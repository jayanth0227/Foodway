import { getToken, getCurrentUser } from '../utils/auth.utils';
import { API_BASE_URL } from '../utils/api';

class UnifiedRealtimeSocketService {
  private nativeWS: WebSocket | null = null;
  private joinedRooms: Set<string> = new Set();
  private isNativeMode: boolean = true;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: any = null;
  private pingInterval: any = null;

  constructor() {
    this.determineEngineMode();
  }

  private determineEngineMode() {
    // Production AWS WebSocket API default
    this.isNativeMode = true;
  }

  // Unified Connect Function
  public connect(): WebSocket | null {
    return this.connectNativeWS();
  }

  public disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.joinedRooms.clear();
    if (this.nativeWS) {
      try {
        this.nativeWS.onclose = null;
        this.nativeWS.onerror = null;
        this.nativeWS.close();
      } catch (e) {}
      this.nativeWS = null;
    }
  }

  public reconnect(): void {
    this.disconnect();
    this.connect();
  }

  // --- NATIVE WEBSOCKET ENGINE ---
  private connectNativeWS(): WebSocket | null {
    if (this.nativeWS && (this.nativeWS.readyState === WebSocket.OPEN || this.nativeWS.readyState === WebSocket.CONNECTING)) {
      return this.nativeWS;
    }

    const defaultProductionWss = 'wss://swsw35x9j8.execute-api.ap-south-2.amazonaws.com/production';
    let baseWsUrl = import.meta.env.VITE_WSS_URL || import.meta.env.VITE_WS_URL || defaultProductionWss;

    // Fallback: If baseWsUrl points to localhost/127.0.0.1 or local port 5000, redirect to production AWS WebSocket API
    if (!baseWsUrl || baseWsUrl.includes('localhost') || baseWsUrl.includes('127.0.0.1')) {
      baseWsUrl = defaultProductionWss;
    }

    const token = getToken() || '';
    const currentUser = getCurrentUser();
    const userId = currentUser?.id || (currentUser as any)?.userId || currentUser?.email || '';

    // Append ?token=... for $connect route JWT verification in AWS API Gateway
    const fullWsUrl = token
      ? `${baseWsUrl}${baseWsUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
      : baseWsUrl;

    console.log(`⚡ [Native WebSocket Engine] Connecting to: ${baseWsUrl} (Authenticated User: ${userId || 'Anonymous'})`);

    try {
      this.nativeWS = new WebSocket(fullWsUrl);

      this.nativeWS.onopen = () => {
        console.log(`⚡ [Native WebSocket Engine] Successfully Connected to AWS API Gateway WebSocket!`);
        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        // Start ping heartbeat keepalive
        this.startHeartbeat();

        // Register authenticated connectionId with token + userId
        const freshToken = getToken() || '';
        const freshUser = getCurrentUser();
        const freshUserId = freshUser?.id || (freshUser as any)?.userId || freshUser?.email || '';

        this.sendNativeEvent('register_connection', {
          token: freshToken,
          userId: freshUserId,
          rooms: Array.from(this.joinedRooms)
        });

        // Re-join tracked rooms on reconnect
        this.joinedRooms.forEach(roomKey => {
          this.sendNativeEvent('join_room', {
            room: roomKey,
            token: freshToken,
            userId: freshUserId
          });
        });
      };

      this.nativeWS.onmessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          const eventName = payload.event || payload.type || payload.action || '';
          const eventData = payload.data !== undefined ? payload.data : payload;

          if (eventName && this.listeners.has(eventName)) {
            this.listeners.get(eventName)?.forEach(cb => {
              try {
                cb(eventData);
              } catch (e) {
                console.warn(`Listener error for ${eventName}:`, e);
              }
            });
          }
        } catch (err) {
          // Ignore non-JSON frame responses
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
      console.log('🔄 [Native WebSocket] Attempting reconnect to AWS API Gateway...');
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
      const payload = { event, action: event, type: event, ...data, data };
      this.nativeWS.send(JSON.stringify(payload));
    }
  }

  public on(eventName: string, callback: (data: any) => void): () => void {
    return this.subscribeEvent(eventName, callback);
  }

  public off(eventName: string, callback: (data: any) => void): this {
    this.listeners.get(eventName)?.delete(callback);
    return this;
  }

  public emit(eventName: string, data?: any): this {
    this.sendNativeEvent(eventName, data);
    return this;
  }

  public getIO(): any {
    return this;
  }

  public getSocket(): any {
    const socketObj = this.connect();
    if (socketObj && typeof socketObj === 'object' && !(socketObj as any).on) {
      (socketObj as any).on = (eventName: string, cb: (data: any) => void) => this.on(eventName, cb);
      (socketObj as any).off = (eventName: string, cb: (data: any) => void) => this.off(eventName, cb);
      (socketObj as any).emit = (eventName: string, data?: any) => this.emit(eventName, data);
    }
    return socketObj;
  }

  // Unified Event Registration
  private subscribeEvent(eventName: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)?.add(callback);
    this.connectNativeWS();

    return () => {
      this.listeners.get(eventName)?.delete(callback);
    };
  }

  // --- ROOM JOIN METHODS ---
  public joinAdmin(): void {
    const roomKey = 'admin';
    if (!this.joinedRooms.has(roomKey)) {
      this.joinedRooms.add(roomKey);
    }
    const token = getToken() || '';
    const user = getCurrentUser();
    this.sendNativeEvent('join_admin', { room: roomKey, token, userId: user?.id });
    this.sendNativeEvent('join_room', { room: roomKey, token, userId: user?.id });
  }

  public joinRestaurant(restaurantId: string): void {
    if (!restaurantId) return;
    const cleanId = String(restaurantId).trim();
    const roomKey = `restaurant_${cleanId}`;
    if (!this.joinedRooms.has(roomKey)) {
      this.joinedRooms.add(roomKey);
    }
    const token = getToken() || '';
    const user = getCurrentUser();
    this.sendNativeEvent('join_restaurant', { restaurantId: cleanId, room: roomKey, token, userId: user?.id });
    this.sendNativeEvent('join_room', { room: roomKey, token, userId: user?.id });
  }

  public joinCustomer(customerId: string): void {
    if (!customerId) return;
    const cleanId = String(customerId).trim();
    const roomKey = `user_${cleanId}`;
    if (!this.joinedRooms.has(roomKey)) {
      this.joinedRooms.add(roomKey);
    }
    const token = getToken() || '';
    const user = getCurrentUser();
    this.sendNativeEvent('join_customer', { customerId: cleanId, room: roomKey, token, userId: user?.id || cleanId });
    this.sendNativeEvent('join_room', { room: roomKey, token, userId: user?.id || cleanId });
  }

  public joinOrder(orderId: string): void {
    if (!orderId) return;
    const cleanId = String(orderId).trim();
    const roomKey = `order_${cleanId}`;
    if (!this.joinedRooms.has(roomKey)) {
      this.joinedRooms.add(roomKey);
    }
    const token = getToken() || '';
    const user = getCurrentUser();
    this.sendNativeEvent('join_order', { orderId: cleanId, room: roomKey, token, userId: user?.id });
    this.sendNativeEvent('join_room', { room: roomKey, token, userId: user?.id });
  }

  public joinDelivery(deliveryId?: string): void {
    const roomKey = `delivery_${deliveryId || 'riders'}`;
    if (!this.joinedRooms.has(roomKey)) {
      this.joinedRooms.add(roomKey);
    }
    const token = getToken() || '';
    const user = getCurrentUser();
    this.sendNativeEvent('join_delivery', { deliveryId: deliveryId || 'riders', room: roomKey, token, userId: user?.id });
    this.sendNativeEvent('join_room', { room: roomKey, token, userId: user?.id });
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
