export interface WishlistItem {
  id: string;
  name: string;
  image?: string;
  price?: number;
  rating?: number;
  restaurantId?: string;
  restaurantName?: string;
  category?: string;
  type?: 'dish' | 'restaurant';
}

const WISHLIST_KEY = 'foodway_wishlist_items';

export const getWishlist = (): WishlistItem[] => {
  try {
    const data = localStorage.getItem(WISHLIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading wishlist from localStorage:', err);
    return [];
  }
};

export const isInWishlist = (id: string): boolean => {
  const list = getWishlist();
  return list.some((item) => item.id === id);
};

export const toggleWishlistItem = (item: WishlistItem): boolean => {
  try {
    const list = getWishlist();
    const index = list.findIndex((i) => i.id === item.id);
    let updated: WishlistItem[];
    let added = false;

    if (index >= 0) {
      updated = list.filter((i) => i.id !== item.id);
      added = false;
    } else {
      updated = [...list, item];
      added = true;
    }

    localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('foodway_wishlist_updated'));
    return added;
  } catch (err) {
    console.error('Error updating wishlist in localStorage:', err);
    return false;
  }
};

export const removeFromWishlist = (id: string): WishlistItem[] => {
  try {
    const list = getWishlist();
    const updated = list.filter((i) => i.id !== id);
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('foodway_wishlist_updated'));
    return updated;
  } catch (err) {
    console.error('Error removing item from wishlist:', err);
    return [];
  }
};
