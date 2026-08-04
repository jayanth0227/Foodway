import { GetCommand, PutCommand, ScanCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, menuItemsTableName } from '../config/aws';
import { IMenuItem } from '../types/db.types';

export class MenuRepository {
  async findByMenuItemId(menuItemId: string): Promise<IMenuItem | null> {
    try {
      const command = new GetCommand({
        TableName: menuItemsTableName,
        Key: { menuItemId }
      });
      const response = await dynamoDocClient.send(command);
      return (response.Item as IMenuItem) || null;
    } catch (error) {
      console.error(`Error in MenuRepository.findByMenuItemId(${menuItemId}):`, error);
      return null;
    }
  }

  async findByRestaurantId(restaurantId: string): Promise<IMenuItem[]> {
    try {
      // 1. Try GSI Query
      try {
        const queryCommand = new QueryCommand({
          TableName: menuItemsTableName,
          IndexName: 'restaurantId-index',
          KeyConditionExpression: 'restaurantId = :resId',
          ExpressionAttributeValues: { ':resId': restaurantId }
        });
        const queryResp = await dynamoDocClient.send(queryCommand);
        if (queryResp.Items) {
          return queryResp.Items as IMenuItem[];
        }
      } catch (e) {
        // Fallback to Scan
      }

      // 2. Scan fallback
      const scanCommand = new ScanCommand({
        TableName: menuItemsTableName,
        FilterExpression: 'restaurantId = :resId',
        ExpressionAttributeValues: { ':resId': restaurantId }
      });
      const response = await dynamoDocClient.send(scanCommand);
      return (response.Items as IMenuItem[]) || [];
    } catch (error) {
      console.error(`Error in MenuRepository.findByRestaurantId(${restaurantId}):`, error);
      return [];
    }
  }

  async create(menuItem: IMenuItem): Promise<IMenuItem> {
    const command = new PutCommand({
      TableName: menuItemsTableName,
      Item: menuItem
    });
    await dynamoDocClient.send(command);
    return menuItem;
  }

  async update(menuItemId: string, updates: Partial<IMenuItem>): Promise<IMenuItem | null> {
    let existing = await this.findByMenuItemId(menuItemId);

    // Fallback: match by restaurantId and foodName if menuItemId does not match exact record
    if (!existing && updates.restaurantId && updates.foodName) {
      try {
        const allResItems = await this.findByRestaurantId(updates.restaurantId);
        existing = allResItems.find(i => i.foodName.toLowerCase() === updates.foodName!.toLowerCase()) || null;
      } catch (e) {}
    }

    const targetId = existing ? existing.menuItemId : menuItemId;
    const now = new Date().toISOString();

    const updated: IMenuItem = {
      menuItemId: targetId,
      restaurantId: updates.restaurantId || (existing ? existing.restaurantId : ''),
      foodName: updates.foodName || (existing ? existing.foodName : ''),
      description: updates.description !== undefined ? updates.description : (existing ? existing.description : ''),
      category: updates.category || (existing ? existing.category : 'Main Course'),
      price: updates.price !== undefined ? Number(updates.price) : (existing ? existing.price : 0),
      discountPrice: updates.discountPrice !== undefined ? updates.discountPrice : existing?.discountPrice,
      foodImage: updates.foodImage !== undefined ? updates.foodImage : (existing ? existing.foodImage : ''),
      isVeg: updates.isVeg !== undefined ? updates.isVeg : (existing ? existing.isVeg : true),
      isAvailable: updates.isAvailable !== undefined ? updates.isAvailable : (existing ? existing.isAvailable : true),
      status: updates.status || (existing ? existing.status : 'AVAILABLE'),
      preparationTime: updates.preparationTime || (existing ? existing.preparationTime : '15-20 mins'),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    const command = new PutCommand({
      TableName: menuItemsTableName,
      Item: updated
    });
    await dynamoDocClient.send(command);
    return updated;
  }

  async delete(menuItemId: string): Promise<boolean> {
    try {
      const command = new DeleteCommand({
        TableName: menuItemsTableName,
        Key: { menuItemId }
      });
      await dynamoDocClient.send(command);
      return true;
    } catch (error) {
      console.error(`Error in MenuRepository.delete(${menuItemId}):`, error);
      return false;
    }
  }
}

export const menuRepository = new MenuRepository();
export default menuRepository;
