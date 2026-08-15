import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';

class ClientSocketService {
  private socket: Socket | null = null;
  private joinedRooms: Set<string> = new Set();

  connect(): Socket {
    if (!this.socket) {
      // Resolve WebSocket URL dynamically for host IP (Android Mobile support)
      let socketUrl = 'http://localhost:5000';
      if (typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const protocol = window.location.protocol || 'http:';
        socketUrl = `${protocol}//${window.location.hostname}:5000`;
      } else if (API_BASE_URL) {
        socketUrl = API_BASE_URL.replace(/\/api$/, '');
      }

      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      });

      this.socket.on('connect', () => {
        console.log(`⚡ [Real-Time WebSockets Connected] Socket ID: ${this.socket?.id}`);
        // Re-join tracked rooms on reconnect
        this.joinedRooms.forEach(room => {
          const [type, id] = room.split('_');
          if (type === 'restaurant') this.socket?.emit('join_restaurant', id);
          if (type === 'user') this.socket?.emit('join_customer', id);
          if (type === 'order') this.socket?.emit('join_order', id);
          if (type === 'delivery') this.socket?.emit('join_delivery', id);
        });
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`🔌 [Real-Time WebSockets Disconnected]: ${reason}`);
      });

      this.socket.on('connect_error', (error) => {
        console.warn('⚠️ Socket connection warning:', error.message);
      });
    }

    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  getSocket(): Socket {
    return this.connect();
  }

  // Room Join Methods with duplicate check
  joinRestaurant(restaurantId: string): void {
    if (!restaurantId) return;
    const roomKey = `restaurant_${restaurantId}`;
    if (this.joinedRooms.has(roomKey)) return;
    const socket = this.connect();
    socket.emit('join_restaurant', restaurantId);
    this.joinedRooms.add(roomKey);
  }

  joinCustomer(customerId: string): void {
    if (!customerId) return;
    const roomKey = `user_${customerId}`;
    if (this.joinedRooms.has(roomKey)) return;
    const socket = this.connect();
    socket.emit('join_customer', customerId);
    this.joinedRooms.add(roomKey);
  }

  joinOrder(orderId: string): void {
    if (!orderId) return;
    const roomKey = `order_${orderId}`;
    if (this.joinedRooms.has(roomKey)) return;
    const socket = this.connect();
    socket.emit('join_order', orderId);
    this.joinedRooms.add(roomKey);
  }

  joinDelivery(deliveryId?: string): void {
    const roomKey = `delivery_${deliveryId || 'riders'}`;
    if (this.joinedRooms.has(roomKey)) return;
    const socket = this.connect();
    socket.emit('join_delivery', deliveryId || '');
    this.joinedRooms.add(roomKey);
  }

  // Listener Subscriptions
  onOrderCreated(callback: (order: any) => void): () => void {
    const socket = this.connect();
    socket.on('order_created', callback);
    return () => {
      socket.off('order_created', callback);
    };
  }

  onOrderStatusUpdated(callback: (order: any) => void): () => void {
    const socket = this.connect();
    socket.on('order_status_updated', callback);
    return () => {
      socket.off('order_status_updated', callback);
    };
  }

  onOrderReadyForPickup(callback: (order: any) => void): () => void {
    const socket = this.connect();
    socket.on('order_ready_pickup', callback);
    return () => {
      socket.off('order_ready_pickup', callback);
    };
  }

  onOrderAssigned(callback: (order: any) => void): () => void {
    const socket = this.connect();
    socket.on('order_assigned', callback);
    return () => {
      socket.off('order_assigned', callback);
    };
  }

  onRiderStatusUpdated(callback: (order: any) => void): () => void {
    const socket = this.connect();
    socket.on('rider_status_updated', callback);
    return () => {
      socket.off('rider_status_updated', callback);
    };
  }

  onCartUpdated(callback: (data: { userId: string; cartItems: any[] }) => void): () => void {
    const socket = this.connect();
    socket.on('cart_updated', callback);
    return () => {
      socket.off('cart_updated', callback);
    };
  }
}

export const socketService = new ClientSocketService();
export default socketService;
