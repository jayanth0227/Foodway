import { restaurantRepository, RestaurantRepository } from '../repositories/restaurant.repository';

export class RestaurantService {
  private repository: RestaurantRepository;

  constructor(repository: RestaurantRepository = restaurantRepository) {
    this.repository = repository;
  }

  async getStatus(restaurantId: string): Promise<{ success: boolean; restaurantId: string; isOpen: boolean; status: string }> {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required.');
    }

    const isOpen = await this.repository.getStatus(restaurantId);
    return {
      success: true,
      restaurantId,
      isOpen,
      status: isOpen ? 'open' : 'closed'
    };
  }

  async updateStatus(
    restaurantId: string,
    isOpen: boolean
  ): Promise<{ success: boolean; restaurantId: string; isOpen: boolean; status: string; message: string; storedInDynamoDB: boolean }> {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required.');
    }

    if (typeof isOpen !== 'boolean') {
      throw new Error('Status field "isOpen" must be a boolean value.');
    }

    const result = await this.repository.updateStatus(restaurantId, isOpen);

    return {
      success: true,
      restaurantId,
      isOpen: result.isOpen,
      status: result.isOpen ? 'open' : 'closed',
      message: `Restaurant is now ${result.isOpen ? 'Open' : 'Closed'}.`,
      storedInDynamoDB: result.storedInDynamoDB
    };
  }

  async getSettings(restaurantId: string): Promise<{ success: boolean; settings: any }> {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required.');
    }
    const settings = await this.repository.getSettings(restaurantId);
    return { success: true, settings };
  }

  async updateSettings(restaurantId: string, settings: any): Promise<{ success: boolean; settings: any }> {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required.');
    }
    const updated = await this.repository.updateSettings(restaurantId, settings);
    return { success: true, settings: updated };
  }

  async updateAvailability(itemId: string, isAvailable: boolean): Promise<{ success: boolean; item: any }> {
    if (!itemId) {
      throw new Error('Item ID is required.');
    }
    const item = await this.repository.updateItemAvailability(itemId, isAvailable);
    return { success: true, item };
  }
}

export const restaurantService = new RestaurantService();
