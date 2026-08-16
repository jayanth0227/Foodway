import { GetCommand, PutCommand, ScanCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, categoriesTableName } from '../config/aws';
import { ICategory } from '../types/db.types';

export class CategoryRepository {
  private normalizeCategory(raw: any): ICategory | null {
    if (!raw) return null;
    const categoryId = raw.categoryId || raw.id || '';
    const restaurantId = raw.restaurantId || raw.shopId || raw.ownerUserId || raw.email || '';
    const name = raw.name || '';

    return {
      ...raw,
      categoryId,
      id: categoryId,
      name,
      restaurantId,
      shopId: restaurantId,
      type: 'category',
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString()
    };
  }

  async findByRestaurantId(restaurantId: string): Promise<ICategory[]> {
    if (!restaurantId) return [];
    const cleanId = String(restaurantId).trim();
    const cleanLower = cleanId.toLowerCase();

    try {
      // 1. Try querying restaurantId-index
      try {
        const queryCommand = new QueryCommand({
          TableName: categoriesTableName,
          IndexName: 'restaurantId-index',
          KeyConditionExpression: 'restaurantId = :rId',
          ExpressionAttributeValues: { ':rId': cleanId }
        });
        const queryResp = await dynamoDocClient.send(queryCommand);
        if (queryResp.Items && queryResp.Items.length > 0) {
          return queryResp.Items.map(item => this.normalizeCategory(item)!).filter(Boolean);
        }
      } catch (e) { }

      // 2. Comprehensive Scan fallback matching restaurantId, shopId, ownerUserId, or email
      const scanCommand = new ScanCommand({ TableName: categoriesTableName });
      const response = await dynamoDocClient.send(scanCommand);
      if (!response.Items || response.Items.length === 0) return [];

      const matched = response.Items.filter((raw: any) => {
        const rId = (raw.restaurantId || '').toString().toLowerCase();
        const sId = (raw.shopId || '').toString().toLowerCase();
        const eId = (raw.email || raw.ownerEmail || '').toString().toLowerCase();
        const uId = (raw.ownerUserId || raw.userId || '').toString().toLowerCase();

        return rId === cleanLower || sId === cleanLower || eId === cleanLower || uId === cleanLower;
      });

      return matched.map(item => this.normalizeCategory(item)!).filter(Boolean);
    } catch (error) {
      console.error(`Error in CategoryRepository.findByRestaurantId(${restaurantId}):`, error);
      return [];
    }
  }

  async getAllCategories(): Promise<ICategory[]> {
    try {
      const scanCommand = new ScanCommand({ TableName: categoriesTableName });
      const response = await dynamoDocClient.send(scanCommand);
      if (!response.Items) return [];
      return response.Items.map(item => this.normalizeCategory(item)!).filter(Boolean);
    } catch (error) {
      console.error('Error in CategoryRepository.getAllCategories():', error);
      return [];
    }
  }

  async create(cat: Partial<ICategory> & { name: string; restaurantId: string; ownerUserId?: string; email?: string }): Promise<ICategory> {
    const categoryId = cat.categoryId || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const rId = cat.restaurantId.trim();

    const item: any = {
      categoryId,
      id: categoryId,
      name: cat.name.trim(),
      restaurantId: rId,
      shopId: rId,
      ownerUserId: cat.ownerUserId || rId,
      email: cat.email || rId,
      image: cat.image || '',
      description: cat.description || '',
      type: 'category',
      createdAt: now,
      updatedAt: now
    };

    const command = new PutCommand({
      TableName: categoriesTableName,
      Item: item
    });
    await dynamoDocClient.send(command);
    return this.normalizeCategory(item)!;
  }

  async deleteCategory(restaurantId: string, categoryName: string): Promise<boolean> {
    try {
      const existing = await this.findByRestaurantId(restaurantId);
      const targetNorm = categoryName.trim().toLowerCase();
      const toDelete = existing.filter(c => c.name.trim().toLowerCase() === targetNorm);

      for (const item of toDelete) {
        await dynamoDocClient.send(new DeleteCommand({
          TableName: categoriesTableName,
          Key: { categoryId: item.categoryId }
        }));
      }
      return true;
    } catch (error) {
      console.error(`Error deleting category ${categoryName}:`, error);
      return false;
    }
  }

  async setCategoriesForRestaurant(restaurantId: string, categories: string[], extraInfo?: { ownerUserId?: string; email?: string }): Promise<ICategory[]> {
    const existing = await this.findByRestaurantId(restaurantId);
    for (const oldCat of existing) {
      try {
        await dynamoDocClient.send(new DeleteCommand({
          TableName: categoriesTableName,
          Key: { categoryId: oldCat.categoryId }
        }));
      } catch (e) { }
    }

    const createdList: ICategory[] = [];
    const cleanList = Array.from(new Set(categories.map(c => c.trim()).filter(Boolean)));
    for (const catName of cleanList) {
      const created = await this.create({
        name: catName,
        restaurantId,
        ownerUserId: extraInfo?.ownerUserId,
        email: extraInfo?.email
      });
      createdList.push(created);
    }
    return createdList;
  }
}

export default new CategoryRepository();
