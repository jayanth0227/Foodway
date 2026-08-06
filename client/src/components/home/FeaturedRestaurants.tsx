import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, ArrowRight, Store, Clock, Star, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';

export const FeaturedRestaurants: React.FC = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/public/restaurants`);
        if (response.data.success && Array.isArray(response.data.restaurants)) {
          setRestaurants(response.data.restaurants);
        } else {
          setRestaurants([]);
        }
      } catch (err) {
        console.warn('Error fetching restaurants from DB:', err);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 25 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <section id="featured-restaurants" className="py-8 sm:py-12 md:py-16 bg-bg-darkSec border-t border-glass relative">
      {/* Ambient background decoration */}
      <div className="absolute top-1/2 left-0 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 relative z-10">

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8 pb-3 sm:pb-4 border-b border-glass/40">
          <div className="space-y-1 text-left max-w-xl">
            <h2 className="text-lg sm:text-2xl md:text-4xl font-extrabold font-display text-gradient-gold tracking-tight">
              Explore Shops
            </h2>
            <p className="hidden md:block text-xs sm:text-sm text-text-secondary font-medium leading-relaxed">
              Explore verified partner kitchens, bakeries, and merchant stores across Konaseema. Click a shop to view its full menu.
            </p>
          </div>

          <button
            onClick={() => navigate('/restaurants')}
            className="px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-black font-black text-xs uppercase tracking-wider border border-primary/30 transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <span>See All</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Restaurants Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-panel border border-glass rounded-3xl h-[360px] animate-pulse" />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-16 glass-panel border border-glass rounded-3xl p-12 max-w-md mx-auto space-y-3">
            <Store size={40} className="mx-auto text-text-muted opacity-50" />
            <h3 className="font-bold text-lg text-text-primary">No Merchant Shops Found</h3>
            <p className="text-xs text-text-muted">
              Partner restaurants registered in the system will automatically appear here.
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8"
          >
            {restaurants.slice(0, 6).map((restaurant) => {
              const resId = restaurant.id || restaurant.restaurantId;
              const resName = restaurant.name || 'Partner Kitchen';
              const resImage = restaurant.image || restaurant.logo || restaurant.bannerImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800';
              const resCuisine = restaurant.cuisine || 'Multi-Cuisine';
              const resRating = restaurant.rating || 4.5;
              const resTime = restaurant.deliveryTime || '20-30 MINS';
              const isOpen = restaurant.isOpen !== false;
              const isFav = !!favorites[resId];

              return (
                <motion.div
                  key={resId}
                  variants={cardVariants}
                  onClick={() => navigate(`/restaurants/${resId}`)}
                  className="group relative flex flex-col justify-between overflow-hidden cursor-pointer rounded-2xl sm:rounded-3xl bg-white dark:bg-bg-dark border border-slate-200/80 dark:border-glass shadow-md hover:shadow-luxury transition-all duration-300 hover:-translate-y-1.5 active:scale-[0.98]"
                >
                  {/* Swiggy Image Section */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-bg-dark shrink-0">
                    <img
                      src={resImage}
                      alt={resName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />

                    {/* Top Right Action Icons */}
                    <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10">
                      <button
                        type="button"
                        onClick={(e) => toggleFav(resId, e)}
                        className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all shadow-md cursor-pointer"
                        title="Favorite"
                      >
                        <Heart size={15} className={isFav ? "fill-rose-500 text-rose-500" : "text-white"} />
                      </button>
                    </div>

                    {/* Bottom Right Floating Badge with Delivery Time & Open/Closed Status */}
                    <div className="absolute bottom-0 right-0 z-10 bg-white dark:bg-[#1a1715] px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-tl-xl sm:rounded-tl-2xl border-t border-l border-slate-200 dark:border-glass shadow-xl text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-1.5 text-slate-900 dark:text-white font-extrabold text-[11px] sm:text-xs tracking-tight">
                        <Clock size={12} className="text-primary stroke-[2.5]" />
                        <span className="text-slate-900 dark:text-white font-black">{resTime.toUpperCase()}</span>
                      </div>
                      <div className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider mt-0.5 flex items-center justify-end gap-1 ${isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span>{isOpen ? 'OPEN NOW' : 'CLOSED'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Swiggy Card Body */}
                  <div className="p-3.5 sm:p-5 flex flex-col justify-between flex-grow space-y-2.5 sm:space-y-3">
                    <div>
                      {/* Restaurant Title */}
                      <h3 className="text-base sm:text-lg md:text-xl font-bold font-display text-slate-900 dark:text-white group-hover:text-primary transition-colors tracking-tight line-clamp-1">
                        {resName}
                      </h3>

                      {/* Rating & Location Line */}
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold mt-1">
                        <span className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                          <Star size={9} className="fill-white text-white" strokeWidth={0} />
                        </span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{resRating}</span>
                        <span className="text-slate-400 dark:text-slate-500 font-bold">•</span>
                        <span className="truncate text-slate-800 dark:text-slate-200 font-bold">{restaurant.address || 'Konaseema Central'}</span>
                      </div>
                    </div>

                    {/* Bottom View Menu Pill Button */}
                    <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-glass flex items-center justify-between sm:justify-end">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[120px] sm:hidden">
                        {resCuisine}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/restaurants/${resId}`);
                        }}
                        className="px-3.5 py-1.5 sm:px-4 sm:py-1.5 rounded-full bg-white dark:bg-bg-dark border border-primary/70 hover:border-primary text-primary font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer"
                      >
                        <Plus size={14} className="text-primary stroke-[2.5]" />
                        <span>View Menu</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default FeaturedRestaurants;
