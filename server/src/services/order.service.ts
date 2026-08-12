import orderRepository from '../repositories/order.repository';
import orderItemRepository from '../repositories/orderItem.repository';
import { IOrder, IOrderItem } from '../types/db.types';
import { OrderStatus } from '../types/enums';
import { generateOrderId, generateOrderItemId } from '../utils/idGenerator';
import notificationService from './notification.service';
import socketService from './socket.service';

export class OrderService {
  async createOrder(data: {
    customerId: string;
    customerEmail: string;
    shopId?: string;
    restaurantId?: string;
    shopName?: string;
    restaurantName?: string;
    deliveryAddress: string;
    customerName?: string;
    customerPhone?: string;
    paymentMethod?: string;
    items: Array<{
      itemId?: string;
      menuItemId?: string;
      itemName?: string;
      foodName?: string;
      variantId?: string;
      variantLabel?: string;
      unit?: string;
      quantity: number;
      price?: number;
      unitPrice?: number;
    }>;
    subtotal: number;
    deliveryCharge?: number;
    tax?: number;
    discount?: number;
    totalAmount: number;
  }): Promise<{ order: IOrder; orderItems: IOrderItem[] }> {
    const orderId = generateOrderId();
    const now = new Date().toISOString();
    const targetShopId = data.shopId || data.restaurantId || '';
    const targetShopName = data.shopName || data.restaurantName || 'Partner Shop';

    const orderItems: IOrderItem[] = data.items.map((item) => {
      const itmId = item.itemId || item.menuItemId || '';
      const itmName = item.itemName || item.foodName || 'Item';
      const uPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(item.price || 0);
      const qty = Number(item.quantity || 1);

      return {
        orderItemId: generateOrderItemId(),
        orderId,
        itemId: itmId,
        menuItemId: itmId,
        itemName: itmName,
        foodName: itmName,
        variantId: item.variantId || '',
        variantLabel: item.variantLabel || '',
        unit: item.unit || '',
        quantity: qty,
        price: uPrice,
        total: qty * uPrice
      };
    });

    const order: IOrder = {
      orderId,
      customerId: data.customerId,
      customerEmail: data.customerEmail,
      shopId: targetShopId,
      restaurantId: targetShopId,
      shopName: targetShopName,
      restaurantName: targetShopName,
      paymentMethod: data.paymentMethod || 'Online Payment',
      paymentStatus: 'SUCCESS',
      subtotal: Number(data.subtotal),
      deliveryCharge: Number(data.deliveryCharge || 0),
      tax: Number(data.tax || 0),
      discount: Number(data.discount || 0),
      totalAmount: Number(data.totalAmount),
      status: 'PENDING',
      deliveryAddress: data.deliveryAddress,
      customerName: data.customerName || 'Valued Customer',
      customerPhone: data.customerPhone || '',
      items: orderItems as any[],
      orderedAt: now,
      createdAt: now,
      updatedAt: now
    };

    await orderRepository.create(order);
    await orderItemRepository.createBatch(orderItems);

    // Phase 1 Real-Time Trigger: Emit Socket.io event to Merchant room
    try {
      socketService.emitOrderCreated(order);
    } catch (e) {
      console.warn('Socket emit error (non-blocking):', e);
    }

    // Phase 1 Push Notification Trigger: Send FCM push to Merchant
    void notificationService.notifyMerchantNewOrder({
      orderId: order.orderId,
      restaurantId: order.shopId,
      customerName: order.customerName || 'Valued Customer',
      totalAmount: order.totalAmount,
      itemsCount: orderItems.length,
    });

    return { order, orderItems };
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<IOrder[]> {
    return orderRepository.findByRestaurantId(restaurantId);
  }

  async getOrdersByCustomer(customerId: string): Promise<IOrder[]> {
    return orderRepository.findByCustomerId(customerId);
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    cancelledByRole?: 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY'
  ): Promise<IOrder | null> {
    const updated = await orderRepository.updateStatus(orderId, status);

    if (updated) {
      // Real-Time Socket Emissions for Phase 2, Phase 3, Phase 4
      try {
        if (status === 'READY') {
          socketService.emitOrderReadyForPickup(updated);
          socketService.emitOrderStatusUpdated(updated);
        } else if (status === 'ASSIGNED' || status === 'PICKED_UP' || status === 'DELIVERED') {
          socketService.emitRiderStatusUpdated(updated);
        } else {
          socketService.emitOrderStatusUpdated(updated);
        }
      } catch (e) {
        console.warn('Socket status emit error (non-blocking):', e);
      }

      const sId = updated.shopId || updated.restaurantId || '';

      // FCM Push Notifications (Single non-duplicate triggers per event)
      if (status === 'CANCELLED') {
        void notificationService.notifyOrderCancelled({
          orderId: updated.orderId,
          customerId: updated.customerId,
          restaurantId: sId,
          cancelledBy: cancelledByRole || 'RESTAURANT',
        });
      } else {
        void notificationService.notifyCustomerOrderStatus({
          orderId: updated.orderId,
          customerId: updated.customerId,
          customerEmail: updated.customerEmail,
          restaurantName: updated.shopName || updated.restaurantName || 'Partner Shop',
          status: updated.status,
        });

        if (status === 'READY') {
          void notificationService.notifyDeliveryPartnersPickupAvailable({
            orderId: updated.orderId,
            restaurantId: sId,
            restaurantName: updated.shopName || updated.restaurantName || 'Partner Shop',
          });
        } else if (status === 'DELIVERED') {
          void notificationService.notifyDeliveryCompleted({
            orderId: updated.orderId,
            restaurantId: sId,
          });
        }
      }
    }

    return updated;
  }
}

export const orderService = new OrderService();
export default orderService;
