import { GetCommand, PutCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, deliveryTableName } from '../config/aws';
import { IDelivery } from '../types/db.types';
import { OrderStatus } from '../types/enums';

export class DeliveryRepository {
  async findByDeliveryId(deliveryId: string): Promise<IDelivery | null> {
    try {
      const command = new GetCommand({
        TableName: deliveryTableName,
        Key: { deliveryId }
      });
      const response = await dynamoDocClient.send(command);
      return (response.Item as IDelivery) || null;
    } catch (error) {
      console.error(`Error in DeliveryRepository.findByDeliveryId(${deliveryId}):`, error);
      return null;
    }
  }

  async findByOrderId(orderId: string): Promise<IDelivery | null> {
    try {
      try {
        const queryCommand = new QueryCommand({
          TableName: deliveryTableName,
          IndexName: 'orderId-index',
          KeyConditionExpression: 'orderId = :ordId',
          ExpressionAttributeValues: { ':ordId': orderId }
        });
        const queryResp = await dynamoDocClient.send(queryCommand);
        if (queryResp.Items && queryResp.Items.length > 0) {
          return queryResp.Items[0] as IDelivery;
        }
      } catch (e) {
        // Fallback to Scan
      }

      const scanCommand = new ScanCommand({
        TableName: deliveryTableName,
        FilterExpression: 'orderId = :ordId',
        ExpressionAttributeValues: { ':ordId': orderId }
      });
      const response = await dynamoDocClient.send(scanCommand);
      return response.Items && response.Items.length > 0 ? (response.Items[0] as IDelivery) : null;
    } catch (error) {
      console.error(`Error in DeliveryRepository.findByOrderId(${orderId}):`, error);
      return null;
    }
  }

  async findByDeliveryUserId(deliveryUserId: string): Promise<IDelivery[]> {
    try {
      try {
        const queryCommand = new QueryCommand({
          TableName: deliveryTableName,
          IndexName: 'deliveryUserId-index',
          KeyConditionExpression: 'deliveryUserId = :userId',
          ExpressionAttributeValues: { ':userId': deliveryUserId }
        });
        const queryResp = await dynamoDocClient.send(queryCommand);
        if (queryResp.Items) {
          return queryResp.Items as IDelivery[];
        }
      } catch (e) {
        // Fallback to Scan
      }

      const scanCommand = new ScanCommand({
        TableName: deliveryTableName,
        FilterExpression: 'deliveryUserId = :userId',
        ExpressionAttributeValues: { ':userId': deliveryUserId }
      });
      const response = await dynamoDocClient.send(scanCommand);
      return (response.Items as IDelivery[]) || [];
    } catch (error) {
      console.error(`Error in DeliveryRepository.findByDeliveryUserId(${deliveryUserId}):`, error);
      return [];
    }
  }

  async create(delivery: IDelivery): Promise<IDelivery> {
    const command = new PutCommand({
      TableName: deliveryTableName,
      Item: delivery
    });
    await dynamoDocClient.send(command);
    return delivery;
  }

  async updateStatus(deliveryId: string, status: OrderStatus, remarks?: string): Promise<IDelivery | null> {
    const existing = await this.findByDeliveryId(deliveryId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: IDelivery = {
      ...existing,
      deliveryStatus: status,
      remarks: remarks || existing.remarks,
      updatedAt: now
    };

    if (status === 'PICKED_UP') updated.pickupTime = now;
    if (status === 'DELIVERED') updated.deliveryTime = now;

    const command = new PutCommand({
      TableName: deliveryTableName,
      Item: updated
    });
    await dynamoDocClient.send(command);
    return updated;
  }
}

export const deliveryRepository = new DeliveryRepository();
export default deliveryRepository;
