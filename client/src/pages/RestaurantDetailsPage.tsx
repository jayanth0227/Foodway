import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, MapPin, Star, Search, ShoppingBag, Utensils, UtensilsCrossed, Plus, Minus, Layers, X, AlertTriangle, Lock, Clock, Heart, ChevronDown, Check, ArrowRight, LayoutGrid, List } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { API_BASE_URL } from '../utils/api';
import { MobileMenuSkeleton, MobileGridSkeleton } from '../components/common/MobileSkeletonLoader';
import { getWishlist, toggleWishlistItem } from '../utils/wishlistUtils';
import socketService from '../services/socket.service';
import GooeyPopover from '../components/GooeyPopover';
import shopService from '../services/shop.service';
import { ItemDetailsModal } from '../components/common/ItemDetailsModal';
import { getItemVariantLabel } from '../utils/variantUtils';
import ItemImageOrIcon from '../components/common/ItemImageOrIcon';

const removeEmojis = (str: string) => {
  if (!str) return '';
  return str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
};

export const RestaurantDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { cartItems, totalAmount, totalItemsCount, addToCart, reduceQuantity, getItemQuantity, setCartOpen } = useCart();

  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDietary, setSelectedDietary] = useState<'All' | 'Veg' | 'Non-Veg'>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedVariantsMap, setSelectedVariantsMap] = useState<Record<string, any>>({});
  const [activePickerDish, setActivePickerDish] = useState<any | null>(null);
  const [activeDetailItem, setActiveDetailItem] = useState<any | null>(null);
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

      const handleStatusUpdate = () => fetchRestaurantDetails(id, false);

      const unsubscribeMenu = socketService.onMenuUpdated((data: any) => {
        console.log('⚡ [Live Socket Event: MENU_UPDATED] Received in RestaurantDetailsPage:', data);
        const updatedItem = data?.item || data?.dish || data;
        if (!updatedItem) return;

        const targetResId = String(id || restaurant?.id || restaurant?.shopId || '').toLowerCase();
        const eventResId = String(data.restaurantId || data.shopId || updatedItem.restaurantId || updatedItem.shopId || '').toLowerCase();

        if (!eventResId || !targetResId || eventResId === targetResId || targetResId.includes(eventResId) || eventResId.includes(targetResId)) {
          const targetItemId = String(updatedItem.id || updatedItem.itemId || updatedItem.menuItemId || data.deletedId || '').toLowerCase();

          setMenuItems(prevItems => {
            if (data.deletedId) {
              return prevItems.filter(item => String(item.id || item.itemId || item.menuItemId || '').toLowerCase() !== targetItemId);
            }

            const existingIndex = prevItems.findIndex(item => String(item.id || item.itemId || item.menuItemId || '').toLowerCase() === targetItemId);

            if (existingIndex >= 0) {
              const updated = [...prevItems];
              updated[existingIndex] = {
                ...updated[existingIndex],
                ...updatedItem,
                price: typeof updatedItem.price === 'number' ? updatedItem.price : updated[existingIndex].price,
                name: updatedItem.name || updatedItem.foodName || updated[existingIndex].name,
                foodName: updatedItem.foodName || updatedItem.name || updated[existingIndex].foodName,
                isAvailable: updatedItem.isAvailable !== undefined ? updatedItem.isAvailable : updated[existingIndex].isAvailable,
                variants: updatedItem.variants || updated[existingIndex].variants || []
              };
              return updated;
            } else if (updatedItem.name || updatedItem.foodName) {
              return [updatedItem, ...prevItems];
            }
            return prevItems;
          });
        }
      });

      window.addEventListener('foodway_restaurant_status_updated', handleStatusUpdate);

      const syncWishlist = () => {
        const list = getWishlist();
        const favMap: Record<string, boolean> = {};
        list.forEach(i => { favMap[i.id] = true; });
        setFavorites(favMap);
      };

      window.addEventListener('foodway_wishlist_updated', syncWishlist);
      return () => {
        unsubscribeMenu();
        window.removeEventListener('foodway_restaurant_status_updated', handleStatusUpdate);
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
      let foundRes: any = null;

      // 1. Try fetching specific shop profile directly
      try {
        const singleResp = await axios.get(`${API_BASE_URL}/shops/${resId}`);
        if (singleResp.data?.success && (singleResp.data.shop || singleResp.data.restaurant)) {
          foundRes = singleResp.data.shop || singleResp.data.restaurant;
        }
      } catch (e) { }

      // 2. Try fetching from public restaurants endpoint if direct lookup failed
      if (!foundRes) {
        try {
          const list = await shopService.getPublicRestaurants();
          foundRes = list.find((r: any) =>
            r.id === resId || r.restaurantId === resId || r.shopId === resId ||
            (r.name && r.name.toLowerCase() === resId.toLowerCase()) ||
            (r.shopName && r.shopName.toLowerCase() === resId.toLowerCase())
          );
        } catch (e) { }
      }

      if (foundRes) {
        const isClosed = foundRes.isOpen === false || foundRes.isOpen === 'false' || foundRes.status === 'closed' || foundRes.status === 'inactive' || foundRes.status === 'INACTIVE' || foundRes.status === 'OFFLINE' || foundRes.status === 'offline' || foundRes.status === 'CLOSED';
        setRestaurant({
          ...foundRes,
          id: foundRes.id || foundRes.shopId || foundRes.restaurantId || resId,
          name: foundRes.name || foundRes.shopName || foundRes.restaurantName || 'Partner Shop',
          isOpen: !isClosed,
          status: isClosed ? 'closed' : 'active'
        });
      } else {
        // Fallback: fetch status from status API endpoint
        let isOpenStatus = true;
        try {
          const statusResp = await axios.get(`${API_BASE_URL}/restaurant/status/${resId}`);
          if (statusResp.data && typeof statusResp.data.isOpen === 'boolean') {
            isOpenStatus = statusResp.data.isOpen;
          }
        } catch (e) { }

        setRestaurant({
          id: resId,
          name: 'Partner Restaurant',
          cuisine: 'Multi-Cuisine',
          rating: 4.8,
          deliveryTime: '20-30 mins',
          image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=85',
          isOpen: isOpenStatus,
          status: isOpenStatus ? 'active' : 'closed'
        });
      }

      // 3. Fetch menu items for this specific restaurant from DynamoDB
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

      <div className="min-h-screen bg-bg-dark pt-18 sm:pt-20 lg:pt-20 pb-32 lg:pb-16 px-3 sm:px-6 lg:px-12 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-20 left-0 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-2.5 sm:space-y-3 relative z-10">

          {/* Redesigned Integrated Mobile Shop Header Card */}
          {loading ? (
            <div className="block sm:hidden glass-panel border border-glass rounded-2xl h-36 animate-pulse" />
          ) : restaurant && (
            <div className="block sm:hidden glass-panel border border-glass rounded-2xl p-3.5 shadow-luxury bg-bg-cardSec space-y-3 relative overflow-hidden">
              {/* Top Row: Back Button (Left) + Wishlist Heart (Right) */}
              <div className="flex items-center justify-between gap-2 border-b border-glass/80 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.history.state && window.history.state.idx > 0) {
                      navigate(-1);
                    } else {
                      navigate('/shops');
                    }
                  }}
                  className="w-8 h-8 rounded-xl bg-glass border border-glass hover:bg-glass-subtle text-text-primary flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-xs"
                  title="Back to Stores"
                >
                  <ArrowLeft size={16} className="stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={(e) => toggleFav(restaurant, e)}
                  className={`p-1.5 rounded-xl border transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center ${favorites[restaurant.id || id || '']
                    ? 'bg-rose-500/15 border-rose-500/35 text-rose-500'
                    : 'bg-glass border-glass text-text-muted hover:text-rose-400'
                    }`}
                  title={favorites[restaurant.id || id || ''] ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Heart size={16} className={favorites[restaurant.id || id || ''] ? "fill-rose-500 text-rose-500" : "text-text-muted"} />
                </button>
              </div>

              {/* Middle Row: Shop Logo Avatar + Name & Address */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-glass bg-bg-dark shrink-0 shadow-md">
                  <img
                    src={restaurant.logo || restaurant.image || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400"}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-0.5 text-left min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg font-black font-display text-text-primary leading-snug truncate">
                    {restaurant.name}
                  </h1>

                  {restaurant.address && (
                    <p className="text-[11px] text-text-muted flex items-center gap-1 font-semibold truncate">
                      <MapPin size={12} className="text-primary shrink-0" />
                      <span className="truncate">{restaurant.address}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Badges Row: Open for Orders (Left) + Rating Badge (Right) */}
              <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${isResOpen ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isResOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span>{isResOpen ? 'OPEN FOR ORDERS' : 'CLOSED NOW'}</span>
                </span>

                <div className="flex items-center gap-1.5 ml-auto">
                  {restaurant.deliveryTime && (
                    <span className="px-2 py-0.5 rounded-xl bg-glass border border-glass text-text-secondary text-[10px] font-extrabold flex items-center gap-1">
                      <Clock size={11} className="text-primary shrink-0" />
                      <span>{restaurant.deliveryTime}</span>
                    </span>
                  )}

                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black shrink-0 shadow-xs border border-emerald-500">
                    <Star size={11} className="fill-white text-white shrink-0" />
                    <span>{restaurant.rating || 4.8} Rating</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Restructured Navigation Header Bar with Back Button & Breadcrumbs (Desktop Only) */}
          <div className="hidden sm:flex items-center justify-between gap-3 bg-bg-cardSec/80 backdrop-blur-md border border-glass/80 p-2 sm:p-2.5 rounded-xl shadow-xs">
            <button
              onClick={() => {
                if (window.history.state && window.history.state.idx > 0) {
                  navigate(-1);
                } else {
                  navigate('/shops');
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all group"
            >
              <ArrowLeft size={15} className="text-primary group-hover:-translate-x-1 transition-transform" />
              <span>Back to Restaurants</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-text-muted">
              <span>Stores</span>
              <span>/</span>
              <span className="text-primary font-black truncate max-w-xs">{restaurant?.name || 'Store Details'}</span>
            </div>

            {restaurant && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black shrink-0">
                <Star size={13} className="fill-emerald-400 text-emerald-400" />
                <span>{restaurant.rating || 4.8} Rating</span>
              </div>
            )}
          </div>

          {/* Desktop-Only Banner Header */}
          {loading ? (
            <div className="hidden sm:block glass-panel border border-glass rounded-2xl h-32 sm:h-40 animate-pulse" />
          ) : restaurant && (
            <div className="hidden sm:block relative rounded-2xl sm:rounded-3xl overflow-hidden border border-glass/80 shadow-luxury bg-bg-darkSec">
              <div className="h-32 sm:h-40 relative overflow-hidden">
                {/* Background Cover Image */}
                <img
                  src={restaurant.image || restaurant.bannerImage || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200"}
                  alt={restaurant.name}
                  className={`w-full h-full object-cover filter ${!isResOpen ? 'grayscale brightness-75' : 'brightness-90'}`}
                />
                {/* Dark Gradient Overlay for crystal clear text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/75 to-black/40" />

                {/* Top Badges Row */}
                <div className="absolute top-2.5 left-3 sm:top-3 sm:left-4 flex items-center gap-2 flex-wrap z-10">
                  <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md border flex items-center gap-1.5 ${isResOpen ? 'bg-emerald-600/90 text-white border-emerald-400/40' : 'bg-rose-600/90 text-white border-rose-400/40'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isResOpen ? 'bg-emerald-300 animate-pulse' : 'bg-white'}`} />
                    <span>{isResOpen ? 'OPEN FOR ORDERS' : 'CLOSED NOW'}</span>
                  </span>

                  {restaurant.deliveryTime && (
                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-black/60 text-white border border-white/20 backdrop-blur-md flex items-center gap-1.5">
                      <Clock size={12} className="text-primary" />
                      <span>{restaurant.deliveryTime}</span>
                    </span>
                  )}
                </div>

                {/* Top Right Rating Badge */}
                <div className="absolute top-2.5 right-3 sm:top-3 sm:right-4 z-10">
                  <div className="flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-500 text-black font-black text-xs shadow-md border border-amber-300">
                    <Star size={13} className="fill-black text-black" />
                    <span>{restaurant.rating || 4.8} Rating</span>
                  </div>
                </div>

                {/* Bottom Main Content Row */}
                <div className="absolute bottom-2.5 left-3 right-3 sm:bottom-3.5 sm:left-4 sm:right-4 flex items-end justify-between gap-3 z-10">
                  <div className="flex items-center gap-3">
                    {/* Logo Avatar */}
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-white/20 shadow-xl shrink-0 bg-black/60 backdrop-blur-md">
                      <img
                        src={restaurant.logo || restaurant.image || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400"}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Shop Name & Address + Categories */}
                    <div className="space-y-0.5 text-left">
                      <div className="flex items-center gap-2.5">
                        <h1 className="text-lg sm:text-2xl font-black font-display text-white tracking-tight drop-shadow-md">
                          {restaurant.name}
                        </h1>

                        <button
                          type="button"
                          onClick={(e) => toggleFav(restaurant, e)}
                          className={`p-1.5 rounded-xl border backdrop-blur-md transition-all duration-300 active:scale-95 cursor-pointer shrink-0 ${favorites[restaurant.id || id || '']
                            ? 'bg-rose-500/25 border-rose-500/40 text-rose-400'
                            : 'bg-black/40 border-white/20 text-white hover:border-rose-400/50 hover:bg-rose-500/10'
                            }`}
                          title={favorites[restaurant.id || id || ''] ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Heart size={14} className={favorites[restaurant.id || id || ''] ? "fill-rose-500 text-rose-500" : "text-white"} />
                        </button>
                      </div>

                      {restaurant.address && (
                        <p className="text-[10.5px] sm:text-xs text-text-secondary flex items-center gap-1 font-medium">
                          <MapPin size={11} className="text-primary shrink-0" />
                          <span className="truncate max-w-lg">{restaurant.address}</span>
                        </p>
                      )}

                      {/* Categories Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {(categories.filter(c => c && c.trim() !== '' && c !== 'All').length > 0
                          ? categories.filter(c => c && c.trim() !== '' && c !== 'All')
                          : [restaurant.cuisine || 'Multi-Cuisine']
                        ).map((catName, idx) => (
                          <span key={catName || `cat-${idx}`} className="px-2 py-0.5 rounded-md bg-black/50 text-white text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider border border-white/15 backdrop-blur-md">
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

              {/* 2. Swiggy Horizontal Filter Bar (Dynamic Veg / Non-Veg Toggle Chips + Categories) */}
              {(() => {
                const hasNonVegItems = menuItems.some((d: any) => d.isVeg === false || d.type === 'non-veg' || d.type === 'nonveg');
                const isPureVegShop = (restaurant as any)?.dietaryType === 'PURE_VEG' || (restaurant as any)?.isVegOnly === true || (!hasNonVegItems && menuItems.length > 0);

                return (
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
                      <span>{isPureVegShop ? 'Pure Veg' : 'Veg'}</span>
                    </button>

                    {/* Non-Veg Filter Chip (Only rendered if store has Non-Veg items) */}
                    {!isPureVegShop && (
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
                    )}

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

                    <div className="h-4 w-px bg-glass shrink-0 mx-1" />

                    {/* Grid / List Layout Switcher */}
                    <div className="flex items-center gap-1 bg-bg-dark/80 p-1 rounded-xl border border-glass shrink-0 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${viewMode === 'grid'
                          ? 'bg-primary text-black font-extrabold shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                          }`}
                        title="Grid View"
                      >
                        <LayoutGrid size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${viewMode === 'list'
                          ? 'bg-primary text-black font-extrabold shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                          }`}
                        title="List View"
                      >
                        <List size={15} />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Food Items Grid / List */}
          {loading ? (
            viewMode === 'grid' ? <MobileGridSkeleton count={6} /> : <MobileMenuSkeleton count={5} />
          ) : filteredMenuItems.length === 0 ? (
            <div className="py-20 text-center glass-panel border border-glass rounded-3xl p-12 max-w-lg mx-auto space-y-4">
              <Utensils size={48} className="mx-auto text-text-muted opacity-50" />
              <h3 className="text-xl font-bold font-display text-text-primary">No Food Items Available</h3>
              <p className="text-xs text-text-muted">
                This establishment has not listed items matching your filter criteria yet.
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3.5 sm:gap-5 md:gap-6 w-full" : "flex flex-col space-y-4 w-full"}>
              {filteredMenuItems.map((item, idx) => {
                const dishId = item.menuItemId || item.id || `dish-${idx}`;
                const isRestaurantClosed = isResClosed;
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
                  image: item.foodImage || item.image || '',
                  type: (item.isVeg !== false ? 'veg' : 'non-veg') as 'veg' | 'non-veg',
                  isVeg: item.isVeg !== false,
                  isAvailable: !isOutOfStock,
                  restaurantIsOpen: !isRestaurantClosed,
                  rating: 4.8,
                  restaurantId: restaurant?.id || id || item.restaurantId,
                  restaurantName: removeEmojis(restaurant?.name || 'Partner Shop'),
                  variants: itemVariants
                };

                if (viewMode === 'grid') {
                  return (
                    <motion.div
                      key={dishId}
                      initial={false}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => navigate(`/item/${dishObj.id}`, { state: { dish: dishObj } })}
                      className={`glass-panel border rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between shadow-luxury transition-all duration-300 w-full relative overflow-hidden bg-bg-cardSec group hover:border-primary/40 cursor-pointer h-full ${isOutOfStock
                        ? 'opacity-70 border-rose-500/20 bg-bg-dark/40'
                        : 'border-glass'
                        }`}
                    >
                      {/* Image Container with Overlays */}
                      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-bg-dark border border-glass/60 shrink-0">
                        <ItemImageOrIcon
                          image={dishObj.image}
                          name={dishObj.name}
                          category={dishObj.category}
                          isVeg={dishObj.isVeg}
                          className={`w-full h-full object-cover transition-transform duration-500 ${isOutOfStock ? 'grayscale' : 'group-hover:scale-105'}`}
                          containerClassName="w-full h-full"
                          iconSize={32}
                        />

                        {/* Top-Left: Veg / Non-Veg Indicator */}
                        <div className="absolute top-2 left-2 z-10 p-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xs">
                          <div
                            className={`w-3.5 h-3.5 rounded-sm border-2 p-0.5 flex items-center justify-center ${dishObj.isVeg ? 'border-emerald-500' : 'border-rose-500'
                              }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${dishObj.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                            />
                          </div>
                        </div>

                        {/* Top-Right: Wishlist Heart */}
                        <button
                          type="button"
                          onClick={(e) => toggleFav(dishObj, e)}
                          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-95 transition-all shadow-md cursor-pointer hover:bg-black/80"
                          title="Favorite"
                        >
                          <Heart size={13} className={favorites[dishId] ? "fill-rose-500 text-rose-500" : "text-white"} />
                        </button>

                        {/* Bottom-Left: Discount Badge */}
                        {activeVariant?.compareAtPrice && Number(activeVariant.compareAtPrice) > effectivePrice && (
                          <div className="absolute bottom-2 left-2 z-10">
                            {(() => {
                              const disc = Math.round(((Number(activeVariant.compareAtPrice) - effectivePrice) / Number(activeVariant.compareAtPrice)) * 100);
                              return disc > 0 ? (
                                <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md border border-emerald-400/40 shadow-sm uppercase tracking-wider">
                                  {disc}% OFF
                                </span>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="space-y-1.5 pt-2.5 flex-1 flex flex-col justify-between text-left">
                        <div className="space-y-1">
                          {/* Category Badge */}
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 truncate">
                              {dishObj.category}
                            </span>
                          </div>

                          {/* Item Title */}
                          <h3 className="font-extrabold text-xs sm:text-base text-text-primary line-clamp-1 h-5 leading-tight group-hover:text-primary transition-colors truncate">
                            {dishObj.name}
                          </h3>

                          {/* Variant / Portion Fixed Container (Ensures 100% Uniform Card Height across Grid) */}
                          <div className="h-6 sm:h-7 flex items-center my-0.5 max-w-full">
                            {hasMultipleVariants ? (
                              <div
                                className="inline-flex items-center gap-1 p-0.5 sm:p-1 rounded-full bg-slate-200/80 dark:bg-bg-dark/90 border border-slate-300/80 dark:border-glass/80 overflow-x-auto max-w-full scroll-smooth shadow-inner [&::-webkit-scrollbar]:hidden"
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedVariantsMap(prev => ({ ...prev, [dishId]: v }));
                                      }}
                                      className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0 ${isSelected
                                        ? 'bg-white dark:bg-primary text-slate-900 dark:text-black font-black shadow-md scale-[1.02]'
                                        : 'text-slate-600 dark:text-text-muted hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                      <span>{shortLabel}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[9.5px] sm:text-[10.5px] font-bold text-text-muted/80 bg-glass-subtle/60 px-2 py-0.5 rounded-full border border-glass/40 inline-flex items-center truncate">
                                <span>{getItemVariantLabel(item)}</span>
                              </span>
                            )}
                          </div>

                          {/* Fixed Height Description (Strictly 1 Line to ensure all cards have uniform height) */}
                          <div className="h-4 sm:h-5 overflow-hidden">
                            <p className="text-[10.5px] sm:text-xs text-text-muted line-clamp-1 truncate leading-tight">
                              {dishObj.description || 'Freshly prepared delicious item.'}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Footer: Price & ADD Button */}
                        <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-glass/60 mt-2">
                          <div className="flex flex-col text-left">
                            <div className="font-black text-sm sm:text-lg text-text-primary font-display flex items-baseline gap-1">
                              <span>₹{Number.isInteger(effectivePrice) ? effectivePrice : effectivePrice.toFixed(2)}</span>
                            </div>
                            {activeVariant?.compareAtPrice && Number(activeVariant.compareAtPrice) > effectivePrice && (
                              <span className="text-[10px] sm:text-xs text-text-muted line-through font-normal -mt-0.5">
                                ₹{Number.isInteger(Number(activeVariant.compareAtPrice)) ? Number(activeVariant.compareAtPrice) : Number(activeVariant.compareAtPrice).toFixed(2)}
                              </span>
                            )}
                          </div>

                          <div onClick={(e) => e.stopPropagation()}>
                            {isRestaurantClosed ? (
                              <button
                                disabled
                                className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed uppercase"
                              >
                                Closed
                              </button>
                            ) : isOutOfStock ? (
                              <button
                                disabled
                                className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed uppercase"
                              >
                                Unavailable
                              </button>
                            ) : qtyInCart > 0 ? (
                              <div className="flex items-center bg-bg-cardSec text-primary rounded-xl px-1.5 py-0.5 sm:px-2 sm:py-1 shadow-md border-2 border-primary">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    reduceQuantity(itemKey);
                                  }}
                                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-md hover:bg-primary/20 text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                                  title="Decrease quantity"
                                >
                                  <Minus size={11} className="stroke-[3]" />
                                </button>
                                <span className="w-5 text-center font-black text-xs font-display text-primary">
                                  {qtyInCart}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(dishObj, activeVariant);
                                  }}
                                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-md hover:bg-primary/20 text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                                  title="Increase quantity"
                                >
                                  <Plus size={11} className="stroke-[3]" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(dishObj, activeVariant);
                                }}
                                className="px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-xl bg-primary/15 text-primary hover:bg-primary hover:text-black border border-primary/40 font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
                              >
                                <span>ADD</span>
                                <Plus size={12} className="stroke-[3]" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                // List View Layout
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

                      {/* Portion / Variant Container (Ensures Uniform Card Spacing in List View) */}
                      <div className="h-7 sm:h-8 flex items-center my-0.5 max-w-full">
                        {hasMultipleVariants ? (
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
                        ) : (
                          <span className="text-[10px] sm:text-xs font-bold text-text-muted/80 bg-glass-subtle/60 px-2.5 py-0.5 rounded-full border border-glass/40 inline-flex items-center truncate">
                            <span>{getItemVariantLabel(item)}</span>
                          </span>
                        )}
                      </div>

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
                        <ItemImageOrIcon
                          image={dishObj.image}
                          name={dishObj.name}
                          category={dishObj.category}
                          isVeg={dishObj.isVeg}
                          className={`w-full h-full object-cover transition-transform duration-500 ${isOutOfStock ? 'grayscale' : 'hover:scale-105'}`}
                          containerClassName="w-full h-full"
                          iconSize={24}
                          showCategoryLabel={false}
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
          <div className="fixed inset-0 z-[1000000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-bg-cardSec border-t sm:border border-glass rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-glass pb-3 shrink-0">
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

              {/* Options List with Smooth Scroll */}
              <div className="space-y-2.5 py-2 my-2 overflow-y-auto max-h-[50vh] sm:max-h-[45vh] pr-1 touch-pan-y flex-1 custom-scrollbar">
                {activePickerDish.variants.map((v: any, idx: number) => {
                  const currentActive = selectedVariantsMap[activePickerDish.id] || activePickerDish.variants[0];
                  const isSelected =
                    (currentActive?.id && v.id && String(currentActive.id) === String(v.id)) ||
                    (currentActive?.variantId && v.variantId && String(currentActive.variantId) === String(v.variantId)) ||
                    (currentActive?.label && v.label && currentActive.label === v.label && Number(currentActive.price) === Number(v.price)) ||
                    (currentActive?.quantity === v.quantity && currentActive?.unit === v.unit && Number(currentActive?.price) === Number(v.price)) ||
                    (currentActive === v) ||
                    (!selectedVariantsMap[activePickerDish.id] && idx === 0);

                  const vLabel = v.label || `${v.quantity} ${v.unit}`;
                  const priceNum = Number(v.price);
                  const formattedPrice = Number.isInteger(priceNum) ? priceNum : priceNum.toFixed(2);

                  return (
                    <button
                      key={v.id || v.variantId || idx}
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
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-amber-400 text-black font-black text-sm shadow-luxury hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-between px-5 cursor-pointer shrink-0 mt-2"
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
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-[1000000]">
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
            bgClassName="bg-bg-cardSec border border-glass dark:border-white/15 text-text-primary shadow-luxury"
            contentClassName="p-4"
            trigger={
              <div className="flex items-center justify-center gap-2 px-3.5 w-full h-full rounded-full bg-primary text-black font-black text-xs uppercase tracking-wider whitespace-nowrap shadow-none border border-black/15 hover:scale-105 active:scale-95 transition-transform cursor-pointer">
                <UtensilsCrossed size={16} className="stroke-[2.5] shrink-0" />
                <span className="font-black text-xs shrink-0">MENU</span>
                <span className="w-5 h-5 rounded-full bg-black text-primary font-black text-[10px] flex items-center justify-center border border-black/20 shrink-0 shadow-inner">
                  {categories.filter(c => c !== 'All').length}
                </span>
              </div>
            }
          >
            <div className="space-y-3 text-left">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-glass/80 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-black shrink-0">
                    <Utensils size={14} className="stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-xs text-text-primary uppercase tracking-wider font-display">STORE CATEGORIES</h3>
                    <p className="text-[10px] text-text-muted font-bold">{menuItems.length} Total Dishes</p>
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
                        ? 'bg-primary text-black font-black shadow-md'
                        : 'bg-bg-dark/70 hover:bg-bg-dark border border-glass text-text-primary hover:text-primary font-bold'
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2 text-left">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-black' : 'bg-primary'}`} />
                        <span className="text-xs font-extrabold truncate text-left">
                          {cat === 'All' ? 'All Establishment Dishes' : removeEmojis(cat)}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${isSelected ? 'bg-black/20 text-black' : 'bg-bg-dark text-text-muted border border-glass'
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
