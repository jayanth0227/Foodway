import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Star, Plus, Minus, ShoppingBag, Check, Store, Clock, UtensilsCrossed, Sparkles, ShieldCheck } from 'lucide-react';
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
    <div className="min-h-screen bg-bg-dark text-text-primary pt-24 sm:pt-24 lg:pt-20 pb-52 lg:pb-24">
      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-1 sm:pt-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Image Banner + Aligned Control Bar */}
          <div className="md:col-span-6 space-y-3">
            {/* Control Bar directly in line with Image Section */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-bg-cardSec border border-glass hover:border-primary/50 text-text-primary font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={toggleFav}
                className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-extrabold transition-all active:scale-95 cursor-pointer shadow-md ${
                  isFav
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-500 shadow-rose-500/10'
                    : 'bg-bg-cardSec border-white/20 text-text-primary hover:border-rose-400 hover:text-rose-400'
                }`}
                title="Add to Wishlist"
              >
                <Heart size={16} className={isFav ? "fill-rose-500 text-rose-500" : "text-text-primary"} />
                <span>{isFav ? 'Favorited' : 'Favorite'}</span>
              </button>
            </div>

            {/* Image Card Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-square sm:aspect-[4/3] w-full rounded-3xl overflow-hidden border border-glass shadow-luxury bg-bg-cardSec"
            >
              <ItemImageOrIcon
                image={itemImage}
                name={itemName}
                category={dish.category}
                isVeg={isVeg}
                className="w-full h-full object-cover"
                containerClassName="w-full h-full"
                iconSize={80}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 via-transparent to-black/30" />

              {/* Badges Overlay */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-md border flex items-center gap-1.5 ${isVeg ? 'bg-emerald-600/90 text-white border-emerald-400/40' : 'bg-rose-600/90 text-white border-rose-400/40'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${isVeg ? 'bg-emerald-300 animate-pulse' : 'bg-white'}`} />
                  <span>{isVeg ? 'VEGETARIAN' : 'NON-VEG'}</span>
                </span>

                {itemCategory && (
                  <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-primary/20 text-primary border border-primary/30 backdrop-blur-md uppercase tracking-wider">
                    {itemCategory}
                  </span>
                )}
              </div>

              {/* Delivery info & rating overlay */}
              <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 backdrop-blur-md text-amber-300 text-xs font-black">
                  <Star size={14} className="fill-amber-300 text-amber-300" />
                  <span>{dish.rating || 4.8} Rating</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-text-muted text-xs font-bold">
                  <Clock size={13} className="text-primary" />
                  <span>{dish.prepTime || '15-20 mins'}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Dish Info & Variants */}
          <div className="md:col-span-6 space-y-5 text-left md:pt-9">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black font-display text-text-primary leading-tight">
                {itemName}
              </h2>

              {(dish.restaurantName || dish.shopName) && (
                <Link
                  to={dish.restaurantId ? `/restaurants/${dish.restaurantId}` : '/restaurants'}
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all text-xs font-extrabold group"
                >
                  <Store size={13} className="text-primary" />
                  <span>{removeEmojis(dish.restaurantName || dish.shopName)}</span>
                </Link>
              )}
            </div>

            {/* Description */}
            <div className="bg-bg-cardSec border border-glass p-4 rounded-2xl space-y-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Sparkles size={13} className="text-primary" />
                <span>Description & Flavor Profile</span>
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-medium">
                {itemDesc || 'Freshly prepared delicious dish crafted with high quality ingredients and authentic flavor.'}
              </p>
            </div>

            {/* Preparation Guarantee */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <ShieldCheck size={18} className="shrink-0" />
              <span>Prepared fresh upon order following strict hygiene protocols</span>
            </div>

            {/* Portion / Variant Options */}
            {itemVariants.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-muted">
                  Select Portion / Weight Pack
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
                            ? 'bg-primary/15 border-primary text-primary font-black shadow-md ring-1 ring-primary/40'
                            : 'bg-bg-cardSec border-glass text-text-secondary hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-black' : 'border-text-muted'}`}>
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

      {/* Fixed Bottom Action Bar (Positioned above mobile tab bar on mobile, and bottom-0 on desktop) */}
      <div className="fixed bottom-[68px] sm:bottom-[72px] lg:bottom-0 left-0 right-0 z-[9999999] bg-bg-cardSec/95 backdrop-blur-2xl border-t border-glass px-4 py-3 sm:py-4 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col text-left">
            <span className="text-[10px] sm:text-xs font-black uppercase text-text-muted tracking-wider">Total Price</span>
            <div className="font-black text-2xl sm:text-3xl text-text-primary font-display flex items-baseline gap-2">
              <span>₹{Number.isInteger(effectivePrice) ? effectivePrice : effectivePrice.toFixed(2)}</span>
              {activeVariant?.compareAtPrice && Number(activeVariant.compareAtPrice) > effectivePrice && (
                <span className="text-xs sm:text-sm text-text-muted line-through font-normal">
                  ₹{Number.isInteger(Number(activeVariant.compareAtPrice)) ? Number(activeVariant.compareAtPrice) : Number(activeVariant.compareAtPrice).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {qtyInCart > 0 && !isOutOfStock && (
              <div className="flex items-center bg-bg-dark text-primary rounded-2xl px-3 py-2 shadow-md border-2 border-primary">
                <button
                  type="button"
                  onClick={() => reduceQuantity(itemKey)}
                  className="w-7 h-7 rounded-xl bg-primary/20 hover:bg-primary hover:text-black text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  title="Decrease quantity"
                >
                  <Minus size={14} className="stroke-[3]" />
                </button>
                <span className="w-8 text-center font-black text-base font-display text-primary">
                  {qtyInCart}
                </span>
                <button
                  type="button"
                  onClick={() => dishPayload && addToCart(dishPayload, activeVariant)}
                  className="w-7 h-7 rounded-xl bg-primary/20 hover:bg-primary hover:text-black text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  title="Increase quantity"
                >
                  <Plus size={14} className="stroke-[3]" />
                </button>
              </div>
            )}

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => {
                if (dishPayload) addToCart(dishPayload, activeVariant);
              }}
              className={`px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-luxury transition-all flex items-center gap-2.5 cursor-pointer active:scale-95 ${
                isOutOfStock
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary to-amber-400 text-black hover:scale-[1.02]'
              }`}
            >
              <ShoppingBag size={18} />
              <span>{isOutOfStock ? 'Unavailable' : qtyInCart > 0 ? 'Add More' : 'Add To Cart'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailsPage;
