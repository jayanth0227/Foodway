import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import socketService from '../services/socket.service';
import { useAuth } from '../context/AuthContext';
import shopService from '../services/shop.service';

export const useRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // 1. Establish socket connection & join user's role/id rooms
    const socket = socketService.connect();

    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        socketService.joinAdmin();
      }
      if (user.role === 'SHOP' || user.role === 'RESTAURANT' || user.shopId) {
        socketService.joinRestaurant(user.shopId || user.id);
      }
      if (user.role === 'DELIVERY_PARTNER') {
        socketService.joinDelivery(user.id);
      }
      socketService.joinCustomer(user.id);
    }

    // 2. Real-Time Event Handlers -> Invalidate TanStack Query Cache & Dispatch Local Events
    const handleShopChange = (data?: any) => {
      console.log('⚡ [Real-time Sync] Shop data updated:', data);
      shopService.getPublicRestaurants(true); // Force refresh shopService in-memory cache
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

    const handleOrderChange = (order?: any) => {
      console.log('⚡ [Real-time Sync] Order updated:', order);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      window.dispatchEvent(new CustomEvent('foodway_order_updated', { detail: order }));
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
      handleOrderChange(data);
      window.dispatchEvent(new CustomEvent('vendor_items_cancelled', { detail: data }));
    };

    // 3. Register Socket Event Listeners
    const unsubShopCreated = socketService.onShopCreated(handleShopChange);
    const unsubShopUpdated = socketService.onShopUpdated(handleShopChange);
    const unsubShopStatus = socketService.onShopStatusUpdated(handleShopChange);
    const unsubMenu = socketService.onMenuUpdated(handleMenuChange);
    const unsubOrderCreated = socketService.onOrderCreated(handleOrderChange);
    const unsubOrderStatus = socketService.onOrderStatusUpdated(handleOrderChange);
    const unsubOrderPickup = socketService.onOrderReadyForPickup(handleOrderChange);
    const unsubOrderAssigned = socketService.onOrderAssigned(handleOrderChange);
    const unsubRiderStatus = socketService.onRiderStatusUpdated(handleOrderChange);
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
