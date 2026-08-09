import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const FloatingCartBar: React.FC = () => {
  const { totalItemsCount, totalAmount, lastAddedItem, setCartOpen } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Hide on admin/restaurant/delivery portal routes, or on checkout/cart pages
  const isPortalOrCartRoute =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/restaurant') ||
    location.pathname.startsWith('/delivery') ||
    location.pathname === '/cart';

  if (isPortalOrCartRoute || totalItemsCount === 0 || isDismissed) {
    return null;
  }

  const handleCheckout = () => {
    if (window.innerWidth < 1024) {
      navigate('/cart');
    } else {
      setCartOpen(true);
    }
  };

  const displayName = lastAddedItem?.name || (lastAddedItem as any)?.restaurantName || 'Foodway Orders';
  const displayImage = lastAddedItem?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=200';

  return (
    <AnimatePresence>
      <motion.div
        key={lastAddedItem ? lastAddedItem.name + totalItemsCount : 'swiggy-cart-bar'}
        initial={{ y: 70, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 70, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="fixed bottom-[84px] lg:bottom-6 left-3 right-3 sm:left-auto sm:right-6 z-[9990] sm:w-[410px]"
      >
        <div className="w-full p-2.5 sm:p-3 rounded-full bg-white dark:bg-bg-cardSec text-text-primary shadow-[0_12px_40px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-glass/60 flex items-center justify-between gap-2.5 backdrop-blur-xl">
          {/* Left: Round Avatar Thumbnail & Text Stack */}
          <div className="flex items-center gap-2.5 min-w-0 pl-1">
            <div className="relative w-11 h-11 rounded-full overflow-hidden border border-slate-100 dark:border-glass shrink-0 shadow-sm bg-bg-dark">
              <img
                src={displayImage}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 text-left leading-tight space-y-0.5">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[170px]">
                {displayName}
              </h4>
              <button
                type="button"
                onClick={handleCheckout}
                className="text-[11px] font-bold text-slate-500 dark:text-text-muted hover:text-emerald-500 underline cursor-pointer block truncate"
              >
                View full cart
              </button>
            </div>
          </div>

          {/* Right: Green Swiggy Checkout Pill & Close Icon */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCheckout}
              className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex flex-col items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer leading-none space-y-1"
            >
              <span className="text-xs font-black tracking-tight">Checkout</span>
              <span className="text-[10px] font-bold opacity-90">
                {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'} • ₹{Math.round(totalAmount)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-glass hover:bg-slate-200 dark:hover:bg-glass-subtle flex items-center justify-center text-slate-400 dark:text-text-muted transition-colors cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingCartBar;
