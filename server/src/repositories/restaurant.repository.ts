import { GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, tableName } from '../config/aws';

// In-memory store fallback when AWS DynamoDB table is not configured or offline
const statusFallbackStore = new Map<string, boolean>();
const settingsFallbackStore = new Map<string, any>();

export class RestaurantRepository {
  async getRestaurant(restaurantId: string): Promise<any | null> {
    if (tableName) {
      try {
        // Try getting by pk RESTAURANT#<id>
        const getCommand = new GetCommand({
          TableName: tableName,
          Key: { pk: `RESTAURANT#${restaurantId}` }
        });
        const response = await dynamoDocClient.send(getCommand);
        if (response.Item) {
          return response.Item;
        }

        // Alternative: scan for matching id or pk
        const scanCommand = new ScanCommand({ TableName: tableName });
        const scanResponse = await dynamoDocClient.send(scanCommand);
        if (scanResponse.Items) {
          const matched = scanResponse.Items.find(
            (item: any) =>
              item.id === restaurantId ||
              item.pk === `RESTAURANT#${restaurantId}` ||
              (item.email && item.email.toLowerCase() === restaurantId.toLowerCase())
          );
          if (matched) return matched;
        }
      } catch (error) {
        console.warn(`[RestaurantRepository] DynamoDB get error for ${restaurantId}:`, error);
      }
    }

    return null;
  }

  async getStatus(restaurantId: string): Promise<boolean> {
    const restaurant = await this.getRestaurant(restaurantId);
    if (restaurant && typeof restaurant.isOpen === 'boolean') {
      return restaurant.isOpen;
    }
    if (restaurant && typeof restaurant.isClosed === 'boolean') {
      return !restaurant.isClosed;
    }
    if (restaurant && restaurant.status) {
      return restaurant.status === 'open';
    }

    // Return in-memory fallback if set, otherwise default to true (open)
    if (statusFallbackStore.has(restaurantId)) {
      return statusFallbackStore.get(restaurantId)!;
    }

    return true;
  }

  async updateStatus(restaurantId: string, isOpen: boolean): Promise<{ success: boolean; isOpen: boolean; storedInDynamoDB: boolean }> {
    // Keep fallback store updated
    statusFallbackStore.set(restaurantId, isOpen);

    if (tableName) {
      try {
        const existingRecord = await this.getRestaurant(restaurantId);
        const updatedItem = {
          ...(existingRecord || {}),
          id: restaurantId,
          pk: `RESTAURANT#${restaurantId}`,
          type: 'restaurant',
          isOpen: isOpen,
          isClosed: !isOpen,
          status: isOpen ? 'open' : 'closed',
          updatedAt: new Date().toISOString()
        };

        const putCommand = new PutCommand({
          TableName: tableName,
          Item: updatedItem
        });

        await dynamoDocClient.send(putCommand);

        return {
          success: true,
          isOpen,
          storedInDynamoDB: true
        };
      } catch (error: any) {
        console.error(`[RestaurantRepository] DynamoDB update error for ${restaurantId}:`, error);
      }
    }

    return {
      success: true,
      isOpen,
      storedInDynamoDB: false
    };
  }

  async getSettings(restaurantId: string): Promise<any> {
    if (tableName) {
      try {
        const getCommand = new GetCommand({
          TableName: tableName,
          Key: { pk: `SETTINGS#${restaurantId}` }
        });
        const response = await dynamoDocClient.send(getCommand);
        if (response.Item) return response.Item;
      } catch (e) {
        console.warn(`[RestaurantRepository] DynamoDB getSettings error for ${restaurantId}:`, e);
      }
    }
    return settingsFallbackStore.get(restaurantId) || { soundAlerts: true, language: 'en', currency: '₹' };
  }

  async updateSettings(restaurantId: string, settings: any): Promise<any> {
    const newSettings = {
      soundAlerts: settings.soundAlerts !== undefined ? settings.soundAlerts : true,
      language: settings.language || 'en',
      currency: '₹', // Always Rupee
      updatedAt: new Date().toISOString()
    };

    settingsFallbackStore.set(restaurantId, newSettings);

    if (tableName) {
      try {
        const putCommand = new PutCommand({
          TableName: tableName,
          Item: {
            pk: `SETTINGS#${restaurantId}`,
            type: 'settings',
            restaurantId,
            ...newSettings
          }
        });
        await dynamoDocClient.send(putCommand);
      } catch (e) {
        console.error(`[RestaurantRepository] DynamoDB updateSettings error for ${restaurantId}:`, e);
      }
    }

    return newSettings;
  }

  async updateItemAvailability(itemId: string, isAvailable: boolean): Promise<any> {
    if (tableName) {
      try {
        const getCommand = new GetCommand({
          TableName: tableName,
          Key: { pk: `MENU#${itemId}` }
        });
        const response = await dynamoDocClient.send(getCommand);
        if (response.Item) {
          const updatedItem = {
            ...response.Item,
            isAvailable,
            status: isAvailable ? 'active' : 'disabled',
            updatedAt: new Date().toISOString()
          };
          const putCommand = new PutCommand({
            TableName: tableName,
            Item: updatedItem
          });
          await dynamoDocClient.send(putCommand);
          return updatedItem;
        }
      } catch (e) {
        console.error(`[RestaurantRepository] DynamoDB updateItemAvailability error for ${itemId}:`, e);
      }
    }
    return { id: itemId, isAvailable, status: isAvailable ? 'active' : 'disabled' };
  }
}

export const restaurantRepository = new RestaurantRepository();
