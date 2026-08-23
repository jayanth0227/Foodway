import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, JwtUserPayload } from '../utils/jwt.utils';

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

      // Admin Room (Authorized for ADMIN only)
      socket.on('join_admin', () => {
        if (socketUser?.role === 'ADMIN') {
          socket.join('admin');
          console.log(`🛡️ Socket [${socket.id}] joined room: admin`);
        }
      });

      // Shop / Restaurant Room Authorization
      socket.on('join_restaurant', (restaurantId: string) => {
        if (!restaurantId) return;
        const cleanId = String(restaurantId).trim();
        const room = `restaurant_${cleanId}`;
        const isAuthorized =
          socketUser?.role === 'ADMIN' ||
          !socketUser || // Allow public guests to view store updates
          socketUser?.shopId === cleanId;

        if (isAuthorized && !socket.rooms.has(room)) {
          socket.join(room);
          console.log(`🏬 Socket [${socket.id}] joined room: ${room}`);
        }
      });

      // Customer Room Authorization
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

      // Order Room Authorization
      socket.on('join_order', (orderId: string) => {
        if (!orderId) return;
        const cleanId = String(orderId).trim();
        const room = `order_${cleanId}`;
        if (!socket.rooms.has(room)) {
          socket.join(room);
          console.log(`📋 Socket [${socket.id}] joined room: ${room}`);
        }
      });

      // Delivery Partner Room Authorization
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

    console.log('⚡ Socket.io Server Initialized Successfully with JWT Authentication & Room Authorization');
    return this.io;
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

  // --- REAL-TIME BROADCAST EVENT METHODS ---

  // Admin -> Shop / Public: New Shop Created
  emitShopCreated(shop: any): void {
    if (!this.io) return;
    const shopId = shop.id || shop.shopId || shop.restaurantId;
    console.log(`📡 [Socket Emit: SHOP_CREATED] -> Shop #${shopId}`);
    this.io.to('admin').emit('shop_created', shop);
    this.io.emit('shop_created', shop);
  }

  // Admin / Merchant -> Public / Dashboards: Shop Profile & Location Updated
  emitShopUpdated(shop: any): void {
    if (!this.io) return;
    const shopId = shop.id || shop.shopId || shop.restaurantId;
    console.log(`📡 [Socket Emit: SHOP_UPDATED & LOCATION_UPDATED] -> Shop #${shopId}`, shop);
    this.io.to('admin').to(`restaurant_${shopId}`).emit('shop_updated', shop);
    this.io.emit('shop_updated', shop);
    this.io.emit('foodway_restaurant_updated', shop);
    this.io.emit('restaurant_profile_updated', shop);
    this.io.emit('location_updated', shop);
  }

  // Admin / Merchant -> Public: Shop Open/Close Status Updated
  emitShopStatusUpdated(shopId: string, isOpen: boolean, status: string): void {
    if (!this.io || !shopId) return;
    console.log(`📡 [Socket Emit: SHOP_STATUS_UPDATED] -> Shop #${shopId} Open: ${isOpen}`);
    const payload = { shopId, restaurantId: shopId, isOpen, status };
    this.io.to('admin').to(`restaurant_${shopId}`).emit('foodway_restaurant_status_updated', payload);
    this.io.emit('foodway_restaurant_status_updated', payload);
    this.io.emit('shop_status_updated', payload);
    this.io.emit('restaurant_status_updated', payload);
    this.io.emit('shop_updated', payload);
  }

  // Merchant -> Public / Menu: Item Created / Updated / Deleted
  emitMenuUpdated(restaurantId: string, item?: any): void {
    if (!this.io || !restaurantId) return;
    console.log(`📡 [Socket Emit: MENU_UPDATED] -> Restaurant [${restaurantId}] Item:`, item);
    const payload = { restaurantId, shopId: restaurantId, item, dish: item };
    this.io.to(`restaurant_${restaurantId}`).emit('menu_updated', payload);
    this.io.emit('menu_updated', payload);
    this.io.emit('foodway_menu_updated', payload);
    this.io.emit('menu_item_updated', payload);
  }

  // Customer -> Merchant & Admin: New Order Created
  emitOrderCreated(order: any): void {
    if (!this.io) return;
    const restRoom = `restaurant_${order.restaurantId}`;
    const userRoom = `user_${order.customerId}`;
    console.log(`📡 [Socket Emit: ORDER_CREATED] -> Room [${restRoom}] Order #${order.orderId}`);
    this.io.to('admin').to(restRoom).to(userRoom).emit('order_created', order);
    this.io.emit('order_created', order);
  }

  // Merchant / Admin / Rider -> Customer & Merchant: Order Status Updated
  emitOrderStatusUpdated(order: any): void {
    if (!this.io) return;
    const userRoom = `user_${order.customerId}`;
    const orderRoom = `order_${order.orderId}`;
    const restRoom = `restaurant_${order.restaurantId}`;

    console.log(`📡 [Socket Emit: ORDER_STATUS_UPDATED] -> Order #${order.orderId} Status: ${order.status}`);
    this.io.to('admin').to(userRoom).to(orderRoom).to(restRoom).emit('order_status_updated', order);
    this.io.emit('order_status_updated', order);
  }

  // Merchant -> Delivery Partner Broadcast: Order Ready for Pickup
  emitOrderReadyForPickup(order: any): void {
    if (!this.io) return;
    console.log(`📡 [Socket Emit: ORDER_READY_PICKUP] -> Room [delivery_riders] Order #${order.orderId}`);
    this.io.to('admin').to('delivery_riders').emit('order_ready_pickup', order);
    this.io.emit('order_ready_pickup', order);
  }

  // Rider -> Customer & Merchant & Admin: Rider Status Updated
  emitRiderStatusUpdated(order: any): void {
    if (!this.io) return;
    const userRoom = `user_${order.customerId}`;
    const restRoom = `restaurant_${order.restaurantId}`;
    const orderRoom = `order_${order.orderId}`;

    console.log(`📡 [Socket Emit: RIDER_STATUS_UPDATED] -> Order #${order.orderId} Rider Status: ${order.status}`);
    this.io.to('admin').to(userRoom).to(restRoom).to(orderRoom).emit('rider_status_updated', order);
    this.io.emit('rider_status_updated', order);
  }

  // Admin -> Delivery Partner / Customer / Merchant: Order Assigned to Delivery Agent
  emitOrderAssigned(order: any): void {
    if (!this.io) return;
    const userRoom = `user_${order.customerId}`;
    const restRoom = `restaurant_${order.restaurantId}`;
    const orderRoom = `order_${order.orderId}`;
    const deliveryRoom = `delivery_${order.deliveryUserId}`;

    console.log(`📡 [Socket Emit: ORDER_ASSIGNED] -> Order #${order.orderId} assigned to Rider #${order.deliveryUserId}`);
    this.io.to('admin').to(deliveryRoom).to('delivery_riders').to(userRoom).to(restRoom).to(orderRoom).emit('order_assigned', order);
    this.io.emit('order_assigned', order);
  }

  // Delivery Partner -> Admin / Riders: Duty Status Updated
  emitDeliveryDutyUpdated(partner: any): void {
    if (!this.io) return;
    console.log(`📡 [Socket Emit: PARTNER_DUTY_UPDATED] -> Partner #${partner.userId} OnDuty: ${partner.isOnDuty}`);
    this.io.to('admin').to('delivery_riders').emit('partner_duty_updated', partner);
    this.io.emit('partner_duty_updated', partner);
  }

  // Multi-device Cart Synchronization
  emitCartUpdated(userId: string, cartItems: any[]): void {
    if (!this.io || !userId) return;
    const userRoom = `user_${userId}`;
    console.log(`📡 [Socket Emit: CART_UPDATED] -> Room [${userRoom}] Items Count: ${cartItems.length}`);
    this.io.to(userRoom).emit('cart_updated', { userId, cartItems });
  }

  // Delivery Locations Updated
  emitLocationUpdated(location: any): void {
    if (!this.io) return;
    console.log(`📡 [Socket Emit: LOCATION_UPDATED] -> Location #${location.locationId}`);
    this.io.to('admin').emit('location_updated', location);
    this.io.emit('location_updated', location);
  }

  // Real-Time Delivery Settings & Rates Broadcast
  emitDeliverySettingsUpdated(settings: any): void {
    if (!this.io) return;
    console.log(`📡 [Socket Emit: DELIVERY_SETTINGS_UPDATED] -> Rates updated live!`, settings);
    this.io.emit('delivery_settings_updated', settings);
    this.io.emit('foodway_delivery_settings_updated', settings);
  }
}

export const socketService = new SocketService();
export default socketService;
