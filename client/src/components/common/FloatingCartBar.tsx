import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { getCurrentUser } from '../../utils/auth.utils';

export const FloatingCartBar: React.FC = () => {
  const { totalItemsCount, totalAmount, lastAddedItem, setCartOpen } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Auto-reset dismissed state whenever items count changes or a new item is added
  useEffect(() => {
    if (totalItemsCount > 0) {
      setIsDismissed(false);
    }
  }, [totalItemsCount, lastAddedItem?.timestamp]);

  const currentUser = getCurrentUser();

  // Hide on auth (login/register), admin/restaurant/delivery portal routes, or on checkout/cart pages
  const isAuthOrPortalRoute =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/restaurant') ||
    location.pathname.startsWith('/delivery') ||
    location.pathname === '/cart' ||
    location.pathname === '/checkout';

  // Only show popup when customer is logged in, not on auth/portal pages, and cart is not empty
  if (!currentUser || isAuthOrPortalRoute || totalItemsCount === 0 || isDismissed) {
    return null;
  }

  const handleCheckout = () => {
    setCartOpen(false);
    navigate('/cart');
  };

  const displayName = lastAddedItem?.name || (lastAddedItem as any)?.restaurantName || 'Foodway Cart';
  const displayImage = lastAddedItem?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=200';

  return (
    <AnimatePresence>
      <motion.div
        key={lastAddedItem ? lastAddedItem.name + totalItemsCount : 'floating-cart-popup'}
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-6 z-[9999] sm:w-[420px]"
      >
        <div className="w-full p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-zinc-900 to-black text-white shadow-[0_15px_45px_rgba(0,0,0,0.5)] border border-primary/30 flex items-center justify-between gap-3 backdrop-blur-2xl">
          {/* Left: Thumbnail & Text Stack */}
          <div className="flex items-center gap-3 min-w-0 pl-1">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-primary/40 shrink-0 shadow-sm bg-black">
              <img
                src={displayImage}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 text-left space-y-0.5">
              <div className="flex items-center gap-1.5">
                <ShoppingBag size={13} className="text-primary shrink-0" />
                <h4 className="font-extrabold text-xs text-white truncate max-w-[140px] sm:max-w-[170px]">
                  {displayName}
                </h4>
              </div>
              <p className="text-[11px] font-medium text-emerald-400">
                {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} in cart
              </p>
            </div>
          </div>

          {/* Right: View Cart & Checkout Button & Close Icon */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCheckout}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>View Cart • ₹{Math.round(totalAmount)}</span>
              <ArrowRight size={14} className="stroke-[3]" />
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-text-muted hover:text-white transition-colors cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingCartBar;
