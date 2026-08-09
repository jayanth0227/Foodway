import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const ItemAddedToast: React.FC = () => {
  const { lastAddedItem } = useCart();
  const [visible, setVisible] = useState(false);
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    if (lastAddedItem) {
      setItem(lastAddedItem);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [lastAddedItem]);

  if (!visible || !item) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={item.name + (item.timestamp || Date.now())}
        initial={{ opacity: 0, y: -40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] w-[90vw] max-w-sm pointer-events-none"
      >
        <div className="bg-slate-900/95 dark:bg-bg-darkSec/95 text-white border border-emerald-500/60 px-3.5 py-2.5 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-emerald-500/40 shrink-0 shadow-sm bg-black">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                <span>Added to cart</span>
              </div>
              <h5 className="text-xs font-bold text-white truncate max-w-[200px]">
                {item.name}
              </h5>
            </div>
          </div>

          <div className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-xl text-[11px] font-black shrink-0 border border-emerald-500/40">
            x{item.quantity}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ItemAddedToast;
