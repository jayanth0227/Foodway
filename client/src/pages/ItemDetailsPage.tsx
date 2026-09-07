import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Star, Plus, Minus, ShoppingBag, Check, Store, Clock, UtensilsCrossed, Info, FileText, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { getWishlist, toggleWishlistItem } from '../utils/wishlistUtils';
import ItemImageOrIcon from '../components/common/ItemImageOrIcon';
import { API_BASE_URL } from '../utils/api';

const removeEmojis = (str: string) => {
  if (!str) return '';
  return str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
};

export const ItemDetailsPage: React.FC = () => {
  const { dishId } = useParams<{ dishId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, reduceQuantity, getItemQuantity } = useCart();

  const [dish, setDish] = useState<any | null>(() => location.state?.dish || null);
  const [loading, setLoading] = useState<boolean>(!location.state?.dish);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    const list = getWishlist();
    const favMap: Record<string, boolean> = {};
    list.forEach(i => { favMap[i.id] = true; });
    return favMap;
  });

  // Sync wishlist updates
  useEffect(() => {
    const syncWishlist = () => {
      const list = getWishlist();
      const favMap: Record<string, boolean> = {};
      list.forEach(i => { favMap[i.id] = true; });
      setFavorites(favMap);
    };
    window.addEventListener('foodway_wishlist_updated', syncWishlist);
    return () => window.removeEventListener('foodway_wishlist_updated', syncWishlist);
  }, []);

  // Fetch item details if not passed via route state
  useEffect(() => {
    let isMounted = true;
    if (dishId) {
      if (!dish || String(dish.id || dish.menuItemId) !== String(dishId)) {
        setLoading(true);
        axios.get(`${API_BASE_URL}/public/dishes/${dishId}`)
          .then((res) => {
            if (isMounted && res.data && res.data.dish) {
              setDish(res.data.dish);
            }
          })
          .catch(() => {
            // Fallback scan if single fetch fails
            axios.get(`${API_BASE_URL}/public/dishes`)
              .then((res) => {
                if (isMounted && res.data && res.data.dishes) {
                  const found = res.data.dishes.find((d: any) => String(d.id || d.menuItemId) === String(dishId));
                  if (found) setDish(found);
                }
              })
              .catch((err) => console.error("Error fetching dish details:", err))
              .finally(() => { if (isMounted) setLoading(false); });
          })
          .finally(() => { if (isMounted) setLoading(false); });
      } else {
        setLoading(false);
      }
    }
  }, [dishId]);

  const targetDishId = dish?.id || dish?.menuItemId || dishId || '';
  const itemName = removeEmojis(dish?.foodName || dish?.name || 'Item Details');
  const itemDesc = removeEmojis(dish?.description || '');
  const itemCategory = removeEmojis(dish?.category || dish?.foodCategory || 'General');
  const itemImage = dish?.foodImage || dish?.image || dish?.logo || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';
  const isVeg = dish?.isVeg !== false && dish?.type !== 'non-veg' && dish?.type !== 'nonveg';
  const isOutOfStock = dish?.isAvailable === false || dish?.status === 'UNAVAILABLE' || dish?.status === 'disabled';
  const itemVariants = Array.isArray(dish?.variants) && dish.variants.length > 0 ? dish.variants : [];

  const activeVariant = selectedVariant || (itemVariants.length > 0 ? itemVariants[0] : dish?.selectedVariant);
  const effectivePrice = activeVariant ? Number(activeVariant.price) : Number(dish?.price || 0);
  const activeVariantId = activeVariant?.id || activeVariant?.variantId;
  const itemKey = activeVariantId ? `${targetDishId}-${activeVariantId}` : targetDishId;
  const qtyInCart = getItemQuantity(targetDishId, activeVariantId);
  const isFav = !!favorites[targetDishId];

  const toggleFav = () => {
    if (!targetDishId) return;
    toggleWishlistItem({
      id: targetDishId,
      name: itemName,
      image: itemImage,
      price: effectivePrice,
      rating: dish?.rating || 4.8,
      restaurantId: dish?.restaurantId || 'kona-res',
      restaurantName: dish?.restaurantName || 'Partner Store',
      category: itemCategory,
      type: 'dish',
    });
  };

  const dishPayload = dish ? {
    id: targetDishId,
    name: itemName,
    description: itemDesc,
    price: effectivePrice,
    category: itemCategory,
    image: itemImage,
    type: (isVeg ? 'veg' : 'non-veg') as 'veg' | 'non-veg',
    isVeg: isVeg,
    isAvailable: !isOutOfStock,
    rating: dish.rating || 4.8,
    restaurantId: dish.restaurantId || 'kona-res',
    restaurantName: removeEmojis(dish.restaurantName || dish.shopName || 'Partner Store'),
    variants: itemVariants
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark pt-24 pb-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm font-bold animate-pulse">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="min-h-screen bg-bg-dark pt-24 pb-16 px-4 flex flex-col items-center justify-center text-center">
        <UtensilsCrossed size={48} className="text-text-muted mb-4 opacity-50" />
        <h2 className="text-2xl font-black text-text-primary mb-2">Item Not Found</h2>
        <p className="text-text-muted text-sm max-w-md mb-6">
          The dish you are looking for might have been removed or is temporarily unavailable.
        </p>
        <button
          onClick={() => navigate('/dishes')}
          className="px-6 py-3 rounded-2xl bg-primary text-black font-black uppercase text-xs tracking-wider hover:bg-amber-400 transition-all shadow-luxury cursor-pointer"
        >
          Explore All Dishes
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary pt-16 sm:pt-24 lg:pt-20 pb-44 sm:pb-36 lg:pb-32">
      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-3.5 sm:px-6 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-8 items-start">
          {/* Left Column: Premium Hero Image with Floating Header Overlay */}
          <div className="md:col-span-6 space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative aspect-[4/3] sm:aspect-[4/3] w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-bg-cardSec group"
            >
              <ItemImageOrIcon
                image={itemImage}
                name={itemName}
                category={dish.category}
                isVeg={isVeg}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                containerClassName="w-full h-full"
                iconSize={90}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-black/20 to-black/60 pointer-events-none" />

              {/* Floating Top Navigation Icon Bar directly inside Hero */}
              <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-auto">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-10 h-10 rounded-full bg-black/70 hover:bg-black backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xl group/btn"
                  title="Go Back"
                >
                  <ArrowLeft size={18} className="group-hover/btn:-translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={toggleFav}
                  className={`w-10 h-10 rounded-full backdrop-blur-xl border flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xl ${
                    isFav
                      ? 'bg-rose-500/40 border-rose-500/70 text-rose-400 shadow-rose-500/30'
                      : 'bg-black/70 hover:bg-black border-white/20 text-white hover:text-rose-400'
                  }`}
                  title={isFav ? "Remove from Wishlist" : "Add to Wishlist"}
                >
                  <Heart size={18} className={isFav ? "fill-rose-500 text-rose-500 scale-110" : "text-white"} />
                </button>
              </div>

              {/* Badges Overlay on Image Removed as per design preference */}
            </motion.div>
          </div>

          {/* Right Column: Dish Info & Options */}
          <div className="md:col-span-6 space-y-4 text-left">
            {/* Title, Veg Dot, Rating & Info Header Card */}
            <div className="bg-bg-cardSec/40 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-2.5 backdrop-blur-sm shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  {/* Veg/Non-Veg Dot Indicator + Category Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-transparent ${
                        isVeg
                          ? 'border-emerald-500/80 text-emerald-400'
                          : 'border-rose-500/80 text-rose-400'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-[3px] border-2 flex items-center justify-center shrink-0 ${isVeg ? 'border-emerald-500' : 'border-rose-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                      </span>
                      <span>{isVeg ? 'Veg' : 'Non-Veg'}</span>
                    </span>

                    {itemCategory && (
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/25">
                        {itemCategory}
                      </span>
                    )}
                  </div>

                  {/* Main Product Title */}
                  <h1 className="text-xl sm:text-2xl font-black font-display text-text-primary leading-snug tracking-tight pt-0.5">
                    {itemName}
                  </h1>

                  {/* Prepared Fresh By Restaurant & Prep Time */}
                  {(dish.restaurantName || dish.shopName || dish.prepTime) && (
                    <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                      {(dish.restaurantName || dish.shopName) && (
                        <Link
                          to={dish.restaurantId ? `/restaurants/${dish.restaurantId}` : '/restaurants'}
                          className="inline-flex items-center gap-1.5 text-text-muted hover:text-primary transition-colors font-semibold group"
                        >
                          <Store size={13} className="text-primary group-hover:scale-110 transition-transform" />
                          <span className="text-primary font-bold group-hover:underline">{removeEmojis(dish.restaurantName || dish.shopName)}</span>
                        </Link>
                      )}

                      {dish.prepTime && (
                        <>
                          <span className="text-text-muted/40">•</span>
                          <span className="inline-flex items-center gap-1 text-text-muted font-medium">
                            <Clock size={12} className="text-primary" />
                            <span>{dish.prepTime || '15-20m'}</span>
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Mint Green Rating Badge Pill on Right Side */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-black text-xs sm:text-sm shrink-0">
                  <Star size={14} className="fill-emerald-400 text-emerald-400 shrink-0" />
                  <span>{dish.rating || 4.8}</span>
                </div>
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-bg-cardSec/80 border border-white/10 p-4 rounded-2xl space-y-1.5 backdrop-blur-sm shadow-sm">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Info size={14} className="text-primary" />
                <span>Description & Flavor Profile</span>
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-medium">
                {itemDesc || 'Freshly prepared delicious dish crafted with high quality ingredients and authentic flavor.'}
              </p>
            </div>

            {/* Freshness & Hygiene Guarantee */}
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold shadow-sm">
              <ShieldCheck size={18} className="shrink-0 text-emerald-400" />
              <span>Prepared fresh upon order following strict hygiene protocols</span>
            </div>

            {/* Portion / Weight Pack Selector */}
            {itemVariants.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center justify-between">
                  <span>Select Portion / Weight Pack</span>
                  <span className="text-primary text-[10px]">Required</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {itemVariants.map((v: any, idx: number) => {
                    const isSelected =
                      (activeVariant?.id && v.id && String(activeVariant.id) === String(v.id)) ||
                      (activeVariant?.variantId && v.variantId && String(activeVariant.variantId) === String(v.variantId)) ||
                      (activeVariant?.label && v.label && activeVariant.label === v.label && Number(activeVariant.price) === Number(v.price)) ||
                      (activeVariant?.quantity === v.quantity && activeVariant?.unit === v.unit && Number(activeVariant?.price) === Number(v.price)) ||
                      (activeVariant === v) ||
                      (!selectedVariant && idx === 0);
                    const rawLabel = v.label || `${v.quantity} ${v.unit}`;
                    const vPrice = Number(v.price);

                    return (
                      <button
                        key={v.id || idx}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/15 border-primary text-primary font-black shadow-md ring-1 ring-primary/40 scale-[1.01]'
                            : 'bg-bg-cardSec/90 border-white/10 text-text-secondary hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary text-black' : 'border-text-muted'}`}>
                            {isSelected && <Check size={10} className="stroke-[3]" />}
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-text-primary">{rawLabel}</span>
                        </div>
                        <span className="text-xs sm:text-sm font-black text-primary">₹{Number.isInteger(vPrice) ? vPrice : vPrice.toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Modern Responsive Bottom Bar (Fits seamlessly on Mobile & Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 z-[99999999] bg-bg-cardSec/95 backdrop-blur-2xl border-t border-white/15 px-3.5 sm:px-6 py-3 sm:py-4 shadow-[0_-12px_35px_rgba(0,0,0,0.6)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Price Label & Display */}
          <div className="flex flex-col text-left shrink-0">
            <span className="text-[9.5px] sm:text-xs font-black uppercase text-text-muted tracking-widest">Total Price</span>
            <div className="font-black text-xl sm:text-3xl text-text-primary font-display flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-primary font-black">₹{Number.isInteger(effectivePrice) ? effectivePrice : effectivePrice.toFixed(2)}</span>
              {activeVariant?.compareAtPrice && Number(activeVariant.compareAtPrice) > effectivePrice && (
                <span className="text-[11px] sm:text-sm text-text-muted line-through font-normal">
                  ₹{Number.isInteger(Number(activeVariant.compareAtPrice)) ? Number(activeVariant.compareAtPrice) : Number(activeVariant.compareAtPrice).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons: White Pill Stepper / ADD + Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {qtyInCart > 0 && !isOutOfStock ? (
              <div className="flex items-center bg-white text-amber-600 rounded-full px-2 sm:px-3 py-1.5 sm:py-2 border border-amber-300/90 shrink-0 font-black">
                <button
                  type="button"
                  onClick={() => reduceQuantity(itemKey)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-amber-100/70 text-amber-600 font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  title="Decrease quantity"
                >
                  <Minus size={15} className="stroke-[3.5]" />
                </button>
                <span className="w-7 sm:w-9 text-center font-black text-sm sm:text-base font-display text-amber-600">
                  {qtyInCart}
                </span>
                <button
                  type="button"
                  onClick={() => dishPayload && addToCart(dishPayload, activeVariant)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-amber-100/70 text-amber-600 font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  title="Increase quantity"
                >
                  <Plus size={15} className="stroke-[3.5]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={() => {
                  if (dishPayload) addToCart(dishPayload, activeVariant);
                }}
                className={`px-6 sm:px-9 py-2.5 sm:py-3.5 rounded-full font-black text-sm sm:text-base uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 ${
                  isOutOfStock
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed'
                    : 'bg-white text-amber-600 hover:bg-amber-50 border border-amber-300/90'
                }`}
              >
                <span>{isOutOfStock ? 'Unavailable' : 'ADD'}</span>
                {!isOutOfStock && <Plus size={18} className="stroke-[3.5] text-amber-600" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailsPage;
