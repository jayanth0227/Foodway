import { GetCommand, PutCommand, ScanCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, itemsTableName } from '../config/aws';
import { IItem, IItemVariant } from '../types/db.types';

export class ItemRepository {
  private normalizeItem(raw: any): IItem | null {
    if (!raw) return null;
    const itemId = raw.itemId || raw.menuItemId || raw.id || '';
    const shopId = raw.shopId || raw.restaurantId || '';
    const name = raw.name || raw.foodName || 'Item';
    const image = raw.image || raw.foodImage || '';

    let rawVariants = Array.isArray(raw.variants) ? raw.variants : [];
    let variants: IItemVariant[] = rawVariants.map((v: any, idx: number) => {
      const itemM = v && v.M ? v.M : (v || {});
      const vId = itemM.variantId?.S || itemM.variantId || itemM.id?.S || itemM.id || `V${idx + 1}`;
      const qty = itemM.quantity?.N || itemM.quantity?.S || itemM.quantity || 1;
      const u = itemM.unit?.S || itemM.unit || 'pcs';
      const p = itemM.price?.N || itemM.price?.S || itemM.price || raw.price || 0;
      const cmpP = itemM.compareAtPrice?.N || itemM.compareAtPrice?.S || itemM.compareAtPrice;
      const avail = itemM.isAvailable?.BOOL !== undefined ? itemM.isAvailable.BOOL : (itemM.isAvailable !== false);
      const lbl = itemM.label?.S || itemM.label || `${qty} ${u}`;

      return {
        variantId: String(vId),
        id: String(vId),
        quantity: Number(qty) || 1,
        unit: String(u),
        price: Number(p) || 0,
        compareAtPrice: cmpP !== undefined && cmpP !== '' ? Number(cmpP) : undefined,
        isAvailable: Boolean(avail),
        label: String(lbl)
      };
    });

    if (variants.length === 0 && (raw.price !== undefined && raw.price !== null)) {
      variants = [{
        variantId: `${itemId}-V1`,
        id: `${itemId}-V1`,
        quantity: 1,
        unit: 'pcs',
        price: Number(raw.price || 0),
        compareAtPrice: raw.discountPrice ? Number(raw.discountPrice) : undefined,
        isAvailable: raw.isAvailable !== false,
        label: 'Standard'
      }];
    }

    return {
      ...raw,
      itemId,
      menuItemId: itemId,
      id: itemId,
      shopId,
      restaurantId: shopId,
      name,
      foodName: name,
      image,
      foodImage: image,
      category: raw.category || 'General',
      price: variants[0]?.price || Number(raw.price || 0),
      isAvailable: raw.isAvailable !== false,
      status: raw.status || 'AVAILABLE',
      variants
    };
  }

  async findByItemId(itemId: string): Promise<IItem | null> {
    try {
      let command = new GetCommand({
        TableName: itemsTableName,
        Key: { itemId }
      });
      let response = await dynamoDocClient.send(command);
      if (!response.Item) {
        command = new GetCommand({
          TableName: itemsTableName,
          Key: { menuItemId: itemId }
        });
        response = await dynamoDocClient.send(command);
      }
      return this.normalizeItem(response.Item);
    } catch (error) {
      console.error(`Error in ItemRepository.findByItemId(${itemId}):`, error);
      return null;
    }
  }

  async findByShopId(shopIdOrIds: string | string[], vendorCategories?: string[]): Promise<IItem[]> {
    if (!shopIdOrIds) return [];
    const ids = Array.isArray(shopIdOrIds) ? shopIdOrIds : [shopIdOrIds];
    const candidateSet = new Set(ids.map(id => String(id).trim().toLowerCase()).filter(Boolean));
    const categorySet = new Set((vendorCategories || []).map(c => String(c).trim().toLowerCase()).filter(c => c && c !== 'uncategorized'));

    try {
      const scanCommand = new ScanCommand({
        TableName: itemsTableName
      });
      const response = await dynamoDocClient.send(scanCommand);
      if (!response.Items || response.Items.length === 0) return [];

      const matchedMap = new Map<string, any>();

      response.Items.forEach((raw: any) => {
        const itemShop = (raw.shopId || '').toString().toLowerCase();
        const itemRes = (raw.restaurantId || '').toString().toLowerCase();
        const itemUser = (raw.userId || raw.ownerUserId || '').toString().toLowerCase();
        const itemEmail = (raw.email || raw.ownerEmail || '').toString().toLowerCase();
        const itemCat = (raw.category || '').toString().trim().toLowerCase();

        const isDirectMatch = candidateSet.has(itemShop) ||
                              candidateSet.has(itemRes) ||
                              candidateSet.has(itemUser) ||
                              candidateSet.has(itemEmail);

        const isLegacyMatch = (itemShop === 'res-001' || itemShop === 'res_default' || itemShop === 'default' || itemShop === '' ||
                               itemRes === 'res-001' || itemRes === 'res_default' || itemRes === 'default' || itemRes === '') &&
                              categorySet.has(itemCat);

        if (isDirectMatch || isLegacyMatch) {
          const itemId = raw.itemId || raw.menuItemId || raw.id;
          if (itemId && !matchedMap.has(itemId)) {
            matchedMap.set(itemId, raw);
          }
        }
      });

      return Array.from(matchedMap.values()).map(item => this.normalizeItem(item)!).filter(Boolean);
    } catch (error) {
      console.error(`Error in ItemRepository.findByShopId(${shopIdOrIds}):`, error);
      return [];
    }
  }

  async findByRestaurantId(restaurantId: string | string[], vendorCategories?: string[]): Promise<IItem[]> {
    return this.findByShopId(restaurantId, vendorCategories);
  }

  async create(item: IItem & { ownerUserId?: string; email?: string }): Promise<IItem> {
    const normalized = {
      ...item,
      menuItemId: item.itemId,
      restaurantId: item.shopId,
      ownerUserId: item.ownerUserId || item.shopId,
      email: item.email || item.shopId,
      foodName: item.name,
      foodImage: item.image,
      price: item.variants && item.variants.length > 0 ? item.variants[0].price : (item.price || 0)
    };
    const command = new PutCommand({
      TableName: itemsTableName,
      Item: normalized
    });
    await dynamoDocClient.send(command);
    return this.normalizeItem(normalized)!;
  }

  async update(itemId: string, updates: Partial<IItem> & { ownerUserId?: string; email?: string }): Promise<IItem | null> {
    let existing = await this.findByItemId(itemId);

    if (!existing && (updates.shopId || updates.restaurantId) && (updates.name || updates.foodName)) {
      const sId = updates.shopId || updates.restaurantId!;
      const targetName = updates.name || updates.foodName!;
      const shopItems = await this.findByShopId(sId);
      existing = shopItems.find(i => i.name.toLowerCase() === targetName.toLowerCase()) || null;
    }

    const targetId = existing ? existing.itemId : itemId;
    const now = new Date().toISOString();

    const variants = updates.variants !== undefined ? updates.variants : (existing ? existing.variants : []);
    const defaultPrice = variants.length > 0 ? variants[0].price : (updates.price !== undefined ? updates.price : (existing ? existing.price : 0));

    const updatedItem: any = {
      ...(existing || {}),
      ...updates,
      itemId: targetId,
      menuItemId: targetId,
      shopId: updates.shopId || updates.restaurantId || (existing ? existing.shopId : ''),
      restaurantId: updates.shopId || updates.restaurantId || (existing ? existing.shopId : ''),
      ownerUserId: updates.ownerUserId || (existing as any)?.ownerUserId || updates.shopId || '',
      email: updates.email || (existing as any)?.email || updates.shopId || '',
      name: updates.name || updates.foodName || (existing ? existing.name : ''),
      foodName: updates.name || updates.foodName || (existing ? existing.name : ''),
      description: updates.description !== undefined ? updates.description : (existing ? existing.description : ''),
      category: updates.category || (existing ? existing.category : 'General'),
      image: updates.image !== undefined ? updates.image : (updates.foodImage !== undefined ? updates.foodImage : (existing ? existing.image : '')),
      foodImage: updates.image !== undefined ? updates.image : (updates.foodImage !== undefined ? updates.foodImage : (existing ? existing.image : '')),
      price: defaultPrice,
      discountPrice: updates.discountPrice !== undefined ? updates.discountPrice : existing?.discountPrice,
      isVeg: updates.isVeg !== undefined ? updates.isVeg : (existing ? existing.isVeg : true),
      isAvailable: updates.isAvailable !== undefined ? updates.isAvailable : (existing ? existing.isAvailable : true),
      status: updates.status || (existing ? existing.status : 'AVAILABLE'),
      variants,
      preparationTime: updates.preparationTime || (existing ? existing.preparationTime : '10-15 mins'),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    const command = new PutCommand({
      TableName: itemsTableName,
      Item: updatedItem
    });
    await dynamoDocClient.send(command);
    return this.normalizeItem(updatedItem)!;
  }

  async delete(itemId: string): Promise<boolean> {
    try {
      const command = new DeleteCommand({
        TableName: itemsTableName,
        Key: { itemId }
      });
      await dynamoDocClient.send(command);
      return true;
    } catch (error) {
      console.error(`Error in ItemRepository.delete(${itemId}):`, error);
      return false;
    }
  }
}

export const itemRepository = new ItemRepository();
export default itemRepository;
