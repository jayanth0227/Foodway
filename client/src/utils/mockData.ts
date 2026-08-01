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
  category: string;
  description: string;
  isAvailable?: boolean;
  status?: string;
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
    question: 'What makes MK Delivery Services a luxury service?',
    answer: 'We partner exclusively with top-tier establishments, Michelin-starred venues, and premium artisanal bakers. Our transport containers are temperature-controlled, hermetically sealed, and delivered by trained professional couriers, ensuring your food arrives exactly as the chef intended.',
  },
  {
    id: 'faq-2',
    question: 'How does the temperature control technology work?',
    answer: 'We utilize active thermal insulation modules in our delivery cases. They maintain precise temperature ranges—warm dishes stay heated at 65°C and cold items (like luxury desserts and ice creams) are kept chilled, preventing degradation during transport.',
  },
  {
    id: 'faq-3',
    question: 'Is there a minimum order value for delivery?',
    answer: 'To maintain our premium delivery standard, we have a minimum order value of $25. This ensures that every delivery is afforded the highest degree of safety, packaging care, and logistics priority.',
  },
  {
    id: 'faq-4',
    question: 'Do you offer catering services or private dining orders?',
    answer: 'Yes. Through our MK Bespoke tier, you can order customized menus, private chef packages, and multi-course catered dinners delivered directly to your estate or corporate venue.',
  },
];

export const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: 1,
    title: 'Curate & Place Order',
    description: 'Browse our exclusive Michelin-recommended selection and place your request via our secure portal.',
    timeEstimate: 'Instant',
  },
  {
    id: 2,
    title: 'Royal Acceptance',
    description: 'The kitchen receives the order, and the Head Chef personally inspects the ingredient allocations.',
    timeEstimate: '2 mins',
  },
  {
    id: 3,
    title: 'Artisanal Preparation',
    description: 'Your dish is curated with culinary mastery, using organic, premium-sourced ingredients.',
    timeEstimate: '15-20 mins',
  },
  {
    id: 4,
    title: 'Hermetic Packaging',
    description: 'The food is packed in bespoke temperature-controlled containers to preserve moisture and plating layout.',
    timeEstimate: '3 mins',
  },
  {
    id: 5,
    title: 'White-Glove Courier Transit',
    description: 'A dedicated MK Courier collects and transports your meal with active thermal containment.',
    timeEstimate: '10-15 mins',
  },
  {
    id: 6,
    title: 'Pristine Presentation',
    description: 'Arrives at your doorstep in pristine condition, ready for standard-setting dining.',
    timeEstimate: 'Arrived',
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
