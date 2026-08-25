import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, JwtUserPayload } from '../utils/jwt.utils';
import { dynamoDocClient, usersTableName, ordersTableName } from '../config/aws';
import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { apiGatewayWS } from './api-gateway-websocket.service';
import userRepository from '../repositories/user.repository';

export interface SocketUser {
  userId: string;
  role: string;
  email?: string;
  shopId?: string;
}

export class SocketService {
  private io: SocketIOServer | null = null;

  initialize(httpServer: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Production Socket Middleware: Authenticate JWT on handshake (if token present)
    this.io.use((socket: Socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (token) {
          const decoded = verifyToken(token);
          if (decoded && (decoded.id || decoded.email)) {
            const socketUser: SocketUser = {
              userId: decoded.id,
              role: decoded.role || 'USER',
              email: decoded.email,
              shopId: decoded.shopId || decoded.restaurantId
            };
            (socket as any).user = socketUser;
          }
        }
      } catch (err) {
        console.warn(`⚠️ Socket connection authentication warning for ${socket.id}:`, (err as any)?.message);
      }
      next();
    });

    this.io.on('connection', (socket: Socket) => {
      const socketUser: SocketUser | undefined = (socket as any).user;
      console.log(`🔌 [Socket.io Connected]: ${socket.id} (User: ${socketUser?.userId || 'Anonymous'}, Role: ${socketUser?.role || 'Guest'})`);

      if (socketUser && socketUser.userId) {
        this.registerUserSocketId(socketUser.userId, socket.id).catch(() => {});
      }

      // Admin Room
      socket.on('join_admin', () => {
        if (socketUser?.role === 'ADMIN') {
          socket.join('admin');
          console.log(`🛡️ Socket [${socket.id}] joined room: admin`);
        }
      });

      // Shop / Restaurant Room
      socket.on('join_restaurant', (restaurantId: string) => {
        if (!restaurantId) return;
        const cleanId = String(restaurantId).trim();
        const room = `restaurant_${cleanId}`;
        const isAuthorized =
          socketUser?.role === 'ADMIN' ||
          !socketUser ||
          socketUser?.shopId === cleanId;

        if (isAuthorized && !socket.rooms.has(room)) {
          socket.join(room);
          console.log(`🏬 Socket [${socket.id}] joined room: ${room}`);
        }
      });

      // Customer Room
      socket.on('join_customer', (customerId: string) => {
        if (!customerId) return;
        const cleanId = String(customerId).trim();
        const room = `user_${cleanId}`;
        const isAuthorized =
          socketUser?.role === 'ADMIN' ||
          !socketUser ||
          socketUser?.userId === cleanId;

        if (isAuthorized && !socket.rooms.has(room)) {
          socket.join(room);
          console.log(`👤 Socket [${socket.id}] joined room: ${room}`);
        }
      });

      // Order Room
      socket.on('join_order', (orderId: string) => {
        if (!orderId) return;
        const cleanId = String(orderId).trim();
        const room = `order_${cleanId}`;
        if (!socket.rooms.has(room)) {
          socket.join(room);
          console.log(`📋 Socket [${socket.id}] joined room: ${room}`);
        }
      });

      // Delivery Partner Room
      socket.on('join_delivery', (deliveryId?: string) => {
        const isDeliveryPartner = socketUser?.role === 'DELIVERY_PARTNER' || socketUser?.role === 'ADMIN' || !socketUser;
        if (isDeliveryPartner) {
          if (!socket.rooms.has('delivery_riders')) {
            socket.join('delivery_riders');
          }
          if (deliveryId) {
            const room = `delivery_${deliveryId}`;
            if (!socket.rooms.has(room)) {
              socket.join(room);
              console.log(`🛵 Socket [${socket.id}] joined rooms: delivery_riders and ${room}`);
            }
          }
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`🔌 [Socket.io Disconnected]: ${socket.id} (Reason: ${reason})`);
      });
    });

    console.log('⚡ Socket.io Server Initialized Successfully with Option 1 DynamoDB Connection Storage');
    return this.io;
  }

  // --- REGISTER WEBSOCKET CONNECTION ID IN EXISTING TABLES ---
  public async registerUserSocketId(userId: string, connectionId: string, orderId?: string): Promise<void> {
    if (!userId) return;
    try {
      const user = await userRepository.findByUserId(userId) || await userRepository.findByIdentifier(userId);
      if (user) {
        const key: any = {};
        if ((user as any).userId) key.userId = (user as any).userId;
        else if (user.email) key.email = user.email;
        else key.id = (user as any).id || userId;

        await dynamoDocClient.send(
          new UpdateCommand({
            TableName: usersTableName,
            Key: key,
            UpdateExpression: 'SET socketConnectionId = :cid, lastSocketConnectedAt = :now',
            ExpressionAttributeValues: {
              ':cid': connectionId,
              ':now': new Date().toISOString()
            }
          })
        );
        console.log(`💾 Saved ConnectionId [${connectionId}] in existing users table for User #${userId}`);
      }

      if (orderId) {
        await dynamoDocClient.send(
          new UpdateCommand({
            TableName: ordersTableName,
            Key: { orderId },
            UpdateExpression: 'SET customerSocketConnectionId = :cid',
            ExpressionAttributeValues: {
              ':cid': connectionId
            }
          })
        );
      }
    } catch (err) {
      console.warn(`⚠️ DynamoDB connection save warning for User #${userId}:`, (err as any)?.message);
    }
  }

  getIO(): SocketIOServer {
    if (!this.io) {
      const noopProxy: any = new Proxy({}, {
        get: () => (..._args: any[]) => noopProxy,
      });
      return noopProxy as SocketIOServer;
    }
    return this.io;
  }

  // Helper to dispatch event to both Socket.IO (Local Dev) & API Gateway WebSocket (AWS Lambda Production)
  private async dispatchEvent(room: string, eventName: string, payload: any): Promise<void> {
    // 1. Local Dev: Socket.IO
    if (this.io) {
      if (room === 'public') {
        this.io.emit(eventName, payload);
      } else {
        this.io.to(room).emit(eventName, payload);
      }
    }

    // 2. AWS Lambda Production: API Gateway WebSockets via PostToConnection
    try {
      await apiGatewayWS.broadcastToRoom(room, eventName, payload);
    } catch (err) {
      console.warn(`⚠️ API Gateway broadcast error for event [${eventName}] in room [${room}]:`, err);
    }
  }

  // --- REAL-TIME BROADCAST EVENT METHODS (Preserved Exact Public Interface) ---

  // Admin -> Shop / Public: New Shop Created
  emitShopCreated(shop: any): void {
    const shopId = shop.id || shop.shopId || shop.restaurantId;
    console.log(`📡 [Socket Emit: SHOP_CREATED] -> Shop #${shopId}`);
    this.dispatchEvent('admin', 'shop_created', shop);
    this.dispatchEvent('public', 'shop_created', shop);
  }

  // Admin / Merchant -> Public / Dashboards: Shop Profile & Location Updated
  emitShopUpdated(shop: any): void {
    const shopId = shop.id || shop.shopId || shop.restaurantId;
    console.log(`📡 [Socket Emit: SHOP_UPDATED & LOCATION_UPDATED] -> Shop #${shopId}`, shop);
    this.dispatchEvent('admin', 'shop_updated', shop);
    this.dispatchEvent(`restaurant_${shopId}`, 'shop_updated', shop);
    this.dispatchEvent('public', 'shop_updated', shop);
    this.dispatchEvent('public', 'foodway_restaurant_updated', shop);
    this.dispatchEvent('public', 'restaurant_profile_updated', shop);
    this.dispatchEvent('public', 'location_updated', shop);
  }

  // Admin / Merchant -> Public: Shop Open/Close Status Updated
  emitShopStatusUpdated(shopId: string, isOpen: boolean, status: string): void {
    if (!shopId) return;
    console.log(`📡 [Socket Emit: SHOP_STATUS_UPDATED] -> Shop #${shopId} Open: ${isOpen}`);
    const payload = { shopId, restaurantId: shopId, isOpen, status };
    this.dispatchEvent('admin', 'foodway_restaurant_status_updated', payload);
    this.dispatchEvent(`restaurant_${shopId}`, 'foodway_restaurant_status_updated', payload);
    this.dispatchEvent('public', 'foodway_restaurant_status_updated', payload);
    this.dispatchEvent('public', 'shop_status_updated', payload);
    this.dispatchEvent('public', 'restaurant_status_updated', payload);
  }

  // Merchant -> Public / Menu: Item Created / Updated / Deleted
  emitMenuUpdated(restaurantId: string, item?: any): void {
    if (!restaurantId) return;
    console.log(`📡 [Socket Emit: MENU_UPDATED] -> Restaurant [${restaurantId}] Item:`, item);
    const payload = { restaurantId, shopId: restaurantId, item, dish: item };
    this.dispatchEvent(`restaurant_${restaurantId}`, 'menu_updated', payload);
    this.dispatchEvent('public', 'menu_updated', payload);
    this.dispatchEvent('public', 'foodway_menu_updated', payload);
  }

  // Customer -> Merchant & Admin: New Order Created
  emitOrderCreated(order: any): void {
    const restRoom = `restaurant_${order.restaurantId}`;
    const userRoom = `user_${order.customerId}`;
    console.log(`📡 [Socket Emit: ORDER_CREATED] -> Room [${restRoom}] Order #${order.orderId}`);
    this.dispatchEvent('admin', 'order_created', order);
    this.dispatchEvent(restRoom, 'order_created', order);
    this.dispatchEvent(userRoom, 'order_created', order);
    this.dispatchEvent('public', 'order_created', order);
  }

  // Merchant / Admin / Rider -> Customer & Merchant: Order Status Updated
  emitOrderStatusUpdated(order: any): void {
    const userRoom = `user_${order.customerId}`;
    const orderRoom = `order_${order.orderId}`;
    const restRoom = `restaurant_${order.restaurantId}`;

    console.log(`📡 [Socket Emit: ORDER_STATUS_UPDATED] -> Order #${order.orderId} Status: ${order.status}`);
    this.dispatchEvent('admin', 'order_status_updated', order);
    this.dispatchEvent(userRoom, 'order_status_updated', order);
    this.dispatchEvent(orderRoom, 'order_status_updated', order);
    this.dispatchEvent(restRoom, 'order_status_updated', order);
    this.dispatchEvent('public', 'order_status_updated', order);
  }

  // Merchant -> Delivery Partner Broadcast: Order Ready for Pickup
  emitOrderReadyForPickup(order: any): void {
    console.log(`📡 [Socket Emit: ORDER_READY_PICKUP] -> Room [delivery_riders] Order #${order.orderId}`);
    this.dispatchEvent('admin', 'order_ready_pickup', order);
    this.dispatchEvent('delivery_riders', 'order_ready_pickup', order);
    this.dispatchEvent('public', 'order_ready_pickup', order);
  }

  // Rider -> Customer & Merchant & Admin: Rider Status Updated
  emitRiderStatusUpdated(order: any): void {
    const userRoom = `user_${order.customerId}`;
    const restRoom = `restaurant_${order.restaurantId}`;
    const orderRoom = `order_${order.orderId}`;

    console.log(`📡 [Socket Emit: RIDER_STATUS_UPDATED] -> Order #${order.orderId} Rider Status: ${order.status}`);
    this.dispatchEvent('admin', 'rider_status_updated', order);
    this.dispatchEvent(userRoom, 'rider_status_updated', order);
    this.dispatchEvent(restRoom, 'rider_status_updated', order);
    this.dispatchEvent(orderRoom, 'rider_status_updated', order);
    this.dispatchEvent('public', 'rider_status_updated', order);
  }

  // Admin -> Delivery Partner / Customer / Merchant: Order Assigned to Delivery Agent
  emitOrderAssigned(order: any): void {
    const userRoom = `user_${order.customerId}`;
    const restRoom = `restaurant_${order.restaurantId}`;
    const orderRoom = `order_${order.orderId}`;
    const deliveryRoom = `delivery_${order.deliveryUserId}`;

    console.log(`📡 [Socket Emit: ORDER_ASSIGNED] -> Order #${order.orderId} assigned to Rider #${order.deliveryUserId}`);
    this.dispatchEvent('admin', 'order_assigned', order);
    this.dispatchEvent(deliveryRoom, 'order_assigned', order);
    this.dispatchEvent('delivery_riders', 'order_assigned', order);
    this.dispatchEvent(userRoom, 'order_assigned', order);
    this.dispatchEvent(restRoom, 'order_assigned', order);
    this.dispatchEvent(orderRoom, 'order_assigned', order);
  }

  // Delivery Partner -> Admin / Riders: Duty Status Updated
  emitDeliveryDutyUpdated(partner: any): void {
    console.log(`📡 [Socket Emit: PARTNER_DUTY_UPDATED] -> Partner #${partner.userId} OnDuty: ${partner.isOnDuty}`);
    this.dispatchEvent('admin', 'partner_duty_updated', partner);
    this.dispatchEvent('delivery_riders', 'partner_duty_updated', partner);
    this.dispatchEvent('public', 'partner_duty_updated', partner);
  }

  // Multi-device Cart Synchronization
  emitCartUpdated(userId: string, cartItems: any[]): void {
    if (!userId) return;
    const userRoom = `user_${userId}`;
    console.log(`📡 [Socket Emit: CART_UPDATED] -> Room [${userRoom}] Items Count: ${cartItems.length}`);
    this.dispatchEvent(userRoom, 'cart_updated', { userId, cartItems });
  }

  // Delivery Locations Updated
  emitLocationUpdated(location: any): void {
    console.log(`📡 [Socket Emit: LOCATION_UPDATED] -> Location #${location.locationId}`);
    this.dispatchEvent('admin', 'location_updated', location);
    this.dispatchEvent('public', 'location_updated', location);
  }

  // Multi-Vendor Items Cancelled Alert
  emitVendorItemsCancelled(payload: any): void {
    const { parentOrderId, customerId } = payload;
    console.log(`📡 [Socket Emit: VENDOR_ITEMS_CANCELLED] -> Order #${parentOrderId}`);
    this.dispatchEvent('admin', 'vendor_items_cancelled', payload);
    this.dispatchEvent('delivery_riders', 'vendor_items_cancelled', payload);
    if (customerId) {
      this.dispatchEvent(`user_${customerId}`, 'vendor_items_cancelled', payload);
    }
    this.dispatchEvent('public', 'vendor_items_cancelled', payload);
  }

  // Real-Time Delivery Settings & Rates Broadcast
  emitDeliverySettingsUpdated(settings: any): void {
    console.log(`📡 [Socket Emit: DELIVERY_SETTINGS_UPDATED] -> Rates updated live!`, settings);
    this.dispatchEvent('public', 'delivery_settings_updated', settings);
    this.dispatchEvent('public', 'foodway_delivery_settings_updated', settings);
  }
}

export const socketService = new SocketService();
export default socketService;
