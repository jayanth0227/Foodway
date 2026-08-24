import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';

class UnifiedRealtimeSocketService {
  private socketIO: Socket | null = null;
  private nativeWS: WebSocket | null = null;
  private joinedRooms: Set<string> = new Set();
  private isNativeMode: boolean = false;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: any = null;
  private pingInterval: any = null;

  constructor() {
    this.determineEngineMode();
  }

  private determineEngineMode() {
    const wsEnv = import.meta.env.VITE_WSS_URL || import.meta.env.VITE_WS_URL || '';
    if (wsEnv && (wsEnv.startsWith('ws://') || wsEnv.startsWith('wss://'))) {
      this.isNativeMode = true;
    }
  }

  // Unified Connect Function
  public connect(): any {
    if (this.isNativeMode) {
      return this.connectNativeWS();
    } else {
      return this.connectSocketIO();
    }
  }

  // --- NATIVE WEBSOCKET ENGINE ---
  private connectNativeWS(): WebSocket | null {
    if (this.nativeWS && (this.nativeWS.readyState === WebSocket.OPEN || this.nativeWS.readyState === WebSocket.CONNECTING)) {
      return this.nativeWS;
    }

    const wsUrl = import.meta.env.VITE_WSS_URL || import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
    console.log(`⚡ [Native WebSocket Engine] Connecting to: ${wsUrl}`);

    try {
      this.nativeWS = new WebSocket(wsUrl);

      this.nativeWS.onopen = () => {
        console.log(`⚡ [Native WebSocket Engine] Successfully Connected!`);
        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        // Start ping heartbeat
        this.startHeartbeat();

        // Re-join tracked rooms on reconnect
        this.joinedRooms.forEach(roomKey => {
          const parts = roomKey.split('_');
          const type = parts[0];
          const id = parts.slice(1).join('_');
          this.sendNativeEvent('join_room', { room: roomKey, type, id });
        });
      };

      this.nativeWS.onmessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          const eventName = payload.event || payload.type || payload.action || '';
          const eventData = payload.data !== undefined ? payload.data : payload;

          if (eventName && this.listeners.has(eventName)) {
            this.listeners.get(eventName)?.forEach(cb => {
              try { cb(eventData); } catch (e) { console.warn(`Listener error for ${eventName}:`, e); }
            });
          }
        } catch (err) {
          console.warn('⚡ [Native WebSocket] Received non-JSON message:', event.data);
        }
      };

      this.nativeWS.onclose = (event) => {
        console.warn(`🔌 [Native WebSocket Disconnected] Code: ${event.code}. Auto-reconnecting...`);
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.nativeWS.onerror = (error) => {
        console.warn('⚠️ [Native WebSocket Error]:', error);
      };
    } catch (e) {
      console.error('Failed to initialize Native WebSocket:', e);
      this.scheduleReconnect();
    }

    return this.nativeWS;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setInterval(() => {
      console.log('🔄 [Native WebSocket] Attempting reconnect...');
      this.connectNativeWS();
    }, 3000);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.nativeWS && this.nativeWS.readyState === WebSocket.OPEN) {
        this.nativeWS.send(JSON.stringify({ action: 'ping', timestamp: Date.now() }));
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private sendNativeEvent(event: string, data: any) {
    if (this.nativeWS && this.nativeWS.readyState === WebSocket.OPEN) {
      this.nativeWS.send(JSON.stringify({ event, action: event, type: event, data }));
    }
  }

  // --- SOCKET.IO FALLBACK ENGINE ---
  private connectSocketIO(): Socket {
    if (!this.socketIO) {
      let socketUrl = 'http://localhost:5000';
      if (typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const protocol = window.location.protocol || 'http:';
        socketUrl = `${protocol}//${window.location.hostname}:5000`;
      } else if (API_BASE_URL) {
        socketUrl = API_BASE_URL.replace(/\/api$/, '');
      }

      const token = localStorage.getItem('foodway_auth_token') || localStorage.getItem('mk_auth_token') || '';

      this.socketIO = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1500
      });

      this.socketIO.on('connect', () => {
        console.log(`⚡ [Socket.io Connected] ID: ${this.socketIO?.id}`);
        this.joinedRooms.forEach(room => {
          const parts = room.split('_');
          const type = parts[0];
          const id = parts.slice(1).join('_');
          if (type === 'admin') this.socketIO?.emit('join_admin');
          if (type === 'restaurant') this.socketIO?.emit('join_restaurant', id);
          if (type === 'user') this.socketIO?.emit('join_customer', id);
          if (type === 'order') this.socketIO?.emit('join_order', id);
          if (type === 'delivery') this.socketIO?.emit('join_delivery', id);
        });
      });
    }

    if (this.socketIO && !this.socketIO.connected) {
      this.socketIO.connect();
    }

    return this.socketIO;
  }

  public getSocket(): any {
    return this.connect();
  }

  // Unified Event Registration (Works for Native WS & Socket.io)
  private subscribeEvent(eventName: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)?.add(callback);

    // If using Socket.io, also attach socket.io listener
    if (!this.isNativeMode) {
      const ioSocket = this.connectSocketIO();
      ioSocket.on(eventName, callback);
    } else {
      this.connectNativeWS();
    }

    return () => {
      this.listeners.get(eventName)?.delete(callback);
      if (!this.isNativeMode && this.socketIO) {
        this.socketIO.off(eventName, callback);
      }
    };
  }

  // --- ROOM JOIN METHODS ---
  public joinAdmin(): void {
    const roomKey = 'admin_room';
    if (this.joinedRooms.has(roomKey)) return;
    this.joinedRooms.add(roomKey);

    if (this.isNativeMode) {
      this.sendNativeEvent('join_admin', { room: roomKey });
    } else {
      this.connectSocketIO().emit('join_admin');
    }
  }

  public joinRestaurant(restaurantId: string): void {
    if (!restaurantId) return;
    const roomKey = `restaurant_${restaurantId}`;
    if (this.joinedRooms.has(roomKey)) return;
    this.joinedRooms.add(roomKey);

    if (this.isNativeMode) {
      this.sendNativeEvent('join_restaurant', { restaurantId, room: roomKey });
    } else {
      this.connectSocketIO().emit('join_restaurant', restaurantId);
    }
  }

  public joinCustomer(customerId: string): void {
    if (!customerId) return;
    const roomKey = `user_${customerId}`;
    if (this.joinedRooms.has(roomKey)) return;
    this.joinedRooms.add(roomKey);

    if (this.isNativeMode) {
      this.sendNativeEvent('join_customer', { customerId, room: roomKey });
    } else {
      this.connectSocketIO().emit('join_customer', customerId);
    }
  }

  public joinOrder(orderId: string): void {
    if (!orderId) return;
    const roomKey = `order_${orderId}`;
    if (this.joinedRooms.has(roomKey)) return;
    this.joinedRooms.add(roomKey);

    if (this.isNativeMode) {
      this.sendNativeEvent('join_order', { orderId, room: roomKey });
    } else {
      this.connectSocketIO().emit('join_order', orderId);
    }
  }

  public joinDelivery(deliveryId?: string): void {
    const roomKey = `delivery_${deliveryId || 'riders'}`;
    if (this.joinedRooms.has(roomKey)) return;
    this.joinedRooms.add(roomKey);

    if (this.isNativeMode) {
      this.sendNativeEvent('join_delivery', { deliveryId: deliveryId || 'riders', room: roomKey });
    } else {
      this.connectSocketIO().emit('join_delivery', deliveryId || '');
    }
  }

  // --- EVENT LISTENER SUBSCRIPTIONS ---
  public onShopCreated(callback: (shop: any) => void): () => void {
    return this.subscribeEvent('shop_created', callback);
  }

  public onShopUpdated(callback: (shop: any) => void): () => void {
    const unsub1 = this.subscribeEvent('shop_updated', callback);
    const unsub2 = this.subscribeEvent('foodway_restaurant_updated', callback);
    const unsub3 = this.subscribeEvent('restaurant_profile_updated', callback);
    const unsub4 = this.subscribeEvent('location_updated', callback);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }

  public onShopStatusUpdated(callback: (data: any) => void): () => void {
    const unsub1 = this.subscribeEvent('foodway_restaurant_status_updated', callback);
    const unsub2 = this.subscribeEvent('shop_status_updated', callback);
    const unsub3 = this.subscribeEvent('restaurant_status_updated', callback);
    const unsub4 = this.subscribeEvent('shop_updated', callback);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }

  public onMenuUpdated(callback: (data: any) => void): () => void {
    const unsub1 = this.subscribeEvent('menu_updated', callback);
    const unsub2 = this.subscribeEvent('foodway_menu_updated', callback);
    const unsub3 = this.subscribeEvent('menu_item_updated', callback);
    return () => { unsub1(); unsub2(); unsub3(); };
  }

  public onOrderCreated(callback: (order: any) => void): () => void {
    return this.subscribeEvent('order_created', callback);
  }

  public onOrderStatusUpdated(callback: (order: any) => void): () => void {
    return this.subscribeEvent('order_status_updated', callback);
  }

  public onOrderReadyForPickup(callback: (order: any) => void): () => void {
    return this.subscribeEvent('order_ready_pickup', callback);
  }

  public onOrderAssigned(callback: (order: any) => void): () => void {
    return this.subscribeEvent('order_assigned', callback);
  }

  public onDeliverySettingsUpdated(callback: (settings: any) => void): () => void {
    const unsub1 = this.subscribeEvent('delivery_settings_updated', callback);
    const unsub2 = this.subscribeEvent('foodway_delivery_settings_updated', callback);
    return () => { unsub1(); unsub2(); };
  }

  public onRiderStatusUpdated(callback: (order: any) => void): () => void {
    return this.subscribeEvent('rider_status_updated', callback);
  }

  public onPartnerDutyUpdated(callback: (data: any) => void): () => void {
    return this.subscribeEvent('partner_duty_updated', callback);
  }

  public onLocationUpdated(callback: (location: any) => void): () => void {
    return this.subscribeEvent('location_updated', callback);
  }

  public onCartUpdated(callback: (data: { userId: string; cartItems: any[] }) => void): () => void {
    return this.subscribeEvent('cart_updated', callback);
  }
}

export const socketService = new UnifiedRealtimeSocketService();
export default socketService;
