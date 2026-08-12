import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowLeft, ShoppingBag, Trash2, Star, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getWishlist, removeFromWishlist } from '../utils/wishlistUtils';
import type { WishlistItem } from '../utils/wishlistUtils';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    const loadItems = () => {
      setItems(getWishlist());
    };
    loadItems();

    window.addEventListener('foodway_wishlist_updated', loadItems);
    return () => window.removeEventListener('foodway_wishlist_updated', loadItems);
  }, []);

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeFromWishlist(id);
    setItems(updated);
  };

  const handleAddToCart = (item: WishlistItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'restaurant') {
      navigate(`/restaurant/${item.id}`);
      return;
    }
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price || 0,
      image: item.image || '',
      restaurantId: item.restaurantId || '',
      restaurantName: item.restaurantName || '',
      category: item.category || '',
      rating: item.rating || 0,
      type: 'veg',
      description: '',
    });
  };

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary pt-24 pb-28 px-4 sm:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-full bg-glass-subtle border border-glass hover:border-primary/30 text-text-secondary hover:text-primary transition-all duration-300"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary">
              {t('my_wishlist_title')}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              {items.length > 0
                ? `${items.length} saved item${items.length > 1 ? 's' : ''}`
                : 'Your saved favorite dishes & restaurants'}
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => navigate('/categories')}
            className="text-xs text-primary font-semibold hover:underline hidden sm:block"
          >
            + Add More Dishes
          </button>
        )}
      </div>

      {/* Wishlist Content */}
      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-darkSec/70 border border-glass rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[360px] shadow-luxury"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-[0_0_25px_rgba(197,147,99,0.15)]">
            <Heart size={32} />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">No Saved Favorites Yet</h2>
          <p className="text-xs text-text-muted max-w-sm mb-6">
            Explore delicious dishes from top local restaurants and tap the heart icon to save them here!
          </p>
          <button
            onClick={() => navigate('/categories')}
            className="btn-primary text-xs font-bold py-3 px-6 rounded-xl uppercase tracking-wider flex items-center space-x-2 shadow-luxury"
          >
            <ShoppingBag size={16} />
            <span>Explore Delicious Food</span>
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                onClick={() => {
                  if (item.type === 'restaurant') {
                    navigate(`/restaurants/${item.id}`);
                  } else if (item.restaurantId) {
                    navigate(`/restaurants/${item.restaurantId}`);
                  }
                }}
                className="glass-card hover-glow-gold rounded-2xl p-4 flex flex-col justify-between border border-glass relative group cursor-pointer"
              >
                {/* Remove button */}
                <button
                  onClick={(e) => handleRemove(item.id, e)}
                  className="absolute top-3 right-3 z-10 p-2 rounded-full bg-bg-dark/80 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 backdrop-blur-md border border-rose-500/20 transition-all duration-300 opacity-90 group-hover:opacity-100"
                  title="Remove from Wishlist"
                >
                  <Trash2 size={16} />
                </button>

                <div>
                  {/* Image container */}
                  <div className="relative h-44 w-full rounded-xl overflow-hidden mb-4 bg-bg-darkSec">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-bg-darkSec text-text-muted">
                        <Utensils size={32} className="opacity-40" />
                      </div>
                    )}
                    {item.type && (
                      <span className="absolute bottom-2 left-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-bg-dark/80 backdrop-blur-md border border-glass text-primary">
                        {item.type}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-text-primary truncate max-w-[200px]">
                        {item.name}
                      </h3>
                      {item.rating && (
                        <div className="flex items-center space-x-1 text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <Star size={12} className="fill-amber-400" />
                          <span>{item.rating}</span>
                        </div>
                      )}
                    </div>
                    {item.restaurantName && (
                      <p className="text-xs text-text-muted font-medium truncate">
                        {item.restaurantName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-glass/40 flex items-center justify-between">
                  <div className="text-sm font-extrabold text-primary">
                    {item.price ? `₹${item.price}` : 'View Details'}
                  </div>
                  <button
                    onClick={(e) => handleAddToCart(item, e)}
                    className="btn-primary text-xs font-bold py-2 px-3 rounded-lg flex items-center space-x-1.5 shadow-luxury"
                  >
                    <ShoppingBag size={14} />
                    <span>{item.type === 'restaurant' ? 'Visit Store' : 'Add to Cart'}</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default WishlistPage;

