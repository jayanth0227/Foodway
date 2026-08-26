import { GetCommand, PutCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, shopsTableName } from '../config/aws';
import { IShop } from '../types/db.types';

export class ShopRepository {
  private normalizeShop(item: any): IShop | null {
    if (!item) return null;
    const shopId = item.shopId || item.restaurantId || '';
    const shopName = item.shopName || item.restaurantName || '';
    const shopType = item.shopType || 'FOOD';

    const dietaryType = item.dietaryType || (item.isVegOnly ? 'PURE_VEG' : 'BOTH');

    const latRaw = item.latitude !== undefined ? item.latitude : item.lat;
    const lngRaw = item.longitude !== undefined ? item.longitude : item.lng;
    const latitude = latRaw !== undefined && latRaw !== null && !isNaN(Number(latRaw)) ? Number(latRaw) : undefined;
    const longitude = lngRaw !== undefined && lngRaw !== null && !isNaN(Number(lngRaw)) ? Number(lngRaw) : undefined;

    return {
      ...item,
      shopId,
      restaurantId: shopId,
      shopName,
      restaurantName: shopName,
      shopType,
      dietaryType,
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {})
    };
  }

  async findByShopId(shopId: string): Promise<IShop | null> {
    if (!shopId || shopId === 'default' || typeof shopId !== 'string' || !shopId.trim()) {
      return null;
    }
    const cleanId = shopId.trim();
    try {
      const command = new GetCommand({
        TableName: shopsTableName,
        Key: { shopId: cleanId }
      });
      let response = await dynamoDocClient.send(command);
      if (response.Item) {
        return this.normalizeShop(response.Item);
      }

      // Fallback try scan if shopId is stored under different attribute
      const scanCommand = new ScanCommand({
        TableName: shopsTableName,
        FilterExpression: 'shopId = :sId OR restaurantId = :sId OR id = :sId OR ownerUserId = :sId OR email = :sId OR shopName = :sId OR restaurantName = :sId',
        ExpressionAttributeValues: { ':sId': cleanId }
      });
      const scanResp = await dynamoDocClient.send(scanCommand);
      if (scanResp.Items && scanResp.Items.length > 0) {
        return this.normalizeShop(scanResp.Items[0]);
      }

      return null;
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

    const shopName = (updates as any).name || updates.shopName || updates.restaurantName || existing.shopName;

    const reqLat = updates.latitude !== undefined ? updates.latitude : (updates as any).lat;
    const reqLng = updates.longitude !== undefined ? updates.longitude : (updates as any).lng;
    const finalLat = reqLat !== undefined && reqLat !== null && !isNaN(Number(reqLat)) ? Number(reqLat) : existing.latitude;
    const finalLng = reqLng !== undefined && reqLng !== null && !isNaN(Number(reqLng)) ? Number(reqLng) : existing.longitude;

    const updated: IShop = {
      ...existing,
      ...updates,
      shopId: shopId,
      restaurantId: shopId,
      shopName: shopName,
      restaurantName: shopName,
      latitude: finalLat,
      longitude: finalLng,
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
