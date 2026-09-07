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

const FALLBACK_KONASEEMA_DISHES: any[] = [];

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

  const [cmsConfig, setCmsConfig] = useState<any>(null);

  useEffect(() => {
    const fetchDishes = async () => {
      setLoading(true);
      try {
        const [dishesRes, cmsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/public/dishes`),
          axios.get(`${API_BASE_URL}/cms/homepage`).catch(() => ({ data: null }))
        ]);

        if (cmsRes?.data?.success && cmsRes.data.cms) {
          setCmsConfig(cmsRes.data.cms.flavoursOfKonaseema);
        }

        if (dishesRes.data.success && Array.isArray(dishesRes.data.dishes) && dishesRes.data.dishes.length > 0) {
          let fetched = dishesRes.data.dishes;
          const featuredIds = cmsRes?.data?.cms?.flavoursOfKonaseema?.featuredItemIds;
          if (Array.isArray(featuredIds) && featuredIds.length > 0) {
            const filtered = fetched.filter((d: any) => featuredIds.includes(d.id) || featuredIds.includes(d._id));
            if (filtered.length > 0) fetched = filtered;
          }
          setDishes(fetched);
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
          <div className="space-y-0.5 sm:space-y-1 text-left max-w-xl">
            <h2 className="text-lg sm:text-3xl md:text-4xl font-extrabold font-display text-gradient-gold tracking-tight">
              {cmsConfig?.title || 'Flavours of Konaseema'}
            </h2>
            <p className="hidden sm:block text-xs sm:text-sm text-text-secondary font-medium leading-relaxed">
              {cmsConfig?.subtitle || 'Experience traditional recipes, local ingredients, and unforgettable gourmet tastes directly from the kitchens that define Konaseema.'}
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
          </>
        )}

      </div>
    </section>
  );
};

export default PopularDishes;


