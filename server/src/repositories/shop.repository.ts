import { GetCommand, PutCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, shopsTableName } from '../config/aws';
import { IShop } from '../types/db.types';

export class ShopRepository {
  private normalizeShop(item: any): IShop | null {
    if (!item) return null;
    const shopId = item.shopId || item.restaurantId || '';
    const shopName = item.shopName || item.restaurantName || '';
    const shopType = item.shopType || 'FOOD';

    return {
      ...item,
      shopId,
      restaurantId: shopId,
      shopName,
      restaurantName: shopName,
      shopType
    };
  }

  async findByShopId(shopId: string): Promise<IShop | null> {
    try {
      const command = new GetCommand({
        TableName: shopsTableName,
        Key: { shopId }
      });
      let response = await dynamoDocClient.send(command);
      if (!response.Item) {
        // Fallback try with restaurantId key
        const resCommand = new GetCommand({
          TableName: shopsTableName,
          Key: { restaurantId: shopId }
        });
        response = await dynamoDocClient.send(resCommand);
      }
      return this.normalizeShop(response.Item);
    } catch (error) {
      console.error(`Error in ShopRepository.findByShopId(${shopId}):`, error);
      return null;
    }
  }

  findByRestaurantId = this.findByShopId;

  async findByOwnerUserId(ownerUserId: string): Promise<IShop | null> {
    try {
      try {
        const queryCommand = new QueryCommand({
          TableName: shopsTableName,
          IndexName: 'ownerUserId-index',
          KeyConditionExpression: 'ownerUserId = :ownerId',
          ExpressionAttributeValues: { ':ownerId': ownerUserId }
        });
        const queryResp = await dynamoDocClient.send(queryCommand);
        if (queryResp.Items && queryResp.Items.length > 0) {
          return this.normalizeShop(queryResp.Items[0]);
        }
      } catch (e) {
        // Fallback to scan
      }

      const scanCommand = new ScanCommand({
        TableName: shopsTableName,
        FilterExpression: 'ownerUserId = :ownerId',
        ExpressionAttributeValues: { ':ownerId': ownerUserId }
      });
      const scanResp = await dynamoDocClient.send(scanCommand);
      return scanResp.Items && scanResp.Items.length > 0 ? this.normalizeShop(scanResp.Items[0]) : null;
    } catch (error) {
      console.error(`Error in ShopRepository.findByOwnerUserId(${ownerUserId}):`, error);
      return null;
    }
  }

  async findByEmail(email: string): Promise<IShop | null> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const scanCommand = new ScanCommand({
        TableName: shopsTableName
      });
      const scanResp = await dynamoDocClient.send(scanCommand);
      if (scanResp.Items && scanResp.Items.length > 0) {
        const found = scanResp.Items.find(
          (item: any) => item.email && item.email.trim().toLowerCase() === cleanEmail
        );
        return this.normalizeShop(found);
      }
      return null;
    } catch (error) {
      console.error(`Error in ShopRepository.findByEmail(${email}):`, error);
      return null;
    }
  }

  async create(shop: IShop): Promise<IShop> {
    const normalized: IShop = {
      ...shop,
      restaurantId: shop.shopId,
      restaurantName: shop.shopName,
      shopType: shop.shopType || 'FOOD'
    };
    const command = new PutCommand({
      TableName: shopsTableName,
      Item: normalized
    });
    await dynamoDocClient.send(command);
    return normalized;
  }

  async update(shopId: string, updates: Partial<IShop>): Promise<IShop | null> {
    const existing = await this.findByShopId(shopId);
    if (!existing) return null;

    const updated: IShop = {
      ...existing,
      ...updates,
      restaurantId: shopId,
      restaurantName: updates.shopName || existing.shopName,
      updatedAt: new Date().toISOString()
    };

    const command = new PutCommand({
      TableName: shopsTableName,
      Item: updated
    });
    await dynamoDocClient.send(command);
    return updated;
  }

  async findAll(): Promise<IShop[]> {
    try {
      const command = new ScanCommand({ TableName: shopsTableName });
      const response = await dynamoDocClient.send(command);
      if (!response.Items) return [];
      return response.Items.map(item => this.normalizeShop(item)!).filter(Boolean);
    } catch (error) {
      console.error('Error scanning ShopRepository:', error);
      return [];
    }
  }
}

export const shopRepository = new ShopRepository();
export default shopRepository;
