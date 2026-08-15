import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

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

    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 [Socket.io Connected]: ${socket.id}`);

      // Room Joining Events with duplicate check
      socket.on('join_restaurant', (restaurantId: string) => {
        if (restaurantId) {
          const room = `restaurant_${restaurantId}`;
          if (!socket.rooms.has(room)) {
            socket.join(room);
            console.log(`🏬 Socket [${socket.id}] joined room: ${room}`);
          }
        }
      });

      socket.on('join_customer', (customerId: string) => {
        if (customerId) {
          const room = `user_${customerId}`;
          if (!socket.rooms.has(room)) {
            socket.join(room);
            console.log(`👤 Socket [${socket.id}] joined room: ${room}`);
          }
        }
      });

      socket.on('join_order', (orderId: string) => {
        if (orderId) {
          const room = `order_${orderId}`;
          if (!socket.rooms.has(room)) {
            socket.join(room);
            console.log(`📋 Socket [${socket.id}] joined room: ${room}`);
          }
        }
      });

      socket.on('join_delivery', (deliveryId: string) => {
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
      });

      socket.on('disconnect', (reason) => {
        console.log(`🔌 [Socket.io Disconnected]: ${socket.id} (Reason: ${reason})`);
      });
    });

    console.log('⚡ Socket.io Server Initialized Successfully');
    return this.io;
  }

  getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.io has not been initialized!');
    }
    return this.io;
  }

  // Phase 1: Customer places order -> Emit to Merchant room
  emitOrderCreated(order: any): void {
    if (!this.io) return;
    const room = `restaurant_${order.restaurantId}`;
    console.log(`📡 [Socket Emit: ORDER_CREATED] -> Room [${room}] Order #${order.orderId}`);
    this.io.to(room).emit('order_created', order);
  }

  // Phase 2: Merchant updates status -> Emit to Customer & Order rooms
  emitOrderStatusUpdated(order: any): void {
    if (!this.io) return;
    const userRoom = `user_${order.customerId}`;
    const orderRoom = `order_${order.orderId}`;
    const restRoom = `restaurant_${order.restaurantId}`;

    console.log(`📡 [Socket Emit: ORDER_STATUS_UPDATED] -> Order #${order.orderId} Status: ${order.status}`);
    this.io.to(userRoom).to(orderRoom).to(restRoom).emit('order_status_updated', order);
  }

  // Phase 3: Merchant marks READY -> Emit to Delivery Partner broadcast
  emitOrderReadyForPickup(order: any): void {
    if (!this.io) return;
    console.log(`📡 [Socket Emit: ORDER_READY_PICKUP] -> Room [delivery_riders] Order #${order.orderId}`);
    this.io.to('delivery_riders').emit('order_ready_pickup', order);
  }

  // Phase 4: Rider updates status -> Emit to Customer & Merchant
  emitRiderStatusUpdated(order: any): void {
    if (!this.io) return;
    const userRoom = `user_${order.customerId}`;
    const restRoom = `restaurant_${order.restaurantId}`;
    const orderRoom = `order_${order.orderId}`;

    console.log(`📡 [Socket Emit: RIDER_STATUS_UPDATED] -> Order #${order.orderId} Rider Status: ${order.status}`);
    this.io.to(userRoom).to(restRoom).to(orderRoom).emit('rider_status_updated', order);
  }

  // Multi-device Real-Time Cart Synchronization
  emitCartUpdated(userId: string, cartItems: any[]): void {
    if (!this.io || !userId) return;
    const userRoom = `user_${userId}`;
    console.log(`📡 [Socket Emit: CART_UPDATED] -> Room [${userRoom}] Items Count: ${cartItems.length}`);
    this.io.to(userRoom).emit('cart_updated', { userId, cartItems });
  }
}

export const socketService = new SocketService();
export default socketService;
