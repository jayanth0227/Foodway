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
 
 
 

 
 
 
];

export const cleanCategoryName = (name: string = ''): string => {
  return name.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
};

export const getMergedCategories = (dbCategories: any[] = []): CategoryItem[] => {
  const merged: CategoryItem[] = [];
  const seen = new Set<string>();

  // 1. Add DB categories first
  if (Array.isArray(dbCategories)) {
    dbCategories.forEach((cat) => {
      const rawName = cat.name || '';
      const name = cleanCategoryName(rawName);
      if (!name) return;

      const lowerName = name.toLowerCase();
      if (!seen.has(lowerName)) {
        seen.add(lowerName);

        // Check matching default category for keywords & high quality image fallback
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

  // 2. Add remaining default culinary categories
  DEFAULT_CULINARY_CATEGORIES.forEach((defaultCat) => {
    const lowerName = defaultCat.name.toLowerCase();
    if (!seen.has(lowerName)) {
      seen.add(lowerName);
      merged.push(defaultCat);
    }
  });

  return merged;
};
