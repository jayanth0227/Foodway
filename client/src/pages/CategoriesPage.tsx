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
  Minus,
  UtensilsCrossed,
  Tag,
  SlidersHorizontal,
  Filter,
  X
} from 'lucide-react';
import axios from 'axios';
import shopService from '../services/shop.service';
import { API_BASE_URL } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { getMergedCategories, DEFAULT_CULINARY_CATEGORIES, getTranslatedCategoryName, type CategoryItem } from '../utils/categoryUtils';
import { MobileShopCardSkeleton, MobileGridSkeleton, DishCardSkeleton } from '../components/common/MobileSkeletonLoader';

export const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cartItems, addToCart, getItemQuantity, reduceQuantity, totalAmount, totalItemsCount, setCartOpen } = useCart();
  const { t } = useLanguage();

  // State
  const getSafeCategoryFromUrl = () => {
    try {
      const raw = searchParams.get('category');
      return raw ? decodeURIComponent(raw) : null;
    } catch {
      return searchParams.get('category') || null;
    }
  };
  const [selectedCategory, setSelectedCategory] = useState<string | null>(getSafeCategoryFromUrl());
  const [culinaryCategories, setCulinaryCategories] = useState<CategoryItem[]>(getMergedCategories([]));
  const [searchTerm, setSearchTerm] = useState('');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCategorySwitching, setIsCategorySwitching] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [selectedVariantsMap, setSelectedVariantsMap] = useState<Record<string, any>>({});

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

  // Synchronize state with URL query param safely
  useEffect(() => {
    const catFromUrl = getSafeCategoryFromUrl();
    if (catFromUrl && catFromUrl !== selectedCategory) {
      setSelectedCategory(catFromUrl);
    }
  }, [searchParams]);

  // Fetch initial restaurant categories & dishes
  useEffect(() => {
    const loadCategoriesData = async () => {
      setLoading(true);
      try {
        const [catResp, resList, dishResp] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/public/categories`),
          shopService.getPublicRestaurants(),
          axios.get(`${API_BASE_URL}/public/dishes`)
        ]);

        if (catResp.status === 'fulfilled' && catResp.value.data?.categories) {
          setCulinaryCategories(getMergedCategories(catResp.value.data.categories));
        } else {
          setCulinaryCategories(getMergedCategories([]));
        }

        if (resList.status === 'fulfilled') {
          setRestaurants(resList.value);
        }

        if (dishResp.status === 'fulfilled') {
          const dishData = dishResp.value.data;
          const list = Array.isArray(dishData) ? dishData : (dishData?.dishes || dishData?.data || []);
          setDishes(list);
        }
      } catch (err) {
        console.error('Error loading category data:', err);
        setCulinaryCategories(getMergedCategories([]));
      } finally {
        setLoading(false);
      }
    };

    loadCategoriesData();
  }, []);

  const handleSelectCategory = (catName: string) => {
    setIsCategorySwitching(true);
    setSelectedCategory(catName);
    setSearchParams({ category: catName });
    setTimeout(() => setIsCategorySwitching(false), 200);
  };

  const handleClearCategory = () => {
    setSelectedCategory(null);
    setSearchParams({});
  };

  const currentCategoryObj = culinaryCategories.find(
    c => c.name.toLowerCase() === (selectedCategory || '').toLowerCase()
  ) || {
    name: selectedCategory || '',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
    description: `Explore delicious ${selectedCategory} dishes from top local restaurants`,
    keywords: [selectedCategory?.toLowerCase() || '']
  };

  // Filter dishes matching selected category & search & dietary filter
  const matchingDishes = dishes.filter(dish => {
    if (!selectedCategory) return true;
    const catLower = selectedCategory.toLowerCase();
    const dishCat = (dish.category || dish.foodCategory || '').toLowerCase();
    const dishName = (dish.name || dish.foodName || '').toLowerCase();
    const dishDesc = (dish.description || '').toLowerCase();
    const shopName = (dish.restaurantName || '').toLowerCase();
    const isVeg = dish.isVeg !== false;

    const catKeywords = currentCategoryObj?.keywords || [catLower];

    const matchesCategory = dishCat === catLower ||
      dishCat.includes(catLower) ||
      catLower.includes(dishCat) ||
      catKeywords.some(k => dishCat.includes(k) || dishName.includes(k) || dishDesc.includes(k));

    const matchesSearch = !searchTerm ||
      dishName.includes(searchTerm.toLowerCase()) ||
      dishDesc.includes(searchTerm.toLowerCase()) ||
      shopName.includes(searchTerm.toLowerCase());

    const matchesDietary = dietaryFilter === 'all' ||
      (dietaryFilter === 'veg' ? isVeg : !isVeg);

    return matchesCategory && matchesSearch && matchesDietary;
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
              {/* Top Navigation Bar & Search & Dietary Filters */}
              <div className="shrink-0 space-y-3 pt-2 sm:pt-0 pb-3 border-b border-glass bg-bg-dark/80 backdrop-blur-md sticky top-16 z-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Back Button & Category Name */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate('/categories')}
                      className="p-2.5 rounded-2xl bg-glass border border-glass hover:border-primary/50 text-text-primary flex items-center justify-center transition-all cursor-pointer shadow-sm group shrink-0 active:scale-95 hover:bg-glass-subtle"
                      aria-label="Back to Categories"
                    >
                      <ArrowLeft size={18} className="text-primary group-hover:-translate-x-0.5 transition-transform" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text-muted">Categories</span>
                        <span className="text-xs text-text-muted">/</span>
                        <span className="text-sm font-black text-gradient-gold uppercase tracking-wider">
                          {selectedCategory}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted font-medium">
                        Showing {matchingDishes.length} items from partner stores
                      </p>
                    </div>
                  </div>

                  {/* Right: Search Input + Filter Popover Button */}
                  <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                    {/* Larger Glassmorphic Search Bar with Animated Focus Glow */}
                    <div className="relative flex-1 sm:w-72 md:w-80">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary shrink-0 transition-colors" />
                      <input
                        type="text"
                        placeholder={`Search ${selectedCategory}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-bg-card border-2 border-glass/80 focus:border-primary text-text-primary text-sm font-extrabold focus:outline-none transition-all placeholder:text-text-muted shadow-md focus:shadow-luxury-hover focus:ring-4 focus:ring-primary/15"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-text-muted/20 hover:bg-rose-500 hover:text-white text-text-muted flex items-center justify-center transition-all cursor-pointer"
                          title="Clear search"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Filter Icon Button beside Search Bar */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                        className={`px-3.5 py-2.5 sm:py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 border-2 ${dietaryFilter === 'veg'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                            : dietaryFilter === 'non-veg'
                              ? 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20'
                              : 'bg-white dark:bg-bg-card border-glass text-text-primary hover:border-primary/50'
                          }`}
                        title="Filter dishes by diet"
                      >
                        <SlidersHorizontal size={17} className="shrink-0" />
                        <span className="hidden sm:inline uppercase text-[11px] tracking-wider">
                          {dietaryFilter === 'all' ? 'Filter' : dietaryFilter}
                        </span>
                      </button>

                      {/* Dropdown Popover Menu */}
                      <AnimatePresence>
                        {isFilterMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            className="absolute right-0 mt-2 w-40 z-30 bg-white dark:bg-bg-card border border-glass rounded-2xl shadow-xl p-1.5 space-y-1"
                          >
                            <button
                              type="button"
                              onClick={() => { setDietaryFilter('all'); setIsFilterMenuOpen(false); }}
                              className={`w-full px-3 py-2 rounded-xl text-xs font-black text-left flex items-center justify-between transition-all cursor-pointer ${dietaryFilter === 'all'
                                  ? 'bg-primary/15 text-primary'
                                  : 'text-text-primary hover:bg-glass'
                                }`}
                            >
                              <span>All Items</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDietaryFilter('veg'); setIsFilterMenuOpen(false); }}
                              className={`w-full px-3 py-2 rounded-xl text-xs font-black text-left flex items-center justify-between transition-all cursor-pointer ${dietaryFilter === 'veg'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'text-text-primary hover:bg-glass'
                                }`}
                            >
                              <span>Pure Veg</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDietaryFilter('non-veg'); setIsFilterMenuOpen(false); }}
                              className={`w-full px-3 py-2 rounded-xl text-xs font-black text-left flex items-center justify-between transition-all cursor-pointer ${dietaryFilter === 'non-veg'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  : 'text-text-primary hover:bg-glass'
                                }`}
                            >
                              <span>Non-Veg</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Category Switcher Horizontal Slider */}
                <div className="pt-1">
                  <div
                    onWheel={(e) => {
                      if (e.deltaY !== 0) {
                        e.currentTarget.scrollLeft += e.deltaY * 1.5;
                      }
                    }}
                    className="flex items-center gap-2.5 overflow-x-auto py-2 scroll-smooth -mx-3 px-3 sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {culinaryCategories.map((cat) => {
                      const selCatLower = (selectedCategory || '').toLowerCase();
                      const catNameLower = cat.name.toLowerCase();
                      const catIdLower = (cat.id || '').toLowerCase();
                      const active = selCatLower === catNameLower || selCatLower === catIdLower;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat.name)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0 cursor-pointer transition-all duration-300 border snap-start ${active
                              ? 'bg-[#C59363] text-white border-[#C59363] shadow-md font-black scale-105'
                              : 'bg-white dark:bg-bg-card border-glass text-text-primary hover:border-primary/40 hover:bg-glass-subtle font-bold'
                            }`}
                        >
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 shadow-xs border border-white/20">
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-xs whitespace-nowrap">
                            {getTranslatedCategoryName(cat.name, t)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Category Dishes Grid Section */}
              <div className="space-y-4 pt-2">
                {loading || isCategorySwitching ? (
                  <DishCardSkeleton count={6} />
                ) : matchingDishes.length === 0 ? (
                  <div className="py-12 text-center glass-panel border border-glass rounded-3xl p-6 max-w-md mx-auto space-y-4 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
                      <UtensilsCrossed size={26} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-text-primary">
                        No Dishes Found in {selectedCategory}
                      </h3>
                      <p className="text-xs text-text-muted">
                        No items match your search or filter selection right now. Try clearing filters.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setDietaryFilter('all'); setSearchTerm(''); }}
                      className="px-4 py-2 rounded-xl bg-primary text-black font-extrabold text-xs shadow-md hover:scale-105 transition-all cursor-pointer"
                    >
                      Clear Search & Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {matchingDishes.map((dish) => {
                      const dishId = dish.id || dish.menuItemId;
                      const dishName = dish.name || dish.foodName || 'Item';
                      const dishImage = dish.image || dish.foodImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';
                      const dishDesc = dish.description || '';
                      const isVeg = dish.isVeg !== false;
                      const isAvailable = dish.isAvailable !== false && dish.status !== 'UNAVAILABLE' && dish.status !== 'disabled';
                      const shopName = dish.restaurantName || 'Partner Store';
                      const shopId = dish.restaurantId || 'RES-001';

                      const itemVariants = Array.isArray(dish.variants) && dish.variants.length > 0 ? dish.variants : [];
                      const hasVariants = itemVariants.length > 1;
                      const activeVariant = selectedVariantsMap[dishId] || (itemVariants.length > 0 ? itemVariants[0] : null);
                      const effectivePrice = activeVariant ? Number(activeVariant.price) : Number(dish.price);
                      const activeVariantId = activeVariant?.id || activeVariant?.variantId;
                      const itemKey = activeVariantId ? `${dishId}-${activeVariantId}` : dishId;
                      const qtyInCart = getItemQuantity(dishId, activeVariantId);

                      const dishObj = {
                        id: dishId,
                        name: dishName,
                        description: dishDesc,
                        price: effectivePrice,
                        category: dish.category || selectedCategory,
                        image: dishImage,
                        type: (isVeg ? 'veg' : 'non-veg') as 'veg' | 'non-veg',
                        isVeg: isVeg,
                        isAvailable: isAvailable,
                        rating: dish.rating || 4.8,
                        restaurantId: shopId,
                        restaurantName: shopName,
                        variants: itemVariants
                      };

                      return (
                        <motion.div
                          key={dishId}
                          initial={false}
                          animate={{ opacity: 1, y: 0 }}
                          className={`bg-bg-card border-2 rounded-3xl overflow-hidden shadow-md hover:shadow-luxury-hover sm:hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group relative ${!isAvailable ? 'opacity-80 border-glass' : 'border-glass hover:border-primary/60'
                            }`}
                        >
                          <div>
                            {/* Clean Food Banner Image Container */}
                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/90">
                              <img
                                src={dishImage}
                                alt={dishName}
                                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${!isAvailable ? 'grayscale brightness-90 opacity-75' : ''}`}
                              />

                              {/* Diagonal Cross SOLD OUT Overlay Ribbon */}
                              {!isAvailable && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden pointer-events-none">
                                  <div className="w-[140%] py-1.5 bg-rose-600/90 text-white font-black text-xs uppercase tracking-widest text-center shadow-lg -rotate-45 border-y border-white/20 backdrop-blur-xs">
                                    SOLD OUT
                                  </div>
                                </div>
                              )}

                              {/* Top Left: Authentic FSSAI Standard Veg / Non-Veg Square Icon */}
                              <div className="absolute top-2.5 left-2.5 z-10">
                                <div className={`w-5 h-5 rounded-md bg-white/95 dark:bg-black/90 backdrop-blur-md border-2 flex items-center justify-center shadow-md ${isVeg ? 'border-emerald-600' : 'border-rose-600'
                                  }`}>
                                  <div className={`w-2.5 h-2.5 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                </div>
                              </div>

                              {/* Top Right: Rating Badge */}
                              <div className="absolute top-2.5 right-2.5 z-10">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[11px] backdrop-blur-md flex items-center gap-0.5 shadow-md">
                                  <Star size={10} className="fill-white text-white" />
                                  <span>{dish.rating || 4.8}</span>
                                </span>
                              </div>
                            </div>

                            {/* Clean Card Content Body */}
                            <div className="p-3.5 space-y-1.5">
                              {/* Restaurant Subtitle & Delivery Time Row */}
                              <div className="flex items-center justify-between gap-2 text-xs font-bold">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Store size={13} className="text-primary shrink-0" />
                                  <span className="font-extrabold text-primary truncate">{shopName}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 bg-glass px-2 py-0.5 rounded-lg border border-glass shadow-xs">
                                  <Clock size={11} className="text-primary" />
                                  <span className="text-[11px] font-black text-text-primary">{dish.prepTime || '15-20m'}</span>
                                </div>
                              </div>

                              {/* Food Item Title - High Contrast Bold Typography */}
                              <h3 className="text-base sm:text-lg font-black font-display text-text-primary leading-tight line-clamp-1 group-hover:text-primary transition-colors pt-0.5">
                                {dishName}
                              </h3>

                              {/* Dish Description (if present in database) */}
                              {dishDesc && (
                                <p className="text-xs text-text-muted line-clamp-2 leading-relaxed font-medium">
                                  {dishDesc}
                                </p>
                              )}

                              {/* Variant Selector Pills (if multiple variants exist) */}
                              {hasVariants && (
                                <div className="pt-2 border-t border-glass/40 space-y-1">
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-text-muted block">Portion:</span>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {itemVariants.map((v: any, idx: number) => {
                                      const vId = v.id || v.variantId || `v-${idx}`;
                                      const isSelected = activeVariantId === vId;
                                      const label = v.label || `${v.quantity || ''} ${v.unit || ''}`.trim() || `Option ${idx + 1}`;
                                      return (
                                        <button
                                          key={vId}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedVariantsMap(prev => ({ ...prev, [dishId]: v }));
                                          }}
                                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${isSelected
                                            ? 'bg-primary/20 border-primary text-primary font-black shadow-xs'
                                            : 'bg-glass border-glass text-text-secondary hover:border-primary/40'
                                            }`}
                                        >
                                          <span>{label}</span>
                                          <span className="ml-1 opacity-80 font-black">₹{v.price}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Highlighted Card Footer */}
                          <div className="px-4 py-3 flex items-center justify-between border-t-2 border-glass bg-glass-subtle/60 backdrop-blur-xs mt-1">
                            {/* Price */}
                            <div>
                              <span className="text-[9px] text-text-muted font-extrabold uppercase tracking-wider block">PRICE</span>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black font-display text-text-primary tracking-tight">
                                  ₹{effectivePrice}
                                </span>
                                {dish.discountPrice && Number(dish.discountPrice) > effectivePrice && (
                                  <span className="text-xs text-text-muted line-through font-semibold">
                                    ₹{dish.discountPrice}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* ADD Button / Quantity Controller (White Rectangle with Caramel Text) */}
                            {isAvailable ? (
                              <div>
                                {qtyInCart === 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => addToCart(dishObj, activeVariant)}
                                    className="px-5 py-2 rounded-xl bg-white dark:bg-bg-card border border-glass text-primary font-black text-xs uppercase tracking-wider shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
                                  >
                                    <Plus size={14} className="stroke-[3] text-primary" />
                                    <span>ADD</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center bg-white dark:bg-bg-card border border-glass text-primary rounded-xl px-2 py-1 shadow-sm font-black">
                                    <button
                                      type="button"
                                      onClick={() => reduceQuantity(itemKey)}
                                      className="w-6 h-6 rounded-lg hover:bg-glass text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                                      title="Decrease quantity"
                                    >
                                      <Minus size={12} className="stroke-[3]" />
                                    </button>
                                    <span className="w-6 text-center font-black text-xs font-display text-primary">
                                      {qtyInCart}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => addToCart(dishObj, activeVariant)}
                                      className="w-6 h-6 rounded-lg hover:bg-glass text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                                      title="Increase quantity"
                                    >
                                      <Plus size={12} className="stroke-[3]" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-black text-white bg-rose-600 px-3.5 py-1.5 rounded-xl uppercase tracking-wider shadow-sm border border-rose-500/20">
                                Sold Out
                              </span>
                            )}
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
                      className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-glass border border-glass hover:border-primary/50 text-text-primary transition-all active:scale-95 shadow-sm group shrink-0 cursor-pointer flex items-center justify-center"
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
                  <div className="relative w-full sm:w-80 md:w-96 lg:ml-auto shrink-0">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                    <input
                      type="text"
                      placeholder={t('search_categories_dishes')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white dark:bg-bg-card border-2 border-glass/80 focus:border-primary text-text-primary text-sm font-extrabold focus:outline-none transition-all placeholder:text-text-muted shadow-md focus:shadow-luxury-hover focus:ring-4 focus:ring-primary/15"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-text-muted/20 hover:bg-rose-500 hover:text-white text-text-muted flex items-center justify-center transition-all cursor-pointer"
                        title="Clear search"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Categories Grid */}
              <div>
                {loading ? (
                  <MobileGridSkeleton count={8} />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {culinaryCategories.map((category: any) => (
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
