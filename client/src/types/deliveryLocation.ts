export type DeliveryLocationStatus = 'ACTIVE' | 'INACTIVE';

export interface DeliveryLocation {
  locationId: string;
  name: string;
  region: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  status: DeliveryLocationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationDTO {
  name: string;
  region: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  status?: DeliveryLocationStatus;
}

export interface UpdateLocationDTO {
  name?: string;
  region?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  status?: DeliveryLocationStatus;
}
