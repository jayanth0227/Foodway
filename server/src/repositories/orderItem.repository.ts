import { PutCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, orderItemsTableName } from '../config/aws';
import { IOrderItem } from '../types/db.types';

export class OrderItemRepository {
  async findByOrderId(orderId: string): Promise<IOrderItem[]> {
    try {
      try {
        const queryCommand = new QueryCommand({
          TableName: orderItemsTableName,
          IndexName: 'orderId-index',
          KeyConditionExpression: 'orderId = :ordId',
          ExpressionAttributeValues: { ':ordId': orderId }
        });
        const queryResp = await dynamoDocClient.send(queryCommand);
        if (queryResp.Items) {
          return queryResp.Items as IOrderItem[];
        }
      } catch (e) {
        // Fallback to Scan
      }

      const scanCommand = new ScanCommand({
        TableName: orderItemsTableName,
        FilterExpression: 'orderId = :ordId',
        ExpressionAttributeValues: { ':ordId': orderId }
      });
      const response = await dynamoDocClient.send(scanCommand);
      return (response.Items as IOrderItem[]) || [];
    } catch (error) {
      console.error(`Error in OrderItemRepository.findByOrderId(${orderId}):`, error);
      return [];
    }
  }

  async createBatch(items: IOrderItem[]): Promise<IOrderItem[]> {
    const promises = items.map((item) => {
      const command = new PutCommand({
        TableName: orderItemsTableName,
        Item: item
      });
      return dynamoDocClient.send(command);
    });

    await Promise.all(promises);
    return items;
  }
}

export const orderItemRepository = new OrderItemRepository();
export default orderItemRepository;
