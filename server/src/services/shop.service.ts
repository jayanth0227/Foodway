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
    const hasNewPassword = !!(data.password && data.password.trim());
    const hashedPassword = hasNewPassword ? await hashPassword(data.password!.trim()) : null;
    const now = new Date().toISOString();
    const nameToUse = data.shopName || data.restaurantName || 'New Shop';

    // 1. Find or Create Owner User
    let ownerUser = await userRepository.findByEmail(cleanEmail);
    if (!ownerUser) {
      if (!hasNewPassword) {
        throw new Error('Password is required to register a new vendor account.');
      }
      const ownerUserId = generateUserId('SHOP');
      ownerUser = await userRepository.create({
        userId: ownerUserId,
        role: 'SHOP',
        name: data.ownerName || nameToUse,
        email: cleanEmail,
        phone: data.phone || '',
        password: hashedPassword!,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      });
    } else {
      const userUpdates: any = {
        name: data.ownerName || nameToUse,
        phone: data.phone || ownerUser.phone,
        role: 'SHOP',
        status: 'ACTIVE'
      };
      if (hashedPassword) {
        userUpdates.password = hashedPassword;
      }
      ownerUser = (await userRepository.update(ownerUser.userId, userUpdates)) || ownerUser;
    }

    // 2. Find or Create Shop
    let shop = (await shopRepository.findByOwnerUserId(ownerUser.userId)) || (await shopRepository.findByEmail(cleanEmail));
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
        password: hashedPassword || ownerUser.password,
        vendorPassword: data.password ? data.password.trim() : undefined,
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
      } as any);
    } else {
      const shopUpdates: any = {
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
      };
      if (hashedPassword) {
        shopUpdates.password = hashedPassword;
        (shopUpdates as any).vendorPassword = data.password!.trim();
      }
      shop = (await shopRepository.update(shop.shopId, shopUpdates)) || shop;
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
    const rawPass = (updates as any).password || (updates as any).vendorPassword;
    if (rawPass && typeof rawPass === 'string' && rawPass.trim()) {
      const trimmedPass = rawPass.trim();
      const isAlreadyBcrypt = /^\$2[aby]\$/.test(trimmedPass);
      const hashedPassword = isAlreadyBcrypt ? trimmedPass : await hashPassword(trimmedPass);
      
      updates.password = hashedPassword;
      (updates as any).vendorPassword = isAlreadyBcrypt ? undefined : trimmedPass;

      // Also update password in foodway-users table for owner
      const targetShop = await shopRepository.findByShopId(shopId);
      if (targetShop) {
        let ownerUser = targetShop.ownerUserId ? await userRepository.findByUserId(targetShop.ownerUserId) : null;
        if (!ownerUser && targetShop.email) {
          ownerUser = await userRepository.findByEmail(targetShop.email);
        }
        if (ownerUser) {
          await userRepository.update(ownerUser.userId, { password: hashedPassword });
        }
      }
    }

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
