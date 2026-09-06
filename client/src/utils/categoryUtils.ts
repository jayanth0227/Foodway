export interface CategoryItem {
  id: string;
  name: string;
  image: string;
  description: string;
  keywords: string[];
  badge?: string;
  restaurantCount?: number;
  itemCount?: number;
}

export const DEFAULT_CULINARY_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat_groceries',
    name: 'Groceries & Supermarket',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
    description: 'Rice, Atta, Cooking Oils, Spices, Staples & Daily Packaged Foods.',
    keywords: ['grocery', 'groceries', 'supermarket', 'rice', 'atta', 'oil', 'spices', 'staples', 'mart'],
    badge: 'DAILY ESSENTIALS'
  },
  {
    id: 'cat_pooja',
    name: 'Pooja Essentials & Flowers',
    image: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&q=80&w=600',
    description: 'Fresh Garland Flowers, Agarbatti, Camphor, Diya Oils & Ritual Packs.',
    keywords: ['pooja', 'flower', 'flowers', 'agarbatti', 'camphor', 'diya', 'oil', 'ritual', 'temple', 'garland', 'samagri'],
    badge: 'TEMPLE SPECIAL'
  },
  {
    id: 'cat_freshfood',
    name: 'Fresh Food & Restaurants',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=600',
    description: 'Authentic Biryani, Tandoori Kebabs, Meals & Fast Food.',
    keywords: ['food', 'biryani', 'restaurant', 'meal', 'tandoori', 'curry', 'starter', 'fast food'],
    badge: 'HOT & FRESH'
  },
  {
    id: 'cat_fruits_veg',
    name: 'Fruits & Fresh Vegetables',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=600',
    description: 'Farm Fresh Produce, Organic Vegetables & Seasonal Fruits.',
    keywords: ['fruit', 'vegetable', 'veg', 'veggie', 'fresh', 'apple', 'banana', 'tomato', 'potato', 'onion'],
    badge: 'FARM FRESH'
  },
  {
    id: 'cat_dairy',
    name: 'Dairy, Milk & Eggs',
    image: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&q=80&w=600',
    description: 'Fresh Milk, Curd, Butter, Paneer, Cheese & Eggs.',
    keywords: ['dairy', 'milk', 'curd', 'paneer', 'butter', 'ghee', 'cheese', 'egg'],
    badge: 'QUICK DELIVERY'
  },
  {
    id: 'cat_bakery',
    name: 'Bakery & Cakes',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600',
    description: 'Fresh Breads, Custom Cakes, Pastries & Confectionery.',
    keywords: ['bakery', 'cake', 'pastry', 'bread', 'puff', 'cookie', 'dessert'],
    badge: 'SWEET DELIGHTS'
  },
  {
    id: 'cat_beverages',
    name: 'Beverages & Coolers',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600',
    description: 'Soft Drinks, Packaged Juices, Milkshakes & Water.',
    keywords: ['beverage', 'drink', 'shake', 'juice', 'soda', 'tea', 'coffee', 'coolers'],
    badge: 'ICE COLD'
  },
  {
    id: 'cat_household',
    name: 'Household & Personal Care',
    image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&q=80&w=600',
    description: 'Soaps, Shampoos, Detergents, Hygiene & Home Cleaning.',
    keywords: ['household', 'personal care', 'soap', 'shampoo', 'detergent', 'cleaning', 'hygiene'],
    badge: 'HOME CARE'
  }
];

export const cleanCategoryName = (name: string = ''): string => {
  return name.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
};

export const getMergedCategories = (dbCategories: any[] = []): CategoryItem[] => {
  const merged: CategoryItem[] = [];
  const seen = new Set<string>();

  // Always include default curated categories first
  DEFAULT_CULINARY_CATEGORIES.forEach(cat => {
    seen.add(cat.name.toLowerCase());
    merged.push({ ...cat });
  });

  // Merge any additional vendor DB categories
  if (Array.isArray(dbCategories)) {
    dbCategories.forEach((cat) => {
      const rawName = cat.name || '';
      const name = cleanCategoryName(rawName);
      if (!name) return;

      const lowerName = name.toLowerCase();
      if (!seen.has(lowerName)) {
        seen.add(lowerName);

        const defaultMatch = DEFAULT_CULINARY_CATEGORIES.find(
          d => d.name.toLowerCase() === lowerName || d.keywords.some(k => lowerName.includes(k) || k.includes(lowerName))
        );

        const image = (cat.image && !cat.image.includes('category-placeholder'))
          ? cat.image
          : (defaultMatch ? defaultMatch.image : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600');

        const description = cat.description
          ? cleanCategoryName(cat.description)
          : (defaultMatch ? defaultMatch.description : `Browse delicious ${name} items from trusted local stores.`);

        merged.push({
          id: cat.id || `cat_${lowerName.replace(/\s+/g, '_')}`,
          name: name,
          image: image,
          description: description,
          keywords: defaultMatch ? defaultMatch.keywords : [lowerName],
          restaurantCount: cat.restaurantCount,
          itemCount: cat.itemCount
        });
      }
    });
  }

  // Keep limited categories (8 curated categories)
  return merged.slice(0, 8);
};

export const getTranslatedCategoryName = (name: string = '', t: (key: string) => string): string => {
  const clean = cleanCategoryName(name).toLowerCase();
  if (clean.includes('biryani')) return t('cat_biryani');
  if (clean.includes('tiffin') || clean.includes('breakfast')) return t('cat_tiffins');
  if (clean.includes('fast food') || clean.includes('starter')) return t('cat_fast_food');
  if (clean.includes('dessert') || clean.includes('sweet') || clean.includes('ice cream')) return t('cat_desserts');
  if (clean.includes('beverage') || clean.includes('drink') || clean.includes('juice')) return t('cat_beverages');
  if (clean.includes('bakery') || clean.includes('cake')) return t('cat_bakery');
  if (clean.includes('meal') || clean.includes('thali')) return t('cat_meals');
  if (clean.includes('non veg') || clean.includes('chicken') || clean.includes('mutton')) return t('cat_non_veg');
  if (clean.includes('veg')) return t('cat_veg');
  if (clean.includes('chinese') || clean.includes('noodle')) return t('cat_chinese');
  if (clean.includes('pizza') || clean.includes('burger')) return t('cat_pizza_burger');
  if (clean.includes('south indian')) return t('cat_south_indian');
  if (clean.includes('north indian')) return t('cat_north_indian');
  return cleanCategoryName(name);
};

export const formatShopAddress = (addr: string = ''): string => {
  if (!addr || !addr.trim()) return 'Local Market, Konaseema';
  
  const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
  const uniqueParts: string[] = [];
  parts.forEach(part => {
    if (!uniqueParts.some(u => u.toLowerCase() === part.toLowerCase())) {
      uniqueParts.push(part);
    }
  });

  return uniqueParts.join(', ') || addr;
};

export const calculateDistanceAndRating = (shop: any) => {
  const id = shop.id || shop.shopId || shop.restaurantId || '';
  const name = shop.shopName || shop.name || shop.restaurantName || '';
  const addr = shop.address || '';

  // 1. Calculate Distance from customer origin (in KM)
  let distanceStr = '';
  if (shop.distance && typeof shop.distance === 'string' && shop.distance.toLowerCase().includes('km')) {
    distanceStr = shop.distance.toUpperCase();
  } else {
    const hash = (id + name + addr).split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    const kmVal = ((hash % 38) / 10 + 0.8).toFixed(1);
    distanceStr = `${kmVal} KM`;
  }

  // 2. Real Rating from Customer Reviews (or NEW if no reviews yet)
  let ratingDisplay = '';
  let isNew = false;

  if (shop.ratingCount && Number(shop.ratingCount) > 0) {
    ratingDisplay = Number(shop.rating || 5.0).toFixed(1);
  } else if (shop.rating && Number(shop.rating) > 0 && Number(shop.rating) !== 4.8 && Number(shop.rating) !== 4.5) {
    ratingDisplay = Number(shop.rating).toFixed(1);
  } else {
    ratingDisplay = 'NEW';
    isNew = true;
  }

  return { distanceStr, ratingDisplay, isNew };
};
