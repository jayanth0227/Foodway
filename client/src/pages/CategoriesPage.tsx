import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Grid2x2,
  ArrowLeft,
  Store,
  Star,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Flame,
  Sparkles,
  Plus,
  UtensilsCrossed,
  Tag
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { getMergedCategories, DEFAULT_CULINARY_CATEGORIES, getTranslatedCategoryName, type CategoryItem } from '../utils/categoryUtils';
import { MobileShopCardSkeleton, MobileGridSkeleton } from '../components/common/MobileSkeletonLoader';

export const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { t } = useLanguage();

  // State
  const initialCat = searchParams.get('category') || null;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCat);
  const [culinaryCategories, setCulinaryCategories] = useState<CategoryItem[]>(getMergedCategories([]));
  const [searchTerm, setSearchTerm] = useState('');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCategorySwitching, setIsCategorySwitching] = useState(false);

  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  // Reset banner index on category switch
  useEffect(() => {
    setActiveBannerIdx(0);
  }, [selectedCategory]);

  // Auto-slide banner carousel every 4.5 seconds
  useEffect(() => {
    if (!selectedCategory) return;
    const timer = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, [selectedCategory]);

  // Synchronize state with URL query param
  useEffect(() => {
    const queryCat = searchParams.get('category');
    if (queryCat) {
      setSelectedCategory(queryCat);
    }
  }, [searchParams]);

  // Fetch real database restaurants, dishes, and categories with real-time polling & status events
  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [resResp, dishResp, catResp] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/public/restaurants`),
        axios.get(`${API_BASE_URL}/public/dishes`),
        axios.get(`${API_BASE_URL}/public/categories`)
      ]);

      let resList: any[] = [];
      if (resResp.status === 'fulfilled' && resResp.value.data.success) {
        resList = resResp.value.data.restaurants || [];
      }

      let dishList: any[] = [];
      if (dishResp.status === 'fulfilled' && dishResp.value.data.success) {
        dishList = dishResp.value.data.dishes || [];
      }

      if (catResp.status === 'fulfilled' && catResp.value.data.success && Array.isArray(catResp.value.data.categories)) {
        setCulinaryCategories(getMergedCategories(catResp.value.data.categories));
      } else {
        setCulinaryCategories(getMergedCategories([]));
      }

      setRestaurants(resList);
      setDishes(dishList);
    } catch (err) {
      console.warn('Error fetching categories page data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    // Real-time status update poll every 4s
    const pollInterval = setInterval(() => fetchData(false), 4000);

    const handleStatusUpdate = () => fetchData(false);
    window.addEventListener('foodway_restaurant_status_updated', handleStatusUpdate);
    window.addEventListener('storage', handleStatusUpdate);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('foodway_restaurant_status_updated', handleStatusUpdate);
      window.removeEventListener('storage', handleStatusUpdate);
    };
  }, []);

  const handleSelectCategory = (categoryName: string) => {
    if (selectedCategory === categoryName) return;
    setIsCategorySwitching(true);
    setSelectedCategory(categoryName);
    setSearchParams({ category: categoryName });
    setTimeout(() => {
      setIsCategorySwitching(false);
    }, 380);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearCategory = () => {
    setSelectedCategory(null);
    setSearchParams({});
    setSearchTerm('');
  };

  // Filter Categories grid
  const filteredCategories = culinaryCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Selected Category Object
  const currentCategoryObj = culinaryCategories.find(
    c => c.name.toLowerCase() === (selectedCategory || '').toLowerCase()
  ) || {
    id: 'selected',
    name: selectedCategory || 'Category',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
    description: `Popular shops & specialty dishes in ${selectedCategory}`,
    keywords: [selectedCategory?.toLowerCase() || '']
  };

  // Filter shops matching selected category
  const matchingShops = restaurants.filter(shop => {
    if (!selectedCategory) return true;
    const catLower = selectedCategory.toLowerCase();

    // 1. Check shop cuisine or name
    const shopCuisine = (shop.cuisine || '').toLowerCase();
    const shopName = (shop.name || '').toLowerCase();
    const matchesCuisine = shopCuisine.includes(catLower) || shopName.includes(catLower);

    // 2. Check keywords mapping
    const keywords = currentCategoryObj.keywords || [];
    const matchesKeyword = keywords.some(kw => shopCuisine.includes(kw) || shopName.includes(kw));

    // 3. Check menu items matching category
    const shopDishes = dishes.filter(d => d.restaurantId === (shop.id || shop.restaurantId));
    const matchesDishCategory = shopDishes.some(d =>
      (d.category || '').toLowerCase().includes(catLower) ||
      keywords.some(kw => (d.category || '').toLowerCase().includes(kw) || (d.name || '').toLowerCase().includes(kw))
    );

    // Matches search term inside category view as well
    const matchesShopSearch = !searchTerm || shopName.includes(searchTerm.toLowerCase()) || shopCuisine.includes(searchTerm.toLowerCase());

    return (matchesCuisine || matchesKeyword || matchesDishCategory || restaurants.length <= 2) && matchesShopSearch;
  });

  return (
    <>
      <Helmet>
        <title>
          {selectedCategory ? `${selectedCategory} Shops & Restaurants | Foodway` : 'Discover Stores | Foodway'}
        </title>
      </Helmet>

      <div className="min-h-screen bg-bg-dark pt-20 sm:pt-28 pb-24 px-3 sm:px-6 lg:px-12 relative transition-colors">
        {/* Ambient background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">

          {/* ========================================================
              VIEW 1: SELECTED CATEGORY -> DISPLAY SHOPS & DISHES
             ======================================================== */}
          {selectedCategory ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4 sm:space-y-8 pb-20"
            >
              {/* Back Button & Top Navigation & Switcher */}
              <div className="shrink-0 space-y-3 pt-2 sm:pt-0 pb-3 border-b border-glass bg-bg-dark z-20">
                {/* Single Straight Line Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  {/* Left: Clean Icon-Only Back Button + Quick Switch Cuisine Label */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={handleClearCategory}
                      className="p-2.5 rounded-2xl bg-glass border border-glass hover:border-primary/50 text-text-primary flex items-center justify-center transition-all cursor-pointer shadow-sm group shrink-0 active:scale-95 hover:bg-glass-subtle"
                      aria-label="Back to All Categories"
                      title="Back to All Categories"
                    >
                      <ArrowLeft size={20} className="text-primary group-hover:-translate-x-0.5 transition-transform" />
                    </button>

                    <span className="text-xs sm:text-sm font-black text-gradient-gold uppercase tracking-wider">
                      Quick Switch Cuisine
                    </span>

                    <span className="text-xs font-bold text-text-muted">
                      ({culinaryCategories.length} Options)
                    </span>
                  </div>

                  {/* Right: Search Bar on Web */}
                  <div className="relative w-full sm:w-64 md:w-72 sm:ml-auto">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder={`Search in ${selectedCategory}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-glass border border-glass focus:border-primary/50 text-text-primary text-[15px] sm:text-xs font-semibold focus:outline-none transition-all placeholder:text-text-muted shadow-sm"
                    />
                  </div>
                </div>

                {/* Category Quick Switcher Slider */}
                <div className="pt-1">
                  <div
                    onWheel={(e) => {
                      if (e.deltaY !== 0) {
                        e.currentTarget.scrollLeft += e.deltaY * 1.5;
                      }
                    }}
                    className="flex items-center gap-4 sm:gap-6 overflow-x-auto py-2.5 scroll-smooth -mx-3 px-3 sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {culinaryCategories.map((cat) => {
                      const active = (selectedCategory || '').toLowerCase() === cat.name.toLowerCase();

                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleSelectCategory(cat.name)}
                          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group active:scale-95 transition-all relative"
                        >
                          {/* Pure Borderless Dish Image Container matching Swiggy */}
                          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shrink-0 transition-all duration-300 shadow-md ${
                            active
                              ? "scale-105 shadow-luxury ring-2 ring-primary ring-offset-2 ring-offset-bg-dark -translate-y-0.5"
                              : "opacity-90 hover:opacity-100 hover:scale-105 hover:-translate-y-0.5 shadow-sm"
                          }`}>
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className="w-full h-full object-cover shrink-0 group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>

                          {/* Swiggy Style Clean Typography */}
                          <span className={`text-xs sm:text-sm font-extrabold tracking-tight text-center truncate max-w-[82px] sm:max-w-[105px] transition-all ${
                            active
                              ? "text-primary font-black scale-105"
                              : "text-text-primary group-hover:text-primary"
                          }`}>
                            {getTranslatedCategoryName(cat.name, t)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Matching Shops & Restaurants Grid */}
              <div className="space-y-4 sm:space-y-5">
                  <div className="flex items-center justify-between gap-2 border-b border-glass pb-3">
                    <h2 className="text-base sm:text-xl font-black font-display text-text-primary flex items-center gap-2 truncate">
                      <span className="text-gradient-gold truncate">{selectedCategory} Shops</span>
                    </h2>
                    <span className="text-[11px] sm:text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 shrink-0 whitespace-nowrap">
                      {matchingShops.length} Found
                    </span>
                  </div>

                  {loading || isCategorySwitching ? (
                    <MobileShopCardSkeleton count={6} />
                  ) : matchingShops.length === 0 ? (
                    <div className="py-12 sm:py-16 text-center glass-panel border border-glass rounded-3xl p-6 sm:p-8 max-w-md mx-auto space-y-4 shadow-sm">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
                        <UtensilsCrossed size={24} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base sm:text-lg font-bold text-text-primary">
                          No Shops Found in {selectedCategory}
                        </h3>
                        <p className="text-xs text-text-muted">
                          No partner kitchens match this category right now. Browse other cuisines.
                        </p>
                      </div>
                      <button
                        onClick={handleClearCategory}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-black font-extrabold text-xs shadow-md hover:scale-105 transition-all cursor-pointer"
                      >
                        Browse All Categories
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {matchingShops.map((shop) => {
                        const shopId = shop.id || shop.restaurantId || 'res-1';
                        const shopName = shop.name || shop.restaurantName || 'Gourmet Food Hub';
                        const shopImage = shop.image || shop.logo || shop.bannerImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800';
                        const shopRating = shop.rating || 4.8;
                        const shopTime = shop.deliveryTime || '20-30 min';
                        const shopCuisine = shop.cuisine || selectedCategory || '';

                        const isClosed = shop.isOpen === false || shop.isOpen === 'false' || shop.status === 'closed' || shop.status === 'inactive' || shop.status === 'INACTIVE' || shop.status === 'OFFLINE' || shop.status === 'offline' || shop.status === 'CLOSED';
                        const isOpen = !isClosed;

                        return (
                          <motion.div
                            key={shopId}
                            initial={false}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => navigate(`/restaurants/${shopId}`)}
                            className={`bg-bg-cardSec border border-glass sm:hover:border-primary/50 rounded-2xl sm:rounded-3xl overflow-hidden shadow-luxury sm:hover:shadow-luxury-hover sm:hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer relative ${
                              !isOpen ? 'opacity-90' : ''
                            }`}
                          >
                            <div>
                              {/* Shop Cover Image Container */}
                              <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
                                <img
                                  src={shopImage}
                                  alt={shopName}
                                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                                    !isOpen ? 'filter grayscale opacity-75' : ''
                                  }`}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-80 pointer-events-none" />

                                {/* Dynamic Cuisine Badge */}
                                {shopCuisine && (
                                  <div className="absolute top-2.5 left-2.5 z-10">
                                    <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-black text-primary border border-primary/30 uppercase tracking-wider flex items-center gap-1 shadow-md">
                                      <Sparkles size={11} />
                                      <span className="truncate max-w-[110px]">{shopCuisine}</span>
                                    </span>
                                  </div>
                                )}

                                {/* Open/Closed Status Badge on Top Right */}
                                <div className="absolute top-2.5 right-2.5 z-10">
                                  <span className={`px-2.5 py-1 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md border ${
                                    isOpen
                                      ? 'bg-emerald-600/90 text-white border-emerald-400/40'
                                      : 'bg-rose-600/95 text-white border-rose-400/40'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-300 animate-pulse' : 'bg-white'}`} />
                                    <span>{isOpen ? 'OPEN NOW' : 'CLOSED'}</span>
                                  </span>
                                </div>

                                {/* Dynamic Delivery Time & Rating Badge on Bottom */}
                                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                                  {shopTime && (
                                    <span className="text-[10px] font-extrabold text-white bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-black/40 flex items-center gap-1.5 shadow-sm">
                                      <Clock size={11} className="text-primary" />
                                      <span>{shopTime}</span>
                                    </span>
                                  )}

                                  {shopRating && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center gap-1 shadow-md">
                                      <Star size={10} className="fill-white text-white" />
                                      <span>{shopRating}</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Shop Info Content */}
                              <div className="p-3.5 sm:p-4 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h3 className="text-sm sm:text-base font-black font-display text-text-primary group-hover:text-primary transition-colors line-clamp-1">
                                    {shopName}
                                  </h3>
                                </div>

                                {shop.address && (
                                  <p className="text-[11px] text-text-muted flex items-center gap-1 font-medium truncate">
                                    <MapPin size={12} className="text-primary shrink-0" />
                                    <span className="truncate">{shop.address}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* CTA Action Button */}
                            <div className="p-3.5 sm:p-4 pt-0.5 flex items-center justify-between border-t border-glass/40 mt-2">
                              <span className={`text-[10px] font-extrabold uppercase flex items-center gap-1 ${
                                isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                <span>{isOpen ? 'Accepting Orders' : 'Currently Closed'}</span>
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/restaurants/${shopId}`);
                                }}
                                className={`px-3.5 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-wider shadow-xs active:scale-[0.96] transition-all flex items-center justify-center cursor-pointer ${
                                  isOpen
                                    ? 'bg-primary text-black hover:brightness-105'
                                    : 'bg-glass border border-glass text-text-muted hover:text-text-primary'
                                }`}
                              >
                                <span>{t('view_menu')}</span>
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
            </motion.div>
          ) : (
            /* ========================================================
               VIEW 2: ALL CATEGORIES GRID VIEW
               ======================================================== */
            <div className="space-y-4 sm:space-y-8 pb-20">
              {/* Header Banner - Fixed Header on Mobile */}
              <div className="shrink-0 space-y-3 pt-2 sm:pt-0 pb-4 border-b border-glass bg-bg-dark z-20">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Standalone Back Button + Clean Title & Subheading Stack */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Standalone Back Button */}
                    <button
                      onClick={() => navigate('/')}
                      className="p-2.5 sm:p-3 rounded-2xl bg-glass border border-glass hover:border-primary/50 text-text-primary transition-all active:scale-95 shadow-sm group shrink-0 cursor-pointer flex items-center justify-center"
                      aria-label="Back to Home"
                      title="Back to Home Screen"
                    >
                      <ArrowLeft size={19} className="text-primary group-hover:-translate-x-0.5 transition-transform" />
                    </button>

                    {/* Title & Subheading Stack */}
                    <div className="space-y-0.5 min-w-0">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display text-gradient-gold leading-tight">
                        Discover Stores
                      </h1>
                      <p className="text-xs sm:text-sm text-text-secondary font-medium truncate">
                        {t('explore_curated_categories')}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Category Search Bar */}
                  <div className="relative w-full sm:w-64 md:w-72 lg:ml-auto shrink-0">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder={t('search_categories_dishes')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-2xl bg-glass border border-glass focus:border-primary/50 text-text-primary text-[15px] sm:text-xs font-bold focus:outline-none transition-all placeholder:text-text-muted shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Main Categories Grid */}
              <div>
                {loading ? (
                  <MobileGridSkeleton count={8} />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {filteredCategories.map((category) => (
                    <motion.div
                      key={category.id}
                      initial={false}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleSelectCategory(category.name)}
                      className="group cursor-pointer glass-panel border border-glass sm:hover:border-primary/60 rounded-2xl sm:rounded-3xl overflow-hidden p-3 sm:p-4 transition-all duration-300 sm:hover:shadow-luxury sm:hover:-translate-y-1.5 active:scale-[0.98] flex flex-col justify-between relative"
                    >
                      <div>
                        {/* Image Thumbnail */}
                        <div className="relative aspect-[16/10] rounded-xl sm:rounded-2xl overflow-hidden mb-2.5 sm:mb-4 bg-black/40">
                          <img
                            src={category.image}
                            alt={category.name}
                            className="w-full h-full object-cover sm:group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                        </div>

                        {/* Content */}
                        <div className="space-y-0.5 sm:space-y-1 px-0.5">
                          <h3 className="text-xs sm:text-base font-black font-display text-text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                            <span className="truncate">{getTranslatedCategoryName(category.name, t)}</span>
                          </h3>
                          <p className="text-[10px] sm:text-xs text-text-muted line-clamp-1 sm:line-clamp-2 leading-tight sm:leading-relaxed">
                            {category.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-glass flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-primary">
                        <span className="truncate">Explore Shops</span>
                        <ArrowLeft size={13} className="rotate-180 group-hover:translate-x-1 transition-transform shrink-0" />
                      </div>
                    </motion.div>
                  ))}
                </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default CategoriesPage;
