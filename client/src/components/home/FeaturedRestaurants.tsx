import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, ArrowRight, Utensils, ShoppingBag, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import { API_BASE_URL } from '../../utils/api';
import { HomeDishCardSkeleton } from './HomePageSkeleton';

export const FeaturedRestaurants: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, reduceQuantity, getItemQuantity } = useCart();
  const [favouriteItems, setFavouriteItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchFavourites = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/public/dishes`);
        if (response.data.success && Array.isArray(response.data.dishes)) {
          const allDishes = response.data.dishes;

          // Filter items marked by restaurant owner as Category Favourite
          const flaggedFavourites = allDishes.filter((d: any) => d.isCategoryFavourite === true || d.isFeatured === true);

          if (flaggedFavourites.length > 0) {
            setFavouriteItems(flaggedFavourites);
          } else {
            // Group by category and pick 1 top dish per category from DB
            const categoryGroupMap: Record<string, any> = {};
            allDishes.forEach((dish: any) => {
              const cat = dish.category || 'Main Course';
              if (!categoryGroupMap[cat]) {
                categoryGroupMap[cat] = dish;
              }
            });
            setFavouriteItems(Object.values(categoryGroupMap));
          }
        } else {
          setFavouriteItems([]);
        }
      } catch (err) {
        console.warn('Error fetching category favourites from DB:', err);
        setFavouriteItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFavourites();
  }, []);

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
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <section id="featured-restaurants" className="py-16 md:py-20 lg:py-30 bg-bg-darkSec border-t border-glass relative">
      {/* Ambient background decoration */}
      <div className="absolute top-1/2 left-0 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 space-y-4 md:space-y-0">
          <div className="space-y-4 text-center md:text-left">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block">
              Curated Selections
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-gradient-gold">
              One Category One Favourite.
            </h2>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <p className="text-xs md:text-sm text-text-secondary font-medium max-w-md text-center md:text-left">
              Handpicked top dishes chosen by restaurant owners in every category across Konaseema.
            </p>
            <button
              onClick={() => navigate('/restaurants')}
              className="px-5 py-2.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-black font-extrabold text-xs uppercase tracking-wider border border-primary/30 transition-all shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <span>View All Restaurants</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Dynamic Favourite Items Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <HomeDishCardSkeleton key={i} />
            ))}
          </div>
        ) : favouriteItems.length === 0 ? (
          <div className="text-center py-16 glass-panel border border-glass rounded-3xl p-12 max-w-md mx-auto space-y-3">
            <Utensils size={40} className="mx-auto text-text-muted opacity-50" />
            <h3 className="font-bold text-lg text-text-primary">No Featured Dishes Selected</h3>
            <p className="text-xs text-text-muted">
              Restaurant owners can check "One Category One Favourite" in their dashboard to showcase dishes here.
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {favouriteItems.map((item) => (
              <motion.div
                key={item.id || item.menuItemId}
                variants={cardVariants}
                className="group premium-card relative flex flex-col h-[450px] overflow-hidden"
              >
                {/* Cover Image & Category Badges */}
                <div className="relative h-56 overflow-hidden shrink-0 border-b border-glass bg-bg-dark">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
                  <img
                    src={item.image || item.foodImage}
                    alt={item.name || item.foodName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.2s] ease-out"
                  />

                  {/* Category Favourite Overlay */}
                  <div className="absolute top-4 left-4 z-20">
                    <span className="bg-amber-500 text-black text-[9px] font-black uppercase px-3 py-1.5 rounded-lg tracking-widest shadow-lg flex items-center gap-1.5">
                      <Star size={12} className="fill-black" />
                      <span>{item.category || 'Category Special'}</span>
                    </span>
                  </div>

                  {/* Dietary Badge */}
                  <div className="absolute top-4 right-4 z-20">
                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg tracking-widest backdrop-blur-md border ${item.isVeg !== false ? 'bg-emerald-500/80 text-white border-emerald-400/40' : 'bg-rose-600/80 text-white border-rose-500/40'
                      }`}>
                      {item.isVeg !== false ? 'Veg Favourite' : 'Non-Veg Special'}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between">
                    <span className="text-white text-lg font-black font-display">
                      ₹{Number(item.price).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-md">
                      ⭐ 4.9 Top Rated
                    </span>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-6 flex flex-col justify-between flex-grow bg-bg-darkSec">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold font-display text-text-primary group-hover:text-primary transition-colors line-clamp-1">
                      {item.name || item.foodName}
                    </h3>
                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                      {item.description || `Signature ${item.category || 'dish'} crafted with authentic local spices.`}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-glass flex items-center justify-between">
                    <button
                      onClick={() => navigate('/restaurants')}
                      className="text-xs font-bold text-text-muted hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin size={13} className="text-primary" />
                      <span>Available in Database</span>
                    </button>

                    {getItemQuantity(item.id || item.menuItemId) > 0 ? (
                      <div className="flex items-center bg-primary text-black rounded-xl p-1 shadow-md border border-amber-300">
                        <button
                          type="button"
                          onClick={() => reduceQuantity(item.id || item.menuItemId)}
                          className="w-7 h-7 rounded-lg bg-black/15 hover:bg-black/30 text-black font-black flex items-center justify-center transition-colors cursor-pointer"
                          title="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center font-black text-xs">
                          {getItemQuantity(item.id || item.menuItemId)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            addToCart({
                              id: item.id || item.menuItemId,
                              name: item.name || item.foodName,
                              description: item.description || '',
                              price: Number(item.price),
                              category: item.category || 'Main Course',
                              image: item.image || item.foodImage,
                              type: item.isVeg !== false ? 'veg' : 'non-veg',
                              isVeg: item.isVeg !== false,
                              isAvailable: item.isAvailable !== false,
                              rating: 4.9
                            });
                          }}
                          className="w-7 h-7 rounded-lg bg-black/15 hover:bg-black/30 text-black font-black flex items-center justify-center transition-colors cursor-pointer"
                          title="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          addToCart({
                            id: item.id || item.menuItemId,
                            name: item.name || item.foodName,
                            description: item.description || '',
                            price: Number(item.price),
                            category: item.category || 'Main Course',
                            image: item.image || item.foodImage,
                            type: item.isVeg !== false ? 'veg' : 'non-veg',
                            isVeg: item.isVeg !== false,
                            isAvailable: item.isAvailable !== false,
                            rating: 4.9
                          });
                        }}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-black font-extrabold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShoppingBag size={13} />
                        <span>Order Now</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default FeaturedRestaurants;
