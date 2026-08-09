export type DeliveryLocationStatus = 'ACTIVE' | 'INACTIVE';

export interface IDeliveryLocation {
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

export interface CreateDeliveryLocationDTO {
  name: string;
  region: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  status?: DeliveryLocationStatus;
}

export interface UpdateDeliveryLocationDTO {
  name?: string;
  region?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  status?: DeliveryLocationStatus;
}
