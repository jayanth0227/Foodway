import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, Plus, Minus, Ban, Utensils, Sparkles, ChevronRight, Trash2, Store, UtensilsCrossed, Info, ArrowRight, Search, Filter } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import type { DishItem } from '../../utils/mockData';
import { API_BASE_URL } from '../../utils/api';
import { HomeDishCardSkeleton } from './HomePageSkeleton';
import { getWishlist, toggleWishlistItem } from '../../utils/wishlistUtils';

const FALLBACK_KONASEEMA_DISHES = [
  {
    id: 'kona-1',
    name: 'Ghee Motichoor Laddu',
    restaurantName: 'Vijaya Durga Sweets',
    price: 160,
    rating: 4.9,
    type: 'veg',
    category: 'Sweets',
    description: 'Authentic melt-in-mouth golden Motichoor Laddus made with pure ghee and crushed pistachios.',
    image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-2',
    name: 'Special Paneer Kathi Roll',
    restaurantName: 'Jayanth Foods',
    price: 180,
    rating: 4.8,
    type: 'veg',
    category: 'Fast Food',
    description: 'Soft malai paneer cubes tossed in tandoori spices wrapped in a hot crispy laccha paratha.',
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-3',
    name: 'Konaseema Royyala Veepudu',
    restaurantName: 'Passalapudi Ruchulu',
    price: 380,
    rating: 4.9,
    type: 'non-veg',
    category: 'Konaseema Specials',
    description: 'Juicy Godavari prawns tossed with fresh coconut, curry leaves, and traditional village spices.',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-4',
    name: 'Fresh Farm Organic Vegetables',
    restaurantName: 'Konaseema Fresh Farms',
    price: 120,
    rating: 4.9,
    type: 'veg',
    category: 'Vegetables & Farm Fresh',
    description: 'Direct farm-fresh organic carrots, crisp green capsicums, tomatoes, and village greens.',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-5',
    name: 'Gongura Mutton Fry',
    restaurantName: 'Godavari Village Kitchen',
    price: 420,
    rating: 4.8,
    type: 'non-veg',
    category: 'Konaseema Specials',
    description: 'Tender slow-cooked mutton infused with tangy Gongura leaves and authentic Andhra garam masala.',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-6',
    name: 'Kakinada Gottam Kaja',
    restaurantName: 'Vijaya Durga Sweets',
    price: 140,
    rating: 4.9,
    type: 'veg',
    category: 'Sweets',
    description: 'Traditional juicy Gottam Kaja dripping with aromatic cardamom sugar syrup.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-7',
    name: 'Godavari Chepala Pulusu',
    restaurantName: 'Amalapuram Ruchulu',
    price: 350,
    rating: 4.9,
    type: 'non-veg',
    category: 'Konaseema Specials',
    description: 'Authentic Godavari river fish simmered in tangy tamarind gravy with raw mangoes and garlic.',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-8',
    name: 'Avakaya Chicken Biryani',
    restaurantName: 'Godavari Village Kitchen',
    price: 320,
    rating: 4.8,
    type: 'non-veg',
    category: 'Konaseema Specials',
    description: 'Fragrant basmati rice dum cooked with juicy chicken marinated in spicy handmade Andhra mango pickle.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-9',
    name: 'Traditional Pootharekulu',
    restaurantName: 'Vijaya Durga Sweets',
    price: 220,
    rating: 5.0,
    type: 'veg',
    category: 'Sweets',
    description: 'Famous paper-thin rice starch wrappers filled with pure ghee, powdered jaggery, and dry fruits.',
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-10',
    name: 'Panasa Pattu Biryani',
    restaurantName: 'Passalapudi Ruchulu',
    price: 280,
    rating: 4.7,
    type: 'veg',
    category: 'Konaseema Specials',
    description: 'Unique Konaseema delicacy made with tender raw jackfruit shreds cooked in rich aromatic biryani spices.',
    image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-11',
    name: 'Crispy Butter Dosa Platter',
    restaurantName: 'Jayanth Foods',
    price: 110,
    rating: 4.8,
    type: 'veg',
    category: 'Fast Food',
    description: 'Golden crispy butter dosa served with coconut chutney, ginger chutney, and hot sambar.',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-12',
    name: 'Natukodi Kodi Kura',
    restaurantName: 'Amalapuram Ruchulu',
    price: 390,
    rating: 4.9,
    type: 'non-veg',
    category: 'Konaseema Specials',
    description: 'Country chicken cooked in traditional clay pot with freshly ground black pepper and roasted coconut.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  }
];

export const PopularDishes: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, reduceQuantity, removeFromCart, getItemQuantity } = useCart();
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    const list = getWishlist();
    const favMap: Record<string, boolean> = {};
    list.forEach(i => { favMap[i.id] = true; });
    return favMap;
  });

  useEffect(() => {
    const fetchDishes = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/public/dishes`);
        if (response.data.success && Array.isArray(response.data.dishes) && response.data.dishes.length > 0) {
          setDishes(response.data.dishes);
        } else {
          setDishes(FALLBACK_KONASEEMA_DISHES);
        }
      } catch (err) {
        console.warn('Using fallback Konaseema dishes:', err);
        setDishes(FALLBACK_KONASEEMA_DISHES);
      } finally {
        setLoading(false);
      }
    };

    fetchDishes();

    const syncWishlist = () => {
      const list = getWishlist();
      const favMap: Record<string, boolean> = {};
      list.forEach(i => { favMap[i.id] = true; });
      setFavorites(favMap);
    };

    window.addEventListener('foodway_wishlist_updated', syncWishlist);
    return () => window.removeEventListener('foodway_wishlist_updated', syncWishlist);
  }, []);

  const toggleFavorite = (dish: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleWishlistItem({
      id: dish.id,
      name: dish.name,
      image: dish.image,
      price: dish.price,
      rating: dish.rating || 4.8,
      restaurantId: dish.restaurantId || 'kona-res',
      restaurantName: dish.restaurantName || 'Konaseema Kitchens',
      category: dish.category,
      type: 'dish',
    });
  };

  const handleAddToCart = (dish: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (dish.isAvailable === false || dish.status === 'disabled') return;
    addToCart({
      id: dish.id,
      name: dish.name,
      price: Number(dish.price),
      rating: dish.rating || 4.8,
      image: dish.image,
      type: dish.type || (dish.isVeg ? 'veg' : 'non-veg'),
      category: dish.category || 'Konaseema',
      description: dish.description || '',
      restaurantId: dish.restaurantId || 'kona-res',
      restaurantName: dish.restaurantName || 'Konaseema Kitchens'
    });
  };

  const renderDishCard = (dish: any) => {
    const isFav = !!favorites[dish.id];
    const isOutOfStock = dish.isAvailable === false || dish.status === 'disabled';
    const quantity = getItemQuantity(dish.id);

    return (
      <motion.div
        key={dish.id}
        layout
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`group glass-panel border border-glass rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-luxury bg-bg-cardSec/90 hover:border-primary/50 transition-all duration-300 ${
          isOutOfStock ? 'opacity-75 border-rose-500/20' : ''
        }`}
      >
        <div>
          {/* Dish Image Container */}
          <div className="relative h-32 sm:h-36 rounded-xl sm:rounded-2xl overflow-hidden border border-glass mb-3 bg-black/40">
            <img
              src={dish.image}
              alt={dish.name}
              className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                isOutOfStock ? 'grayscale' : 'group-hover:scale-105'
              }`}
            />

            {/* Top Overlay Badges */}
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 flex-wrap">
              <span
                className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-md ${
                  dish.type === 'veg' || dish.isVeg
                    ? 'bg-emerald-500/80 text-white border border-emerald-400/40'
                    : 'bg-rose-600/80 text-white border border-rose-400/40'
                }`}
              >
                {dish.type === 'veg' || dish.isVeg ? 'Veg' : 'Non-Veg'}
              </span>

              {isOutOfStock && (
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-600/90 text-white shadow-md backdrop-blur-md">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Favorite Wishlist Heart Button */}
            <button
              type="button"
              onClick={(e) => toggleFavorite(dish, e)}
              className="absolute top-2 right-2 z-20 p-1.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 text-white hover:text-rose-400 active:scale-95 transition-all shadow-md cursor-pointer"
              title="Favorite"
            >
              <Heart
                size={13}
                className={isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}
              />
            </button>
          </div>

          {/* Restaurant / Shop Name with Store Icon */}
          <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-primary/90 truncate mb-1 flex items-center gap-1.5">
            <Store size={11} className="text-primary shrink-0" />
            <span className="truncate">{dish.restaurantName || 'Konaseema Kitchens'}</span>
          </div>

          {/* Dish Title & Rating with UtensilsCrossed Icon */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <UtensilsCrossed size={12} className="text-amber-400/90 shrink-0" />
              <h3 className="font-display font-black text-xs sm:text-sm text-text-primary group-hover:text-primary transition-colors truncate">
                {dish.name}
              </h3>
            </div>
            
            <div className="flex items-center gap-0.5 shrink-0 bg-emerald-600 border border-emerald-500/40 px-1.5 py-0.5 rounded-md text-white text-[10px] sm:text-[11px] font-black shadow-sm">
              <Star size={10} className="fill-white text-white" />
              <span>{dish.rating || 4.8}</span>
            </div>
          </div>

          {/* Description with Info Icon */}
          <div className="flex items-start gap-1 mt-1">
            <Info size={11} className="text-text-muted shrink-0 mt-0.5 opacity-60" />
            <p className="text-[11px] text-text-muted leading-snug line-clamp-2 font-medium">
              {dish.description}
            </p>
          </div>

        </div>

        {/* Price & Add to Cart Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-glass/60 mt-3">
          <span className="text-sm sm:text-base font-black text-text-primary text-gradient-gold">
            ₹{Number(dish.price).toFixed(0)}
          </span>

          {/* Direct Add to Cart Action */}
          {isOutOfStock ? (
            <button
              disabled
              className="font-bold text-[10px] py-1.5 px-2.5 rounded-lg flex items-center gap-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed"
            >
              <Ban size={11} />
              <span>Unavailable</span>
            </button>
          ) : quantity > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-primary/10 border border-primary/40 text-primary rounded-xl p-0.5 shadow-sm backdrop-blur-md">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    reduceQuantity(dish.id);
                  }}
                  className="w-6 h-6 rounded-lg bg-primary/20 hover:bg-primary hover:text-black text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Decrease quantity"
                >
                  <Minus size={11} />
                </button>

                <span className="w-6 text-center font-black text-xs text-primary">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(dish, e);
                  }}
                  className="w-6 h-6 rounded-lg bg-primary/20 hover:bg-primary hover:text-black text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Increase quantity"
                >
                  <Plus size={11} />
                </button>
              </div>

              {/* Trash/Delete Icon Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromCart(dish.id);
                }}
                className="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
                title="Remove item"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => handleAddToCart(dish, e)}
              className="px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-black font-extrabold text-[11px] uppercase tracking-wider shadow-sm transition-all duration-300 backdrop-blur-md active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} />
              <span>Add</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  const sortedDishes = [...dishes].sort((a, b) => Number(b.rating || 4.8) - Number(a.rating || 4.8));
  const visibleDishes = sortedDishes.slice(0, 6);

  return (
    <section id="popular-dishes" className="py-8 sm:py-12 md:py-16 bg-bg-dark border-t border-glass relative overflow-hidden">
      {/* Ambient background orb light */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 relative z-10 space-y-4 sm:space-y-6">

        {/* Section Header - 100% identical styling with Explore Categories */}
        <div className="flex items-end justify-between mb-4 sm:mb-6 pb-3 border-b border-glass/40 gap-3">
          <div className="space-y-1 text-left max-w-xl">
            <h2 className="text-lg sm:text-3xl md:text-4xl font-extrabold font-display text-gradient-gold tracking-tight">
              Taste the Heart of Konaseema
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary font-medium leading-relaxed mt-0.5">
              Experience traditional recipes, local ingredients, and unforgettable gourmet tastes directly from the kitchens that define Konaseema.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dishes')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 border border-primary/25 hover:border-primary hover:bg-primary/20 text-primary font-black text-[11px] sm:text-xs tracking-wider uppercase transition-all duration-300 shadow-sm hover:scale-105 group shrink-0 cursor-pointer"
          >
            <span>See All</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </div>

        {/* Dishes Container */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <HomeDishCardSkeleton key={i} />
            ))}
          </div>
        ) : dishes.length === 0 ? (
          <div className="text-center py-10 sm:py-12 glass-panel border border-glass rounded-2xl p-6 sm:p-8 max-w-md mx-auto space-y-2">
            <Utensils size={32} className="mx-auto text-text-muted opacity-50" />
            <h3 className="font-bold text-sm sm:text-base text-text-primary">No Dishes Found</h3>
            <p className="text-xs text-text-muted">No dishes available right now.</p>
          </div>
        ) : (
          <>
            {/* Mobile Horizontal Carousel View */}
            <div className="block sm:hidden overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
              <div className="flex gap-4 w-max">
                {visibleDishes.map((dish) => (
                  <div key={dish.id} className="w-[82vw] max-w-[320px] shrink-0">
                    {renderDishCard(dish)}
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Grid View */}
            <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleDishes.map((dish) => renderDishCard(dish))}
            </div>

            {/* Bottom See All Pill Button */}
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => navigate('/dishes')}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-amber-500/20 border border-primary/40 text-primary hover:bg-primary hover:text-black font-black text-xs uppercase tracking-widest shadow-luxury transition-all duration-300 backdrop-blur-md active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>See All</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </>
        )}

      </div>
    </section>
  );
};

export default PopularDishes;


