import deliveryRepository from '../repositories/delivery.repository';
import orderRepository from '../repositories/order.repository';
import { IDelivery } from '../types/db.types';
import { OrderStatus } from '../types/enums';
import { generateDeliveryId } from '../utils/idGenerator';

export class DeliveryService {
  async assignDelivery(orderId: string, deliveryUserId: string): Promise<IDelivery> {
    const deliveryId = generateDeliveryId();
    const now = new Date().toISOString();

    const delivery: IDelivery = {
      deliveryId,
      orderId,
      deliveryUserId,
      deliveryStatus: 'ASSIGNED',
      createdAt: now,
      updatedAt: now
    };

    await deliveryRepository.create(delivery);
    await orderRepository.updateStatus(orderId, 'ASSIGNED');

    return delivery;
  }

  async getDeliveryByOrder(orderId: string): Promise<IDelivery | null> {
    return deliveryRepository.findByOrderId(orderId);
  }

  async getDeliveriesForUser(deliveryUserId: string): Promise<IDelivery[]> {
    return deliveryRepository.findByDeliveryUserId(deliveryUserId);
  }

  async updateDeliveryStatus(deliveryId: string, status: OrderStatus, remarks?: string): Promise<IDelivery | null> {
    const updated = await deliveryRepository.updateStatus(deliveryId, status, remarks);
    if (updated) {
      await orderRepository.updateStatus(updated.orderId, status);
    }
    return updated;
  }
}

export const deliveryService = new DeliveryService();
export default deliveryService;
