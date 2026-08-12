import { UserRole } from '../types/enums';

export const generateUserId = (role: UserRole): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  switch (role) {
    case 'ADMIN':
      return `ADM-${timestamp}${random}`;
    case 'SHOP':
    case 'RESTAURANT':
      return `SHPUSR-${timestamp}${random}`;
    case 'DELIVERY_PARTNER':
    case 'DELIVERY':
      return `DEL-${timestamp}${random}`;
    case 'USER':
    default:
      return `USR-${timestamp}${random}`;
  }
};

export const generateShopId = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `SHP-${timestamp}${random}`;
};
export const generateRestaurantId = generateShopId; // Backward compatibility alias

export const generateItemId = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `ITM-${timestamp}${random}`;
};
export const generateMenuItemId = generateItemId; // Backward compatibility alias

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
