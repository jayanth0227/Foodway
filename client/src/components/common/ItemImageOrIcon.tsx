import React, { useState } from 'react';
import {
  Apple,
  Carrot,
  CupSoda,
  Coffee,
  Pizza,
  Cake,
  Cookie,
  Utensils,
  UtensilsCrossed,
  ChefHat,
  Flame,
  Leaf,
  type LucideIcon
} from 'lucide-react';

export const isNoUserImage = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.includes('unsplash.com')) return true;
  if (trimmed.includes('placeholder')) return true;
  if (trimmed === 'default' || trimmed === 'none' || trimmed === 'null') return true;
  return false;
};

export interface IconConfig {
  Icon: LucideIcon;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  categoryLabel: string;
}

export const getItemIconConfig = (
  name: string = '',
  category: string = '',
  isVeg: boolean = true
): IconConfig => {
  const combined = `${name} ${category}`.toLowerCase();

  // 1. Fruits & Fresh Fruit (e.g. Apples, Mangoes, Bananas)
  if (
    combined.includes('fruit') ||
    combined.includes('apple') ||
    combined.includes('banana') ||
    combined.includes('mango') ||
    combined.includes('grape') ||
    combined.includes('orange') ||
    combined.includes('citrus') ||
    combined.includes('berry') ||
    combined.includes('papaya') ||
    combined.includes('watermelon') ||
    combined.includes('guava') ||
    combined.includes('pomegranate') ||
    combined.includes('pineapple')
  ) {
    return {
      Icon: Apple,
      bgGradient: 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950',
      borderColor: 'border-emerald-500/40',
      textColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
      categoryLabel: 'Fresh Fruit'
    };
  }

  // 2. Vegetables & Farm Fresh (e.g. Brinjal, Potato, Tomato)
  if (
    combined.includes('vegetable') ||
    combined.includes('farm fresh') ||
    combined.includes('brinjal') ||
    combined.includes('eggplant') ||
    combined.includes('potato') ||
    combined.includes('aloo') ||
    combined.includes('tomato') ||
    combined.includes('onion') ||
    combined.includes('carrot') ||
    combined.includes('cabbage') ||
    combined.includes('cauliflower') ||
    combined.includes('spinach') ||
    combined.includes('palak') ||
    combined.includes('mushroom') ||
    combined.includes('chilli') ||
    combined.includes('bhendi') ||
    combined.includes('ladyfinger') ||
    combined.includes('gourd') ||
    combined.includes('beans') ||
    combined.includes('peas')
  ) {
    return {
      Icon: Carrot,
      bgGradient: 'bg-gradient-to-br from-green-950 via-emerald-900 to-lime-950',
      borderColor: 'border-green-500/40',
      textColor: 'text-green-400',
      badgeBg: 'bg-green-500/20',
      badgeText: 'text-green-300',
      categoryLabel: 'Farm Fresh'
    };
  }

  // 3. Cold Drinks, Juices, Sodas, Shakes (e.g. Thumsup, Pepsi, Juice)
  if (
    combined.includes('drink') ||
    combined.includes('juice') ||
    combined.includes('soda') ||
    combined.includes('thumsup') ||
    combined.includes('thums up') ||
    combined.includes('coke') ||
    combined.includes('pepsi') ||
    combined.includes('sprite') ||
    combined.includes('limca') ||
    combined.includes('7up') ||
    combined.includes('beverage') ||
    combined.includes('shake') ||
    combined.includes('milkshake') ||
    combined.includes('lassi') ||
    combined.includes('smoothie') ||
    combined.includes('mojito') ||
    combined.includes('cool') ||
    combined.includes('fizz') ||
    combined.includes('water')
  ) {
    return {
      Icon: CupSoda,
      bgGradient: 'bg-gradient-to-br from-cyan-950 via-blue-900 to-sky-950',
      borderColor: 'border-cyan-500/40',
      textColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/20',
      badgeText: 'text-cyan-300',
      categoryLabel: 'Cold Drink / Juice'
    };
  }

  // 4. Hot Drinks, Tea, Coffee
  if (
    combined.includes('tea') ||
    combined.includes('chai') ||
    combined.includes('coffee') ||
    combined.includes('espresso') ||
    combined.includes('latte') ||
    combined.includes('cappuccino')
  ) {
    return {
      Icon: Coffee,
      bgGradient: 'bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900',
      borderColor: 'border-amber-500/40',
      textColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
      categoryLabel: 'Beverage'
    };
  }

  // 5. Biryani, Rice, Pulao, Curries, Meals
  if (
    combined.includes('biryani') ||
    combined.includes('rice') ||
    combined.includes('pulao') ||
    combined.includes('dum') ||
    combined.includes('thali') ||
    combined.includes('meal') ||
    combined.includes('curry') ||
    combined.includes('gravy') ||
    combined.includes('dal') ||
    combined.includes('sambar')
  ) {
    return {
      Icon: ChefHat,
      bgGradient: 'bg-gradient-to-br from-amber-950 via-orange-900 to-yellow-950',
      borderColor: 'border-amber-500/40',
      textColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
      categoryLabel: 'Special Dish'
    };
  }

  // 6. Fast Food, Pizza, Burger, Noodles, Snacks
  if (
    combined.includes('pizza') ||
    combined.includes('burger') ||
    combined.includes('fast food') ||
    combined.includes('sandwich') ||
    combined.includes('noodle') ||
    combined.includes('pasta') ||
    combined.includes('chinese') ||
    combined.includes('momo') ||
    combined.includes('fries') ||
    combined.includes('wrap') ||
    combined.includes('roll') ||
    combined.includes('snack') ||
    combined.includes('samosa')
  ) {
    return {
      Icon: Pizza,
      bgGradient: 'bg-gradient-to-br from-rose-950 via-red-900 to-orange-950',
      borderColor: 'border-rose-500/40',
      textColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/20',
      badgeText: 'text-rose-300',
      categoryLabel: 'Fast Food'
    };
  }

  // 7. Bakery, Cakes, Sweets, Desserts, Ice Cream
  if (
    combined.includes('bakery') ||
    combined.includes('cake') ||
    combined.includes('pastry') ||
    combined.includes('sweet') ||
    combined.includes('dessert') ||
    combined.includes('ice cream') ||
    combined.includes('cookie') ||
    combined.includes('bread') ||
    combined.includes('bun') ||
    combined.includes('donut') ||
    combined.includes('chocolate') ||
    combined.includes('brownie') ||
    combined.includes('halwa') ||
    combined.includes('jamun')
  ) {
    return {
      Icon: Cake,
      bgGradient: 'bg-gradient-to-br from-pink-950 via-fuchsia-900 to-purple-950',
      borderColor: 'border-pink-500/40',
      textColor: 'text-pink-400',
      badgeBg: 'bg-pink-500/20',
      badgeText: 'text-pink-300',
      categoryLabel: 'Bakery & Sweets'
    };
  }

  // 8. Meat, Chicken, Mutton, Fish, Tandoori, Kebabs
  if (
    combined.includes('chicken') ||
    combined.includes('mutton') ||
    combined.includes('fish') ||
    combined.includes('meat') ||
    combined.includes('kebab') ||
    combined.includes('tandoori') ||
    combined.includes('prawn') ||
    combined.includes('egg') ||
    combined.includes('non veg')
  ) {
    return {
      Icon: Flame,
      bgGradient: 'bg-gradient-to-br from-red-950 via-rose-900 to-amber-950',
      borderColor: 'border-rose-500/40',
      textColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/20',
      badgeText: 'text-rose-300',
      categoryLabel: 'Non-Veg Gourmet'
    };
  }

  // 9. Default Veg fallback
  if (isVeg) {
    return {
      Icon: Leaf,
      bgGradient: 'bg-gradient-to-br from-emerald-950 via-teal-900 to-green-950',
      borderColor: 'border-emerald-500/40',
      textColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
      categoryLabel: category || 'Pure Veg'
    };
  }

  // 10. Default Non-Veg / General item fallback
  return {
    Icon: Utensils,
    bgGradient: 'bg-gradient-to-br from-slate-950 via-zinc-900 to-neutral-950',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    categoryLabel: category || 'Item'
  };
};

export interface ItemImageOrIconProps {
  image?: string | null;
  name?: string;
  category?: string;
  isVeg?: boolean;
  className?: string;
  containerClassName?: string;
  alt?: string;
  iconSize?: number;
  showCategoryLabel?: boolean;
}

export const ItemImageOrIcon: React.FC<ItemImageOrIconProps> = ({
  image,
  name = 'Item',
  category = '',
  isVeg = true,
  className = '',
  containerClassName = '',
  alt,
  iconSize,
  showCategoryLabel = true
}) => {
  const [imageError, setImageError] = useState(false);

  const hasNoImage = isNoUserImage(image) || imageError;
  const config = getItemIconConfig(name, category, isVeg);
  const IconComponent = config.Icon;

  if (!hasNoImage && image) {
    return (
      <img
        src={image}
        alt={alt || name}
        className={className}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center border shadow-inner transition-all ${config.bgGradient} ${config.borderColor} ${containerClassName || className || 'w-full h-full'}`}
    >
      {/* Decorative backdrop glow */}
      <div className="absolute inset-0 bg-radial from-white/10 to-transparent opacity-25 pointer-events-none" />
      <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full blur-xl opacity-30 ${config.badgeBg}`} />

      {/* Main Icon */}
      <div className="relative z-10 flex flex-col items-center justify-center p-2 text-center w-full">
        <div className={`p-2 sm:p-2.5 rounded-2xl ${config.badgeBg} ${config.textColor} shadow-md backdrop-blur-xs border border-white/10 mb-1`}>
          <IconComponent size={iconSize || 28} className="stroke-[2.2]" />
        </div>

        {showCategoryLabel && (
          <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${config.textColor} truncate max-w-[90%]`}>
            {name}
          </span>
        )}
      </div>

      {/* Subtle indicator tag */}
      <div className="absolute bottom-1 right-1.5 z-10 opacity-75">
        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${config.badgeBg} ${config.badgeText} border border-white/10`}>
          No Image
        </span>
      </div>
    </div>
  );
};

export default ItemImageOrIcon;
