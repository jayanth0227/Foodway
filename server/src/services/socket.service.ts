import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, JwtUserPayload } from '../utils/jwt.utils';
import { dynamoDocClient, usersTableName, ordersTableName } from '../config/aws';
import { UpdateCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
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
    if (!userId || !connectionId) {
      console.warn(`[WS REGISTER FAILED] connectionId=${connectionId} userId=${userId} reason=MISSING_PARAMETERS`);
      return;
    }

    try {
      // 1. Resolve user via repository or direct identifier match
      let user = await userRepository.findByUserId(userId) || await userRepository.findByIdentifier(userId);
      
      // Fallback: If not found by findByUserId, attempt direct scan/query
      if (!user) {
        try {
          const scanRes = await dynamoDocClient.send(
            new ScanCommand({
              TableName: usersTableName,
              FilterExpression: 'userId = :uid OR id = :uid OR email = :uid',
              ExpressionAttributeValues: { ':uid': userId }
            })
          );
          if (scanRes.Items && scanRes.Items.length > 0) {
            user = scanRes.Items[0] as any;
          }
        } catch (scanErr) {}
      }

      if (!user) {
        console.warn(`[WS REGISTER FAILED] connectionId=${connectionId} userId=${userId} reason=USER_NOT_FOUND`);
        return;
      }

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
      console.log(`[WS REGISTER SUCCESS] userId=${(user as any).userId || user.email || userId} connectionId=${connectionId}`);

      if (orderId) {
        try {
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
          console.log(`[WS REGISTER SUCCESS] Attached orderId=${orderId} to connectionId=${connectionId}`);
        } catch (ordErr: any) {
          console.warn(`⚠️ Warning attaching orderId to connection:`, ordErr?.message);
        }
      }
    } catch (err: any) {
      console.error(`[WS REGISTER FAILED] connectionId=${connectionId} userId=${userId} reason=DYNAMODB_UPDATE_FAILED error=${err?.message || err}`);
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
  private async dispatchEvent(rooms: string | string[], eventName: string, payload: any): Promise<void> {
    const roomList = Array.isArray(rooms) ? rooms : [rooms];

    // 1. Local Dev: Socket.IO
    if (this.io) {
      roomList.forEach(room => {
        if (room === 'public') {
          this.io?.emit(eventName, payload);
        } else {
          this.io?.to(room).emit(eventName, payload);
        }
      });
    }

    // 2. AWS Lambda Production: API Gateway WebSockets via PostToConnection
    try {
      await Promise.all(roomList.map(room => apiGatewayWS.broadcastToRoom(room, eventName, payload)));
    } catch (err) {
      console.warn(`⚠️ API Gateway broadcast error for event [${eventName}]:`, err);
    }
  }

  // --- REAL-TIME BROADCAST EVENT METHODS (Async & Awaitable for AWS Lambda) ---

  // Admin -> Shop / Public: New Shop Created
  async emitShopCreated(shop: any): Promise<void> {
    const shopId = shop.id || shop.shopId || shop.restaurantId;
    console.log(`📡 [Socket Emit: SHOP_CREATED] -> Shop #${shopId}`);
    await this.dispatchEvent(['admin', 'public'], 'shop_created', shop);
  }

  // Admin / Merchant -> Public / Dashboards: Shop Profile & Location Updated
  async emitShopUpdated(shop: any): Promise<void> {
    const shopId = shop.id || shop.shopId || shop.restaurantId;
    console.log(`📡 [Socket Emit: SHOP_UPDATED & LOCATION_UPDATED] -> Shop #${shopId}`, shop);
    await Promise.all([
      this.dispatchEvent(['admin', `restaurant_${shopId}`, 'public'], 'shop_updated', shop),
      this.dispatchEvent('public', 'foodway_restaurant_updated', shop),
      this.dispatchEvent('public', 'restaurant_profile_updated', shop),
      this.dispatchEvent('public', 'location_updated', shop)
    ]);
  }

  // Admin / Merchant -> Public: Shop Open/Close Status Updated
  async emitShopStatusUpdated(shopId: string, isOpen: boolean, status: string): Promise<void> {
    if (!shopId) return;
    console.log(`📡 [Socket Emit: SHOP_STATUS_UPDATED] -> Shop #${shopId} Open: ${isOpen}`);
    const payload = { shopId, restaurantId: shopId, isOpen, status };
    await Promise.all([
      this.dispatchEvent(['admin', `restaurant_${shopId}`, 'public'], 'foodway_restaurant_status_updated', payload),
      this.dispatchEvent(['public'], 'shop_status_updated', payload),
      this.dispatchEvent(['public'], 'restaurant_status_updated', payload)
    ]);
  }

  // Merchant -> Public / Menu: Item Created / Updated / Deleted
  async emitMenuUpdated(restaurantId: string, item?: any): Promise<void> {
    if (!restaurantId) return;
    console.log(`📡 [Socket Emit: MENU_UPDATED] -> Restaurant [${restaurantId}] Item:`, item);
    const payload = { restaurantId, shopId: restaurantId, item, dish: item };
    await Promise.all([
      this.dispatchEvent([`restaurant_${restaurantId}`, 'public'], 'menu_updated', payload),
      this.dispatchEvent('public', 'foodway_menu_updated', payload)
    ]);
  }

  // Customer -> Merchant & Admin: New Order Created
  async emitOrderCreated(order: any): Promise<void> {
    const restRoom = `restaurant_${order.restaurantId}`;
    const userRoom = `user_${order.customerId}`;
    console.log(`📡 [Socket Emit: ORDER_CREATED] -> Room [${restRoom}] Order #${order.orderId}`);
    await this.dispatchEvent(['admin', restRoom, userRoom, 'public'], 'order_created', order);
  }

  // Merchant / Admin / Rider -> Customer & Merchant: Order Status Updated
  async emitOrderStatusUpdated(order: any): Promise<void> {
    const userRoom = `user_${order.customerId}`;
    const orderRoom = `order_${order.orderId}`;
    const restRoom = `restaurant_${order.restaurantId}`;

    console.log(`📡 [Socket Emit: ORDER_STATUS_UPDATED] -> Order #${order.orderId} Status: ${order.status}`);
    await this.dispatchEvent(['admin', userRoom, orderRoom, restRoom, 'public'], 'order_status_updated', order);
  }

  // Merchant -> Delivery Partner Broadcast: Order Ready for Pickup
  async emitOrderReadyForPickup(order: any): Promise<void> {
    console.log(`📡 [Socket Emit: ORDER_READY_PICKUP] -> Room [delivery_riders] Order #${order.orderId}`);
    await this.dispatchEvent(['admin', 'delivery_riders', 'public'], 'order_ready_pickup', order);
  }

  // Rider -> Customer & Merchant & Admin: Rider Status Updated
  async emitRiderStatusUpdated(order: any): Promise<void> {
    const userRoom = `user_${order.customerId}`;
    const restRoom = `restaurant_${order.restaurantId}`;
    const orderRoom = `order_${order.orderId}`;

    console.log(`📡 [Socket Emit: RIDER_STATUS_UPDATED] -> Order #${order.orderId} Rider Status: ${order.status}`);
    await this.dispatchEvent(['admin', userRoom, restRoom, orderRoom, 'public'], 'rider_status_updated', order);
  }

  // Admin -> Delivery Partner / Customer / Merchant: Order Assigned to Delivery Agent
  async emitOrderAssigned(order: any): Promise<void> {
    const userRoom = `user_${order.customerId}`;
    const restRoom = `restaurant_${order.restaurantId}`;
    const orderRoom = `order_${order.orderId}`;
    const deliveryRoom = `delivery_${order.deliveryUserId}`;

    console.log(`📡 [Socket Emit: ORDER_ASSIGNED] -> Order #${order.orderId} assigned to Rider #${order.deliveryUserId}`);
    await this.dispatchEvent(['admin', deliveryRoom, 'delivery_riders', userRoom, restRoom, orderRoom], 'order_assigned', order);
  }

  // Delivery Partner -> Admin / Riders: Duty Status Updated
  async emitDeliveryDutyUpdated(partner: any): Promise<void> {
    console.log(`📡 [Socket Emit: PARTNER_DUTY_UPDATED] -> Partner #${partner.userId} OnDuty: ${partner.isOnDuty}`);
    await this.dispatchEvent(['admin', 'delivery_riders', 'public'], 'partner_duty_updated', partner);
  }

  // Multi-device Cart Synchronization
  async emitCartUpdated(userId: string, cartItems: any[]): Promise<void> {
    if (!userId) return;
    const userRoom = `user_${userId}`;
    console.log(`📡 [Socket Emit: CART_UPDATED] -> Room [${userRoom}] Items Count: ${cartItems.length}`);
    await this.dispatchEvent(userRoom, 'cart_updated', { userId, cartItems });
  }

  // Delivery Locations Updated
  async emitLocationUpdated(location: any): Promise<void> {
    console.log(`📡 [Socket Emit: LOCATION_UPDATED] -> Location #${location.locationId}`);
    await this.dispatchEvent(['admin', 'public'], 'location_updated', location);
  }

  // Multi-Vendor Items Cancelled Alert
  async emitVendorItemsCancelled(payload: any): Promise<void> {
    const { parentOrderId, customerId } = payload;
    console.log(`📡 [Socket Emit: VENDOR_ITEMS_CANCELLED] -> Order #${parentOrderId}`);
    const rooms = ['admin', 'delivery_riders', 'public'];
    if (customerId) rooms.push(`user_${customerId}`);
    await this.dispatchEvent(rooms, 'vendor_items_cancelled', payload);
  }

  // Real-Time Delivery Settings & Rates Broadcast
  async emitDeliverySettingsUpdated(settings: any): Promise<void> {
    console.log(`📡 [Socket Emit: DELIVERY_SETTINGS_UPDATED] -> Rates updated live!`, settings);
    await this.dispatchEvent(['public'], 'delivery_settings_updated', settings);
    await this.dispatchEvent(['public'], 'foodway_delivery_settings_updated', settings);
  }
}

export const socketService = new SocketService();
export default socketService;
