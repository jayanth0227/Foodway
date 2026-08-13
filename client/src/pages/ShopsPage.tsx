import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Search, MapPin, Star, Clock, Store, Plus, Heart, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { MobileShopCardSkeleton } from '../components/common/MobileSkeletonLoader';
import { useLanguage } from '../context/LanguageContext';
import { getWishlist, toggleWishlistItem } from '../utils/wishlistUtils';

export const ShopsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    const list = getWishlist();
    const favMap: Record<string, boolean> = {};
    list.forEach(i => { favMap[i.id] = true; });
    return favMap;
  });

  const fetchShops = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/public/restaurants`);
      const listData = response.data.shops || response.data.restaurants;
      if (response.data.success && Array.isArray(listData)) {
        setShops(listData);
      }
    } catch (err) {
      console.error('Failed to fetch shops from DB:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops(true);

    const pollInterval = setInterval(() => fetchShops(false), 4000);
    const handleStatusUpdate = () => fetchShops(false);
    window.addEventListener('foodway_restaurant_status_updated', handleStatusUpdate);
    window.addEventListener('storage', handleStatusUpdate);

    const syncWishlist = () => {
      const list = getWishlist();
      const favMap: Record<string, boolean> = {};
      list.forEach(i => { favMap[i.id] = true; });
      setFavorites(favMap);
    };

    window.addEventListener('foodway_wishlist_updated', syncWishlist);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('foodway_restaurant_status_updated', handleStatusUpdate);
      window.removeEventListener('storage', handleStatusUpdate);
      window.removeEventListener('foodway_wishlist_updated', syncWishlist);
    };
  }, []);

  const toggleFav = (shop: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const shopId = shop.id || shop.shopId || shop.restaurantId;
    toggleWishlistItem({
      id: shopId,
      name: shop.name || shop.shopName || 'Partner Store',
      image: shop.image || shop.logo || shop.bannerImage || '',
      rating: shop.rating || 4.5,
      type: 'restaurant',
    });
  };

  const categories = ['All', 'Sweets & Bakery', 'Groceries', 'Fruits & Vegetables', 'Dairy & Milk', 'Beverages', 'Prepared Food'];

  const filteredShops = shops.filter((shop) => {
    const sName = (shop.name || shop.shopName || '').toLowerCase();
    const sCat = (shop.shopType || shop.category || shop.cuisine || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = sName.includes(q) || sCat.includes(q);
    const matchesCat = selectedCategory === 'All' || sCat.includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  return (
    <>
      <Helmet>
        <title>Explore Shops & Supermarkets | MK Delivery Services</title>
        <meta name="description" content="Browse all verified partner shops, sweets stores, vegetable marts, dairies, and supermarkets." />
      </Helmet>

      <div className="min-h-screen bg-bg-dark pt-24 sm:pt-32 pb-24 sm:pb-16 px-3.5 sm:px-6 lg:px-12 relative overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-5 sm:space-y-8 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 border-b border-glass pb-4 sm:pb-6 pt-2 sm:pt-4">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 sm:p-2.5 rounded-2xl bg-glass border border-glass text-primary hover:border-primary/50 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
                  aria-label="Back to Home"
                  title="Back to Home Screen"
                >
                  <ArrowLeft size={20} className="text-primary" />
                </button>

                <h1 className="text-2xl sm:text-5xl font-black font-display text-gradient-gold tracking-tight leading-tight">
                  Shops & Supermarkets
                </h1>
              </div>

              <p className="text-xs sm:text-sm text-text-muted font-medium max-w-xl leading-relaxed">
                Explore all verified partner stores registered in our quick-commerce network. View live statuses, item variants, and order directly.
              </p>
            </div>

            <div className="flex items-center justify-end shrink-0 sm:self-end">
              <span className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-glass border border-glass text-[11px] sm:text-xs font-bold text-text-primary shadow-xs">
                {shops.length} Registered Merchant Stores
              </span>
            </div>
          </div>

          <div className="glass-panel border border-glass rounded-2xl p-3.5 sm:p-6 flex flex-col md:flex-row gap-3.5 sm:gap-4 items-center justify-between shadow-luxury">
            <div className="relative w-full md:w-96">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search shops by name, category, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-bg-dark/70 border border-glass text-xs sm:text-sm text-text-primary placeholder:text-text-muted/60 outline-none focus:border-primary/50 transition-all font-semibold"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${selectedCategory === cat
                    ? 'bg-primary text-black font-black shadow-md'
                    : 'bg-glass hover:bg-glass-subtle text-text-secondary border border-glass'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <MobileShopCardSkeleton count={6} />
          ) : filteredShops.length === 0 ? (
            <div className="text-center py-20 glass-panel border border-glass rounded-3xl p-12 max-w-md mx-auto space-y-3">
              <Store size={48} className="mx-auto text-text-muted opacity-40" />
              <h3 className="font-bold text-xl text-text-primary">No Merchant Stores Found</h3>
              <p className="text-xs text-text-muted">
                Try clearing your search query or choosing a different shop category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {filteredShops.map((shop) => {
                const shopId = shop.id || shop.shopId || shop.restaurantId;
                const shopName = shop.shopName || shop.name || 'Partner Store';
                const shopImage = shop.image || shop.logo || shop.bannerImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800';
                const shopCat = shop.shopType || shop.category || shop.cuisine || 'General Store';
                const shopRating = shop.rating || 4.5;
                const shopTime = shop.deliveryTime || '15-25 MINS';
                const isClosed = shop.isOpen === false || shop.isOpen === 'false' || shop.status === 'closed' || shop.status === 'inactive';
                const isOpen = !isClosed;
                const isFav = !!favorites[shopId];

                return (
                  <div
                    key={shopId}
                    onClick={() => navigate(`/shops/${shopId}`)}
                    className="group relative flex flex-col justify-between overflow-hidden cursor-pointer rounded-2xl sm:rounded-3xl bg-white dark:bg-bg-dark border border-slate-200/80 dark:border-glass shadow-md hover:shadow-luxury transition-all duration-300 hover:-translate-y-1.5 active:scale-[0.98]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-bg-dark shrink-0">
                      <img
                        src={shopImage}
                        alt={shopName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />

                      <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10">
                        <button
                          type="button"
                          onClick={(e) => toggleFav(shop, e)}
                          className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all shadow-md cursor-pointer"
                          title="Favorite"
                        >
                          <Heart size={15} className={isFav ? "fill-rose-500 text-rose-500" : "text-white"} />
                        </button>
                      </div>

                      <div className="absolute bottom-0 right-0 z-10 bg-white dark:bg-[#1a1715] px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-tl-xl sm:rounded-tl-2xl border-t border-l border-slate-200 dark:border-glass shadow-xl text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-1.5 text-slate-900 dark:text-white font-extrabold text-[11px] sm:text-xs tracking-tight">
                          <Clock size={12} className="text-primary stroke-[2.5]" />
                          <span className="text-slate-900 dark:text-white font-black">{shopTime.toUpperCase()}</span>
                        </div>
                        <div className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider mt-0.5 flex items-center justify-end gap-1 ${isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          <span>{isOpen ? 'OPEN NOW' : 'CLOSED'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-5 flex flex-col justify-between flex-grow space-y-2.5 sm:space-y-3">
                      <div>
                        <h3 className="text-base sm:text-lg md:text-xl font-bold font-display text-slate-900 dark:text-white group-hover:text-primary transition-colors tracking-tight line-clamp-1">
                          {shopName}
                        </h3>

                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold mt-1">
                          <span className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                            <Star size={9} className="fill-white text-white" strokeWidth={0} />
                          </span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{shopRating}</span>
                          <span className="text-slate-400 dark:text-slate-500 font-bold">•</span>
                          <span className="truncate text-slate-800 dark:text-slate-200 font-bold">{shop.address || 'Local Market'}</span>
                        </div>
                      </div>

                      <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-glass flex items-center justify-between sm:justify-end">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[120px] sm:hidden">
                          {shopCat}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/shops/${shopId}`);
                          }}
                          className="px-3.5 py-1.5 sm:px-4 sm:py-1.5 rounded-full bg-white dark:bg-bg-dark border border-primary/70 hover:border-primary text-primary font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer"
                        >
                          <Plus size={14} className="text-primary stroke-[2.5]" />
                          <span>View Store</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ShopsPage;
