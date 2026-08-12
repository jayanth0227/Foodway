export type ShopType =
  | 'FOOD'
  | 'SWEETS'
  | 'GROCERY'
  | 'FRUITS_VEGETABLES'
  | 'DAIRY'
  | 'BEVERAGES'
  | 'GENERAL_STORE';

export interface ItemVariant {
  id: string;
  variantId?: string;
  quantity: number | string;
  unit: string;
  price: number;
  compareAtPrice?: number;
  isAvailable?: boolean;
  label: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  image: string;
  description: string;
  itemCount: number;
  shopType?: ShopType;
}

export interface ShopItem {
  id: string;
  shopId?: string;
  name: string;
  shopType?: ShopType;
  cuisine?: string;
  rating: number;
  deliveryTime: string;
  distance: string;
  offerBadge: string;
  image: string;
  isPopular?: boolean;
  address?: string;
  phone?: string;
  isOpen?: boolean;
}

export interface RestaurantItem extends ShopItem {} // Backward compatibility alias

export interface MarketplaceItem {
  id: string;
  itemId?: string;
  shopId?: string;
  shopName?: string;
  restaurantId?: string;
  restaurantName?: string;
  name: string;
  price: number;
  rating: number;
  image: string;
  type?: 'veg' | 'non-veg';
  isVeg?: boolean;
  category: string;
  description: string;
  isAvailable?: boolean;
  status?: string;
  variants?: ItemVariant[];
  selectedVariant?: ItemVariant;
}

export interface DishItem extends MarketplaceItem {} // Backward compatibility alias

export interface TestimonialItem {
  id: string;
  name: string;
  designation: string;
  review: string;
  rating: number;
  image: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface TimelineStep {
  id: number;
  title: string;
  description: string;
  timeEstimate: string;
}

export const CATEGORIES: CategoryItem[] = [
  {
    id: 'pizza',
    name: 'Gourmet Pizza',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=85',
    description: 'Truffle-infused woodfired sourdough pizzas.',
    itemCount: 18,
  },
  {
    id: 'burger',
    name: 'Artisanal Burger',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=85',
    description: 'Aged Wagyu and dry-rubbed brioche burgers.',
    itemCount: 12,
  },
  {
    id: 'biryani',
    name: 'Royal Biryani',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=85',
    description: 'Slow-dum gold-leaf saffron rice delicacies.',
    itemCount: 8,
  },
  {
    id: 'chinese',
    name: 'Peking Chinese',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=85',
    description: 'Glazed roasted duck and hand-pulled noodles.',
    itemCount: 15,
  },
  {
    id: 'south-indian',
    name: 'South Indian',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=85',
    description: 'Ghee-soaked crisp dosas and heritage chutneys.',
    itemCount: 14,
  },
  {
    id: 'shawarma',
    name: 'Shawarma & Kebab',
    image: 'https://images.unsplash.com/photo-1642686335198-d14fb9fa360c?auto=format&fit=crop&w=600&q=85',
    description: 'Charcoal-grilled truffle meats with garlic emulsion.',
    itemCount: 10,
  },
  {
    id: 'desserts',
    name: 'Grand Desserts',
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=85',
    description: 'Belgium chocolate fondants and delicate pastries.',
    itemCount: 22,
  },
  {
    id: 'ice-cream',
    name: 'Luxury Ice Cream',
    image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=600&q=85',
    description: 'Churned Madagascar vanilla and gold-dusted pistachio.',
    itemCount: 9,
  },
];

export const RESTAURANTS: RestaurantItem[] = [];

export const DISHES: DishItem[] = [];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'test-1',
    name: 'Lady Victoria Sterling',
    designation: 'Gastronomy Critic',
    review: 'MK Delivery Services has completely redefined home dining. The meals arrive with Michelin-star precision, perfectly warm, and plated like a work of art. Absolutely incomparable.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
  },
  {
    id: 'test-2',
    name: 'Marcus Vance',
    designation: 'Architect & Connoisseur',
    review: 'The attention to detail—from the custom packaging design to the seamless tracking and royal blue accents—reflects true luxury. They represent the highest standard of culinary delivery.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
  },
  {
    id: 'test-3',
    name: 'Elena Rostova',
    designation: 'Opera Vocalist',
    review: 'Delivering from the city’s finest establishments. The Caviar Roast Dosa and Truffle Pizzas arrive in absolute pristine condition. A truly cinematic delivery experience.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
  },
];

export const FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How do I place an order?',
    answer: 'Browse your favorite restaurants or stores, add items to your cart, choose your delivery address, and place your order in just a few clicks.'
  },
  {
    id: 'faq-2',
    question: 'How long does delivery take?',
    answer: 'Most orders are delivered within 20–30 minutes, depending on the restaurant, traffic conditions, weather, and your delivery location.',
  },
  {
    id: 'faq-3',
    question: 'Can I track my order?',
    answer: 'Yes! You can track your order in real time from confirmation until it reaches your doorstep.',
  },
  {
    id: 'faq-4',
    question: 'Which areas do you currently serve?',
    answer: 'MK Delivery proudly serves customers across Konaseema and is continuously expanding to more nearby towns and villages.',
  },
  {
    id: 'faq-5',
    question: 'Is my food delivered safely?',
    answer: 'Absolutely. Every order is packed securely and handled with care by our trusted delivery partners to ensure it reaches you fresh and safely.',
  },
];

export interface TimelineStep {
  id: number;
  title: string;
  description: string;
  timeEstimate: string;
  iconName: string;
  iconColor: string;
  iconBg: string;
}

export const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: 1,
    title: 'Fresh & Quality Food',
    description: 'We partner with trusted local restaurants to ensure every meal is prepared fresh and delivered with care.',
    timeEstimate: 'FRESH',
    iconName: 'Utensils',
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-500/15 border-orange-500/30'
  },
  {
    id: 2,
    title: 'Fast Delivery',
    description: 'Get your favorite food, groceries, and daily essentials delivered quickly to your doorstep without unnecessary waiting.',
    timeEstimate: '20–30 MINS',
    iconName: 'Zap',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-400/15 border-amber-400/30'
  },
  {
    id: 3,
    title: 'Live Order Tracking',
    description: 'Track your order in real time from restaurant confirmation until it reaches your doorstep.',
    timeEstimate: 'LIVE',
    iconName: 'MapPin',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30'
  },
  {
    id: 4,
    title: 'Safe & Reliable Delivery',
    description: 'Every order is packed carefully and delivered safely by trusted delivery partners because your trust is our responsibility.',
    timeEstimate: 'SAFE',
    iconName: 'ShieldCheck',
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/15 border-indigo-500/30'
  },
  {
    id: 5,
    title: 'Local Service You Can Trust',
    description: 'Proudly serving families across Konaseema with reliable delivery and friendly customer support every day.',
    timeEstimate: 'TRUSTED',
    iconName: 'HeartHandshake',
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/15 border-rose-500/30'
  },
  {
    id: 6,
    title: 'Customer Happiness',
    description: 'Your smile after every delivery is what motivates us to serve you better every day.',
    timeEstimate: 'HAPPY',
    iconName: 'Smile',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/15 border-purple-500/30'
  },
];

export interface OfferItem {
  id: string;
  badge: string;
  discount: string;
  title: string;
  description: string;
  code: string;
}

export const OFFERS: OfferItem[] = [
  {
    id: 'off-1',
    badge: 'ROYAL PRIVILEGE',
    discount: '25% OFF',
    title: 'Gourmet Debut Experience',
    description: 'Enjoy 25% savings on your first order across all signature partner establishments.',
    code: 'ROYAL25'
  },
  {
    id: 'off-2',
    badge: 'COMPLIMENTARY',
    discount: 'FREE CAVIAR',
    title: 'Grand Caviar Charter',
    description: 'Receive complimentary Sturgeon Caviar pairing on luxury orders over ₹1000.',
    code: 'CAVIARX'
  },
  {
    id: 'off-3',
    badge: 'ZERO COURIER',
    discount: 'FREE DELIVERY',
    title: 'White-Glove Delivery',
    description: 'Complimentary white-glove thermal transport on all chef tasting menu orders.',
    code: 'FREEDEL'
  }
];
