export type Role = 'ADMIN' | 'RESTAURANT' | 'USER' | 'DELIVERY_PARTNER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
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
  restaurantId: string | null;
  userId: string | null;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  targetRole?: string;
}
