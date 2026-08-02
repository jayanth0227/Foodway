import orderRepository from '../repositories/order.repository';
import orderItemRepository from '../repositories/orderItem.repository';
import { IOrder, IOrderItem } from '../types/db.types';
import { OrderStatus } from '../types/enums';
import { generateOrderId, generateOrderItemId } from '../utils/idGenerator';

export class OrderService {
  async createOrder(data: {
    customerId: string;
    restaurantId: string;
    restaurantName?: string;
    deliveryAddress: string;
    customerName?: string;
    customerPhone?: string;
    paymentMethod?: string;
    items: Array<{ menuItemId: string; foodName: string; quantity: number; price: number }>;
    subtotal: number;
    deliveryCharge?: number;
    tax?: number;
    discount?: number;
    totalAmount: number;
  }): Promise<{ order: IOrder; orderItems: IOrderItem[] }> {
    const orderId = generateOrderId();
    const now = new Date().toISOString();

    const order: IOrder = {
      orderId,
      customerId: data.customerId,
      restaurantId: data.restaurantId,
      restaurantName: data.restaurantName || 'Partner Restaurant',
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
      items: data.items,
      orderedAt: now,
      createdAt: now,
      updatedAt: now
    };

    await orderRepository.create(order);

    const orderItems: IOrderItem[] = data.items.map((item) => ({
      orderItemId: generateOrderItemId(),
      orderId,
      menuItemId: item.menuItemId,
      foodName: item.foodName,
      quantity: Number(item.quantity),
      price: Number(item.price),
      total: Number(item.quantity) * Number(item.price)
    }));

    await orderItemRepository.createBatch(orderItems);

    return { order, orderItems };
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<IOrder[]> {
    return orderRepository.findByRestaurantId(restaurantId);
  }

  async getOrdersByCustomer(customerId: string): Promise<IOrder[]> {
    return orderRepository.findByCustomerId(customerId);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<IOrder | null> {
    return orderRepository.updateStatus(orderId, status);
  }
}

export const orderService = new OrderService();
export default orderService;
