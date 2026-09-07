import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Star, Plus, Minus, ShoppingBag, Check, Info } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { getWishlist, toggleWishlistItem } from '../../utils/wishlistUtils';
import ItemImageOrIcon from './ItemImageOrIcon';

interface ItemDetailsModalProps {
  item: any | null;
  isOpen: boolean;
  onClose: () => void;
}

const removeEmojis = (str: string) => {
  if (!str) return '';
  return str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
};

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({ item, isOpen, onClose }) => {
  const { addToCart, reduceQuantity, getItemQuantity } = useCart();
  const [selectedVariantsMap, setSelectedVariantsMap] = useState<Record<string, any>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    const list = getWishlist();
    const favMap: Record<string, boolean> = {};
    list.forEach(i => { favMap[i.id] = true; });
    return favMap;
  });

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

  if (!isOpen || !item) return null;

  const dishId = item.id || item.menuItemId || item._id;
  const itemName = removeEmojis(item.foodName || item.name || 'Delicious Item');
  const itemDesc = removeEmojis(item.description || '');
  const itemCategory = removeEmojis(item.category || item.foodCategory || 'General');
  const itemImage = item.foodImage || item.image || item.logo || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';
  const isVeg = item.isVeg !== false && item.type !== 'non-veg' && item.type !== 'nonveg';
  const isOutOfStock = item.isAvailable === false || item.status === 'UNAVAILABLE' || item.status === 'disabled';
  const itemVariants = Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : [];

  const activeVariant = selectedVariantsMap[dishId] || (itemVariants.length > 0 ? itemVariants[0] : item.selectedVariant);
  const effectivePrice = activeVariant ? Number(activeVariant.price) : Number(item.price);
  const activeVariantId = activeVariant?.id || activeVariant?.variantId;
  const itemKey = activeVariantId ? `${dishId}-${activeVariantId}` : dishId;
  const qtyInCart = getItemQuantity(dishId, activeVariantId);
  const isFav = !!favorites[dishId];

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlistItem({
      id: dishId,
      name: itemName,
      image: itemImage,
      price: effectivePrice,
      rating: item.rating || 4.8,
      restaurantId: item.restaurantId || 'kona-res',
      restaurantName: item.restaurantName || 'Partner Store',
      category: itemCategory,
      type: 'dish',
    });
  };

  const dishPayload = {
    id: dishId,
    name: itemName,
    description: itemDesc,
    price: effectivePrice,
    category: itemCategory,
    image: itemImage,
    type: (isVeg ? 'veg' : 'non-veg') as 'veg' | 'non-veg',
    isVeg: isVeg,
    isAvailable: !isOutOfStock,
    rating: item.rating || 4.8,
    restaurantId: item.restaurantId || 'kona-res',
    restaurantName: removeEmojis(item.restaurantName || 'Partner Store'),
    variants: itemVariants
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-hidden">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-bg-cardSec border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col relative max-h-[90vh] sm:max-h-[85vh] shrink-0"
        >
          {/* Header Image Section - Compact Height */}
          <div className="relative h-44 sm:h-52 w-full bg-bg-dark shrink-0 overflow-hidden">
            <ItemImageOrIcon
              image={itemImage}
              name={itemName}
              category={item?.category}
              isVeg={isVeg}
              className="w-full h-full object-cover"
              containerClassName="w-full h-full"
              iconSize={60}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-cardSec via-black/20 to-black/60 pointer-events-none" />

            {/* Close Button X - High contrast pill */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white border border-white/20 flex items-center justify-center active:scale-90 transition-all shadow-xl cursor-pointer backdrop-blur-md"
              title="Close details"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>

            {/* Wishlist Heart Button - Top Left */}
            <button
              type="button"
              onClick={toggleFav}
              className={`absolute top-3 left-3 z-30 w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center active:scale-90 transition-all shadow-md cursor-pointer ${
                isFav
                  ? 'bg-rose-500/40 border-rose-500/70 text-rose-400'
                  : 'bg-black/60 hover:bg-black/90 border-white/20 text-white'
              }`}
              title={isFav ? "Remove from Wishlist" : "Add to Wishlist"}
            >
              <Heart size={16} className={isFav ? "fill-rose-500 text-rose-500 scale-110" : "text-white"} />
            </button>
          </div>

          {/* Scrollable Body Container */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-left custom-scrollbar touch-pan-y overscroll-contain">
            {/* Title, Veg Dot, Rating & Info Header Card */}
            <div className="bg-bg-cardSec/40 border border-white/10 p-3.5 sm:p-4 rounded-2xl space-y-2 backdrop-blur-sm shadow-sm">
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
                  <h2 className="text-lg sm:text-xl font-black font-display text-text-primary leading-snug tracking-tight pt-0.5">
                    {itemName}
                  </h2>

                  {/* Prepared Fresh By Restaurant */}
                  {(item.restaurantName || item.shopName) && (
                    <p className="text-xs text-text-muted font-semibold flex items-center gap-1.5 pt-0.5">
                      <Store size={13} className="text-primary shrink-0" />
                      <span className="text-primary font-bold">{removeEmojis(item.restaurantName || item.shopName)}</span>
                    </p>
                  )}
                </div>

                {/* Mint Green Rating Badge Pill on Right Side */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-black text-xs sm:text-sm shrink-0">
                  <Star size={14} className="fill-emerald-400 text-emerald-400 shrink-0" />
                  <span>{item.rating || 4.8}</span>
                </div>
              </div>
            </div>

            {/* Full Description */}
            <div className="bg-bg-dark/50 border border-white/10 p-3.5 rounded-2xl space-y-1">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Info size={13} className="text-primary shrink-0" />
                <span>Description & Details</span>
              </h4>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-medium">
                {itemDesc || 'Freshly prepared delicious dish crafted with high quality ingredients and authentic flavor.'}
              </p>
            </div>

            {/* Variant Portion Selector */}
            {itemVariants.length > 0 && (
              <div className="space-y-2 pt-1">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted">Select Portion / Weight Pack</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {itemVariants.map((v: any, idx: number) => {
                    const isSelected =
                      (activeVariant?.id && v.id && String(activeVariant.id) === String(v.id)) ||
                      (activeVariant?.variantId && v.variantId && String(activeVariant.variantId) === String(v.variantId)) ||
                      (activeVariant?.label && v.label && activeVariant.label === v.label && Number(activeVariant.price) === Number(v.price)) ||
                      (activeVariant?.quantity === v.quantity && activeVariant?.unit === v.unit && Number(activeVariant?.price) === Number(v.price)) ||
                      (activeVariant === v) ||
                      (!selectedVariantsMap[dishId] && idx === 0);
                    const rawLabel = v.label || `${v.quantity} ${v.unit}`;
                    const vPrice = Number(v.price);

                    return (
                      <button
                        key={v.id || idx}
                        type="button"
                        onClick={() => setSelectedVariantsMap(prev => ({ ...prev, [dishId]: v }))}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/15 border-primary text-primary font-black shadow-md ring-1 ring-primary/40'
                            : 'bg-bg-dark/40 border-white/10 text-text-secondary hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-black' : 'border-text-muted'}`}>
                            {isSelected && <Check size={10} className="stroke-[3]" />}
                          </div>
                          <span className="text-xs font-bold text-text-primary">{rawLabel}</span>
                        </div>
                        <span className="text-xs font-black text-primary">₹{Number.isInteger(vPrice) ? vPrice : vPrice.toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Action Bar */}
          <div className="p-4 sm:p-5 bg-bg-cardSec/95 border-t border-white/15 flex items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col text-left">
              <span className="text-[9.5px] sm:text-[10px] font-black uppercase text-text-muted tracking-widest">Total Price</span>
              <div className="font-black text-xl sm:text-2xl text-text-primary font-display flex items-baseline gap-1.5">
                <span className="text-primary font-black">₹{Number.isInteger(effectivePrice) ? effectivePrice : effectivePrice.toFixed(2)}</span>
                {activeVariant?.compareAtPrice && Number(activeVariant.compareAtPrice) > effectivePrice && (
                  <span className="text-xs text-text-muted line-through font-normal">
                    ₹{Number.isInteger(Number(activeVariant.compareAtPrice)) ? Number(activeVariant.compareAtPrice) : Number(activeVariant.compareAtPrice).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5">
              {qtyInCart > 0 && !isOutOfStock ? (
                <div className="flex items-center bg-white text-amber-600 rounded-full px-2.5 py-1.5 border border-amber-300/90 shrink-0 font-black">
                  <button
                    type="button"
                    onClick={() => reduceQuantity(itemKey)}
                    className="w-7 h-7 rounded-full hover:bg-amber-100/70 text-amber-600 font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                    title="Decrease quantity"
                  >
                    <Minus size={14} className="stroke-[3.5]" />
                  </button>
                  <span className="w-7 text-center font-black text-xs sm:text-sm font-display text-amber-600">
                    {qtyInCart}
                  </span>
                  <button
                    type="button"
                    onClick={() => addToCart(dishPayload, activeVariant)}
                    className="w-7 h-7 rounded-full hover:bg-amber-100/70 text-amber-600 font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                    title="Increase quantity"
                  >
                    <Plus size={14} className="stroke-[3.5]" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => {
                    addToCart(dishPayload, activeVariant);
                  }}
                  className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 ${
                    isOutOfStock
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed'
                      : 'bg-white text-amber-600 hover:bg-amber-50 border border-amber-300/90'
                  }`}
                >
                  <span>{isOutOfStock ? 'Unavailable' : 'ADD'}</span>
                  {!isOutOfStock && <Plus size={16} className="stroke-[3.5] text-amber-600" />}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ItemDetailsModal;
