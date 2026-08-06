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
import { getMergedCategories, DEFAULT_CULINARY_CATEGORIES, type CategoryItem } from '../utils/categoryUtils';
import { MobileShopCardSkeleton, MobileGridSkeleton } from '../components/common/MobileSkeletonLoader';

export const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();

  // State
  const initialCat = searchParams.get('category') || null;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCat);
  const [culinaryCategories, setCulinaryCategories] = useState<CategoryItem[]>(getMergedCategories([]));
  const [searchTerm, setSearchTerm] = useState('');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch real database restaurants, dishes, and categories
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
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
      setRestaurants([]);
      setCulinaryCategories(getMergedCategories([]));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSearchParams({ category: categoryName });
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
          {selectedCategory ? `${selectedCategory} Shops & Restaurants | Foodway` : 'Food Categories & Cuisines | Foodway'}
        </title>
      </Helmet>

      <div className="min-h-screen bg-bg-dark pt-20 sm:pt-28 pb-4 sm:pb-20 px-3 sm:px-6 lg:px-12 relative overflow-hidden transition-colors">
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
              className="flex flex-col h-[calc(100vh-88px)] sm:h-auto overflow-hidden sm:overflow-visible space-y-3 sm:space-y-8"
            >
              {/* Back Button & Top Navigation & Switcher - Strictly Fixed Header on Mobile */}
              <div className="shrink-0 space-y-3 pt-2 sm:pt-0 pb-3 border-b border-glass bg-bg-dark z-20">
                <div className="flex items-center sm:justify-between gap-2.5 sm:gap-4">
                  <button
                    onClick={handleClearCategory}
                    className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-glass border border-glass hover:border-primary/50 text-text-primary text-xs font-bold transition-all cursor-pointer shadow-sm group shrink-0 active:scale-95"
                    title="Back to All Categories"
                  >
                    <ArrowLeft size={16} className="text-primary group-hover:-translate-x-0.5 transition-transform" />
                    <span>
                      <span className="sm:hidden">All Categories</span>
                      <span className="hidden sm:inline">Back to All Categories</span>
                    </span>
                  </button>

                  {/* Search inside category view */}
                  <div className="relative flex-1 sm:flex-none sm:w-80">
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">
                      Quick Switch Cuisine
                    </span>
                    <span className="text-[11px] sm:text-xs text-text-muted">
                      {culinaryCategories.length} Options
                    </span>
                  </div>

                  {/* MOBILE ONLY: Swiggy/Zomato Food Avatar Circular Horizontal Story Slider */}
                  <div
                    className="flex sm:hidden items-center gap-2.5 overflow-x-auto pb-1 pt-1 scroll-smooth -mx-1 px-1 [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {culinaryCategories.map((cat) => {
                      const active = (selectedCategory || '').toLowerCase() === cat.name.toLowerCase();

                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleSelectCategory(cat.name)}
                          className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                        >
                          <div className={`relative w-11 h-11 min-w-[44px] min-h-[44px] rounded-full overflow-hidden transition-all duration-300 ${active
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-bg-dark scale-105 shadow-luxury"
                            : "opacity-80 hover:opacity-100 border border-glass"
                            }`}>
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className={`absolute inset-0 transition-opacity ${active ? "bg-primary/10" : "bg-black/20"
                              }`} />
                          </div>
                          <span className={`text-[9.5px] font-black text-center truncate max-w-[56px] leading-tight transition-colors ${active ? "text-primary" : "text-text-muted group-hover:text-text-primary"
                            }`}>
                            {cat.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* DESKTOP ONLY: Standard Pill Button Slider */}
                  <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
                    {culinaryCategories.map((cat) => {
                      const active = (selectedCategory || '').toLowerCase() === cat.name.toLowerCase();

                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleSelectCategory(cat.name)}
                          className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-2 cursor-pointer border ${active
                            ? "bg-gradient-to-r from-primary via-primary-dark to-secondary text-black border-primary shadow-luxury scale-[1.02]"
                            : "bg-glass text-text-secondary border-glass hover:border-primary/50 hover:text-primary shadow-sm"
                            }`}
                        >
                          {active && <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />}
                          <span className="whitespace-nowrap">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Matching Shops & Restaurants Grid - Scrollable ONLY on Mobile */}
              <div className="flex-1 overflow-y-auto sm:overflow-visible pb-24 sm:pb-0 pt-1 scroll-smooth [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                <div className="space-y-4 sm:space-y-5">
                  <div className="flex items-center justify-between gap-2 border-b border-glass pb-3">
                    <h2 className="text-base sm:text-xl font-black font-display text-text-primary flex items-center gap-2 truncate">
                      <span className="text-gradient-gold truncate">{selectedCategory} Shops</span>
                    </h2>
                    <span className="text-[11px] sm:text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 shrink-0 whitespace-nowrap">
                      {matchingShops.length} Found
                    </span>
                  </div>

                  {loading ? (
                    <MobileShopCardSkeleton count={3} />
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
                        const shopImage = shop.image || shop.logo || shop.bannerImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800';
                        const shopRating = shop.rating || 4.8;
                        const shopTime = shop.deliveryTime || '20-30 min';

                        return (
                          <motion.div
                            key={shopId}
                            initial={false}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => navigate(`/restaurants/${shopId}`)}
                            className="glass-panel border border-glass sm:hover:border-primary/50 rounded-2xl sm:rounded-3xl overflow-hidden shadow-luxury sm:hover:shadow-luxury-hover sm:hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                          >
                            <div>
                              {/* Shop Cover Image */}
                              <div className="relative aspect-[16/9] sm:aspect-[16/9] max-h-44 sm:max-h-56 overflow-hidden bg-black/40">
                                <img
                                  src={shopImage}
                                  alt={shopName}
                                  className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                                {/* Rating Badge */}
                                <div className="absolute top-2.5 right-2.5">
                                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-600 text-white font-black text-[11px] sm:text-xs flex items-center gap-1 shadow-md">
                                    <Star size={10} className="fill-white text-white" />
                                    <span>{shopRating}</span>
                                  </span>
                                </div>

                                {/* Delivery Time Badge */}
                                <div className="absolute bottom-2.5 right-2.5">
                                  <span className="text-[10px] sm:text-[11px] font-bold text-white bg-black/75 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-white/10 flex items-center gap-1">
                                    <Clock size={10} className="text-primary" />
                                    <span>{shopTime}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Shop Information */}
                              <div className="p-3.5 sm:p-5 space-y-2.5 sm:space-y-3">
                                <div className="space-y-0.5">
                                  <h3 className="text-base sm:text-lg font-black text-text-primary group-hover:text-primary transition-colors truncate">
                                    {shopName}
                                  </h3>
                                  <p className="text-[11px] sm:text-xs text-text-muted flex items-center gap-1 font-medium truncate">
                                    <MapPin size={11} className="text-primary shrink-0" />
                                    <span className="truncate">{shop.address || 'Konaseema Central'}</span>
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* CTA Button */}
                            <div className="p-3.5 sm:p-5 pt-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/restaurants/${shopId}`);
                                }}
                                className="w-full py-2 rounded-xl bg-white dark:bg-bg-dark border border-primary/70 hover:border-primary text-primary font-extrabold text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                              >
                                <Plus size={14} className="text-primary stroke-[2.5]" />
                                <span>View Menu</span>
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            /* ========================================================
               VIEW 2: ALL CATEGORIES GRID VIEW
               ======================================================== */
            <div className="flex flex-col h-[calc(100vh-88px)] sm:h-auto overflow-hidden sm:overflow-visible space-y-3 sm:space-y-8">
              {/* Header Banner - Strictly Fixed Header on Mobile */}
              <div className="shrink-0 space-y-2 pt-2 sm:pt-0 pb-3 border-b border-glass bg-bg-dark z-20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => navigate('/')}
                      className="md:hidden p-2 rounded-full bg-glass border border-glass hover:border-primary/50 text-text-primary transition-all active:scale-95 shadow-sm group shrink-0 cursor-pointer"
                      aria-label="Back to Home"
                      title="Back to Home"
                    >
                      <ArrowLeft size={18} className="text-primary group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <h1 className="text-2xl sm:text-4xl lg:text-4xl font-black font-display text-gradient-gold">
                      Explore Categories
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary max-w-xl leading-relaxed">
                    Select a category to view all partner shops, sweets stores, bakeries, and restaurants offering your favorite food.
                  </p>
                </div>

                {/* Category Search Bar */}
                <div className="relative w-full md:w-80">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search Food, Sweets, Bakery..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-2xl bg-glass border border-glass focus:border-primary/50 text-text-primary text-[15px] sm:text-xs font-bold focus:outline-none transition-all placeholder:text-text-muted shadow-sm"
                  />
                </div>
              </div>

              {/* Main Categories Grid - Scrollable ONLY on Mobile */}
              <div className="flex-1 overflow-y-auto sm:overflow-visible pb-24 sm:pb-0 pt-1 scroll-smooth [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
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
                            <span className="truncate">{category.name}</span>
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
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default CategoriesPage;
