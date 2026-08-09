import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ShoppingBag, ArrowLeft, Trash2, Plus, Minus, Check, MapPin, Phone, User, CreditCard, ShieldCheck, Utensils, Lock, Sparkles, ChefHat, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../utils/api';
import { CartPageSkeleton } from '../components/common/MobileSkeletonLoader';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, addToCart, reduceQuantity, removeFromCart, clearCart, totalAmount, totalItemsCount } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState((user as any)?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState((user as any)?.address || '');
  const [instructions, setInstructions] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) {
      if (!customerName && user.name) setCustomerName(user.name);
      if (!customerPhone && (user as any).phone) setCustomerPhone((user as any).phone);
      if (!deliveryAddress && (user as any).address) setDeliveryAddress((user as any).address);
    }
  }, [user]);

  const deliveryFee = totalAmount > 300 || totalItemsCount === 0 ? 0 : 30;
  const taxes = Math.round(totalAmount * 0.05);
  const grandTotal = totalAmount + deliveryFee + taxes;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      alert('You must be logged in to place an order. Please log in first.');
      navigate('/login');
      return;
    }

    if (!customerName || !customerPhone || !deliveryAddress) {
      alert('Please fill in your name, phone number, and delivery address.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      // Find target restaurant ID & Name from cart items
      const targetRestaurantId = (cartItems[0]?.dish as any)?.restaurantId || 'RES_DEFAULT';
      const targetRestaurantName = (cartItems[0]?.dish as any)?.restaurantName || 'Partner Restaurant';

      const orderPayload = {
        customerId: user.id || user.email,
        customerName,
        customerPhone,
        deliveryAddress,
        instructions,
        restaurantId: targetRestaurantId,
        restaurantName: targetRestaurantName,
        items: cartItems.map(item => ({
          id: item.dish.id,
          menuItemId: item.dish.id,
          name: item.dish.name,
          foodName: item.dish.name,
          price: item.dish.price,
          quantity: item.quantity,
          image: item.dish.image,
          restaurantId: (item.dish as any).restaurantId || targetRestaurantId
        })),
        subtotal: totalAmount,
        deliveryFee,
        taxes,
        totalAmount: grandTotal,
        paymentMethod: 'CASH_ON_DELIVERY',
        createdAt: new Date().toISOString()
      };

      const response = await axios.post(`${API_BASE_URL}/orders`, orderPayload);
      if (response.data.success || response.status === 200 || response.status === 201) {
        const orderId = response.data.orderId || `ORD-${Date.now().toString().slice(-6)}`;
        setOrderSuccess(orderId);
        clearCart();
      } else {
        alert('Failed to place order: ' + (response.data.error || 'Server error'));
      }
    } catch (error: any) {
      console.error('Error placing order in DynamoDB:', error);
      alert('Failed to save order to database. Please check your network or try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (orderSuccess) {
    const confettiParticles = [
      { x: -55, y: -45, color: 'bg-amber-400', size: 'w-2 h-2 rounded-full' },
      { x: 55, y: -40, color: 'bg-rose-500', size: 'w-2.5 h-1 rounded-sm' },
      { x: -65, y: 15, color: 'bg-blue-400', size: 'w-2 h-2 rounded-full' },
      { x: 65, y: 20, color: 'bg-emerald-400', size: 'w-3 h-1 rounded-sm' },
      { x: -35, y: -65, color: 'bg-purple-400', size: 'w-2 h-2 rounded-full' },
      { x: 35, y: -60, color: 'bg-yellow-300', size: 'w-2.5 h-1 rounded-sm' },
      { x: -25, y: 55, color: 'bg-emerald-500', size: 'w-2 h-2 rounded-full' },
      { x: 30, y: 55, color: 'bg-pink-400', size: 'w-3 h-1 rounded-sm' },
    ];

    return (
      <div className="min-h-screen bg-bg-dark/95 backdrop-blur-md pt-20 pb-20 px-4 flex items-center justify-center relative overflow-hidden z-50">
        {/* Soft Background Emerald Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          className="w-full max-w-sm mx-auto bg-white dark:bg-bg-cardSec rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-emerald-500/30 text-slate-900 dark:text-white space-y-4 relative z-10 text-center"
        >
          {/* Green Tick Circle with Bursting Celebration Confetti */}
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            {/* Confetti Explosion Particles */}
            {confettiParticles.map((p, idx) => (
              <motion.div
                key={idx}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{ x: p.x, y: p.y, opacity: [1, 1, 0], scale: [0, 1.2, 0.8] }}
                transition={{ duration: 0.9, delay: 0.15 + idx * 0.03, ease: 'easeOut' }}
                className={`absolute ${p.color} ${p.size} shadow-sm`}
              />
            ))}

            {/* Glowing Green Tick Circle */}
            <motion.div
              initial={{ scale: 0, rotate: -60 }}
              animate={{ scale: [0, 1.2, 1], rotate: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 240 }}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white flex items-center justify-center shadow-[0_10px_25px_rgba(16,185,129,0.5)] border-2 border-emerald-300 relative z-10"
            >
              <Check size={36} className="stroke-[3]" />
            </motion.div>
          </div>

          {/* Direct Title & Order ID */}
          <div className="space-y-1">
            <h2 className="text-xl font-black font-display tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
              <span>Order Placed!</span>
              <span className="text-lg">🎉</span>
            </h2>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <span>Order ID:</span>
              <span className="font-mono font-extrabold">{orderSuccess}</span>
            </div>
          </div>

          {/* Delivery Address Preview */}
          <div className="bg-slate-50 dark:bg-bg-darkSec/60 border border-slate-200/80 dark:border-glass rounded-2xl p-3 text-left flex items-start gap-2.5 text-xs text-slate-600 dark:text-text-muted">
            <MapPin size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold text-slate-900 dark:text-text-primary block">Delivering to</span>
              <span className="truncate block font-medium">{deliveryAddress}</span>
            </div>
          </div>

          {/* Compact Primary Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => navigate('/orders')}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Track Order Live</span>
              <ArrowRight size={16} className="stroke-[3]" />
            </button>

            <button
              onClick={() => navigate('/restaurants')}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-glass dark:hover:bg-glass-subtle text-slate-700 dark:text-text-secondary font-bold text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Your Shopping Cart | MK Delivery Services</title>
      </Helmet>

      <div className="min-h-screen bg-bg-dark pt-20 sm:pt-28 pb-24 px-3.5 sm:px-6 lg:px-12 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 relative z-10">

          {/* Clean Page Header (Only Back Icon & Clear Cart Button) */}
          <div className="flex items-center justify-between gap-3 border-b border-glass pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => {
                  if (mobileStep === 2 && window.innerWidth < 1024) {
                    setMobileStep(1);
                  } else {
                    navigate(-1);
                  }
                }}
                className="w-10 h-10 rounded-2xl bg-glass border border-glass hover:border-primary/50 text-text-primary flex items-center justify-center transition-all cursor-pointer shadow-sm group shrink-0 active:scale-95"
                title="Go Back"
              >
                <ArrowLeft size={19} className="text-primary group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-black font-display text-text-primary tracking-tight truncate">
                  {mobileStep === 2 ? 'Checkout & Delivery' : 'Your Cart'}
                </h1>
                <p className="text-xs text-text-muted font-medium truncate">
                  {mobileStep === 2 ? 'Step 2 of 2: Enter Delivery Details' : `${totalItemsCount} ${totalItemsCount === 1 ? 'item selected' : 'items selected'}`}
                </p>
              </div>
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
              >
                <Trash2 size={14} />
                <span>Clear Cart</span>
              </button>
            )}
          </div>

          {/* Skeleton Loader View */}
          {isLoading ? (
            <CartPageSkeleton />
          ) : cartItems.length === 0 ? (
            <div className="py-20 text-center glass-panel border border-glass rounded-3xl p-12 max-w-md mx-auto space-y-6">
              <div className="w-20 h-20 bg-glass rounded-full flex items-center justify-center mx-auto text-text-muted">
                <ShoppingBag size={36} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold font-display text-text-primary">Your Cart is Empty</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  You haven't added any dishes to your cart yet. Explore partner restaurants and add your favorite meals!
                </p>
              </div>

              <button
                onClick={() => navigate('/restaurants')}
                className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-black font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                Explore Restaurants
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Items List (Left Side - 7 cols) - Mobile Step 1 / Desktop */}
              <div className={`lg:col-span-7 space-y-4 ${mobileStep === 2 ? 'hidden lg:block' : 'block'}`}>
                <h3 className="text-lg font-extrabold font-display text-text-primary flex items-center gap-2">
                  <Utensils size={18} className="text-primary" />
                  <span>Selected Items ({totalItemsCount})</span>
                </h3>

                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <motion.div
                      key={item.dish.id}
                      layout
                      className="glass-panel border border-glass hover:border-primary/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                        <img
                          src={item.dish.image}
                          alt={item.dish.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-glass shrink-0 shadow-sm"
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${item.dish.isVeg !== false ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <h4 className="font-extrabold text-sm sm:text-base text-text-primary truncate">{item.dish.name}</h4>
                          </div>
                          <span className="text-[11px] font-semibold text-text-muted block">
                            {item.dish.category || 'Main Course'}
                          </span>
                          <span className="text-xs font-extrabold text-primary block font-display">
                            ₹{item.dish.price.toFixed(2)} each
                          </span>
                        </div>
                      </div>

                      {/* Quantity Stepper Controller & Subtotal */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-glass">
                        {/* High-Contrast Stepper Box */}
                        <div className="flex items-center bg-glass-subtle border-2 border-primary/70 rounded-xl p-1 shadow-sm">
                          <button
                            onClick={() => reduceQuantity(item.dish.id)}
                            className="w-7 h-7 rounded-lg bg-primary/20 hover:bg-primary text-primary hover:text-black font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                            title="Reduce Quantity"
                          >
                            <Minus size={12} className="stroke-[3]" />
                          </button>
                          <span className="w-8 text-center font-black text-sm text-primary font-display">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item.dish)}
                            className="w-7 h-7 rounded-lg bg-primary/20 hover:bg-primary text-primary hover:text-black font-black flex items-center justify-center transition-all cursor-pointer active:scale-90"
                            title="Increase Quantity"
                          >
                            <Plus size={12} className="stroke-[3]" />
                          </button>
                        </div>

                        {/* Item Subtotal */}
                        <div className="text-right shrink-0 min-w-[75px]">
                          <span className="text-[10px] font-extrabold text-text-muted block uppercase tracking-wider">Subtotal</span>
                          <span className="text-sm sm:text-base font-black text-text-primary font-display">
                            ₹{(item.dish.price * item.quantity).toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.dish.id)}
                          className="p-2 rounded-xl hover:bg-rose-500/20 text-text-muted hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Mobile Proceed to Delivery Button (Step 1 -> Step 2) */}
                <div className="pt-4 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileStep(2)}
                    className="w-full py-4 px-5 rounded-2xl bg-emerald-600 dark:bg-primary text-white dark:text-black font-extrabold shadow-luxury flex items-center justify-between cursor-pointer active:scale-95 transition-transform border border-emerald-400/30 dark:border-amber-300/40"
                  >
                    <div className="text-left leading-tight">
                      <span className="text-[10px] font-black uppercase tracking-wider block opacity-90">Item Subtotal</span>
                      <span className="text-sm font-black font-display">₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-black/20 dark:bg-black/15 px-3.5 py-2 rounded-xl">
                      <span>Proceed to Delivery</span>
                      <Plus size={15} className="rotate-45 hidden" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Checkout Form & Order Summary (Right Side - 5 cols) - Mobile Step 2 / Desktop */}
              <div className={`lg:col-span-5 space-y-6 ${mobileStep === 1 ? 'hidden lg:block' : 'block'}`}>
                <form onSubmit={handlePlaceOrder} className="glass-panel border border-glass rounded-3xl p-6 space-y-6 shadow-luxury">
                  <h3 className="text-lg font-extrabold font-display text-text-primary flex items-center gap-2 border-b border-glass pb-4">
                    <MapPin size={18} className="text-primary" />
                    <span>Delivery Details</span>
                  </h3>

                  <div className="space-y-4 text-xs font-semibold">
                    <div className="space-y-1.5">
                      <label className="text-text-secondary flex items-center gap-1.5">
                        <User size={13} className="text-primary" />
                        <span>Full Name *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter your full name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-dark border border-glass focus:border-primary/50 text-text-primary placeholder:text-text-muted/50 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-text-secondary flex items-center gap-1.5">
                        <Phone size={13} className="text-primary" />
                        <span>Phone Number *</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Enter your mobile number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-dark border border-glass focus:border-primary/50 text-text-primary placeholder:text-text-muted/50 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-text-secondary flex items-center gap-1.5">
                        <MapPin size={13} className="text-primary" />
                        <span>Delivery Address *</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder="House no, street name, landmark, village/town..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-dark border border-glass focus:border-primary/50 text-text-primary placeholder:text-text-muted/50 outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-text-secondary">Special Delivery Instructions (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Leave at door, don't ring bell"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-dark border border-glass focus:border-primary/50 text-text-primary placeholder:text-text-muted/50 outline-none"
                      />
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="pt-4 border-t border-glass space-y-2.5 text-xs font-semibold">
                    <div className="flex justify-between text-text-secondary">
                      <span>Item Total</span>
                      <span className="text-text-primary font-bold">₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Delivery Fee</span>
                      <span className={deliveryFee === 0 ? 'text-emerald-500 font-bold' : 'text-text-primary font-bold'}>
                        {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Taxes & Charges (5%)</span>
                      <span className="text-text-primary font-bold">₹{taxes.toFixed(2)}</span>
                    </div>

                    <div className="pt-3 border-t border-glass flex justify-between items-center text-base font-black">
                      <span className="text-text-primary">Grand Total</span>
                      <span className="text-primary text-xl font-display">₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Authentication Banner & Order Action */}
                  {!isAuthenticated || !user ? (
                    <div className="space-y-3 pt-2">
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
                        <Lock size={16} className="shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <span className="font-bold block text-amber-400">Login Required to Order</span>
                          <span>You must log in to your account before placing an order. Anonymous orders are not allowed.</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Lock size={16} />
                        <span>Log In / Register to Place Order</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2 text-[11px] font-bold text-primary">
                        <ShieldCheck size={16} className="shrink-0" />
                        <span>Cash on Delivery (COD) / Pay on Delivery</span>
                      </div>

                      <button
                        type="submit"
                        disabled={isPlacingOrder}
                        className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-dark text-black font-black text-sm uppercase tracking-wider shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CreditCard size={16} />
                        <span>{isPlacingOrder ? 'Placing Order in Database...' : 'Place Order Now'}</span>
                      </button>
                    </>
                  )}
                </form>
              </div>

            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default CartPage;
