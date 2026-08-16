import itemRepository from '../repositories/item.repository';
import { IItem, IItemVariant } from '../types/db.types';
import { generateItemId } from '../utils/idGenerator';

export class ItemService {
  async getItemsByShopId(shopId: string | string[], vendorCategories?: string[]): Promise<IItem[]> {
    return itemRepository.findByShopId(shopId, vendorCategories);
  }

  async getItemById(itemId: string): Promise<IItem | null> {
    return itemRepository.findByItemId(itemId);
  }

  async createItem(itemData: {
    shopId?: string;
    restaurantId?: string;
    name?: string;
    foodName?: string;
    description?: string;
    category?: string;
    image?: string;
    foodImage?: string;
    isVeg?: boolean;
    isAvailable?: boolean;
    variants?: IItemVariant[];
    price?: number;
    discountPrice?: number;
    preparationTime?: string;
  }): Promise<IItem> {
    const sId = itemData.shopId || itemData.restaurantId || '';
    const itemName = itemData.name || itemData.foodName || 'New Item';
    const itemId = generateItemId();
    const now = new Date().toISOString();

    let variants: IItemVariant[] = itemData.variants && itemData.variants.length > 0 ? itemData.variants : [];
    if (variants.length === 0) {
      const p = itemData.price !== undefined ? Number(itemData.price) : 0;
      variants = [{
        variantId: `${itemId}-V1`,
        quantity: 1,
        unit: 'pcs',
        price: p,
        compareAtPrice: itemData.discountPrice,
        isAvailable: itemData.isAvailable !== false,
        label: 'Standard'
      }];
    }

    const newItem: IItem = {
      itemId,
      menuItemId: itemId,
      shopId: sId,
      restaurantId: sId,
      name: itemName,
      foodName: itemName,
      description: itemData.description || '',
      category: itemData.category || 'General',
      image: itemData.image || itemData.foodImage || '',
      foodImage: itemData.image || itemData.foodImage || '',
      price: variants[0].price,
      discountPrice: itemData.discountPrice,
      isVeg: itemData.isVeg !== undefined ? itemData.isVeg : true,
      isAvailable: itemData.isAvailable !== false,
      status: itemData.isAvailable !== false ? 'AVAILABLE' : 'UNAVAILABLE',
      variants,
      preparationTime: itemData.preparationTime || '10-15 mins',
      createdAt: now,
      updatedAt: now
    };

    return itemRepository.create(newItem);
  }

  async updateItem(itemId: string, updates: Partial<IItem>): Promise<IItem | null> {
    return itemRepository.update(itemId, updates);
  }

  async deleteItem(itemId: string): Promise<boolean> {
    return itemRepository.delete(itemId);
  }

  async saveMenuItem(data: any): Promise<IItem | null> {
    const id = data.itemId || data.menuItemId || data.id;
    if (id && !id.startsWith('item_') && !id.startsWith('temp_')) {
      const existing = await this.getItemById(id);
      if (existing) {
        return this.updateItem(id, data);
      }
    }
    return this.createItem(data);
  }

  // Backward compatibility alias methods
  getItemsByRestaurantId = this.getItemsByShopId;
  getMenuByRestaurantId = this.getItemsByShopId;
  getMenuItemById = this.getItemById;
  createMenuItem = this.createItem;
  updateMenuItem = this.updateItem;
  deleteMenuItem = this.deleteItem;
}

export const itemService = new ItemService();
export default itemService;
