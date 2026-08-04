import restaurantRepository from '../repositories/restaurant.repository';
import userRepository from '../repositories/user.repository';
import { IRestaurant, IUser } from '../types/db.types';
import { generateRestaurantId, generateUserId } from '../utils/idGenerator';
import { hashPassword } from '../utils/hash.utils';

export class RestaurantService {
  async registerRestaurant(data: {
    restaurantName: string;
    ownerName: string;
    email: string;
    password?: string;
    phone?: string;
    address?: string;
    cuisine?: string;
    openingTime?: string;
    closingTime?: string;
    description?: string;
    logo?: string;
    bannerImage?: string;
  }): Promise<{ restaurant: IRestaurant; ownerUser: IUser }> {
    const cleanEmail = data.email.trim().toLowerCase();
    const hashedPassword = await hashPassword(data.password || 'restaurant123');
    const now = new Date().toISOString();

    // 1. Find or Create/Update Owner User in foodway-users table ONLY
    let ownerUser = await userRepository.findByEmail(cleanEmail);
    if (!ownerUser) {
      const ownerUserId = generateUserId('RESTAURANT');
      ownerUser = await userRepository.create({
        userId: ownerUserId,
        role: 'RESTAURANT',
        name: data.ownerName || data.restaurantName,
        email: cleanEmail,
        phone: data.phone || '',
        password: hashedPassword,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      });
    } else {
      ownerUser = (await userRepository.update(ownerUser.userId, {
        name: data.ownerName || data.restaurantName,
        phone: data.phone || ownerUser.phone,
        password: hashedPassword,
        role: 'RESTAURANT',
        status: 'ACTIVE'
      })) || ownerUser;
    }

    // 2. Find or Create/Update Restaurant record in foodway-restaurants table
    let restaurant = await restaurantRepository.findByOwnerUserId(ownerUser.userId);
    if (!restaurant) {
      const restaurantId = generateRestaurantId();
      restaurant = await restaurantRepository.create({
        restaurantId,
        ownerUserId: ownerUser.userId,
        restaurantName: data.restaurantName,
        description: data.description || 'Gourmet establishment serving handcrafted culinary delights.',
        phone: data.phone || ownerUser.phone || '',
        email: cleanEmail,
        address: data.address || '',
        openingTime: data.openingTime || '11:00 AM',
        closingTime: data.closingTime || '11:00 PM',
        logo: data.logo || '',
        bannerImage: data.bannerImage || '',
        status: 'ACTIVE',
        rating: 4.8,
        isOpen: true,
        cuisine: data.cuisine || 'Multi-Cuisine',
        createdAt: now,
        updatedAt: now
      });
    } else {
      restaurant = (await restaurantRepository.update(restaurant.restaurantId, {
        restaurantName: data.restaurantName,
        phone: data.phone || restaurant.phone,
        address: data.address || restaurant.address,
        openingTime: data.openingTime || restaurant.openingTime,
        closingTime: data.closingTime || restaurant.closingTime,
        logo: data.logo || restaurant.logo,
        bannerImage: data.bannerImage || restaurant.bannerImage,
        cuisine: data.cuisine || restaurant.cuisine
      })) || restaurant;
    }

    return { restaurant, ownerUser };
  }

  async getRestaurantById(restaurantId: string): Promise<IRestaurant | null> {
    return restaurantRepository.findByRestaurantId(restaurantId);
  }

  async getRestaurantByOwnerUserId(ownerUserId: string): Promise<IRestaurant | null> {
    return restaurantRepository.findByOwnerUserId(ownerUserId);
  }

  async updateProfile(restaurantId: string, updates: Partial<IRestaurant>): Promise<IRestaurant | null> {
    return restaurantRepository.update(restaurantId, updates);
  }

  async updateStatus(restaurantId: string, isOpen: boolean): Promise<IRestaurant | null> {
    return restaurantRepository.update(restaurantId, { isOpen });
  }

  async getAllRestaurants(): Promise<IRestaurant[]> {
    return restaurantRepository.findAll();
  }
}

export const restaurantService = new RestaurantService();
export default restaurantService;
