import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ShoppingBag, ArrowLeft, Trash2, Plus, Minus, Check, MapPin, Phone, User, CreditCard, ShieldCheck, Utensils, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../utils/api';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, addToCart, reduceQuantity, removeFromCart, clearCart, totalAmount, totalItemsCount } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState((user as any)?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState((user as any)?.address || '');
  const [instructions, setInstructions] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

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
    return (
      <div className="min-h-screen bg-bg-dark pt-32 pb-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto glass-panel border border-emerald-500/40 rounded-3xl p-8 space-y-6 shadow-luxury"
        >
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/50">
            <Check size={40} />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block">Order Confirmed!</span>
            <h2 className="text-3xl font-black font-display text-white">Thank You For Your Order</h2>
            <p className="text-xs text-text-muted">
              Order ID: <span className="font-mono text-primary font-bold">{orderSuccess}</span>
            </p>
            <p className="text-xs text-text-secondary leading-relaxed pt-2">
              Your delicious meal is being prepared and will be delivered to <span className="text-white font-semibold">{deliveryAddress}</span> shortly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => navigate('/orders')}
              className="flex-1 py-3.5 rounded-2xl bg-primary hover:bg-primary-dark text-black font-black text-sm uppercase tracking-wider shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
            >
              Track Order Status →
            </button>
            <button
              onClick={() => navigate('/restaurants')}
              className="flex-1 py-3.5 rounded-2xl bg-glass border border-glass hover:border-primary/40 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Explore Restaurants
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

      <div className="min-h-screen bg-bg-dark pt-28 pb-24 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-8 relative z-10">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-6">
            <div className="space-y-1">
              <button
                onClick={() => navigate(-1)}
                className="text-xs font-bold text-text-muted hover:text-primary transition-colors flex items-center gap-1 mb-2 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Continue Shopping</span>
              </button>
              <h1 className="text-3xl sm:text-4xl font-black font-display text-gradient-gold">
                Your Shopping Cart
              </h1>
              <p className="text-xs text-text-secondary">
                Review your selected dishes and enter delivery information to complete your order.
              </p>
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Clear Cart</span>
              </button>
            )}
          </div>

          {/* Empty Cart View */}
          {cartItems.length === 0 ? (
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

              {/* Items List (Left Side - 7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-lg font-extrabold font-display text-text-primary flex items-center gap-2">
                  <Utensils size={18} className="text-primary" />
                  <span>Selected Items ({totalItemsCount})</span>
                </h3>

                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <motion.div
                      key={item.dish.id}
                      layout
                      className="glass-panel border border-glass hover:border-primary/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                        <img
                          src={item.dish.image}
                          alt={item.dish.name}
                          className="w-16 h-16 rounded-xl object-cover border border-glass shrink-0"
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${item.dish.isVeg !== false ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <h4 className="font-bold text-sm text-text-primary truncate">{item.dish.name}</h4>
                          </div>
                          <span className="text-[11px] font-semibold text-text-muted block">
                            {item.dish.category || 'Main Course'}
                          </span>
                          <span className="text-xs font-extrabold text-primary block">
                            ₹{item.dish.price.toFixed(2)} each
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controller & Price Total */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-glass">
                        {/* Interactive Quantity Box */}
                        <div className="flex items-center bg-bg-dark border border-primary/40 rounded-xl p-1 shadow-inner">
                          <button
                            onClick={() => reduceQuantity(item.dish.id)}
                            className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-black font-extrabold flex items-center justify-center transition-colors cursor-pointer"
                            title="Reduce Quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-8 text-center font-black text-sm text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item.dish)}
                            className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-black font-extrabold flex items-center justify-center transition-colors cursor-pointer"
                            title="Increase Quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <div className="text-right shrink-0 min-w-[70px]">
                          <span className="text-xs text-text-muted block text-[10px] font-bold uppercase">Subtotal</span>
                          <span className="text-sm font-black text-white">
                            ₹{(item.dish.price * item.quantity).toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.dish.id)}
                          className="p-2 rounded-xl hover:bg-rose-500/20 text-text-muted hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Checkout Form & Order Summary (Right Side - 5 cols) */}
              <div className="lg:col-span-5 space-y-6">
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
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-dark border border-glass focus:border-primary/50 text-white placeholder-text-muted/50 outline-none"
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
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-dark border border-glass focus:border-primary/50 text-white placeholder-text-muted/50 outline-none"
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
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-dark border border-glass focus:border-primary/50 text-white placeholder-text-muted/50 outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-text-secondary">Special Delivery Instructions (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Leave at door, don't ring bell"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-bg-dark border border-glass focus:border-primary/50 text-white placeholder-text-muted/50 outline-none"
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
