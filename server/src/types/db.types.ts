import { UserRole, UserStatus, RestaurantStatus, MenuStatus, OrderStatus, PaymentStatus } from './enums';

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

export interface IRestaurant {
  restaurantId: string;
  ownerUserId: string; // References foodway-users.userId
  restaurantName: string;
  description?: string;
  phone?: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  openingTime?: string;
  closingTime?: string;
  logo?: string;
  bannerImage?: string;
  status: RestaurantStatus;
  rating?: number;
  isOpen?: boolean;
  cuisine?: string;
  fcmToken?: string;
  lastTokenUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMenuItem {
  menuItemId: string;
  restaurantId: string; // References foodway-restaurants.restaurantId
  foodName: string;
  description?: string;
  category: string;
  price: number;
  discountPrice?: number;
  foodImage?: string;
  isVeg: boolean;
  isAvailable: boolean;
  status: MenuStatus;
  preparationTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOrder {
  orderId: string;
  customerId: string; // References foodway-users.userId
  customerEmail: string;
  restaurantId: string; // References foodway-restaurants.restaurantId
  restaurantName?: string;
  items?: any[];
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

export interface IOrderItem {
  orderItemId: string;
  orderId: string; // References foodway-orders.orderId
  menuItemId: string; // References foodway-menu-items.menuItemId
  foodName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface IDelivery {
  deliveryId: string;
  orderId: string; // References foodway-orders.orderId
  deliveryUserId: string; // References foodway-users.userId
  pickupTime?: string;
  deliveryTime?: string;
  deliveryStatus: OrderStatus;
  remarks?: string;
  fcmToken?: string;
  lastTokenUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}
