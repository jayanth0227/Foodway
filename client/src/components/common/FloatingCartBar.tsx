import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../hooks/useAuth';

export const FloatingCartBar: React.FC = () => {
  const { totalItemsCount, totalAmount, lastAddedItem, setCartOpen } = useCart();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Auto-reset dismissed state whenever items count changes or a new item is added
  useEffect(() => {
    if (totalItemsCount > 0) {
      setIsDismissed(false);
    }
  }, [totalItemsCount, lastAddedItem?.timestamp]);

  // Check if current user is vendor, shop owner, admin, or delivery driver
  const userRole = (user?.role || '').toUpperCase();
  const isVendorOrAdminRole = ['SHOP', 'RESTAURANT', 'VENDOR', 'ADMIN', 'DELIVERY', 'DRIVER'].includes(userRole);

  // Hide on auth (login/register), portal dashboards, or on checkout/cart pages
  const isAuthOrPortalRoute =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/restaurant/dashboard') ||
    location.pathname.startsWith('/shop/dashboard') ||
    location.pathname.startsWith('/vendor') ||
    location.pathname.startsWith('/delivery') ||
    location.pathname === '/cart' ||
    location.pathname === '/checkout';

  // Only show popup for customer users on customer pages when cart is not empty
  if (isVendorOrAdminRole || isAuthOrPortalRoute || totalItemsCount === 0 || isDismissed) {
    return null;
  }

  const handleCheckout = () => {
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
        className="fixed bottom-[144px] lg:bottom-20 right-4 sm:right-6 z-[999999] w-[calc(100%-2rem)] sm:w-[420px]"
      >
        {/* Floating Cart Toast Card */}
        <div
          onClick={handleCheckout}
          className="w-full bg-white dark:bg-[#181C25] backdrop-blur-2xl p-2.5 sm:p-3 rounded-[22px] shadow-[0_16px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.8)] border border-slate-200/90 dark:border-white/20 flex items-center justify-between gap-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-98"
        >
          {/* Left: Circular Image + Details Stack */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-0.5">
            {/* Circular Food/Restaurant Thumbnail */}
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-slate-200 dark:border-white/15 shrink-0 bg-slate-100 dark:bg-white/5 shadow-xs">
              <img
                src={displayImage}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details Stack */}
            <div className="min-w-0 flex-1 text-left space-y-0.5 pr-0.5">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate tracking-tight">
                {displayName}
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                <span>{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="text-primary dark:text-primary-dark hover:underline font-extrabold inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <span>View Menu</span>
                  <span className="text-[9px]">▸</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Side: Emerald Green View Cart Pill Button + Circle Close Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Emerald Green Style Price + View Cart Pill Button */}
            <button
              type="button"
              onClick={handleCheckout}
              className="px-3.5 py-1.5 sm:px-4.5 sm:py-2 rounded-[14px] sm:rounded-[16px] bg-emerald-600 hover:bg-emerald-700 text-white text-center flex flex-col items-center justify-center transition-all shadow-md shadow-emerald-600/30 active:scale-95 cursor-pointer shrink-0"
            >
              <span className="font-black text-xs sm:text-sm font-display leading-tight text-white">
                ₹{Math.round(totalAmount)}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-white/95 leading-tight whitespace-nowrap">
                View Cart
              </span>
            </button>

            {/* Circle Close X Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
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
