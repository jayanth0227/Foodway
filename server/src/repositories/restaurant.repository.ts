import { GetCommand, PutCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, restaurantsTableName } from '../config/aws';
import { IRestaurant } from '../types/db.types';

export class RestaurantRepository {
  async findByRestaurantId(restaurantId: string): Promise<IRestaurant | null> {
    try {
      const command = new GetCommand({
        TableName: restaurantsTableName,
        Key: { restaurantId }
      });
      const response = await dynamoDocClient.send(command);
      return (response.Item as IRestaurant) || null;
    } catch (error) {
      console.error(`Error in RestaurantRepository.findByRestaurantId(${restaurantId}):`, error);
      return null;
    }
  }

  async findByOwnerUserId(ownerUserId: string): Promise<IRestaurant | null> {
    try {
      try {
        const queryCommand = new QueryCommand({
          TableName: restaurantsTableName,
          IndexName: 'ownerUserId-index',
          KeyConditionExpression: 'ownerUserId = :ownerId',
          ExpressionAttributeValues: { ':ownerId': ownerUserId }
        });
        const queryResp = await dynamoDocClient.send(queryCommand);
        if (queryResp.Items && queryResp.Items.length > 0) {
          return queryResp.Items[0] as IRestaurant;
        }
      } catch (e) {
        // Fallback to scan
      }

      const scanCommand = new ScanCommand({
        TableName: restaurantsTableName,
        FilterExpression: 'ownerUserId = :ownerId',
        ExpressionAttributeValues: { ':ownerId': ownerUserId }
      });
      const scanResp = await dynamoDocClient.send(scanCommand);
      return scanResp.Items && scanResp.Items.length > 0 ? (scanResp.Items[0] as IRestaurant) : null;
    } catch (error) {
      console.error(`Error in RestaurantRepository.findByOwnerUserId(${ownerUserId}):`, error);
      return null;
    }
  }

  async findByEmail(email: string): Promise<IRestaurant | null> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const scanCommand = new ScanCommand({
        TableName: restaurantsTableName
      });
      const scanResp = await dynamoDocClient.send(scanCommand);
      if (scanResp.Items && scanResp.Items.length > 0) {
        const found = scanResp.Items.find(
          (item: any) => item.email && item.email.trim().toLowerCase() === cleanEmail
        );
        return (found as IRestaurant) || null;
      }
      return null;
    } catch (error) {
      console.error(`Error in RestaurantRepository.findByEmail(${email}):`, error);
      return null;
    }
  }

  async create(restaurant: IRestaurant): Promise<IRestaurant> {
    const command = new PutCommand({
      TableName: restaurantsTableName,
      Item: restaurant
    });
    await dynamoDocClient.send(command);
    return restaurant;
  }

  async update(restaurantId: string, updates: Partial<IRestaurant>): Promise<IRestaurant | null> {
    const existing = await this.findByRestaurantId(restaurantId);
    if (!existing) return null;

    const updated: IRestaurant = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const command = new PutCommand({
      TableName: restaurantsTableName,
      Item: updated
    });
    await dynamoDocClient.send(command);
    return updated;
  }

  async findAll(): Promise<IRestaurant[]> {
    try {
      const command = new ScanCommand({ TableName: restaurantsTableName });
      const response = await dynamoDocClient.send(command);
      return (response.Items as IRestaurant[]) || [];
    } catch (error) {
      console.error('Error scanning RestaurantRepository:', error);
      return [];
    }
  }
}

export const restaurantRepository = new RestaurantRepository();
export default restaurantRepository;
