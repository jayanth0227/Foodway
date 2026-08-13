export type UserRole = 'ADMIN' | 'SHOP' | 'RESTAURANT' | 'USER' | 'DELIVERY_PARTNER' | 'DELIVERY';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type ShopStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type RestaurantStatus = ShopStatus; // Backward-compatibility alias

export type ItemStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type MenuStatus = ItemStatus; // Backward-compatibility alias

export type ShopType =
  | 'FOOD'
  | 'SWEETS'
  | 'GROCERY'
  | 'FRUITS_VEGETABLES'
  | 'DAIRY'
  | 'BEVERAGES'
  | 'GENERAL_STORE';

export type UnitType =
  | 'g'
  | 'kg'
  | 'mg'
  | 'ml'
  | 'L'
  | 'pcs'
  | 'piece'
  | 'dozen'
  | 'pack'
  | 'box'
  | 'bottle'
  | 'packet';

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

