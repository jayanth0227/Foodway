import axios from 'axios';
import api from './api';
import type { ShopItem, MarketplaceItem, ShopType } from '../utils/mockData';
import { API_BASE_URL } from '../utils/api';

export class ShopService {
  private publicRestaurantsPromise: Promise<any[]> | null = null;
  private cachedPublicRestaurants: any[] | null = null;

  async getPublicRestaurants(forceRefresh = false): Promise<any[]> {
    if (!forceRefresh && this.cachedPublicRestaurants) {
      return this.cachedPublicRestaurants;
    }
    if (!forceRefresh && this.publicRestaurantsPromise) {
      return this.publicRestaurantsPromise;
    }

    this.publicRestaurantsPromise = (async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/public/restaurants`);
        const dataList = response.data?.shops || response.data?.restaurants || (Array.isArray(response.data) ? response.data : []);
        this.cachedPublicRestaurants = Array.isArray(dataList) ? dataList : [];
        return this.cachedPublicRestaurants;
      } catch (error) {
        console.warn('Error fetching public restaurants:', error);
        if (this.cachedPublicRestaurants) return this.cachedPublicRestaurants;
        return [];
      } finally {
        this.publicRestaurantsPromise = null;
      }
    })();

    return this.publicRestaurantsPromise;
  }

  async getAllShops(type?: ShopType): Promise<ShopItem[]> {
    try {
      const url = type ? `/shops?type=${type}` : '/shops';
      const response = await api.get(url);
      if (response.data && response.data.shops) {
        return response.data.shops.map(this.normalizeShop);
      }
      if (response.data && response.data.restaurants) {
        return response.data.restaurants.map(this.normalizeShop);
      }
      return [];
    } catch (error) {
      console.warn('Error fetching shops from API:', error);
      return [];
    }
  }

  async getShopById(id: string): Promise<ShopItem | null> {
    try {
      const response = await api.get(`/shops/${id}`);
      const data = response.data?.shop || response.data?.restaurant;
      return data ? this.normalizeShop(data) : null;
    } catch (error) {
      console.warn(`Error fetching shop (${id}) from API:`, error);
      return null;
    }
  }

  async getShopItems(shopId: string): Promise<MarketplaceItem[]> {
    try {
      const response = await api.get(`/shops/${shopId}/items`);
      const items = response.data?.items || response.data?.menu;
      if (Array.isArray(items)) {
        return items.map(this.normalizeItem);
      }
      return [];
    } catch (error) {
      console.warn(`Error fetching shop items (${shopId}):`, error);
      return [];
    }
  }

  private normalizeShop(raw: any): ShopItem {
    const id = raw.shopId || raw.restaurantId || raw.id;
    const name = raw.shopName || raw.restaurantName || raw.name || 'Shop';
    const shopType = raw.shopType || 'FOOD';

    const isClosed = raw.isOpen === false || raw.isOpen === 'false' || raw.status === 'closed' || raw.status === 'inactive' || raw.status === 'INACTIVE' || raw.status === 'OFFLINE' || raw.status === 'offline' || raw.status === 'CLOSED';

    return {
      id,
      shopId: id,
      name,
      shopType,
      cuisine: raw.cuisine || shopType,
      rating: Number(raw.rating || 4.5),
      deliveryTime: raw.deliveryTime || '15-25 mins',
      distance: raw.distance || '1.2 km',
      offerBadge: raw.offerBadge || '15% OFF',
      image: raw.image || raw.bannerImage || raw.logo || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
      isPopular: raw.isPopular !== false,
      address: raw.address || '',
      phone: raw.phone || '',
      isOpen: !isClosed
    };
  }

  private normalizeItem(raw: any): MarketplaceItem {
    const id = raw.itemId || raw.menuItemId || raw.id;
    const name = raw.name || raw.foodName || 'Item';
    const price = Number(raw.price || 0);

    let variants = Array.isArray(raw.variants) ? raw.variants : [];
    if (variants.length === 0) {
      variants = [{
        id: `${id}-V1`,
        variantId: `${id}-V1`,
        quantity: 1,
        unit: 'pcs',
        price,
        compareAtPrice: raw.discountPrice ? Number(raw.discountPrice) : undefined,
        isAvailable: raw.isAvailable !== false,
        label: 'Standard'
      }];
    }

    return {
      id,
      itemId: id,
      shopId: raw.shopId || raw.restaurantId,
      shopName: raw.shopName || raw.restaurantName,
      restaurantId: raw.shopId || raw.restaurantId,
      restaurantName: raw.shopName || raw.restaurantName,
      name,
      price,
      rating: Number(raw.rating || 4.8),
      image: raw.image || raw.foodImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
      type: raw.isVeg ? 'veg' : 'non-veg',
      isVeg: raw.isVeg !== false,
      category: raw.category || 'General',
      description: raw.description || '',
      isAvailable: raw.isAvailable !== false,
      status: raw.status || 'AVAILABLE',
      variants
    };
  }

  // Alias methods for backward compatibility
  getAllRestaurants = this.getAllShops;
  getRestaurantById = this.getShopById;
}

export const shopService = new ShopService();
export const restaurantService = shopService;
export default shopService;
