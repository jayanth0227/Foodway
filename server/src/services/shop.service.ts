import shopRepository from '../repositories/shop.repository';
import userRepository from '../repositories/user.repository';
import { IShop, IUser } from '../types/db.types';
import { generateShopId, generateUserId } from '../utils/idGenerator';
import { ShopType } from '../types/enums';
import { hashPassword } from '../utils/hash.utils';

export class ShopService {
  async getAllShops(): Promise<IShop[]> {
    return shopRepository.findAll();
  }

  async getShopsByType(shopType: ShopType): Promise<IShop[]> {
    const all = await shopRepository.findAll();
    return all.filter(s => s.shopType === shopType);
  }

  async getShopById(shopId: string): Promise<IShop | null> {
    return shopRepository.findByShopId(shopId);
  }

  async getShopByOwnerUserId(ownerUserId: string): Promise<IShop | null> {
    return shopRepository.findByOwnerUserId(ownerUserId);
  }

  async registerShop(data: {
    shopName?: string;
    restaurantName?: string;
    shopType?: ShopType;
    ownerName?: string;
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
  }): Promise<{ shop: IShop; ownerUser: IUser }> {
    const cleanEmail = data.email.trim().toLowerCase();
    const hashedPassword = await hashPassword(data.password || 'shop123');
    const now = new Date().toISOString();
    const nameToUse = data.shopName || data.restaurantName || 'New Shop';

    // 1. Find or Create Owner User
    let ownerUser = await userRepository.findByEmail(cleanEmail);
    if (!ownerUser) {
      const ownerUserId = generateUserId('SHOP');
      ownerUser = await userRepository.create({
        userId: ownerUserId,
        role: 'SHOP',
        name: data.ownerName || nameToUse,
        email: cleanEmail,
        phone: data.phone || '',
        password: hashedPassword,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      });
    } else {
      ownerUser = (await userRepository.update(ownerUser.userId, {
        name: data.ownerName || nameToUse,
        phone: data.phone || ownerUser.phone,
        password: hashedPassword,
        role: 'SHOP',
        status: 'ACTIVE'
      })) || ownerUser;
    }

    // 2. Find or Create Shop
    let shop = await shopRepository.findByOwnerUserId(ownerUser.userId);
    if (!shop) {
      const shopId = generateShopId();
      shop = await shopRepository.create({
        shopId,
        restaurantId: shopId,
        ownerUserId: ownerUser.userId,
        shopName: nameToUse,
        restaurantName: nameToUse,
        shopType: data.shopType || 'FOOD',
        description: data.description || 'Quality local products and quick delivery.',
        phone: data.phone || ownerUser.phone || '',
        email: cleanEmail,
        address: data.address || '',
        openingTime: data.openingTime || '09:00 AM',
        closingTime: data.closingTime || '10:00 PM',
        logo: data.logo || '',
        bannerImage: data.bannerImage || '',
        status: 'ACTIVE',
        rating: 4.8,
        isOpen: true,
        cuisine: data.cuisine || '',
        createdAt: now,
        updatedAt: now
      });
    } else {
      shop = (await shopRepository.update(shop.shopId, {
        shopName: nameToUse,
        restaurantName: nameToUse,
        shopType: data.shopType || shop.shopType || 'FOOD',
        phone: data.phone || shop.phone,
        address: data.address || shop.address,
        openingTime: data.openingTime || shop.openingTime,
        closingTime: data.closingTime || shop.closingTime,
        logo: data.logo || shop.logo,
        bannerImage: data.bannerImage || shop.bannerImage,
        cuisine: data.cuisine || shop.cuisine
      })) || shop;
    }

    return { shop, ownerUser };
  }

  async createShop(shopData: Partial<IShop>): Promise<IShop> {
    const now = new Date().toISOString();
    const shopId = shopData.shopId || generateShopId();

    const newShop: IShop = {
      shopId,
      restaurantId: shopId,
      ownerUserId: shopData.ownerUserId || '',
      shopName: shopData.shopName || shopData.restaurantName || 'New Shop',
      restaurantName: shopData.shopName || shopData.restaurantName || 'New Shop',
      shopType: shopData.shopType || 'FOOD',
      description: shopData.description || '',
      phone: shopData.phone || '',
      email: shopData.email || '',
      address: shopData.address || '',
      city: shopData.city || '',
      state: shopData.state || '',
      pincode: shopData.pincode || '',
      latitude: shopData.latitude,
      longitude: shopData.longitude,
      openingTime: shopData.openingTime || '09:00 AM',
      closingTime: shopData.closingTime || '10:00 PM',
      logo: shopData.logo || '',
      bannerImage: shopData.bannerImage || '',
      status: shopData.status || 'ACTIVE',
      rating: shopData.rating !== undefined ? shopData.rating : 4.5,
      isOpen: shopData.isOpen !== undefined ? shopData.isOpen : true,
      cuisine: shopData.cuisine || '',
      createdAt: now,
      updatedAt: now
    };

    return shopRepository.create(newShop);
  }

  async updateShop(shopId: string, updates: Partial<IShop>): Promise<IShop | null> {
    return shopRepository.update(shopId, updates);
  }

  async updateShopStatus(shopId: string, isOpen: boolean): Promise<IShop | null> {
    return shopRepository.update(shopId, {
      isOpen,
      status: isOpen ? 'ACTIVE' : 'INACTIVE'
    });
  }

  // Alias methods for backward compatibility
  registerRestaurant = this.registerShop;
  getRestaurantById = this.getShopById;
  getRestaurantByOwnerUserId = this.getShopByOwnerUserId;
  updateProfile = this.updateShop;
  updateStatus = this.updateShopStatus;
  getAllRestaurants = this.getAllShops;
}

export const shopService = new ShopService();
export default shopService;
