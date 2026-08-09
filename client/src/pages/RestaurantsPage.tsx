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

export const RestaurantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All');
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    const list = getWishlist();
    const favMap: Record<string, boolean> = {};
    list.forEach(i => { favMap[i.id] = true; });
    return favMap;
  });

  const fetchRestaurants = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/public/restaurants`);
      if (response.data.success && Array.isArray(response.data.restaurants)) {
        setRestaurants(response.data.restaurants);
      }
    } catch (err) {
      console.error('Failed to fetch restaurants from DB:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants(true);

    // Auto poll every 4 seconds for real-time merchant status updates without page refresh
    const pollInterval = setInterval(() => fetchRestaurants(false), 4000);

    const handleStatusUpdate = () => fetchRestaurants(false);
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

  const toggleFav = (res: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const resId = res.id || res.restaurantId;
    toggleWishlistItem({
      id: resId,
      name: res.name || 'Partner Kitchen',
      image: res.image || res.logo || res.bannerImage || '',
      rating: res.rating || 4.5,
      type: 'restaurant',
    });
  };

  // Filtered Restaurants
  const cuisines = ['All', ...Array.from(new Set(restaurants.map(r => r.cuisine).filter(Boolean)))];

  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.cuisine && r.cuisine.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCuisine = selectedCuisine === 'All' || r.cuisine === selectedCuisine;
    return matchesSearch && matchesCuisine;
  });

  return (
    <>
      <Helmet>
        <title>Available Partner Establishments | MK Delivery Services</title>
        <meta name="description" content="Browse all active restaurants and dining establishments available in our live database." />
      </Helmet>

      <div className="min-h-screen bg-bg-dark pt-24 sm:pt-32 pb-24 sm:pb-16 px-3.5 sm:px-6 lg:px-12 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-5 sm:space-y-8 relative z-10">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 border-b border-glass pb-4 sm:pb-6 pt-2 sm:pt-4">
            <div className="space-y-2 sm:space-y-3">

              {/* Title & Back Arrow on the exact same horizontal line */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 sm:p-2.5 rounded-2xl bg-glass border border-glass text-primary hover:border-primary/50 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
                  aria-label="Back"
                  title="Back"
                >
                  <ArrowLeft size={20} className="text-primary" />
                </button>

                <h1 className="text-2xl sm:text-5xl font-black font-display text-gradient-gold tracking-tight leading-tight">
                  {t('top_rated_restaurants')}
                </h1>
              </div>

              <p className="text-xs sm:text-sm text-text-muted font-medium max-w-xl leading-relaxed">
                Explore all verified partner restaurants registered in our system. View live statuses, menus, and order directly.
              </p>
            </div>

            {/* Registered Establishments Pill - Right Aligned */}
            <div className="flex items-center justify-end shrink-0 sm:self-end">
              <span className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-glass border border-glass text-[11px] sm:text-xs font-bold text-text-primary shadow-xs">
                {restaurants.length} Registered Establishments
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="glass-panel border border-glass rounded-2xl p-3.5 sm:p-6 flex flex-col md:flex-row gap-3.5 sm:gap-4 items-center justify-between shadow-luxury">
            <div className="relative w-full md:w-96">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search restaurant by name, location, or cuisine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 sm:py-3 text-[15px] sm:text-sm font-semibold rounded-xl bg-bg-dark/80 border border-glass focus:border-primary/50 text-text-primary placeholder-text-muted/60 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider shrink-0 mr-1">Cuisine:</span>
              {cuisines.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCuisine(c)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCuisine === c ? 'bg-primary text-black font-extrabold shadow-md' : 'bg-glass hover:bg-glass-subtle border border-glass text-text-secondary'
                    }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Restaurant Grid */}
          {loading ? (
            <MobileShopCardSkeleton count={6} />
          ) : filteredRestaurants.length === 0 ? (
            <div className="py-20 text-center glass-panel border border-glass rounded-3xl p-12 max-w-lg mx-auto space-y-4">
              <Store size={48} className="mx-auto text-text-muted opacity-50" />
              <h3 className="text-xl font-bold font-display text-text-primary">No Restaurants Found</h3>
              <p className="text-xs text-text-muted">
                No active restaurants match your search. New partner establishments registered in the system will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {filteredRestaurants.map((r) => {
                const resId = r.id || r.restaurantId;
                const resName = r.name || 'Partner Kitchen';
                const resImage = r.image || r.logo || r.bannerImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800';
                const resCuisine = r.cuisine || 'Multi-Cuisine';
                const resRating = r.rating || 4.5;
                const resTime = r.deliveryTime || '20-30 MINS';
                const isClosed = r.isOpen === false || r.isOpen === 'false' || r.status === 'closed' || r.status === 'inactive' || r.status === 'INACTIVE' || r.status === 'OFFLINE' || r.status === 'offline' || r.status === 'CLOSED';
                const isOpen = !isClosed;
                const isFav = !!favorites[resId];




                return (
                  <motion.div
                    key={resId}
                    onClick={() => navigate(`/restaurants/${resId}`)}
                    whileHover={{ y: -6 }}
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
                          onClick={(e) => toggleFav(r, e)}
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
                          <span className="truncate text-slate-800 dark:text-slate-200 font-bold">{r.address || 'Konaseema Central'}</span>
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
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RestaurantsPage;
