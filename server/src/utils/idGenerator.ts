import { UserRole } from '../types/enums';

export const generateUserId = (role: UserRole): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  switch (role) {
    case 'ADMIN':
      return `ADM-${timestamp}${random}`;
    case 'RESTAURANT':
      return `RESUSR-${timestamp}${random}`;
    case 'DELIVERY_PARTNER':
    case 'DELIVERY':
      return `DEL-${timestamp}${random}`;
    case 'USER':
    default:
      return `USR-${timestamp}${random}`;
  }
};

export const generateRestaurantId = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `RES-${timestamp}${random}`;
};

export const generateMenuItemId = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `MENU-${timestamp}${random}`;
};

export const generateOrderId = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `ORD-${timestamp}${random}`;
};

export const generateOrderItemId = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `ITEM-${timestamp}${random}`;
};

export const generateDeliveryId = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `DELIV-${timestamp}${random}`;
};
