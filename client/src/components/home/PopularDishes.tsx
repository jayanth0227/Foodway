import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Heart, Plus, Ban } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { DISHES } from '../../utils/mockData';
import type { DishItem } from '../../utils/mockData';

export const PopularDishes: React.FC = () => {
  const { addToCart, setCartOpen } = useCart();
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

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
    setCartOpen(true);
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
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {DISHES.map((dish) => {
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

                  {/* FEATURE 3: Disable Add to Cart when Out of Stock */}
                  <button
                    onClick={(e) => handleAddToCart(dish, e)}
                    disabled={isOutOfStock}
                    className={`font-bold text-xs py-2.5 px-5 rounded-lg flex items-center space-x-1.5 transition-all ${
                      isOutOfStock
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed'
                        : 'btn-secondary'
                    }`}
                  >
                    {isOutOfStock ? (
                      <>
                        <Ban size={13} />
                        <span>Out of Stock</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Add Selection</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default PopularDishes;
