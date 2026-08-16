import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, MapPin, Star, Search, ShoppingBag, Utensils, Plus, Minus, Layers, X, AlertTriangle, Lock, Clock, Heart, ChevronDown, Check } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { API_BASE_URL } from '../utils/api';
import { MobileMenuSkeleton } from '../components/common/MobileSkeletonLoader';
import { getWishlist, toggleWishlistItem } from '../utils/wishlistUtils';
import socketService from '../services/socket.service';
import GooeyPopover from '../components/GooeyPopover';

const removeEmojis = (str: string) => {
  if (!str) return '';
  return str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
};

export const RestaurantDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, reduceQuantity, getItemQuantity } = useCart();

  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDietary, setSelectedDietary] = useState<'All' | 'Veg' | 'Non-Veg'>('All');
  const [selectedVariantsMap, setSelectedVariantsMap] = useState<Record<string, any>>({});
  const [activePickerDish, setActivePickerDish] = useState<any | null>(null);
  const [isCategoryFabOpen, setIsCategoryFabOpen] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    const list = getWishlist();
    const favMap: Record<string, boolean> = {};
    list.forEach(i => { favMap[i.id] = true; });
    return favMap;
  });

  useEffect(() => {
    if (id) {
      fetchRestaurantDetails(id, true);

      // Join Restaurant Socket Room for real-time menu updates
      socketService.joinRestaurant(id);

      // Real-time status poll every 4s
      const pollInterval = setInterval(() => fetchRestaurantDetails(id, false), 4000);
      const handleStatusUpdate = () => fetchRestaurantDetails(id, false);

      const unsubscribeMenu = socketService.onMenuUpdated((data) => {
        if (data && (data.restaurantId === id || data.restaurantId === restaurant?.id)) {
          fetchRestaurantDetails(id, false);
        }
      });

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
        unsubscribeMenu();
        window.removeEventListener('foodway_restaurant_status_updated', handleStatusUpdate);
        window.removeEventListener('storage', handleStatusUpdate);
        window.removeEventListener('foodway_wishlist_updated', syncWishlist);
      };
    }
  }, [id]);


  const toggleFav = (targetObj: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetId = targetObj.id || targetObj.restaurantId || targetObj.menuItemId;
    const isDish = !!targetObj.foodName || !!targetObj.price;
    toggleWishlistItem({
      id: targetId,
      name: targetObj.name || targetObj.foodName || 'Partner Item',
      image: targetObj.image || targetObj.foodImage || targetObj.logo || '',
      price: targetObj.price ? Number(targetObj.price) : undefined,
      rating: targetObj.rating || 4.8,
      restaurantId: restaurant?.id || id,
      restaurantName: restaurant?.name || 'Partner Restaurant',
      category: targetObj.category,
      type: isDish ? 'dish' : 'restaurant',
    });
  };

  const fetchRestaurantDetails = async (resId: string, isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      // 1. Fetch restaurant info
      const resResponse = await axios.get(`${API_BASE_URL}/public/restaurants`);
      if (resResponse.data.success && Array.isArray(resResponse.data.restaurants)) {
        const found = resResponse.data.restaurants.find((r: any) => r.id === resId || r.restaurantId === resId);
        if (found) {
          setRestaurant(found);
        } else {
          setRestaurant({
            id: resId,
            name: 'Partner Restaurant',
            cuisine: 'Multi-Cuisine',
            rating: 4.8,
            deliveryTime: '20-30 mins',
            image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=85',
            isOpen: true
          });
        }
      }

      // 2. Fetch menu items for this specific restaurant from DynamoDB
      const menuResponse = await axios.get(`${API_BASE_URL}/restaurant/menu/${resId}`);
      if (menuResponse.data.success && Array.isArray(menuResponse.data.items)) {
        setMenuItems(menuResponse.data.items);
      } else {
        setMenuItems([]);
      }
    } catch (err) {
      console.error('Error fetching restaurant details & menu from DB:', err);
      setMenuItems([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  };


  const categories = ['All', ...Array.from(new Set(menuItems.map(m => m.category).filter(Boolean)))];

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { 'All': menuItems.length };
    menuItems.forEach(item => {
      const cat = item.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [menuItems]);

  const filteredMenuItems = menuItems.filter(item => {
    const itemName = item.foodName || item.name || '';
    const itemDesc = item.description || '';
    const matchesSearch = itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      itemDesc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const isVegItem = item.isVeg !== false;
    const matchesDietary = selectedDietary === 'All' || (selectedDietary === 'Veg' ? isVegItem : !isVegItem);
    return matchesSearch && matchesCat && matchesDietary;
  });

  const isResClosed = restaurant ? (restaurant.isOpen === false || restaurant.isOpen === 'false' || restaurant.status === 'closed' || restaurant.status === 'inactive' || restaurant.status === 'INACTIVE' || restaurant.status === 'OFFLINE' || restaurant.status === 'offline' || restaurant.status === 'CLOSED') : false;
  const isResOpen = !isResClosed;

  return (
    <>
      <Helmet>
        <title>{restaurant ? `${restaurant.name} | Menu & Orders` : 'Restaurant Details'} | MK Delivery Services</title>
      </Helmet>

      <div className="min-h-screen bg-bg-dark pt-16 sm:pt-28 pb-24 sm:pb-28 px-3.5 sm:px-6 lg:px-12 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-20 left-0 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 relative z-10">

          {/* Mobile-Only Shop Header Card matching User Screenshot */}
          {loading ? (
            <div className="block sm:hidden glass-panel border border-glass rounded-3xl h-48 animate-pulse" />
          ) : restaurant && (
            <div className="block sm:hidden glass-panel border border-glass rounded-3xl p-4 shadow-luxury bg-bg-cardSec space-y-3.5">


              {/* Shop Main Info Row: Logo Thumbnail + Name & Address */}
              <div className="flex items-start gap-3.5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-glass bg-bg-dark shrink-0 shadow-md">
                  <img
                    src={restaurant.logo || restaurant.image || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400"}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-1 text-left min-w-0 flex-1">
                  {/* Shop Name + Wishlist (Heart) Luxury Badge on the right */}
                  <div className="flex items-center justify-between gap-2.5 w-full">
                    <h1 className="text-lg font-black font-display text-gradient-gold leading-snug truncate">
                      {restaurant.name}
                    </h1>

                    <button
                      type="button"
                      onClick={(e) => toggleFav(restaurant, e)}
                      className={`p-2 rounded-2xl border transition-all duration-300 active:scale-95 cursor-pointer shrink-0 ml-auto flex items-center justify-center ${favorites[restaurant.id || id || '']
                        ? 'bg-rose-500/15 border-rose-500/35 text-rose-500'
                        : 'bg-glass border-glass text-text-muted hover:text-rose-400 hover:border-rose-400/40'
                        }`}
                      title={favorites[restaurant.id || id || ''] ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <Heart
                        size={16}
                        className={favorites[restaurant.id || id || ''] ? "fill-rose-500 text-rose-500" : "text-text-muted"}
                      />
                    </button>

                  </div>



                  {restaurant.address && (
                    <p className="text-xs text-text-muted flex items-start gap-1 font-medium leading-relaxed">
                      <MapPin size={12} className="text-primary shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{restaurant.address}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Badges Layout Row: Open for Orders & Delivery Time Side-by-Side */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                <span className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${isResOpen ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isResOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span>{isResOpen ? 'OPEN FOR ORDERS' : 'CLOSED NOW'}</span>
                </span>

                {restaurant.deliveryTime && (
                  <span className="px-3 py-1 rounded-xl bg-glass border border-glass text-text-secondary text-[11px] font-bold flex items-center gap-1.5 ml-auto">
                    <Clock size={12} className="text-primary shrink-0" />
                    <span>{restaurant.deliveryTime}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Restructured Navigation Header Bar with Back Button & Breadcrumbs */}
          <div className="flex items-center justify-between gap-3 bg-bg-cardSec/80 backdrop-blur-md border border-glass/80 p-2.5 sm:p-3.5 rounded-2xl shadow-luxury">
            <button
              onClick={() => navigate('/shops')}
              className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-black text-xs flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all group"
            >
              <ArrowLeft size={16} className="text-primary group-hover:-translate-x-1 transition-transform" />
              <span>Back to Restaurants</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-text-muted">
              <span>Stores</span>
              <span>/</span>
              <span className="text-primary font-black truncate max-w-xs">{restaurant?.name || 'Store Details'}</span>
            </div>

            {restaurant && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black shrink-0">
                <Star size={13} className="fill-emerald-400 text-emerald-400" />
                <span>{restaurant.rating || 4.8} Rating</span>
              </div>
            )}
          </div>

          {/* Desktop-Only Banner Header */}
          {loading ? (
            <div className="hidden sm:block glass-panel border border-glass rounded-3xl h-48 animate-pulse" />
          ) : restaurant && (
            <div className="hidden sm:block relative rounded-3xl overflow-hidden border border-glass shadow-luxury bg-bg-darkSec">
              <div className="h-48 sm:h-56 relative overflow-hidden">
                {/* Background Cover Image */}
                <img
                  src={restaurant.image || restaurant.bannerImage || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200"}
                  alt={restaurant.name}
                  className={`w-full h-full object-cover scale-105 filter ${!isResOpen ? 'grayscale brightness-75' : 'brightness-90'}`}
                />
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/70 to-black/30" />

                {/* Top Badges Row */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 flex-wrap z-10">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg border flex items-center gap-1.5 ${isResOpen ? 'bg-emerald-500/90 text-white border-emerald-400/40' : 'bg-rose-600/90 text-white border-rose-400/40'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isResOpen ? 'bg-emerald-300 animate-pulse' : 'bg-white'}`} />
                    <span>{isResOpen ? 'OPEN FOR ORDERS' : 'CLOSED NOW'}</span>
                  </span>

                  {restaurant.deliveryTime && (
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-black/60 text-white border border-glass backdrop-blur-md flex items-center gap-1.5">
                      <Clock size={12} className="text-primary" />
                      <span>{restaurant.deliveryTime}</span>
                    </span>
                  )}
                </div>

                {/* Top Right Rating Badge */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-black font-black text-xs shadow-xl border border-amber-300">
                    <Star size={13} className="fill-black text-black" />
                    <span>{restaurant.rating || 4.8} Rating</span>
                  </div>
                </div>

                {/* Bottom Main Content Row */}
                <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-5 sm:left-5 sm:right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3 z-10">
                  <div className="flex items-end gap-3 sm:gap-4">
                    {/* Restaurant Logo Avatar */}
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-primary/40 shadow-2xl shrink-0 bg-black/60 backdrop-blur-md">
                      <img
                        src={restaurant.logo || restaurant.image || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400"}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Restaurant Name & Categories + Wishlist Button */}
                    <div className="space-y-0.5 text-left">
                      <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-3xl font-black font-display text-gradient-gold tracking-tight drop-shadow-md">
                          {restaurant.name}
                        </h1>

                        <button
                          type="button"
                          onClick={(e) => toggleFav(restaurant, e)}
                          className={`p-2 rounded-2xl border backdrop-blur-md transition-all duration-300 active:scale-95 cursor-pointer shrink-0 ${favorites[restaurant.id || id || '']
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-500'
                            : 'bg-black/40 border-white/20 text-white hover:border-rose-400/50 hover:bg-rose-500/10'
                            }`}
                          title={favorites[restaurant.id || id || ''] ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Heart size={16} className={favorites[restaurant.id || id || ''] ? "fill-rose-500 text-rose-500" : "text-white"} />
                        </button>


                      </div>

                      {restaurant.address && (
                        <p className="text-[11px] sm:text-xs text-text-secondary flex items-center gap-1 font-semibold">
                          <MapPin size={12} className="text-primary shrink-0" />
                          <span>{restaurant.address}</span>
                        </p>
                      )}

                      {/* Dynamic Categories List Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {(categories.filter(c => c !== 'All').length > 0
                          ? categories.filter(c => c !== 'All')
                          : [restaurant.cuisine || 'Multi-Cuisine']
                        ).map((catName) => (
                          <span key={catName} className="px-2.5 py-0.5 rounded-lg bg-primary/20 text-primary text-[10px] sm:text-xs font-black uppercase tracking-wider border border-primary/30 backdrop-blur-sm">
                            {removeEmojis(catName)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* Swiggy Style Menu Search & Filter Header */}
          <div className="glass-panel border border-glass rounded-2xl p-3.5 sm:p-5 space-y-3 shadow-luxury bg-bg-cardSec">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
              {/* 1. Swiggy Search Input Bar */}
              <div className="relative w-full lg:w-72 shrink-0">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder={`Search in ${restaurant?.name || 'this store'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-bg-dark/80 border border-glass focus:border-primary/50 text-text-primary placeholder:text-text-muted/60 outline-none transition-all"
                />
              </div>

              {/* 2. Swiggy Horizontal Filter Bar (Veg / Non-Veg Toggle Chips + Categories) */}
              <div className="flex items-center gap-2 overflow-x-auto py-1 scroll-smooth [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                {/* Veg Filter Chip */}
                <button
                  type="button"
                  onClick={() => setSelectedDietary(selectedDietary === 'Veg' ? 'All' : 'Veg')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${selectedDietary === 'Veg'
                    ? 'bg-emerald-600 text-white shadow-md border border-emerald-400'
                    : 'bg-glass hover:bg-glass-subtle border border-emerald-500/30 text-emerald-400'
                    }`}
                >
                  <div className="w-3.5 h-3.5 rounded-sm border border-current p-0.5 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  </div>
                  <span>Veg</span>
                </button>

                {/* Non-Veg Filter Chip */}
                <button
                  type="button"
                  onClick={() => setSelectedDietary(selectedDietary === 'Non-Veg' ? 'All' : 'Non-Veg')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${selectedDietary === 'Non-Veg'
                    ? 'bg-rose-600 text-white shadow-md border border-rose-400'
                    : 'bg-glass hover:bg-glass-subtle border border-rose-500/30 text-rose-400'
                    }`}
                >
                  <div className="w-3.5 h-3.5 rounded-sm border border-current p-0.5 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  </div>
                  <span>Non-Veg</span>
                </button>

                <div className="h-4 w-px bg-glass shrink-0 mx-1" />

                {/* Category Drawer Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsCategoryFabOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <Layers size={14} />
                  <span>Categories ({categories.filter(c => c !== 'All').length})</span>
                </button>

                {/* Selected Category Pill */}
                {selectedCategory !== 'All' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('All')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1.5 shrink-0 hover:bg-amber-500/30 transition-all cursor-pointer"
                  >
                    <span>{removeEmojis(selectedCategory)}</span>
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Food Items List */}
          {loading ? (
            <MobileMenuSkeleton count={5} />
          ) : filteredMenuItems.length === 0 ? (
            <div className="py-20 text-center glass-panel border border-glass rounded-3xl p-12 max-w-lg mx-auto space-y-4">
              <Utensils size={48} className="mx-auto text-text-muted opacity-50" />
              <h3 className="text-xl font-bold font-display text-text-primary">No Food Items Available</h3>
              <p className="text-xs text-text-muted">
                This establishment has not listed items matching your filter criteria yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-4 w-full">
              {filteredMenuItems.map(item => {
                const dishId = item.menuItemId || item.id;
                const isRestaurantClosed = restaurant && (restaurant.isOpen === false || restaurant.status === 'closed');
                const isOutOfStock = isRestaurantClosed || item.isAvailable === false || item.status === 'UNAVAILABLE' || item.status === 'disabled';

                const itemVariants = Array.isArray(item.variants) && item.variants.length > 0
                  ? item.variants
                  : [];
                const hasMultipleVariants = itemVariants.length > 1;

                const activeVariant = selectedVariantsMap[dishId] || (hasMultipleVariants ? itemVariants[0] : null);
                const effectivePrice = activeVariant ? Number(activeVariant.price) : Number(item.price);
                const activeVariantId = activeVariant?.id || activeVariant?.variantId;
                const itemKey = activeVariantId ? `${dishId}-${activeVariantId}` : dishId;
                const qtyInCart = getItemQuantity(dishId, activeVariantId);

                const dishObj = {
                  id: dishId,
                  name: removeEmojis(item.foodName || item.name || ''),
                  description: removeEmojis(item.description || ''),
                  price: effectivePrice,
                  category: removeEmojis(item.category || item.foodCategory || 'General'),
                  image: item.foodImage || item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
                  type: (item.isVeg !== false ? 'veg' : 'non-veg') as 'veg' | 'non-veg',
                  isVeg: item.isVeg !== false,
                  isAvailable: !isOutOfStock,
                  restaurantIsOpen: !isRestaurantClosed,
                  rating: 4.8,
                  restaurantId: restaurant?.id || id || item.restaurantId,
                  restaurantName: removeEmojis(restaurant?.name || 'Partner Shop'),
                  variants: itemVariants
                };

                return (
                  <motion.div
                    key={dishId}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-panel border rounded-2xl p-3 sm:p-4 flex items-start justify-between gap-3 sm:gap-5 shadow-luxury transition-all w-full relative overflow-visible ${isOutOfStock
                      ? 'opacity-70 border-rose-500/20 bg-bg-dark/40'
                      : 'border-glass hover:border-primary/40 bg-bg-cardSec'
                      }`}
                  >
                    {/* Left Side: Food Details & Pricing */}
                    <div className="flex-1 min-w-0 space-y-1 text-left">
                      {/* Veg / Non-Veg Indicator & Category */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3.5 h-3.5 rounded-sm border-2 p-0.5 flex items-center justify-center shrink-0 ${dishObj.isVeg ? 'border-emerald-600' : 'border-rose-600'
                            }`}
                        >
                          <div
                            className={`w-1 h-1 rounded-full ${dishObj.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                          />
                        </div>
                        <span className="text-[9.5px] font-black text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                          {dishObj.category}
                        </span>
                      </div>

                      {/* Dish Name */}
                      <h3 className="font-extrabold text-sm sm:text-base text-text-primary line-clamp-1 pt-0.5">
                        {dishObj.name}
                      </h3>

                      {/* Classic iOS Segmented Control for Variant Selection (Option 2) */}
                      {hasMultipleVariants && (
                        <div className="pt-1.5 pb-1 max-w-full">
                          <div
                            className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-200/80 dark:bg-bg-dark/90 border border-slate-300/80 dark:border-glass/80 overflow-x-auto max-w-full scroll-smooth shadow-inner [&::-webkit-scrollbar]:hidden"
                            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                          >
                            {itemVariants.map((v: any, idx: number) => {
                              const isSelected = (activeVariant?.id || activeVariant?.variantId) === (v.id || v.variantId);
                              const rawLabel = v.label || `${v.quantity} ${v.unit}`;
                              const shortLabel = rawLabel
                                .replace(/gms/gi, 'g')
                                .replace(/grams/gi, 'g')
                                .replace(/kilograms/gi, 'kg')
                                .replace(/\s+/g, '');

                              return (
                                <button
                                  key={v.id || idx}
                                  type="button"
                                  onClick={() => setSelectedVariantsMap(prev => ({ ...prev, [dishId]: v }))}
                                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer shrink-0 ${isSelected
                                    ? 'bg-white dark:bg-primary text-slate-900 dark:text-black shadow-md scale-[1.02]'
                                    : 'text-slate-600 dark:text-text-muted hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                  <span>{shortLabel}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Dish Price & Discount Badge */}
                      <div className="font-black text-base sm:text-lg text-text-primary font-display flex items-center gap-2 pt-0.5 flex-wrap">
                        <span>₹{Number.isInteger(effectivePrice) ? effectivePrice : effectivePrice.toFixed(2)}</span>
                        {activeVariant?.compareAtPrice && Number(activeVariant.compareAtPrice) > effectivePrice && (
                          <>
                            <span className="text-xs text-text-muted line-through font-normal">
                              ₹{Number.isInteger(Number(activeVariant.compareAtPrice)) ? Number(activeVariant.compareAtPrice) : Number(activeVariant.compareAtPrice).toFixed(2)}
                            </span>
                            {(() => {
                              const disc = Math.round(((Number(activeVariant.compareAtPrice) - effectivePrice) / Number(activeVariant.compareAtPrice)) * 100);
                              return disc > 0 ? (
                                <span className="bg-emerald-500/15 text-emerald-400 text-[9.5px] font-black px-1.5 py-0.5 rounded-md border border-emerald-500/25">
                                  {disc}% OFF
                                </span>
                              ) : null;
                            })()}
                          </>
                        )}
                      </div>

                      {/* Description */}
                      {dishObj.description && (
                        <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed pt-0.5">
                          {dishObj.description}
                        </p>
                      )}
                    </div>

                    {/* Right Side: Dish Image & Swiggy/Zomato Floating ADD Button */}
                    <div className="relative shrink-0 flex flex-col items-center">
                      <div className="relative w-24 h-24 sm:w-32 sm:h-28 rounded-2xl overflow-hidden border border-glass bg-bg-dark shrink-0">
                        <img
                          src={dishObj.image}
                          alt={dishObj.name}
                          className={`w-full h-full object-cover transition-transform duration-500 ${isOutOfStock ? 'grayscale' : 'hover:scale-105'}`}
                        />
                        <button
                          type="button"
                          onClick={(e) => toggleFav(dishObj, e)}
                          className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-95 transition-all shadow-md cursor-pointer"
                          title="Favorite"
                        >
                          <Heart size={13} className={favorites[dishId] ? "fill-rose-500 text-rose-500" : "text-white"} />
                        </button>
                      </div>

                      {/* Floating ADD / Stepper Button matching Swiggy */}
                      <div className="relative -mt-3.5 z-10">
                        {isRestaurantClosed ? (
                          <button
                            disabled
                            className="px-3 py-1 rounded-xl text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed uppercase"
                          >
                            Closed
                          </button>
                        ) : isOutOfStock ? (
                          <button
                            disabled
                            className="px-3 py-1 rounded-xl text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed uppercase"
                          >
                            Unavailable
                          </button>
                        ) : qtyInCart > 0 ? (
                          <div className="flex items-center bg-bg-cardSec text-primary rounded-xl px-2 py-1 shadow-md border-2 border-primary">
                            <button
                              type="button"
                              onClick={() => reduceQuantity(itemKey)}
                              className="w-5 h-5 rounded-md hover:bg-primary/20 text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                              title="Decrease quantity"
                            >
                              <Minus size={11} className="stroke-[3]" />
                            </button>
                            <span className="w-6 text-center font-black text-xs font-display text-primary">
                              {qtyInCart}
                            </span>
                            <button
                              type="button"
                              onClick={() => addToCart(dishObj, activeVariant)}
                              className="w-5 h-5 rounded-md hover:bg-primary/20 text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                              title="Increase quantity"
                            >
                              <Plus size={11} className="stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(dishObj, activeVariant)}
                            className="px-4 py-1.5 rounded-xl bg-bg-cardSec text-primary border-2 border-primary/80 hover:border-primary font-black text-xs uppercase tracking-wider shadow-md hover:bg-primary hover:text-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
                          >
                            <span>ADD</span>
                            <Plus size={12} className="stroke-[3]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Variant Picker Pop-up Bottom Sheet Modal (Option 3) */}
      <AnimatePresence>
        {activePickerDish && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-bg-cardSec border-t sm:border border-glass rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-glass pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={activePickerDish.image}
                    alt={activePickerDish.name}
                    className="w-12 h-12 rounded-xl object-cover border border-glass"
                  />
                  <div>
                    <h3 className="font-extrabold text-base text-text-primary line-clamp-1">
                      {activePickerDish.name}
                    </h3>
                    <p className="text-xs text-text-muted">Select weight / quantity pack</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePickerDish(null)}
                  className="w-8 h-8 rounded-full bg-glass hover:bg-glass-subtle flex items-center justify-center text-text-muted hover:text-text-primary transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Options List */}
              <div className="space-y-2.5 py-1">
                {activePickerDish.variants.map((v: any, idx: number) => {
                  const currentActive = selectedVariantsMap[activePickerDish.id] || activePickerDish.variants[0];
                  const isSelected = (currentActive?.id || currentActive?.variantId) === (v.id || v.variantId);
                  const vLabel = v.label || `${v.quantity} ${v.unit}`;
                  const priceNum = Number(v.price);
                  const formattedPrice = Number.isInteger(priceNum) ? priceNum : priceNum.toFixed(2);

                  return (
                    <button
                      key={v.id || idx}
                      type="button"
                      onClick={() => setSelectedVariantsMap(prev => ({ ...prev, [activePickerDish.id]: v }))}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${isSelected
                        ? 'bg-primary/15 border-primary text-primary font-black shadow-md ring-1 ring-primary/30'
                        : 'bg-bg-dark/60 border-glass text-text-secondary hover:border-primary/40 hover:bg-bg-dark'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-black' : 'border-text-muted/40'}`}>
                          {isSelected && <Check size={12} className="stroke-[3]" />}
                        </div>
                        <span className="text-sm font-extrabold text-text-primary">{vLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {v.compareAtPrice && Number(v.compareAtPrice) > priceNum && (
                          <span className="text-xs text-text-muted line-through">
                            ₹{Number.isInteger(Number(v.compareAtPrice)) ? Number(v.compareAtPrice) : Number(v.compareAtPrice).toFixed(2)}
                          </span>
                        )}
                        <span className="text-sm font-black text-primary">₹{formattedPrice}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Add Item Button */}
              {(() => {
                const activeV = selectedVariantsMap[activePickerDish.id] || activePickerDish.variants[0];
                const priceNum = Number(activeV?.price || activePickerDish.price);
                const formattedPrice = Number.isInteger(priceNum) ? priceNum : priceNum.toFixed(2);

                return (
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(activePickerDish, activeV);
                      setActivePickerDish(null);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-amber-400 text-black font-black text-sm shadow-luxury hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-between px-5 cursor-pointer"
                  >
                    <span>ADD ITEM TO CART</span>
                    <span className="bg-black/20 px-2.5 py-1 rounded-lg text-xs font-black">
                      ₹{formattedPrice}
                    </span>
                  </button>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Liquid Viscous SVG Gooey Popover Menu */}
      {categories.length > 1 && (
        <div className="fixed bottom-6 right-6 z-40">
          <GooeyPopover
            isOpen={isCategoryFabOpen}
            onOpenChange={setIsCategoryFabOpen}
            triggerWidth={124}
            triggerHeight={46}
            contentWidth={290}
            side="top"
            align="right"
            sideOffset={18}
            speed={0.28}
            bgClassName="bg-slate-900/95"
            contentClassName="p-4"
            trigger={
              <div className="flex items-center justify-center gap-2 px-3.5 w-full h-full rounded-full bg-gradient-to-r from-primary via-amber-400 to-amber-500 text-black font-black text-xs uppercase tracking-wider whitespace-nowrap">
                <Utensils size={16} className="stroke-[2.5] shrink-0" />
                <span className="font-black text-xs shrink-0">MENU</span>
                <span className="w-5 h-5 rounded-full bg-black text-amber-300 font-black text-[10px] flex items-center justify-center border border-amber-400/40 shrink-0 shadow-inner">
                  {categories.filter(c => c !== 'All').length}
                </span>
              </div>
            }
          >
            <div className="space-y-3 text-left">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shrink-0">
                    <Utensils size={14} className="stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-xs text-white uppercase tracking-wider font-display">STORE CATEGORIES</h3>
                    <p className="text-[10px] text-amber-300/80 font-bold">{menuItems.length} Total Dishes</p>
                  </div>
                </div>
              </div>

              {/* Categories list */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden text-left" style={{ scrollbarWidth: 'none' }}>
                {categories.map((cat) => {
                  const count = categoryCounts[cat] || 0;
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setIsCategoryFabOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${isSelected
                        ? 'bg-gradient-to-r from-primary via-amber-400 to-amber-500 text-black font-black shadow-lg ring-1 ring-amber-300'
                        : 'bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-white font-bold hover:border-amber-400/40'
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2 text-left">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-black' : 'bg-amber-400'}`} />
                        <span className="text-xs font-extrabold truncate text-left">
                          {cat === 'All' ? 'All Establishment Dishes' : removeEmojis(cat)}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${isSelected ? 'bg-black text-amber-300' : 'bg-black/40 text-amber-300/90 border border-amber-400/30'
                        }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </GooeyPopover>
        </div>
      )}
    </>
  );
};

export default RestaurantDetailsPage;
