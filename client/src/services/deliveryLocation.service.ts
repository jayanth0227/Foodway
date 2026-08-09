import api from './api';
import type { DeliveryLocation, CreateLocationDTO, UpdateLocationDTO, DeliveryLocationStatus } from '../types/deliveryLocation';


export const deliveryLocationService = {
  // Public Endpoint: Get active delivery locations for Home Page
  async getPublicLocations(): Promise<DeliveryLocation[]> {
    const response = await api.get('/delivery-locations');
    return response.data?.locations || [];
  },

  // Admin Endpoint: Get all delivery locations (with optional search/status filters)
  async getAdminLocations(params?: { search?: string; status?: DeliveryLocationStatus; region?: string }): Promise<DeliveryLocation[]> {
    const response = await api.get('/admin/delivery-locations', { params });
    return response.data?.locations || [];
  },

  // Admin Endpoint: Get single location by ID
  async getLocationById(id: string): Promise<DeliveryLocation> {
    const response = await api.get(`/admin/delivery-locations/${id}`);
    return response.data?.location;
  },

  // Admin Endpoint: Create location
  async createLocation(data: CreateLocationDTO): Promise<DeliveryLocation> {
    const response = await api.post('/admin/delivery-locations', data);
    return response.data?.location;
  },

  // Admin Endpoint: Update location details
  async updateLocation(id: string, data: UpdateLocationDTO): Promise<DeliveryLocation> {
    const response = await api.put(`/admin/delivery-locations/${id}`, data);
    return response.data?.location;
  },

  // Admin Endpoint: Toggle location active/inactive status
  async updateLocationStatus(id: string, status: DeliveryLocationStatus): Promise<DeliveryLocation> {
    const response = await api.patch(`/admin/delivery-locations/${id}/status`, { status });
    return response.data?.location;
  },

  // Admin Endpoint: Delete location
  async deleteLocation(id: string): Promise<boolean> {
    const response = await api.delete(`/admin/delivery-locations/${id}`);
    return response.data?.success || false;
  },
};

export default deliveryLocationService;
