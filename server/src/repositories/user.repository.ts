import { GetCommand, PutCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, usersTableName } from '../config/aws';
import { IUser } from '../types/db.types';

export class UserRepository {
  async findByUserId(userId: string): Promise<IUser | null> {
    try {
      const command = new GetCommand({
        TableName: usersTableName,
        Key: { userId }
      });
      const response = await dynamoDocClient.send(command);
      return (response.Item as IUser) || null;
    } catch (error) {
      console.error(`Error in UserRepository.findByUserId(${userId}):`, error);
      return null;
    }
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      // 1. Try Querying GSI 'email-index'
      try {
        const queryCommand = new QueryCommand({
          TableName: usersTableName,
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: { ':email': cleanEmail }
        });
        const queryResp = await dynamoDocClient.send(queryCommand);
        if (queryResp.Items && queryResp.Items.length > 0) {
          return queryResp.Items[0] as IUser;
        }
      } catch (err) {
        // Fall back to Scan if GSI is indexing or not available
      }

      // 2. Scan fallback
      const scanCommand = new ScanCommand({
        TableName: usersTableName
      });
      const response = await dynamoDocClient.send(scanCommand);
      if (response.Items && response.Items.length > 0) {
        const found = response.Items.find(
          (item: any) => item.email && item.email.trim().toLowerCase() === cleanEmail
        );
        return (found as IUser) || null;
      }
      return null;
    } catch (error) {
      console.error(`Error in UserRepository.findByEmail(${email}):`, error);
      return null;
    }
  }

  async create(user: IUser): Promise<IUser> {
    const command = new PutCommand({
      TableName: usersTableName,
      Item: user
    });
    await dynamoDocClient.send(command);
    return user;
  }

  async update(userId: string, updates: Partial<IUser>): Promise<IUser | null> {
    const existing = await this.findByUserId(userId);
    if (!existing) return null;

    const updatedUser: IUser = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const command = new PutCommand({
      TableName: usersTableName,
      Item: updatedUser
    });
    await dynamoDocClient.send(command);
    return updatedUser;
  }

  async scan(): Promise<IUser[]> {
    try {
      const command = new ScanCommand({ TableName: usersTableName });
      const response = await dynamoDocClient.send(command);
      return (response.Items as IUser[]) || [];
    } catch (error) {
      console.error('Error scanning UserRepository:', error);
      return [];
    }
  }
}

export const userRepository = new UserRepository();
export default userRepository;
