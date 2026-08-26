export interface ShopEventPayload {
  shopId: string;
  shopName?: string;
  isOpen?: boolean;
  status?: string;
  shop?: any;
}

export interface ItemEventPayload {
  itemId: string;
  shopId: string;
  item?: any;
  deletedId?: string;
}

export interface OrderEventPayload {
  orderId: string;
  customerId: string;
  restaurantId: string;
  status: string;
  order?: any;
}

export interface DeliveryEventPayload {
  deliveryId?: string;
  orderId?: string;
  deliveryUserId?: string;
  status?: string;
}

export interface LocationEventPayload {
  locationId: string;
  name?: string;
  status?: string;
}
