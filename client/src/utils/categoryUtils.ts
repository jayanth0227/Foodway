export interface CategoryItem {
  id: string;
  name: string;
  image: string;
  description: string;
  keywords: string[];
  restaurantCount?: number;
  itemCount?: number;
}

export const DEFAULT_CULINARY_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat_biryani',
    name: 'Biryani',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=600',
    description: 'Signature selection of Biryani & Rice Specialties.',
    keywords: ['biryani', 'rice', 'pulao', 'dum']
  },
  {
    id: 'cat_naans',
    name: 'Naans & Tandoori',
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&q=80&w=600',
    description: 'Fresh Naans, Rotis, Kebabs & Tandoori Starters.',
    keywords: ['naan', 'roti', 'tandoori', 'kebab', 'tandoor']
  },
  {
    id: 'cat_soups',
    name: 'Soups & Starters',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=600',
    description: 'Signature Soups & Crispy Appetizers.',
    keywords: ['soup', 'starter', 'appetizer', 'chilli', '65']
  },
  {
    id: 'cat_maincourse',
    name: 'Main Course',
    image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&q=80&w=600',
    description: 'Rich Curries, Gravies & Thali Meals.',
    keywords: ['main course', 'curry', 'gravy', 'paneer', 'chicken curry', 'thali', 'meal']
  },
  {
    id: 'cat_bakery',
    name: 'Bakery & Cakes',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600',
    description: 'Signature selection of Cakes, Pastries & Bakery items.',
    keywords: ['bakery', 'cake', 'pastry', 'bread', 'puff', 'cookie']
  },
  {
    id: 'cat_fastfood',
    name: 'Fast Food & Combos',
    image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&q=80&w=600',
    description: 'Burgers, Pizzas, Noodles & Value Combos.',
    keywords: ['fast food', 'burger', 'pizza', 'noodle', 'chinese', 'combo']
  },
  {
    id: 'cat_desserts',
    name: 'Desserts & Sweets',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=600',
    description: 'Ice Creams, Traditional Sweets & Desserts.',
    keywords: ['dessert', 'sweet', 'ice cream', 'halwa', 'jamun']
  },
  {
    id: 'cat_beverages',
    name: 'Beverages',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600',
    description: 'Refreshing Cold Beverages, Milkshakes & Juices.',
    keywords: ['beverage', 'drink', 'shake', 'juice', 'soda', 'tea', 'coffee']
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
