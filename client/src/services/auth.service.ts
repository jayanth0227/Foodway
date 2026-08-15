import api from './api';
import type { AuthResponse, LoginCredentials } from '../types/auth.types';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  getCurrentUser: async (): Promise<AuthResponse> => {
    const response = await api.get<AuthResponse>('/auth/me');
    return response.data;
  },

  register: async (userData: { name: string; email: string; password?: string; phone?: string }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  updateProfile: async (userData: { name?: string; email?: string; phone?: string; profileImage?: string; addresses?: any[] }): Promise<AuthResponse> => {
    const response = await api.put<AuthResponse>('/auth/profile', userData);
    return response.data;
  }
};

export default authService;
