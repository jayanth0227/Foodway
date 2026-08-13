import { UserRole, UserStatus, ShopStatus, ShopType, ItemStatus, UnitType, OrderStatus, PaymentStatus } from './enums';

export interface IUser {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  password: string; // bcrypt hash
  status: UserStatus;
  profileImage?: string;
  fcmToken?: string;
  lastTokenUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IShop {
  shopId: string;
  restaurantId?: string; // Backward compatibility alias
  ownerUserId: string; // References foodway-users.userId
  shopName: string;
  restaurantName?: string; // Backward compatibility alias
  shopType: ShopType;
  description?: string;
  phone?: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  openingTime?: string;
  closingTime?: string;
  logo?: string;
  bannerImage?: string;
  status: ShopStatus;
  rating?: number;
  isOpen?: boolean;
  cuisine?: string;
  fcmToken?: string;
  lastTokenUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IRestaurant extends IShop { } // Backward compatibility type alias

export interface IItemVariant {
  variantId: string;
  id?: string;
  quantity: number | string;
  unit: UnitType | string;
  price: number;
  compareAtPrice?: number;
  isAvailable?: boolean;
  label?: string; // e.g. "250 g", "1 kg", "6 pcs"
}

export interface IItem {
  itemId: string;
  menuItemId?: string; // Backward compatibility alias
  shopId: string; // References foodway-shops.shopId
  restaurantId?: string; // Backward compatibility alias
  name: string;
  foodName?: string; // Backward compatibility alias
  description?: string;
  categoryId?: string;
  category: string;
  image?: string;
  foodImage?: string; // Backward compatibility alias
  price?: number; // Base or default price fallback
  discountPrice?: number;
  isVeg?: boolean;
  isAvailable: boolean;
  status: ItemStatus;
  variants: IItemVariant[];
  preparationTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMenuItem extends IItem { } // Backward compatibility type alias

export interface IOrder {
  orderId: string;
  parentOrderId?: string;
  customerId: string; // References foodway-users.userId
  customerEmail: string;
  shopId: string; // References foodway-shops.shopId
  restaurantId?: string; // Backward compatibility alias
  shopName?: string;
  restaurantName?: string; // Backward compatibility alias
  items?: IOrderItemDetail[];
  rawItems?: any[];
  deliveryUserId?: string; // References foodway-users.userId
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  subtotal: number;
  deliveryCharge: number;
  tax: number;
  discount: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryAddress: string;
  customerName?: string;
  customerPhone?: string;
  orderedAt: string;
  acceptedAt?: string;
  preparedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOrderItemDetail {
  itemId: string;
  itemName: string;
  variantId?: string;
  variantLabel?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IOrderItem {
  orderItemId: string;
  orderId: string;
  itemId: string;
  menuItemId?: string;
  itemName: string;
  foodName?: string;
  variantId?: string;
  variantLabel?: string;
  unit?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface IDelivery {
  deliveryId: string;
  orderId: string;
  deliveryUserId: string;
  pickupTime?: string;
  deliveryTime?: string;
  deliveryStatus: OrderStatus;
  remarks?: string;
  fcmToken?: string;
  lastTokenUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

