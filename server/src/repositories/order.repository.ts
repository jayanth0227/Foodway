import { GetCommand, PutCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, ordersTableName } from '../config/aws';
import { IOrder } from '../types/db.types';
import { OrderStatus } from '../types/enums';

export class OrderRepository {
  async findByOrderId(orderId: string): Promise<IOrder | null> {
    try {
      const command = new GetCommand({
        TableName: ordersTableName,
        Key: { orderId }
      });
      const response = await dynamoDocClient.send(command);
      return (response.Item as IOrder) || null;
    } catch (error) {
      console.error(`Error in OrderRepository.findByOrderId(${orderId}):`, error);
      return null;
    }
  }

  async findByRestaurantId(restaurantId: string): Promise<IOrder[]> {
    try {
      if (restaurantId === 'all') {
        const scanCommand = new ScanCommand({
          TableName: ordersTableName
        });
        const response = await dynamoDocClient.send(scanCommand);
        return (response.Items as IOrder[]) || [];
      }
      try {
        const queryCommand = new QueryCommand({
          TableName: ordersTableName,
          IndexName: 'restaurantId-index',
          KeyConditionExpression: 'restaurantId = :resId',
          ExpressionAttributeValues: { ':resId': restaurantId }
        });
        const queryResp = await dynamoDocClient.send(queryCommand);
        if (queryResp.Items) {
          return queryResp.Items as IOrder[];
        }
      } catch (e) {
        // Fallback to Scan
      }

      const scanCommand = new ScanCommand({
        TableName: ordersTableName,
        FilterExpression: 'restaurantId = :resId',
        ExpressionAttributeValues: { ':resId': restaurantId }
      });
      const response = await dynamoDocClient.send(scanCommand);
      return (response.Items as IOrder[]) || [];
    } catch (error) {
      console.error(`Error in OrderRepository.findByRestaurantId(${restaurantId}):`, error);
      return [];
    }
  }

  async findByCustomerId(customerId: string): Promise<IOrder[]> {
    try {
      try {
        const queryCommand = new QueryCommand({
          TableName: ordersTableName,
          IndexName: 'customerId-index',
          KeyConditionExpression: 'customerId = :custId',
          ExpressionAttributeValues: { ':custId': customerId }
        });
        const queryResp = await dynamoDocClient.send(queryCommand);
        if (queryResp.Items) {
          return queryResp.Items as IOrder[];
        }
      } catch (e) {
        // Fallback to Scan
      }

      const scanCommand = new ScanCommand({
        TableName: ordersTableName,
        FilterExpression: 'customerId = :custId',
        ExpressionAttributeValues: { ':custId': customerId }
      });
      const response = await dynamoDocClient.send(scanCommand);
      return (response.Items as IOrder[]) || [];
    } catch (error) {
      console.error(`Error in OrderRepository.findByCustomerId(${customerId}):`, error);
      return [];
    }
  }

  async create(order: IOrder): Promise<IOrder> {
    const command = new PutCommand({
      TableName: ordersTableName,
      Item: order
    });
    await dynamoDocClient.send(command);
    return order;
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<IOrder | null> {
    const existing = await this.findByOrderId(orderId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const timeUpdates: Partial<IOrder> = {
      status,
      updatedAt: now
    };

    if (status === 'ACCEPTED') timeUpdates.acceptedAt = now;
    if (status === 'PREPARING') timeUpdates.preparedAt = now;
    if (status === 'PICKED_UP') timeUpdates.pickedUpAt = now;
    if (status === 'DELIVERED') timeUpdates.deliveredAt = now;

    const updated: IOrder = {
      ...existing,
      ...timeUpdates
    };

    const command = new PutCommand({
      TableName: ordersTableName,
      Item: updated
    });
    await dynamoDocClient.send(command);
    return updated;
  }

  async findAll(): Promise<IOrder[]> {
    try {
      const command = new ScanCommand({ TableName: ordersTableName });
      const response = await dynamoDocClient.send(command);
      return (response.Items as IOrder[]) || [];
    } catch (error) {
      console.error('Error scanning OrderRepository:', error);
      return [];
    }
  }
}

export const orderRepository = new OrderRepository();
export default orderRepository;
