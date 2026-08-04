import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const FloatingCartBar: React.FC = () => {
  const { totalItemsCount, totalAmount, setCartOpen } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on admin/restaurant/delivery portal routes, or on checkout/cart pages
  const isPortalOrCartRoute =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/restaurant') ||
    location.pathname.startsWith('/delivery') ||
    location.pathname === '/cart';

  if (isPortalOrCartRoute || totalItemsCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 220 }}
        className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-40 sm:max-w-md w-[calc(100%-2rem)] sm:w-auto"
      >
        <button
          onClick={() => {
            if (window.innerWidth < 640) {
              navigate('/cart');
            } else {
              setCartOpen(true);
            }
          }}
          className="w-full py-3.5 px-5 rounded-2xl bg-amber-500 dark:bg-primary text-black font-extrabold shadow-luxury hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-between gap-4 border border-amber-400/40 dark:border-primary/40 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black/15 flex items-center justify-center font-mono text-sm font-black gap-1">
              <ShoppingBag size={14} />
              <span>{totalItemsCount}</span>
            </div>
            <div className="text-left leading-tight">
              <span className="text-[10px] uppercase font-black tracking-wider block opacity-80">
                {totalItemsCount === 1 ? '1 Item Selected' : `${totalItemsCount} Items Selected`}
              </span>
              <span className="text-sm font-black font-display">
                View Cart • ₹{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs uppercase font-black tracking-wider bg-black/10 px-3 py-1.5 rounded-xl">
            <span>Checkout</span>
            <ArrowRight size={14} />
          </div>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingCartBar;
