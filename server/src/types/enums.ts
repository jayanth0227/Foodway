export type UserRole = 'ADMIN' | 'RESTAURANT' | 'USER' | 'DELIVERY_PARTNER' | 'DELIVERY';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type RestaurantStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type MenuStatus = 'AVAILABLE' | 'UNAVAILABLE';

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
