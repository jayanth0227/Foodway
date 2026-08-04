import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Heart, Plus, Minus, Ban, Utensils } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import type { DishItem } from '../../utils/mockData';
import { API_BASE_URL } from '../../utils/api';
import { HomeDishCardSkeleton } from './HomePageSkeleton';

export const PopularDishes: React.FC = () => {
  const { addToCart, reduceQuantity, getItemQuantity } = useCart();
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchDishes = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/public/dishes`);
        if (response.data.success && Array.isArray(response.data.dishes)) {
          setDishes(response.data.dishes);
        } else {
          setDishes([]);
        }
      } catch (err) {
        console.warn('Error fetching public dishes from DB:', err);
        setDishes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDishes();
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddToCart = (dish: DishItem, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (dish.isAvailable === false || dish.status === 'disabled') return;
    addToCart(dish);
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

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <section id="popular-dishes" className="py-16 md:py-20 lg:py-30 bg-bg-dark border-t border-glass relative">
      {/* Background decorations */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 space-y-4 md:space-y-0">
          <div className="space-y-4 text-center md:text-left">
           
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-gradient-gold">
           Taste the Heart of Konaseema. 
            </h2>
          </div>
          <p className="text-xs md:text-sm text-text-secondary font-medium max-w-md text-center md:text-left">
             Experience traditional recipes, local ingredients, and unforgettable tastes from the kitchens that define Konaseema. 

          </p>
        </div>

        {/* Dishes Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <HomeDishCardSkeleton key={i} />
            ))}
          </div>
        ) : dishes.length === 0 ? (
          <div className="text-center py-12 glass-panel border border-glass rounded-2xl p-8 max-w-md mx-auto space-y-2">
            <Utensils size={36} className="mx-auto text-text-muted opacity-50" />
            <h3 className="font-bold text-base text-text-primary">No Dishes Found in Database</h3>
            <p className="text-xs text-text-muted">Menu items added in Restaurant Dashboard will automatically display here.</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {dishes.map((dish) => {
            const isFav = !!favorites[dish.id];
            const isOutOfStock = dish.isAvailable === false || dish.status === 'disabled';
            return (
              <motion.div
                key={dish.id}
                variants={itemVariants}
                className={`group premium-card p-5 flex flex-col justify-between h-[490px] transition-all duration-300 ${
                  isOutOfStock ? 'opacity-75 border-rose-500/20' : ''
                }`}
              >
                <div>
                  {/* Dish Image Container */}
                  <div className="relative h-56 rounded-2xl overflow-hidden border border-glass mb-5">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className={`w-full h-full object-cover transition-transform duration-[1.2s] ease-out ${
                        isOutOfStock ? 'grayscale' : 'group-hover:scale-105'
                      }`}
                    />

                    {/* Veg/Non-Veg Badge */}
                    <div className="absolute top-3 left-3 z-20 flex gap-2">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1.2 rounded-lg shadow-lg ${
                          dish.type === 'veg'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {dish.type === 'veg' ? 'Veg' : 'Non-Veg'}
                      </span>

                      {/* FEATURE 3: Out of Stock Badge */}
                      {isOutOfStock && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-rose-600/90 text-white shadow-lg backdrop-blur-md">
                          Out of Stock
                        </span>
                      )}
                    </div>

                    {/* Favorite Button Overlay */}
                    <button
                      onClick={(e) => toggleFavorite(dish.id, e)}
                      className="absolute top-3 right-3 z-20 w-8.5 h-8.5 rounded-full bg-black/70 backdrop-blur-md border border-glass text-text-primary hover:text-primary transition-all duration-300 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95"
                    >
                      {isFav ? (
                        <Heart className="text-primary fill-primary" size={16} />
                      ) : (
                        <Heart size={16} className="text-text-primary" />
                      )}
                    </button>
                  </div>

                  {/* Title & Rating */}
                  <div className="flex items-start justify-between space-x-2">
                    <h3 className="font-display font-bold text-base text-text-primary group-hover:text-primary transition-colors truncate duration-300">
                      {dish.name}
                    </h3>
                    <div className="flex items-center space-x-1 shrink-0 bg-glass-subtle border border-primary/20 px-2.5 py-1 rounded-lg">
                      <Star className="text-[#FBBF24] fill-[#FBBF24]" size={11} />
                      <span className="text-[10px] font-bold text-text-primary">{dish.rating}</span>
                    </div>
                  </div>

                  <p className="text-xs text-text-muted mt-2.5 leading-relaxed line-clamp-3 font-medium">
                    {dish.description}
                  </p>
                </div>

                {/* Price & Add to Cart Footer */}
                <div className="flex items-center justify-between pt-5 border-t border-glass mt-5">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-text-muted tracking-widest uppercase font-bold">
                      Curated Price
                    </span>
                    <span className="text-lg font-bold text-text-primary mt-0.5">
                      ₹{dish.price.toFixed(2)}
                    </span>
                  </div>

                  {/* FEATURE 3: Disable Add to Cart when Out of Stock & Dynamic Quantity Counter */}
                  {isOutOfStock ? (
                    <button
                      disabled
                      className="font-bold text-xs py-2.5 px-5 rounded-lg flex items-center space-x-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed"
                    >
                      <Ban size={13} />
                      <span>Out of Stock</span>
                    </button>
                  ) : getItemQuantity(dish.id) > 0 ? (
                    <div className="flex items-center bg-primary text-black rounded-xl p-1 shadow-md border border-amber-300">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          reduceQuantity(dish.id);
                        }}
                        className="w-7 h-7 rounded-lg bg-black/15 hover:bg-black/30 text-black font-black flex items-center justify-center transition-colors cursor-pointer"
                        title="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-8 text-center font-black text-xs">
                        {getItemQuantity(dish.id)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(dish, e);
                        }}
                        className="w-7 h-7 rounded-lg bg-black/15 hover:bg-black/30 text-black font-black flex items-center justify-center transition-colors cursor-pointer"
                        title="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleAddToCart(dish, e)}
                      className="font-bold text-xs py-2.5 px-5 rounded-lg flex items-center space-x-1.5 transition-all btn-secondary cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Selection</span>
                    </button>
                  )}
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

export default PopularDishes;
