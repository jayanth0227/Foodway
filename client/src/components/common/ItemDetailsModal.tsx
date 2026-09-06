import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Star, Plus, Minus, ShoppingBag, Check } from 'lucide-react';
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
      <div className="fixed inset-0 z-[99999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-hidden">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-bg-cardSec border border-glass rounded-3xl overflow-hidden shadow-2xl flex flex-col relative my-auto max-h-[82vh] sm:max-h-[80vh] shrink-0"
        >
          {/* Header Image Section - Compact Height */}
          <div className="relative h-32 sm:h-40 w-full bg-bg-dark shrink-0 overflow-hidden">
            <ItemImageOrIcon
              image={itemImage}
              name={itemName}
              category={item?.category}
              isVeg={isVeg}
              className="w-full h-full object-cover"
              containerClassName="w-full h-full"
              iconSize={42}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-cardSec via-black/20 to-black/50" />

            {/* Close Button X - High contrast dark backdrop pill */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 flex items-center justify-center active:scale-95 transition-all shadow-xl cursor-pointer"
              title="Close details"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>

            {/* Badges */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 flex-wrap max-w-[75%]">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-md border flex items-center gap-1.5 ${isVeg ? 'bg-emerald-600/90 text-white border-emerald-400/40' : 'bg-rose-600/90 text-white border-rose-400/40'}`}>
                <div className={`w-2 h-2 rounded-full ${isVeg ? 'bg-emerald-300 animate-pulse' : 'bg-white'}`} />
                <span>{isVeg ? 'VEGETARIAN' : 'NON-VEG'}</span>
              </span>

              {itemCategory && (
                <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-primary/20 text-primary border border-primary/30 backdrop-blur-md uppercase tracking-wider truncate">
                  {itemCategory}
                </span>
              )}
            </div>

            {/* Wishlist Heart */}
            <button
              type="button"
              onClick={toggleFav}
              className="absolute bottom-3 right-3 z-20 p-2 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 text-white active:scale-95 transition-all shadow-md cursor-pointer hover:bg-black/90"
              title="Favorite"
            >
              <Heart size={18} className={isFav ? "fill-rose-500 text-rose-500" : "text-white"} />
            </button>
          </div>

          {/* Scrollable Body Container */}
          <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 flex-1 text-left custom-scrollbar touch-pan-y overscroll-contain">
            <div className="space-y-0.5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-black font-display text-text-primary leading-tight">
                  {itemName}
                </h2>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black shrink-0">
                  <Star size={12} className="fill-amber-300 text-amber-300" />
                  <span>{item.rating || 4.8}</span>
                </div>
              </div>

              {(item.restaurantName || item.shopName) && (
                <p className="text-[11px] text-text-muted font-semibold flex items-center gap-1">
                  <span>Prepared fresh by</span>
                  <span className="text-primary font-bold">{removeEmojis(item.restaurantName || item.shopName)}</span>
                </p>
              )}
            </div>

            {/* Full Description */}
            <div className="bg-bg-dark/60 border border-glass p-3 rounded-2xl space-y-0.5">
              <h4 className="text-[9.5px] font-black uppercase tracking-wider text-text-muted">Item Details & Description</h4>
              <p className="text-xs text-text-primary leading-relaxed font-medium">
                {itemDesc || 'Freshly prepared delicious dish crafted with high quality ingredients and authentic flavor.'}
              </p>
            </div>

            {/* Variant Portion Selector */}
            {itemVariants.length > 0 && (
              <div className="space-y-2 pt-0.5">
                <h4 className="text-[9.5px] font-black uppercase tracking-wider text-text-muted">Select Portion / Weight Pack</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        className={`p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/15 border-primary text-primary font-black shadow-md ring-1 ring-primary/40'
                            : 'bg-bg-dark/40 border-glass text-text-secondary hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
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

          {/* Modal Footer Bar */}
          <div className="p-3.5 sm:p-4 bg-bg-cardSec border-t border-glass flex items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col text-left">
              <span className="text-[9.5px] font-black uppercase text-text-muted tracking-wider">Total Amount</span>
              <div className="font-black text-xl sm:text-2xl text-text-primary font-display flex items-baseline gap-1.5">
                <span>₹{Number.isInteger(effectivePrice) ? effectivePrice : effectivePrice.toFixed(2)}</span>
                {activeVariant?.compareAtPrice && Number(activeVariant.compareAtPrice) > effectivePrice && (
                  <span className="text-xs text-text-muted line-through font-normal">
                    ₹{Number.isInteger(Number(activeVariant.compareAtPrice)) ? Number(activeVariant.compareAtPrice) : Number(activeVariant.compareAtPrice).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {qtyInCart > 0 && !isOutOfStock && (
                <div className="flex items-center bg-bg-dark text-primary rounded-2xl px-2.5 py-1.5 shadow-md border-2 border-primary">
                  <button
                    type="button"
                    onClick={() => reduceQuantity(itemKey)}
                    className="w-6 h-6 rounded-lg hover:bg-primary/20 text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  >
                    <Minus size={13} className="stroke-[3]" />
                  </button>
                  <span className="w-7 text-center font-black text-sm font-display text-primary">
                    {qtyInCart}
                  </span>
                  <button
                    type="button"
                    onClick={() => addToCart(dishPayload, activeVariant)}
                    className="w-6 h-6 rounded-lg hover:bg-primary/20 text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  >
                    <Plus size={13} className="stroke-[3]" />
                  </button>
                </div>
              )}

              <button
                type="button"
                disabled={isOutOfStock}
                onClick={() => {
                  addToCart(dishPayload, activeVariant);
                }}
                className={`px-4 sm:px-6 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-luxury transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                  isOutOfStock
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-amber-400 text-black hover:scale-[1.02]'
                }`}
              >
                <ShoppingBag size={16} />
                <span>{isOutOfStock ? 'Unavailable' : qtyInCart > 0 ? 'Add More' : 'Add To Cart'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ItemDetailsModal;
