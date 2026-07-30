import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const CartSidebar: React.FC = () => {
  const {
    cartItems,
    addToCart,
    reduceQuantity,
    removeFromCart,
    clearCart,
    totalAmount,
    isCartOpen,
    setCartOpen,
  } = useCart();

  const serviceFee = totalAmount > 0 ? 5.0 : 0;
  const grandTotal = totalAmount + serviceFee;

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            {/* Slide-over panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-screen max-w-md"
            >
              <div className="h-full flex flex-col bg-bg-card border-l border-glass shadow-2xl overflow-hidden relative">
                {/* Accent glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-primary/10 blur-[60px] pointer-events-none" />

                {/* Header */}
                <div className="px-6 py-6 border-b border-glass flex items-center justify-between z-10">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold font-display text-gradient-gold">
                      Your Selection
                    </h2>
                    {cartItems.length > 0 && (
                      <span className="bg-primary/20 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                        {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-full hover:bg-glass-subtleHover"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 z-10 custom-scroll">
                  {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-5">
                      <div className="w-16 h-16 rounded-full bg-glass-subtle flex items-center justify-center text-text-muted border border-glass">
                        <img
                          src="/logo.jpeg"
                          alt="Empty Cart Logo"
                          className="w-10 h-10 rounded-full object-cover grayscale opacity-50"
                        />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-text-primary text-base tracking-tight">
                          Your cart is empty
                        </h3>
                        <p className="text-xs text-text-muted mt-1.5 max-w-xs mx-auto font-medium">
                          Explore our signature menus and curate your ultimate dining experience.
                        </p>
                      </div>
                      <button
                        onClick={() => setCartOpen(false)}
                        className="btn-secondary font-bold text-xs px-5 py-2.5 rounded-lg"
                      >
                        Explore Cuisines
                      </button>
                    </div>
                  ) : (
                    cartItems.map((item) => (
                      <div
                        key={item.dish.id}
                        className="flex items-center space-x-4 bg-bg-cardSec/40 backdrop-blur-md p-3.5 rounded-2xl border border-glass hover:border-primary/30 transition-all duration-500 group"
                      >
                        <img
                          src={item.dish.image}
                          alt={item.dish.name}
                          className="w-16 h-16 rounded-xl object-cover border border-glass group-hover:scale-[1.03] transition-transform duration-500"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-text-primary truncate font-display tracking-tight">
                            {item.dish.name}
                          </h4>
                          <p className="text-xs text-primary font-bold mt-1">
                            ${item.dish.price.toFixed(2)}
                          </p>
                          <div className="flex items-center space-x-2 mt-2.5">
                             <button
                               onClick={() => reduceQuantity(item.dish.id)}
                               className="p-1 rounded bg-glass-subtle hover:bg-glass-subtleHover text-text-secondary transition-colors"
                             >
                               <Minus size={12} />
                             </button>
                             <span className="text-xs font-bold px-2 w-4 text-center">
                               {item.quantity}
                             </span>
                             <button
                               onClick={() => addToCart(item.dish)}
                               className="p-1 rounded bg-glass-subtle hover:bg-glass-subtleHover text-text-secondary transition-colors"
                             >
                               <Plus size={12} />
                             </button>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.dish.id)}
                          className="text-text-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Subtotal Section */}
                {cartItems.length > 0 && (
                  <div className="px-6 py-6 border-t border-glass bg-bg-cardSec z-10 space-y-4">
                    <div className="space-y-2.5 text-xs text-text-secondary font-medium">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Premium Courier Fee</span>
                        <span>${serviceFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-text-primary text-sm pt-2.5 border-t border-glass">
                        <span>Total Sum</span>
                        <span className="text-gradient-gold text-base">${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={clearCart}
                        className="btn-ghost text-[10px] font-bold py-3.5 rounded-xl flex items-center justify-center space-x-1 uppercase tracking-wider"
                      >
                        <Trash2 size={13} />
                        <span>Reset Cart</span>
                      </button>
                      <button
                        onClick={() => {
                          alert(
                            'Thank you for experiencing MK Delivery Services! (Checkout is in demo mode)'
                          );
                          clearCart();
                          setCartOpen(false);
                        }}
                        className="btn-primary text-[10px] font-bold py-3.5 rounded-xl uppercase tracking-wider text-center"
                      >
                        Checkout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default CartSidebar;
