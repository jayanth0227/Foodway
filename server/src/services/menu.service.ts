import menuRepository from '../repositories/menu.repository';
import { IMenuItem } from '../types/db.types';
import { generateMenuItemId } from '../utils/idGenerator';

export class MenuService {
  async getMenuByRestaurantId(restaurantId: string): Promise<IMenuItem[]> {
    return menuRepository.findByRestaurantId(restaurantId);
  }

  async getMenuItemById(menuItemId: string): Promise<IMenuItem | null> {
    return menuRepository.findByMenuItemId(menuItemId);
  }

  async saveMenuItem(data: Partial<IMenuItem> & { restaurantId: string; foodName: string; price: number }): Promise<IMenuItem> {
    const now = new Date().toISOString();

    if (data.menuItemId) {
      const updated = await menuRepository.update(data.menuItemId, {
        ...data,
        updatedAt: now
      });
      if (updated) return updated;
    }

    const newItemId = generateMenuItemId();
    const newItem: IMenuItem = {
      menuItemId: newItemId,
      restaurantId: data.restaurantId,
      foodName: data.foodName,
      description: data.description || '',
      category: data.category || 'Main Course',
      price: Number(data.price),
      discountPrice: data.discountPrice ? Number(data.discountPrice) : undefined,
      foodImage: data.foodImage || '',
      isVeg: data.isVeg !== undefined ? data.isVeg : true,
      isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
      status: data.isAvailable === false ? 'UNAVAILABLE' : 'AVAILABLE',
      preparationTime: data.preparationTime || '15-20 mins',
      createdAt: now,
      updatedAt: now
    };

    return menuRepository.create(newItem);
  }

  async deleteMenuItem(menuItemId: string): Promise<boolean> {
    return menuRepository.delete(menuItemId);
  }
}

export const menuService = new MenuService();
export default menuService;
