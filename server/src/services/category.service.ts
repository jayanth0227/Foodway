import categoryRepository from '../repositories/category.repository';
import { ICategory } from '../types/db.types';

export class CategoryService {
  async getCategoriesByRestaurantId(restaurantId: string): Promise<ICategory[]> {
    return categoryRepository.findByRestaurantId(restaurantId);
  }

  async getAllCategories(): Promise<ICategory[]> {
    return categoryRepository.getAllCategories();
  }

  async addCategory(restaurantId: string, categoryName: string, image?: string, extraInfo?: { ownerUserId?: string; email?: string }): Promise<ICategory> {
    return categoryRepository.create({ name: categoryName, restaurantId, image, ownerUserId: extraInfo?.ownerUserId, email: extraInfo?.email });
  }

  async setCategoriesForRestaurant(restaurantId: string, categories: string[], extraInfo?: { ownerUserId?: string; email?: string }): Promise<ICategory[]> {
    return categoryRepository.setCategoriesForRestaurant(restaurantId, categories, extraInfo);
  }

  async deleteCategory(restaurantId: string, categoryName: string): Promise<boolean> {
    return categoryRepository.deleteCategory(restaurantId, categoryName);
  }
}

export default new CategoryService();
