import { Request, Response } from 'express';
import shopService from '../services/shop.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ShopType } from '../types/enums';

export const getAllShops = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    let shops;
    if (type) {
      shops = await shopService.getShopsByType(type as ShopType);
    } else {
      shops = await shopService.getAllShops();
    }
    return res.json({ success: true, count: shops.length, shops, restaurants: shops });
  } catch (error: any) {
    console.error('Error fetching shops:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve shops.' });
  }
};

export const getShopById = async (req: Request, res: Response) => {
  try {
    const { shopId, id } = req.params;
    const targetId = shopId || id;
    const shop = await shopService.getShopById(targetId);
    if (!shop) {
      return res.status(404).json({ success: false, error: 'Shop not found.' });
    }
    return res.json({ success: true, shop, restaurant: shop });
  } catch (error: any) {
    console.error('Error fetching shop:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve shop.' });
  }
};

export const registerShop = async (req: Request, res: Response) => {
  try {
    const result = await shopService.registerShop(req.body);
    return res.status(201).json({
      success: true,
      message: 'Shop registered successfully.',
      shop: result.shop,
      restaurant: result.shop,
      ownerUser: result.ownerUser
    });
  } catch (error: any) {
    console.error('Error registering shop:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to register shop.' });
  }
};

export const updateShopProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.params.shopId || req.params.id || req.user?.restaurantId || req.user?.id;
    if (!shopId) {
      return res.status(400).json({ success: false, error: 'Shop ID required.' });
    }
    const updated = await shopService.updateShop(shopId, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Shop not found.' });
    }
    return res.json({ success: true, message: 'Shop profile updated.', shop: updated, restaurant: updated });
  } catch (error: any) {
    console.error('Error updating shop profile:', error);
    return res.status(500).json({ success: false, error: 'Failed to update shop.' });
  }
};

export const updateShopStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shopId = req.params.shopId || req.params.id || req.user?.restaurantId;
    const { isOpen } = req.body;
    if (!shopId || isOpen === undefined) {
      return res.status(400).json({ success: false, error: 'Shop ID and isOpen status required.' });
    }
    const updated = await shopService.updateShopStatus(shopId, isOpen);
    return res.json({ success: true, message: `Shop status updated to ${isOpen ? 'OPEN' : 'CLOSED'}.`, shop: updated, restaurant: updated });
  } catch (error: any) {
    console.error('Error updating shop status:', error);
    return res.status(500).json({ success: false, error: 'Failed to update shop status.' });
  }
};

// Aliases for backward compatibility
export const getAllRestaurants = getAllShops;
export const getRestaurantById = getShopById;
export const registerRestaurant = registerShop;
export const updateProfile = updateShopProfile;
export const updateStatus = updateShopStatus;
