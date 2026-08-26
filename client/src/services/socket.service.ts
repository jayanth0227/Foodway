import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';

class ClientSocketService {
  private socket: Socket | null = null;
  private joinedRooms: Set<string> = new Set();
  private disabled: boolean = false;

  constructor() {
    if (!import.meta.env.DEV) {
      const envUrl = import.meta.env.VITE_API_BASE_URL || '';
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        this.disabled = true;
      }
    }
  }

  connect(): Socket {
    if (this.disabled) {
      if (!this.socket) {
        const noopFn = (..._args: any[]) => noopSocket;
        const noopSocket: any = new Proxy({}, {
          get: (_target, prop) => {
            if (prop === 'connected') return false;
            if (prop === 'id') return 'disabled';
            return noopFn;
          }
        });
        this.socket = noopSocket as Socket;
      }
      return this.socket;
    }

    if (!this.socket) {
      let socketUrl = 'http://localhost:5000';
      if (typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const protocol = window.location.protocol || 'http:';
        socketUrl = `${protocol}//${window.location.hostname}:5000`;
      } else if (API_BASE_URL) {
        socketUrl = API_BASE_URL.replace(/\/api$/, '');
      }

      // Attach JWT token if stored in localStorage
      const token = localStorage.getItem('foodway_auth_token') || localStorage.getItem('mk_auth_token') || '';

      this.socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1500
      });

      this.socket.on('connect', () => {
        console.log(`⚡ [Real-Time WebSockets Connected] Socket ID: ${this.socket?.id}`);
        // Re-join tracked rooms on reconnect
        this.joinedRooms.forEach(room => {
          const [type, id] = room.split('_');
          if (type === 'admin') this.socket?.emit('join_admin');
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

  // Room Join Methods
  joinAdmin(): void {
    const roomKey = 'admin_room';
    if (this.joinedRooms.has(roomKey)) return;
    const socket = this.connect();
    socket.emit('join_admin');
    this.joinedRooms.add(roomKey);
  }

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
  onShopCreated(callback: (shop: any) => void): () => void {
    const socket = this.connect();
    socket.on('shop_created', callback);
    return () => { socket.off('shop_created', callback); };
  }

  onShopUpdated(callback: (shop: any) => void): () => void {
    const socket = this.connect();
    const handler1 = (shop: any) => callback(shop);
    const handler2 = (shop: any) => callback(shop);
    const handler3 = (shop: any) => callback(shop);
    const handler4 = (shop: any) => callback(shop);
    socket.on('shop_updated', handler1);
    socket.on('foodway_restaurant_updated', handler2);
    socket.on('restaurant_profile_updated', handler3);
    socket.on('location_updated', handler4);
    return () => {
      socket.off('shop_updated', handler1);
      socket.off('foodway_restaurant_updated', handler2);
      socket.off('restaurant_profile_updated', handler3);
      socket.off('location_updated', handler4);
    };
  }

  onShopStatusUpdated(callback: (data: any) => void): () => void {
    const socket = this.connect();
    const handler1 = (data: any) => callback(data);
    const handler2 = (data: any) => callback(data);
    const handler3 = (data: any) => callback(data);
    const handler4 = (data: any) => callback(data);
    socket.on('foodway_restaurant_status_updated', handler1);
    socket.on('shop_status_updated', handler2);
    socket.on('restaurant_status_updated', handler3);
    socket.on('shop_updated', handler4);
    return () => {
      socket.off('foodway_restaurant_status_updated', handler1);
      socket.off('shop_status_updated', handler2);
      socket.off('restaurant_status_updated', handler3);
      socket.off('shop_updated', handler4);
    };
  }

  onMenuUpdated(callback: (data: any) => void): () => void {
    const socket = this.connect();
    const handler1 = (data: any) => callback(data);
    const handler2 = (data: any) => callback(data);
    const handler3 = (data: any) => callback(data);
    socket.on('menu_updated', handler1);
    socket.on('foodway_menu_updated', handler2);
    socket.on('menu_item_updated', handler3);
    return () => {
      socket.off('menu_updated', handler1);
      socket.off('foodway_menu_updated', handler2);
      socket.off('menu_item_updated', handler3);
    };
  }

  onOrderCreated(callback: (order: any) => void): () => void {
    const socket = this.connect();
    socket.on('order_created', callback);
    return () => { socket.off('order_created', callback); };
  }

  onOrderStatusUpdated(callback: (order: any) => void): () => void {
    const socket = this.connect();
    socket.on('order_status_updated', callback);
    return () => { socket.off('order_status_updated', callback); };
  }

  onOrderReadyForPickup(callback: (order: any) => void): () => void {
    const socket = this.connect();
    socket.on('order_ready_pickup', callback);
    return () => { socket.off('order_ready_pickup', callback); };
  }

  onOrderAssigned(callback: (order: any) => void): () => void {
    const socket = this.connect();
    socket.on('order_assigned', callback);
    return () => { socket.off('order_assigned', callback); };
  }

  onDeliverySettingsUpdated(callback: (settings: any) => void): () => void {
    const socket = this.connect();
    const handler1 = (settings: any) => callback(settings);
    const handler2 = (settings: any) => callback(settings);
    socket.on('delivery_settings_updated', handler1);
    socket.on('foodway_delivery_settings_updated', handler2);
    return () => {
      socket.off('delivery_settings_updated', handler1);
      socket.off('foodway_delivery_settings_updated', handler2);
    };
  }

  onRiderStatusUpdated(callback: (order: any) => void): () => void {
    const socket = this.connect();
    socket.on('rider_status_updated', callback);
    return () => { socket.off('rider_status_updated', callback); };
  }

  onPartnerDutyUpdated(callback: (data: any) => void): () => void {
    const socket = this.connect();
    socket.on('partner_duty_updated', callback);
    return () => { socket.off('partner_duty_updated', callback); };
  }

  onLocationUpdated(callback: (location: any) => void): () => void {
    const socket = this.connect();
    socket.on('location_updated', callback);
    return () => { socket.off('location_updated', callback); };
  }

  onCartUpdated(callback: (data: { userId: string; cartItems: any[] }) => void): () => void {
    const socket = this.connect();
    socket.on('cart_updated', callback);
    return () => { socket.off('cart_updated', callback); };
  }
}

export const socketService = new ClientSocketService();
export default socketService;
