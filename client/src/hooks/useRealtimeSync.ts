import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import socketService from '../services/socket.service';
import { useAuth } from '../context/AuthContext';
import shopService from '../services/shop.service';
import buzzerService from '../services/buzzer.service';

export const useRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Automatically request browser notification permission for push alerts on desktop/mobile
    buzzerService.requestNotificationPermission();

    // 1. Establish socket connection & join user's role/id rooms
    const socket = socketService.connect();

    if (isAuthenticated && user) {
      const uRole = (user.role || '').toUpperCase();
      if (uRole === 'ADMIN') {
        socketService.joinAdmin();
      }
      if (uRole === 'SHOP' || uRole === 'RESTAURANT' || user.shopId) {
        socketService.joinRestaurant(user.shopId || user.id);
      }
      if (uRole === 'DELIVERY_PARTNER' || uRole === 'DELIVERY' || uRole === 'RIDER' || (user.id && String(user.id).startsWith('DEL-'))) {
        socketService.joinDelivery(user.id);
      }
      socketService.joinCustomer(user.id);
    }

    // --- ROLE-BASED 30-SECOND ORDER BUZZER TRIGGER ALGORITHM ---
    const triggerRoleBuzzer = (eventName: string, orderData: any) => {
      if (!orderData) return;

      const orderId = orderData.orderId || orderData.id || orderData.parentOrderId || '';
      const orderRestId = String(orderData.restaurantId || orderData.shopId || '');
      const orderCustomerId = String(orderData.customerId || orderData.userId || '');
      const orderDeliveryId = String(orderData.deliveryUserId || orderData.riderId || orderData.assignedRiderId || '').trim().toLowerCase();
      const assignedRiderStr = String(orderData.assignedRider || orderData.deliveryPartnerName || '').trim().toLowerCase();
      const deliveryPartnerEmailStr = String(orderData.deliveryPartnerEmail || '').trim().toLowerCase();
      const deliveryPartnerPhoneStr = String(orderData.deliveryPartnerPhone || orderData.riderPhone || '').trim().toLowerCase();
      const status = String(orderData.status || orderData.orderStatus || '').toUpperCase();

      const currentUserId = String(user?.id || (user as any)?.userId || '').trim().toLowerCase();
      const userEmail = String(user?.email || '').trim().toLowerCase();
      const userName = String(user?.name || '').trim().toLowerCase();
      const userPhone = String(user?.phone || (user as any)?.mobile || '').trim().toLowerCase();
      const userRole = (user?.role || '').toUpperCase();
      const userShopId = String(user?.shopId || (user as any)?.restaurantId || user?.id || '');

      const isDeliveryRole =
        userRole === 'DELIVERY_PARTNER' ||
        userRole === 'DELIVERY' ||
        userRole === 'RIDER' ||
        (currentUserId && currentUserId.startsWith('del-'));

      console.log(`🔊 [Buzzer Evaluation] Event: ${eventName}, Order: #${orderId}, Status: ${status}, Role: ${userRole}`);

      // Rule 1: Customer places order -> Shop & Admin get 30s buzzer
      if (eventName === 'order_created') {
        if (userRole === 'ADMIN') {
          buzzerService.triggerBuzzer({
            title: '🔔 New Order Placed!',
            message: `New order #${orderId} has been placed for shop ${orderData.restaurantName || orderRestId || ''}!`,
            orderId
          });
        } else if (userRole === 'SHOP' || userRole === 'RESTAURANT' || (userShopId && userShopId === orderRestId)) {
          buzzerService.triggerBuzzer({
            title: '🔔 New Order Received!',
            message: `New order #${orderId} placed for your shop! Please review & prepare.`,
            orderId
          });
        }
      }

      // Rule 2: Admin assigns delivery partner -> Delivery Partner gets 30s buzzer
      if (eventName === 'order_assigned' || (eventName === 'order_status_updated' && status === 'ASSIGNED')) {
        if (isDeliveryRole) {
          const hasRiderField = Boolean(orderDeliveryId || assignedRiderStr || deliveryPartnerEmailStr || deliveryPartnerPhoneStr);
          const isAssignedToMe =
            hasRiderField &&
            ((currentUserId && (orderDeliveryId === currentUserId || currentUserId.includes(orderDeliveryId) || orderDeliveryId.includes(currentUserId))) ||
            (userEmail && (orderDeliveryId === userEmail || deliveryPartnerEmailStr === userEmail)) ||
            (userName && (assignedRiderStr === userName || assignedRiderStr.includes(userName) || userName.includes(assignedRiderStr))) ||
            (userPhone && (deliveryPartnerPhoneStr === userPhone || deliveryPartnerPhoneStr.includes(userPhone))));

          if (isAssignedToMe) {
            buzzerService.triggerBuzzer({
              title: '🛵 New Order Assigned to You!',
              message: `Order #${orderId} has been assigned to you by Admin!`,
              orderId
            });
          }
        }
      }

      // Rule 3: Shop person clicks 'ready for pickup' -> Delivery Partner gets 30s buzzer
      if (
        eventName === 'order_ready_pickup' ||
        (eventName === 'order_status_updated' && (status === 'READY_FOR_PICKUP' || status === 'FOOD_READY' || status === 'READY'))
      ) {
        if (isDeliveryRole) {
          const hasRiderField = Boolean(orderDeliveryId || assignedRiderStr || deliveryPartnerEmailStr || deliveryPartnerPhoneStr);
          const isTargetRider =
            hasRiderField &&
            ((currentUserId && (orderDeliveryId === currentUserId || currentUserId.includes(orderDeliveryId) || orderDeliveryId.includes(currentUserId))) ||
            (userEmail && (orderDeliveryId === userEmail || deliveryPartnerEmailStr === userEmail)) ||
            (userName && (assignedRiderStr === userName || assignedRiderStr.includes(userName) || userName.includes(assignedRiderStr))) ||
            (userPhone && (deliveryPartnerPhoneStr === userPhone || deliveryPartnerPhoneStr.includes(userPhone))));

          if (isTargetRider) {
            buzzerService.triggerBuzzer({
              title: '📦 Order Ready for Pickup!',
              message: `Shop updated order #${orderId} to Ready for Pickup! Please pick up the package.`,
              orderId
            });
          }
        }
      }

      // Rule 4: Delivery partner picks up order & starts delivery ('out for delivery') -> Customer gets 30s buzzer
      if (
        (eventName === 'rider_status_updated' || eventName === 'order_status_updated') &&
        (status === 'OUT_FOR_DELIVERY' || status === 'PICKED_UP' || status === 'IN_TRANSIT')
      ) {
        const storedCustomerId = localStorage.getItem('foodway_customer_id') || localStorage.getItem('foodway_user_id') || '';
        const isMatchingCustomer =
          (currentUserId && currentUserId === orderCustomerId) ||
          (storedCustomerId && storedCustomerId === orderCustomerId);

        if (isMatchingCustomer || (!userRole && orderCustomerId)) {
          buzzerService.triggerBuzzer({
            title: '🛵 Order Out for Delivery!',
            message: `Your order #${orderId} has been picked up by the delivery partner and is on the way!`,
            orderId
          });
        }
      }
    };

    // 2. Real-Time Event Handlers -> Invalidate TanStack Query Cache & Dispatch Local Events
    const handleShopChange = (data?: any) => {
      console.log('⚡ [Real-time Sync] Shop data updated:', data);
      shopService.getPublicRestaurants(true);
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      window.dispatchEvent(new CustomEvent('foodway_restaurant_status_updated', { detail: data }));
    };

    const handleMenuChange = (data?: any) => {
      console.log('⚡ [Real-time Sync] Menu/Items updated:', data);
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      window.dispatchEvent(new CustomEvent('foodway_menu_updated', { detail: data }));
    };

    const handleOrderChange = (eventName: string, order?: any) => {
      console.log(`⚡ [Real-time Sync] Order event [${eventName}] received:`, order);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      window.dispatchEvent(new CustomEvent('foodway_order_updated', { detail: order }));

      // Evaluate role-based buzzer notification algorithm
      triggerRoleBuzzer(eventName, order);
    };

    const handlePartnerChange = (data?: any) => {
      console.log('⚡ [Real-time Sync] Partner duty updated:', data);
      queryClient.invalidateQueries({ queryKey: ['delivery-partners'] });
      window.dispatchEvent(new CustomEvent('foodway_partner_updated', { detail: data }));
    };

    const handleLocationChange = (data?: any) => {
      console.log('⚡ [Real-time Sync] Delivery location updated:', data);
      queryClient.invalidateQueries({ queryKey: ['delivery-locations'] });
      window.dispatchEvent(new CustomEvent('foodway_location_updated', { detail: data }));
    };

    const handleCMSChange = (data?: any) => {
      console.log('⚡ [Real-time Sync] Homepage CMS updated:', data);
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      queryClient.invalidateQueries({ queryKey: ['homepage'] });
      window.dispatchEvent(new CustomEvent('homepage_cms_updated', { detail: data }));
    };

    const handleCategoryChange = (data?: any) => {
      console.log('⚡ [Real-time Sync] Categories updated:', data);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      window.dispatchEvent(new CustomEvent('foodway_category_updated', { detail: data }));
    };

    const handleDeliverySettingsChange = (data?: any) => {
      console.log('⚡ [Real-time Sync] Delivery settings updated:', data);
      queryClient.invalidateQueries({ queryKey: ['delivery-settings'] });
      window.dispatchEvent(new CustomEvent('foodway_delivery_settings_updated', { detail: data }));
    };

    const handleProfileChange = (data?: any) => {
      console.log('⚡ [Real-time Sync] Profile updated:', data);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      window.dispatchEvent(new CustomEvent('foodway_profile_updated', { detail: data }));
    };

    const handleVendorItemsCancelled = (data?: any) => {
      console.log('⚡ [Real-time Sync] Vendor items cancelled:', data);
      handleOrderChange('vendor_items_cancelled', data);
      window.dispatchEvent(new CustomEvent('vendor_items_cancelled', { detail: data }));
    };

    // 3. Register Socket Event Listeners
    const unsubShopCreated = socketService.onShopCreated(handleShopChange);
    const unsubShopUpdated = socketService.onShopUpdated(handleShopChange);
    const unsubShopStatus = socketService.onShopStatusUpdated(handleShopChange);
    const unsubMenu = socketService.onMenuUpdated(handleMenuChange);
    const unsubOrderCreated = socketService.onOrderCreated((order) => handleOrderChange('order_created', order));
    const unsubOrderStatus = socketService.onOrderStatusUpdated((order) => handleOrderChange('order_status_updated', order));
    const unsubOrderPickup = socketService.onOrderReadyForPickup((order) => handleOrderChange('order_ready_pickup', order));
    const unsubOrderAssigned = socketService.onOrderAssigned((order) => handleOrderChange('order_assigned', order));
    const unsubRiderStatus = socketService.onRiderStatusUpdated((order) => handleOrderChange('rider_status_updated', order));
    const unsubPartnerDuty = socketService.onPartnerDutyUpdated(handlePartnerChange);
    const unsubLocation = socketService.onLocationUpdated(handleLocationChange);
    const unsubCMS = socketService.onCMSUpdated(handleCMSChange);
    const unsubCategory = socketService.onCategoryUpdated(handleCategoryChange);
    const unsubDeliverySettings = socketService.onDeliverySettingsUpdated(handleDeliverySettingsChange);
    const unsubProfile = socketService.onProfileUpdated(handleProfileChange);
    const unsubVendorCancelled = socketService.onVendorItemsCancelled(handleVendorItemsCancelled);

    return () => {
      unsubShopCreated();
      unsubShopUpdated();
      unsubShopStatus();
      unsubMenu();
      unsubOrderCreated();
      unsubOrderStatus();
      unsubOrderPickup();
      unsubOrderAssigned();
      unsubRiderStatus();
      unsubPartnerDuty();
      unsubLocation();
      unsubCMS();
      unsubCategory();
      unsubDeliverySettings();
      unsubProfile();
      unsubVendorCancelled();
    };
  }, [user, isAuthenticated, queryClient]);
};

export default useRealtimeSync;
