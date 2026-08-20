import { GetCommand, PutCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, usersTableName } from '../config/aws';
import { IUser } from '../types/db.types';

export class UserRepository {
async findByUserId(userId: string): Promise<IUser | null> {
  try {
    // Since the table partition key is "email",
    // search by userId using Scan.
    const command = new ScanCommand({
      TableName: usersTableName,
      FilterExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    });

    const response = await dynamoDocClient.send(command);

    if (response.Items && response.Items.length > 0) {
      return response.Items[0] as IUser;
    }

    return null;
  } catch (error) {
    console.error(`Error in UserRepository.findByUserId(${userId}):`, error);
    return null;
  }
}

  async findByIdentifier(identifier: string): Promise<IUser | null> {
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return null;
    }
    const cleanId = identifier.trim().toLowerCase();
    const digitsOnly = cleanId.replace(/\D/g, '');

    // 1. Try finding by email first
    const byEmail = await this.findByEmail(cleanId);
    if (byEmail) return byEmail;

    // 2. Try finding by phone number matching
    try {
      const allUsers = await this.scan();
      const foundByPhone = allUsers.find((u: IUser) => {
        if (!u.phone) return false;
        const userPhoneDigits = u.phone.replace(/\D/g, '');
        if (digitsOnly.length >= 7 && userPhoneDigits.length >= 7) {
          return userPhoneDigits === digitsOnly || userPhoneDigits.endsWith(digitsOnly) || digitsOnly.endsWith(userPhoneDigits);
        }
        return u.phone.trim().toLowerCase() === cleanId;
      });
      return foundByPhone || null;
    } catch (error) {
      console.error(`Error in UserRepository.findByIdentifier(${identifier}):`, error);
      return null;
    }
  }

  async findByEmail(email: string): Promise<IUser | null> {
    if (!email || typeof email !== 'string' || !email.trim()) {
      return null;
    }
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
