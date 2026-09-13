import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Star,
  Heart,
  Plus,
  Minus,
  Ban,
  UtensilsCrossed,
  Store,
  Info,
  Trash2,
  Sparkles,
  Utensils,
  Zap,
  ShoppingBag,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { getWishlist, toggleWishlistItem } from '../utils/wishlistUtils';
import { ItemDetailsModal } from '../components/common/ItemDetailsModal';
import ItemImageOrIcon from '../components/common/ItemImageOrIcon';

export const DishesPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, reduceQuantity, removeFromCart, getItemQuantity, totalItemsCount, totalAmount } = useCart();
  const { t } = useLanguage();

  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc'>('rating');
  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);

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
        // Fetch both dishes and CMS config to filter by admin-selected items
        const [dishesRes, cmsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/public/dishes`),
          axios.get(`${API_BASE_URL}/cms/homepage`).catch(() => ({ data: null }))
        ]);

        if (dishesRes.data.success && Array.isArray(dishesRes.data.dishes) && dishesRes.data.dishes.length > 0) {
          const allDishes = dishesRes.data.dishes;
          const featuredIds = cmsRes?.data?.cms?.flavoursOfKonaseema?.featuredItemIds;

          if (Array.isArray(featuredIds) && featuredIds.length > 0) {
            // Only show dishes that the admin has explicitly selected
            const filtered = allDishes.filter((d: any) => featuredIds.includes(d.id) || featuredIds.includes(d._id));
            setDishes(filtered);
          } else {
            // No featured items selected by admin — show empty
            setDishes([]);
          }
        } else {
          setDishes([]);
        }
      } catch (err) {
        console.warn('Error fetching dishes:', err);
        setDishes([]);
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

  const handleAddToCart = (dish: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
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

  // Filter & Sort Dishes
  const filteredDishes = dishes
    .filter((dish) => {
      const matchesSearch =
        searchQuery === '' ||
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dish.description && dish.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (dish.restaurantName && dish.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesCat = true;
      if (selectedCategory === 'Veg') {
        matchesCat = dish.type === 'veg' || dish.isVeg === true;
      } else if (selectedCategory === 'Non-Veg') {
        matchesCat = dish.type === 'non-veg' || dish.isVeg === false;
      } else if (selectedCategory === 'Konaseema Specials') {
        // All admin-selected dishes are Konaseema specials — show all of them
        matchesCat = true;
      } else if (selectedCategory === 'Sweets') {
        matchesCat = (dish.category || '').toLowerCase().includes('sweets') || (dish.category || '').toLowerCase().includes('bakery') || (dish.name || '').toLowerCase().includes('kaja') || (dish.name || '').toLowerCase().includes('laddu');
      }

      return matchesSearch && matchesCat;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
      return Number(b.rating || 4.8) - Number(a.rating || 4.8);
    });

  const categoriesList = ['All', 'Veg', 'Non-Veg', 'Konaseema Specials', 'Sweets', 'Fast Food'];

  return (
    <>
      <Helmet>
        <title>Taste the Heart of Konaseema | Foodway Gourmet Dishes</title>
        <meta
          name="description"
          content="Browse all authentic Konaseema food items, Godavari specials, handcrafted sweets, and fresh gourmet dishes. Add directly to cart!"
        />
      </Helmet>

      <div className="min-h-screen bg-stone-50 dark:bg-[#090B10] pt-20 sm:pt-24 lg:pt-24 pb-32 lg:pb-16 px-3.5 sm:px-6 lg:px-12 relative font-sans transition-colors duration-400">
        {/* Ambient Glowing Orbs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#B87B4B]/10 dark:bg-[#B87B4B]/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 space-y-4">
          {/* Header Navigation & Search Bar Section */}
          <div className="shrink-0 space-y-3.5 pt-0 pb-4 border-b border-slate-200/80 dark:border-white/10 z-20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Back Button & Title */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-10 h-10 rounded-2xl bg-white dark:bg-[#181C25] border border-slate-200/90 dark:border-white/15 text-[#B87B4B] dark:text-[#D4986A] shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer shrink-0 group"
                  aria-label="Back to Home"
                  title="Back to Home Screen"
                >
                  <ArrowLeft size={18} className="text-[#B87B4B] dark:text-[#D4986A] stroke-[2.2] group-hover:-translate-x-0.5 transition-transform" />
                </button>

                <div className="space-y-0.5 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display text-gradient-gold tracking-tight leading-tight truncate">
                    Flavours of Konaseema
                  </h1>
                  <p className="hidden sm:block text-xs sm:text-sm text-slate-500 dark:text-stone-400 font-medium truncate">
                    Discover authentic Godavari recipes, traditional sweets & village kitchen delicacies.
                  </p>
                </div>
              </div>

              {/* Search Bar Input */}
              <div className="relative w-full lg:w-80 shrink-0">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B87B4B] dark:text-[#D4986A]">
                  <Search size={18} className="stroke-[2.2]" />
                </div>
                <input
                  type="text"
                  placeholder="Search dishes, sweets, or shops..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white dark:bg-[#151921] border border-slate-200/90 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-stone-400 outline-none focus:border-[#B87B4B] focus:ring-2 focus:ring-[#B87B4B]/20 transition-all font-semibold shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Clear Search"
                  >
                    <Search size={0} className="hidden" />
                    <span className="text-xs font-bold px-1">✕</span>
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills Bar */}
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pt-2 pb-1">
              {[
                { id: 'All', label: 'All' },
                { id: 'Veg', label: 'Veg' },
                { id: 'Non-Veg', label: 'Non-Veg' },
                { id: 'Konaseema Specials', label: 'Konaseema Specials' },
                { id: 'Sweets', label: 'Sweets & Bakery' },
              ].map((cat) => {
                const isActive = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 cursor-pointer shrink-0 border ${isActive
                        ? 'bg-[#F4E6D8] dark:bg-[#B87B4B]/25 border-[#B87B4B] text-[#B87B4B] dark:text-[#D4986A] shadow-xs scale-105 font-black'
                        : 'bg-white dark:bg-[#151921] border-slate-200/90 dark:border-white/15 text-slate-700 dark:text-stone-300 hover:border-[#B87B4B]/50 hover:text-[#B87B4B]'
                      }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dishes Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-72 rounded-3xl bg-slate-200/60 dark:bg-white/5 animate-pulse border border-slate-200 dark:border-white/10" />
              ))}
            </div>
          ) : filteredDishes.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-[#151921] border border-slate-200/80 dark:border-white/10 rounded-3xl p-8 max-w-md mx-auto space-y-3 shadow-xl">
              <Utensils size={40} className="mx-auto text-slate-400 dark:text-stone-500 opacity-60" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">No Gourmet Dishes Found</h3>
              <p className="text-xs text-slate-500 dark:text-stone-400 leading-relaxed font-medium">
                No items matched your search criteria. Try changing your filters or searching for something else.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#B87B4B] via-[#C59363] to-[#A67C52] text-white font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {filteredDishes.map((dish) => {
                const isFav = !!favorites[dish.id];
                const isOutOfStock = dish.isAvailable === false || dish.status === 'disabled';
                const quantity = getItemQuantity(dish.id);

                return (
                  <motion.div
                    key={dish.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate(`/item/${dish.id || dish.menuItemId}`, { state: { dish } })}
                    className={`group bg-white dark:bg-[#151921] border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col justify-between shadow-lg hover:shadow-2xl hover:border-[#B87B4B]/40 transition-all duration-300 cursor-pointer relative overflow-hidden ${isOutOfStock ? 'opacity-75 border-rose-500/20' : ''
                      }`}
                  >
                    <div>
                      {/* Image Thumbnail Container */}
                      <div className="relative h-36 sm:h-40 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200/50 dark:border-white/10 mb-3 bg-stone-100 dark:bg-black/30 shadow-xs">
                        <ItemImageOrIcon
                          image={dish.image}
                          name={dish.name}
                          category={dish.category}
                          isVeg={dish.isVeg || dish.type === 'veg'}
                          className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isOutOfStock ? 'grayscale' : 'group-hover:scale-105'
                            }`}
                          containerClassName="w-full h-full"
                          iconSize={32}
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md backdrop-blur-md ${dish.type === 'veg' || dish.isVeg
                                ? 'bg-emerald-500 text-white'
                                : 'bg-rose-600 text-white'
                              }`}
                          >
                            {dish.type === 'veg' || dish.isVeg ? 'VEG' : 'NON-VEG'}
                          </span>

                          {isOutOfStock && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-md">
                              Out of Stock
                            </span>
                          )}
                        </div>

                        {/* Rating Badge on Product Image (Right Side) */}
                        <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1 bg-emerald-600/90 text-white px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-black shadow-md backdrop-blur-md border border-emerald-400/30">
                          <Star size={10} className="fill-white text-white" />
                          <span>{dish.rating || 4.8}</span>
                        </div>

                        {/* Wishlist Heart */}
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(dish, e)}
                          className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:text-rose-500 active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer"
                          title="Favorite"
                        >
                          <Heart
                            size={14}
                            className={isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}
                          />
                        </button>
                      </div>

                      {/* Restaurant / Store Name */}
                      <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#B87B4B] dark:text-[#D4986A] truncate mb-1 flex items-center gap-1.5">
                        <Store size={12} className="text-[#B87B4B] dark:text-[#D4986A] shrink-0" />
                        <span className="truncate">{dish.restaurantName || 'Konaseema Kitchens'}</span>
                      </div>

                      {/* Full Title */}
                      <div className="flex items-start gap-1.5 min-h-[38px]">
                        <UtensilsCrossed size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        <h3 className="font-display font-black text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-[#B87B4B] dark:group-hover:text-[#D4986A] transition-colors leading-snug">
                          {dish.name}
                        </h3>
                      </div>
                    </div>

                    {/* Price & Add to Cart Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-white/10 mt-3.5 gap-1 min-w-0">
                      <span className="text-sm sm:text-base font-black text-gradient-gold font-display shrink-0">
                        ₹{Number(dish.price).toFixed(0)}
                      </span>

                      {/* Direct Add to Cart Action */}
                      {isOutOfStock ? (
                        <button
                          disabled
                          className="font-bold text-[10px] py-1.5 px-2.5 rounded-xl flex items-center gap-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 cursor-not-allowed uppercase shrink-0"
                        >
                          <Ban size={11} />
                          <span>Unavailable</span>
                        </button>
                      ) : quantity > 0 ? (
                        <div className="flex items-center bg-white dark:bg-slate-800 border border-[#B87B4B]/40 rounded-full p-1 shadow-md shadow-slate-200/60 dark:shadow-none shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              reduceQuantity(dish.id);
                            }}
                            className="w-7.5 h-7.5 rounded-full bg-[#B87B4B]/10 hover:bg-[#B87B4B] hover:text-white text-[#B87B4B] dark:text-[#D4986A] font-black flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            title="Decrease quantity"
                          >
                            <Minus size={13} className="stroke-[3]" />
                          </button>

                          <span className="w-7 text-center font-black text-sm text-[#B87B4B] dark:text-[#D4986A]">
                            {quantity}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(dish, e);
                            }}
                            className="w-7.5 h-7.5 rounded-full bg-[#B87B4B]/10 hover:bg-[#B87B4B] hover:text-white text-[#B87B4B] dark:text-[#D4986A] font-black flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            title="Increase quantity"
                          >
                            <Plus size={13} className="stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(dish, e)}
                          className="px-4 py-1.5 rounded-2xl bg-white dark:bg-slate-800 text-[#B87B4B] dark:text-[#D4986A] border border-slate-200/90 dark:border-slate-700/80 hover:border-[#B87B4B]/50 hover:bg-[#F4E6D8]/40 active:scale-95 font-black text-xs sm:text-sm tracking-wider shadow-md shadow-slate-200/60 dark:shadow-none transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <span>ADD</span>
                          <Plus size={14} className="stroke-[3] text-[#B87B4B] dark:text-[#D4986A]" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Item Details Modal */}
        {selectedDetailItem && (
          <ItemDetailsModal
            item={selectedDetailItem}
            isOpen={!!selectedDetailItem}
            onClose={() => setSelectedDetailItem(null)}
          />
        )}
      </div>
    </>
  );
};

export default DishesPage;

