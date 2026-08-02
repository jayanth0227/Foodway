import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

export const CartNotificationToast: React.FC = () => {
  const { lastAddedItem, totalItemsCount, totalAmount, dismissToast } = useCart();
  const navigate = useNavigate();

  if (!lastAddedItem || totalItemsCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-50 max-w-md w-[92vw] sm:w-[380px] bg-bg-darkSec border border-primary/40 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center justify-between gap-3 text-text-primary"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-glass">
            <img src={lastAddedItem.image} alt={lastAddedItem.name} className="w-full h-full object-cover" />
            <span className="absolute bottom-0 right-0 bg-primary text-black font-black text-[9px] px-1 rounded-tl-md">
              x{lastAddedItem.quantity}
            </span>
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-black uppercase text-primary tracking-wider">Item Added to Cart</span>
            </div>
            <h4 className="font-bold text-xs text-white truncate">{lastAddedItem.name}</h4>
            <p className="text-[11px] font-extrabold text-amber-400">
              Cart Total: ₹{totalAmount.toFixed(2)} ({totalItemsCount} items)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              dismissToast();
              navigate('/cart');
            }}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-black font-black text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag size={13} />
            <span>View Cart</span>
            <ArrowRight size={13} />
          </button>

          <button
            onClick={dismissToast}
            className="p-1.5 rounded-lg text-text-muted hover:text-white transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
