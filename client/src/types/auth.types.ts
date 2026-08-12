export type Role = 'ADMIN' | 'SHOP' | 'RESTAURANT' | 'USER' | 'DELIVERY_PARTNER';

export type ShopType =
  | 'FOOD'
  | 'SWEETS'
  | 'GROCERY'
  | 'FRUITS_VEGETABLES'
  | 'DAIRY'
  | 'BEVERAGES'
  | 'GENERAL_STORE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  shopId?: string;
  restaurantId?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
  expiresIn?: number;
  error?: string;
}

export interface AuthState {
  user: User | null;
  role: Role | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  shopId: string | null;
  restaurantId: string | null;
  userId: string | null;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}
