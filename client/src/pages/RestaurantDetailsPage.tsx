import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, MapPin, Star, Search, ShoppingBag, Utensils, Plus, Minus, Layers, X, AlertTriangle, Lock, Clock, Heart } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { API_BASE_URL } from '../utils/api';
import { MobileMenuSkeleton } from '../components/common/MobileSkeletonLoader';
import { getWishlist, toggleWishlistItem } from '../utils/wishlistUtils';

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

      // Real-time status poll every 4s
      const pollInterval = setInterval(() => fetchRestaurantDetails(id, false), 4000);
      const handleStatusUpdate = () => fetchRestaurantDetails(id, false);

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
              {/* Top Bar: Back Button (Left) & Rating Badge (Right) */}
              <div className="flex items-center justify-between gap-2 border-b border-glass/60 pb-3">
                <button
                  onClick={() => navigate('/restaurants')}
                  className="px-4 py-1.5 rounded-full bg-glass border border-glass text-text-primary font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <ArrowLeft size={14} className="text-primary" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                  <Star size={13} className="fill-emerald-400 text-emerald-400" />
                  <span>{restaurant.rating || 4.8} Rating</span>
                </div>
              </div>

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
                      className={`p-2 rounded-2xl border transition-all duration-300 active:scale-95 cursor-pointer shrink-0 ml-auto flex items-center justify-center ${
                        favorites[restaurant.id || id || '']
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
                <span className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isResOpen ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
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
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg border flex items-center gap-1.5 ${
                    isResOpen ? 'bg-emerald-500/90 text-white border-emerald-400/40' : 'bg-rose-600/90 text-white border-rose-400/40'
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
                          className={`p-2 rounded-2xl border backdrop-blur-md transition-all duration-300 active:scale-95 cursor-pointer shrink-0 ${
                            favorites[restaurant.id || id || '']
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
                  placeholder={`Search in ${restaurant?.name || 'this restaurant'}...`}
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

                {/* Swiggy Categories Chips */}
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${selectedCategory === cat
                        ? 'bg-primary text-black font-black shadow-md'
                        : 'bg-glass hover:bg-glass-subtle border border-glass text-text-secondary'
                      }`}
                  >
                    {removeEmojis(cat)}
                  </button>
                ))}
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
                const qtyInCart = getItemQuantity(dishId);

                const dishObj = {
                  id: dishId,
                  name: removeEmojis(item.foodName || item.name || ''),
                  description: removeEmojis(item.description || ''),
                  price: Number(item.price),
                  category: removeEmojis(item.category || item.foodCategory || 'Main Course'),
                  image: item.foodImage || item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
                  type: (item.isVeg !== false ? 'veg' : 'non-veg') as 'veg' | 'non-veg',
                  isVeg: item.isVeg !== false,
                  isAvailable: !isOutOfStock,
                  restaurantIsOpen: !isRestaurantClosed,
                  rating: 4.8,
                  restaurantId: restaurant?.id || id || item.restaurantId,
                  restaurantName: removeEmojis(restaurant?.name || 'Partner Restaurant')
                };

                return (
                  <motion.div
                    key={dishId}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-panel border rounded-2xl p-3.5 sm:p-5 flex items-start justify-between gap-3 sm:gap-6 shadow-luxury transition-all w-full relative overflow-visible ${isOutOfStock
                      ? 'opacity-70 border-rose-500/20 bg-bg-dark/40'
                      : 'border-glass hover:border-primary/40 bg-bg-cardSec'
                      }`}
                  >
                    {/* Left Side: Food Details & Pricing */}
                    <div className="flex-1 min-w-0 space-y-1 text-left">
                      {/* Veg / Non-Veg Indicator & Category */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-sm border-2 p-0.5 flex items-center justify-center shrink-0 ${dishObj.isVeg ? 'border-emerald-600' : 'border-rose-600'
                            }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${dishObj.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                          />
                        </div>
                        <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                          {dishObj.category}
                        </span>
                      </div>

                      {/* Dish Name */}
                      <h3 className="font-extrabold text-sm sm:text-base text-text-primary line-clamp-1 pt-0.5">
                        {dishObj.name}
                      </h3>

                      {/* Dish Price */}
                      <div className="font-black text-base sm:text-lg text-text-primary font-display">
                        ₹{dishObj.price.toFixed(2)}
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
                      <div className="relative w-28 h-28 sm:w-36 sm:h-28 rounded-2xl overflow-hidden border border-glass bg-bg-dark shrink-0">
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
                      <div className="relative -mt-4 z-10">
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
                              onClick={() => reduceQuantity(dishId)}
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
                              onClick={() => addToCart(dishObj)}
                              className="w-5 h-5 rounded-md hover:bg-primary/20 text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                              title="Increase quantity"
                            >
                              <Plus size={11} className="stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(dishObj)}
                            className="px-5 py-1.5 rounded-xl bg-bg-cardSec text-primary border-2 border-primary/80 hover:border-primary font-black text-xs uppercase tracking-wider shadow-md hover:bg-primary hover:text-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
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
    </>
  );
};

export default RestaurantDetailsPage;
