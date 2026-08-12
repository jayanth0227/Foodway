export interface CategoryItem {
  id: string;
  name: string;
  image: string;
  description: string;
  itemCount: number;
}

export interface RestaurantItem {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  distance: string;
  offerBadge: string;
  image: string;
  isPopular?: boolean;
}

export interface DishItem {
  id: string;
  name: string;
  price: number;
  rating: number;
  image: string;
  type: 'veg' | 'non-veg';
  isVeg?: boolean;
  category: string;
  description: string;
  isAvailable?: boolean;
  status?: string;
  restaurantId?: string;
  restaurantName?: string;
}

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

export const RESTAURANTS: RestaurantItem[] = [
  {
    id: 'res-1',
    name: 'The Gilded Fork',
    cuisine: 'Modern French & European',
    rating: 4.9,
    deliveryTime: '20-30 min',
    distance: '1.2 km',
    offerBadge: 'Complimentary Caviar on ₹1000+',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=85',
    isPopular: true,
  },
  {
    id: 'res-2',
    name: 'Nippon Kaiseki',
    cuisine: 'Premium Japanese & Sushi',
    rating: 4.8,
    deliveryTime: '25-35 min',
    distance: '2.4 km',
    offerBadge: '20% OFF Signature Omakase',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=85',
    isPopular: true,
  },
  {
    id: 'res-3',
    name: "Trattoria D'Oro",
    cuisine: 'Artisanal Italian & Truffles',
    rating: 4.8,
    deliveryTime: '15-25 min',
    distance: '0.8 km',
    offerBadge: 'Free Delivery on Gold Menu',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=85',
    isPopular: false,
  },
  {
    id: 'res-4',
    name: 'Saffron Royal Hall',
    cuisine: 'Mughlai & Awadhi Heritage',
    rating: 4.7,
    deliveryTime: '30-40 min',
    distance: '3.1 km',
    offerBadge: 'Complimentary Royal Shahi Tukda',
    image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=85',
    isPopular: false,
  },
  {
    id: 'res-5',
    name: 'Black Pearl Grill',
    cuisine: 'Premium Steaks & Seafood',
    rating: 4.9,
    deliveryTime: '35-45 min',
    distance: '4.0 km',
    offerBadge: 'Buy 1 Get 1 Wagyu Ribeye',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=85',
    isPopular: true,
  },
  {
    id: 'res-6',
    name: 'L\'Avenue Patisserie',
    cuisine: 'Luxury Bakery & Tea Room',
    rating: 4.9,
    deliveryTime: '10-20 min',
    distance: '0.5 km',
    offerBadge: 'Complimentary Macaron Box',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=85',
    isPopular: false,
  },
];

export const DISHES: DishItem[] = [
  {
    id: 'dish-1',
    name: 'Gourmet Black Truffle Pizza',
    price: 34.0,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=85',
    type: 'veg',
    category: 'pizza',
    description: 'Fresh black truffle shavings, porcini paste, buffalo mozzarella, and gold-pressed olive oil.',
  },
  {
    id: 'dish-2',
    name: 'Wagyu A5 Brioche Burger',
    price: 48.0,
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=85',
    type: 'non-veg',
    category: 'burger',
    description: '200g prime Wagyu beef patty, vintage cheddar, caramelized shallots, and house-infused truffle aioli.',
  },
  {
    id: 'dish-3',
    name: 'Royal Saffron Lobster Biryani',
    price: 42.0,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=85',
    type: 'non-veg',
    category: 'biryani',
    description: 'Poached lobster tail, premium aged basmati rice, handpicked saffron, rose water, and organic gold leaf.',
  },
  {
    id: 'dish-4',
    name: 'Peking Duck Crispy Noodles',
    price: 28.0,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=85',
    type: 'non-veg',
    category: 'chinese',
    description: 'Crispy roasted duck breast slices with honey glaze, served over hand-pulled egg noodles.',
  },
  {
    id: 'dish-5',
    name: 'Caviar-Ghee Roast Dosa',
    price: 26.0,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=85',
    type: 'veg',
    category: 'south-indian',
    description: 'Crisp paper dosa smeared with premium A2 cow ghee, garnished with premium sturgeon caviar and truffle oil.',
  },
  {
    id: 'dish-6',
    name: 'Signature Madagascar Lava Fondant',
    price: 18.0,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=85',
    type: 'veg',
    category: 'desserts',
    description: 'Warm liquid chocolate core using 75% Single Origin Madagascar cocoa, served with edible gold foil.',
  },
];

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
