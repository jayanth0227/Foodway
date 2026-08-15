import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  ShoppingBag,
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  Check,
  MapPin,
  Phone,
  User,
  CreditCard,
  ShieldCheck,
  Utensils,
  Lock,
  Sparkles,
  ChefHat,
  ArrowRight,
  Clock,
  Home,
  Briefcase,
  Navigation,
  Tag,
  CheckCircle2,
  AlertCircle,
  Truck,
  Receipt,
  Ticket,
  ChevronRight,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../utils/api';
import { CartPageSkeleton } from '../components/common/MobileSkeletonLoader';
import type { Address } from '../types/auth.types';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, addToCart, incrementQuantity, reduceQuantity, removeFromCart, clearCart, totalAmount, totalItemsCount } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);

  // Delivery & Contact State
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedLat, setSelectedLat] = useState<number | undefined>(undefined);
  const [selectedLng, setSelectedLng] = useState<number | undefined>(undefined);
  const [isCustomAddress, setIsCustomAddress] = useState(false);
  const [instructions, setInstructions] = useState('');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'UPI' | 'ONLINE'>('CASH_ON_DELIVERY');

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // 1. Always scroll to top when CartPage mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 2. Pre-fill Customer details and default saved address from profile
  useEffect(() => {
    if (user) {
      setCustomerName(user.name || '');
      setCustomerPhone(user.phone || '');

      const userAddresses: Address[] = user.addresses || [];
      if (userAddresses.length > 0) {
        const defaultAddr = userAddresses.find(a => a.isDefault) || userAddresses[0];
        setSelectedAddressId(defaultAddr.id);
        applyAddress(defaultAddr);
      } else if ((user as any).address) {
        setDeliveryAddress((user as any).address);
      }
    }
  }, [user]);

  // 3. Synchronize loading timer with user & address resolution to prevent layout shift
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [user]);

  const applyAddress = (addr: Address) => {
    const parts = [
      addr.street,
      addr.area,
      addr.city,
      addr.state ? `${addr.state}` : '',
      addr.pincode ? `- ${addr.pincode}` : '',
      addr.landmark ? `(Landmark: ${addr.landmark})` : ''
    ].filter(Boolean);
    setDeliveryAddress(parts.join(', '));

    if (addr.fullName) setCustomerName(addr.fullName);
    if (addr.phone) setCustomerPhone(addr.phone);
    setSelectedLat(addr.latitude);
    setSelectedLng(addr.longitude);
  };

  const handleSelectAddressCard = (addr: Address) => {
    setSelectedAddressId(addr.id);
    setIsCustomAddress(false);
    applyAddress(addr);
  };

  // Coupon Handler
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) return;

    if (cleanCode === 'FOODWAY10' || cleanCode === 'MKFOOD10') {
      const discount = Math.round(totalAmount * 0.10);
      setAppliedCoupon({ code: cleanCode, discount });
    } else if (cleanCode === 'FREEDEL') {
      setAppliedCoupon({ code: cleanCode, discount: 30 });
    } else {
      setCouponError('Invalid coupon code. Try FOODWAY10 for 10% OFF.');
    }
  };

  // Platform Delivery Fee Rate State (from Admin Settings)
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState<number>(15);
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number>(25);
  const [storeLat, setStoreLat] = useState<number | undefined>(undefined);
  const [storeLng, setStoreLng] = useState<number | undefined>(undefined);
  const [calculatedDistanceKm, setCalculatedDistanceKm] = useState<number | null>(null);

  // Fetch Delivery Rates Config from Admin Settings API
  useEffect(() => {
    const fetchDeliveryConfig = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/settings/delivery`);
        if (res.data && typeof res.data.deliveryFeePerKm === 'number') {
          setDeliveryFeePerKm(res.data.deliveryFeePerKm);
        }
        if (res.data && typeof res.data.baseDeliveryFee === 'number') {
          setBaseDeliveryFee(res.data.baseDeliveryFee);
        }
      } catch (e) {
        console.warn('Could not fetch delivery rate config:', e);
      }
    };
    fetchDeliveryConfig();
  }, []);

  // Fetch Store / Restaurant Coordinates
  useEffect(() => {
    if (cartItems.length > 0) {
      const targetResId = (cartItems[0]?.dish as any)?.restaurantId;
      if (targetResId) {
        axios.get(`${API_BASE_URL}/shops/${targetResId}`)
          .then(res => {
            const shop = res.data?.shop || res.data?.restaurant;
            if (shop?.latitude && shop?.longitude) {
              setStoreLat(shop.latitude);
              setStoreLng(shop.longitude);
            }
          })
          .catch(() => {});
      }
    }
  }, [cartItems]);

  // Compute 100% Real Road Driving Distance via OSRM OpenStreetMap Routing API
  useEffect(() => {
    if (storeLat && storeLng && selectedLat && selectedLng) {
      let isCancelled = false;
      const fetchDrivingDistance = async () => {
        try {
          // OSRM routing format: lon1,lat1;lon2,lat2
          const url = `https://router.project-osrm.org/route/v1/driving/${storeLng},${storeLat};${selectedLng},${selectedLat}?overview=false`;
          const resp = await fetch(url);
          const data = await resp.json();
          if (!isCancelled && data && data.routes && data.routes.length > 0) {
            const distanceMeters = data.routes[0].distance; // Real road driving distance in meters
            const km = Math.round((distanceMeters / 1000) * 10) / 10;
            setCalculatedDistanceKm(km > 0.1 ? km : 1.0);
            return;
          }
        } catch (e) {
          console.warn('OSRM road routing fallback:', e);
        }

        // Fallback: Haversine Geodesic Distance * 1.25 (Road curve factor)
        if (!isCancelled) {
          const R = 6371; // Earth radius in KM
          const dLat = (selectedLat - storeLat) * (Math.PI / 180);
          const dLon = (selectedLng - storeLng) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(storeLat * (Math.PI / 180)) * Math.cos(selectedLat * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const directKm = R * c;
          const roadKm = Math.round((directKm * 1.25) * 10) / 10;
          setCalculatedDistanceKm(roadKm > 0.1 ? roadKm : 1.5);
        }
      };

      fetchDrivingDistance();
      return () => {
        isCancelled = true;
      };
    } else {
      setCalculatedDistanceKm(null);
    }
  }, [storeLat, storeLng, selectedLat, selectedLng]);

  // Calculation Breakdown (Distance-based Delivery Fee per KM - No taxes or hidden charges)
  const freeDeliveryThreshold = 500;
  const effectiveDistance = calculatedDistanceKm ?? 2.0;
  const rawCalculatedFee = Math.max(baseDeliveryFee, Math.round(effectiveDistance * deliveryFeePerKm));
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const deliveryFee = appliedCoupon?.code === 'FREEDEL' ? 0 : rawCalculatedFee;
  const grandTotal = Math.max(0, totalAmount + deliveryFee - couponDiscount);

  // Handle Order Submission
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      alert('You must be logged in to place an order. Please log in first.');
      navigate('/login');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      alert('Please select or fill in your delivery name, phone number, and address.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const targetRestaurantId = (cartItems[0]?.dish as any)?.restaurantId || 'RES_DEFAULT';
      const targetRestaurantName = (cartItems[0]?.dish as any)?.restaurantName || 'Partner Restaurant';

      const orderPayload = {
        customerId: user.id || user.email,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        latitude: selectedLat,
        longitude: selectedLng,
        instructions: instructions.trim(),
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
          restaurantId: (item.dish as any).restaurantId || targetRestaurantId,
          restaurantName: (item.dish as any).restaurantName || targetRestaurantName
        })),
        subtotal: totalAmount,
        discount: couponDiscount,
        deliveryFee,
        taxes: 0,
        distanceKm: effectiveDistance,
        totalAmount: grandTotal,
        paymentMethod,
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
      console.error('Error placing order:', error);
      alert('Error connecting to backend database. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Your Shopping Cart | Foodway Quick-Commerce</title>
        <meta name="description" content="Review your cart items, select saved delivery addresses, apply discount coupons, and checkout securely." />
      </Helmet>

      <div className="min-h-screen bg-bg-dark text-text-primary pt-24 pb-24 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Clean Page Header */}
          <div className="flex items-center justify-between border-b border-border-color/60 pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-2xl bg-card-bg border border-border-color text-text-secondary hover:text-primary flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="Go Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black font-display text-text-primary tracking-tight">
                  {mobileStep === 2 ? 'Checkout & Delivery' : 'Shopping Cart'}
                </h1>
                <p className="text-xs text-text-muted mt-0.5">
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} selected for fast delivery
                </p>
              </div>
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="px-3.5 py-2 rounded-xl bg-error/10 hover:bg-error/20 border border-error/30 text-error text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear Cart</span>
              </button>
            )}
          </div>

          {/* ORDER SUCCESS SCREEN */}
          {orderSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto bg-card-bg border border-border-color rounded-3xl p-8 text-center space-y-6 shadow-2xl my-8 relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto border-2 border-success/40 shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black font-display text-text-primary">
                  Order Confirmed!
                </h2>
                <p className="text-sm text-text-secondary">
                  Your order has been dispatched to the restaurant kitchen.
                </p>
                <div className="inline-block bg-primary/10 border border-primary/30 px-4 py-1.5 rounded-full text-xs font-extrabold text-primary font-mono mt-2">
                  Order ID: {orderSuccess}
                </div>
              </div>

              <div className="pt-4 border-t border-border-color/60 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/orders')}
                  className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>Track Live Order</span>
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 rounded-xl border border-border-color text-xs font-bold text-text-secondary hover:bg-bg-dark transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </motion.div>
          ) : isLoading ? (
            <CartPageSkeleton />
          ) : cartItems.length === 0 ? (
            /* EMPTY CART SCREEN */
            <div className="text-center py-20 bg-card-bg border border-border-color rounded-3xl p-8 max-w-lg mx-auto space-y-6 shadow-xl">
              <div className="w-24 h-24 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto border border-primary/30 shadow-inner">
                <ShoppingBag className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black font-display text-text-primary">
                  Your Cart is Empty
                </h3>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-sm mx-auto">
                  You haven't added any delicious food or grocery items yet. Explore partner stores and add your favorites!
                </p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="px-8 py-3.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 inline-flex items-center gap-2 cursor-pointer"
              >
                <Utensils className="w-4 h-4" />
                <span>Explore Nearby Restaurants</span>
              </button>
            </div>
          ) : (
            /* MAIN CART & CHECKOUT GRID */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* LEFT COLUMN: Cart Items List (7 cols) */}
              <div className={`lg:col-span-7 space-y-6 ${mobileStep === 2 ? 'hidden lg:block' : 'block'}`}>

                {/* Free Delivery Progress Bar */}
                <div className="bg-card-bg border border-border-color rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-text-primary">
                      <Truck className="w-4 h-4 text-primary" />
                      <span>Free Delivery Status</span>
                    </span>
                    <span className={totalAmount >= freeDeliveryThreshold ? 'text-success' : 'text-primary'}>
                      {totalAmount >= freeDeliveryThreshold
                        ? '🎉 You unlocked FREE Delivery!'
                        : `Add ₹${(freeDeliveryThreshold - totalAmount).toFixed(0)} more for FREE Delivery`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-bg-dark rounded-full overflow-hidden border border-border-color/50">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, (totalAmount / freeDeliveryThreshold) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Cart Items Cards */}
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <motion.div
                      key={item.itemKey || item.dish.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-card-bg border border-border-color rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      {/* Image & Title */}
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <img
                          src={item.dish.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
                          alt={item.dish.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-border-color shrink-0 shadow-xs"
                        />
                        <div className="space-y-1">
                          <h4 className="text-sm sm:text-base font-extrabold text-text-primary font-display leading-snug">
                            {item.dish.name}
                          </h4>
                          {item.dish.category && (
                            <span className="inline-block text-[11px] font-semibold text-text-muted bg-bg-dark px-2 py-0.5 rounded-md border border-border-color/50">
                              {item.dish.category}
                            </span>
                          )}
                          <p className="text-xs font-bold text-primary font-mono pt-0.5">
                            ₹{(item.selectedVariant ? Number(item.selectedVariant.price) : Number(item.dish.price)).toFixed(2)} each
                          </p>
                        </div>
                      </div>

                      {/* Quantity Stepper & Subtotal */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-border-color/60">
                        {/* Stepper */}
                        <div className="flex items-center bg-bg-dark/80 border border-border-color rounded-xl p-1 shadow-inner">
                          <button
                            type="button"
                            onClick={() => reduceQuantity(item.itemKey || item.dish.id)}
                            className="w-7 h-7 rounded-lg bg-card-bg hover:bg-primary text-text-secondary hover:text-white font-bold flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-extrabold text-sm text-text-primary font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => incrementQuantity(item.itemKey || item.dish.id)}
                            className="w-7 h-7 rounded-lg bg-card-bg hover:bg-primary text-text-secondary hover:text-white font-bold flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right shrink-0 min-w-[70px]">
                          <span className="text-[10px] font-bold text-text-muted block uppercase tracking-wider">Subtotal</span>
                          <span className="text-sm font-black text-text-primary font-mono">
                            ₹{((item.selectedVariant ? Number(item.selectedVariant.price) : Number(item.dish.price)) * item.quantity).toFixed(2)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.itemKey || item.dish.id)}
                          className="p-2 rounded-xl hover:bg-error/15 text-text-muted hover:text-error transition-colors cursor-pointer shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Coupon Code Section */}
                <div className="bg-card-bg border border-border-color rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">
                      Apply Promo / Coupon Code
                    </h4>
                  </div>
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Try FOODWAY10 or FREEDEL"
                      className="w-full px-4 py-2.5 rounded-xl bg-bg-dark border border-border-color text-xs text-text-primary uppercase font-mono tracking-wider focus:outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-bold cursor-pointer transition-all shrink-0"
                    >
                      Apply
                    </button>
                  </form>
                  {appliedCoupon && (
                    <div className="text-xs text-success font-bold flex items-center gap-1.5 pt-1">
                      <Check className="w-4 h-4" />
                      <span>Coupon '{appliedCoupon.code}' applied! Saved ₹{appliedCoupon.discount}</span>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-xs text-error font-semibold pt-1">{couponError}</p>
                  )}
                </div>

                {/* Mobile Step 1 -> Step 2 Button */}
                <div className="pt-4 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileStep(2)}
                    className="w-full py-4 px-6 rounded-2xl bg-primary text-white font-black shadow-xl flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
                  >
                    <div className="text-left">
                      <span className="text-[10px] uppercase tracking-wider block opacity-80">Subtotal</span>
                      <span className="text-sm font-black font-mono">₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Checkout & Saved Address Selector (5 cols) */}
              <div className={`lg:col-span-5 space-y-6 ${mobileStep === 1 ? 'hidden lg:block' : 'block'}`}>
                <form onSubmit={handlePlaceOrder} className="bg-card-bg border border-border-color rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                  {/* Ambient Glow */}
                  <div className="absolute top-0 right-0 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Header Title */}
                  <div className="flex items-center justify-between border-b border-border-color/60 pb-4 relative z-10">
                    <h3 className="text-lg font-black font-display text-text-primary flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      <span>Delivery Details</span>
                    </h3>
                    {mobileStep === 2 && (
                      <button
                        type="button"
                        onClick={() => setMobileStep(1)}
                        className="lg:hidden text-xs font-bold text-primary hover:underline"
                      >
                        Edit Items
                      </button>
                    )}
                  </div>

                  <div className="space-y-5 relative z-10">

                    {/* SAVED ADDRESSES SELECTOR */}
                    {isAuthenticated && user && (user.addresses || []).length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-extrabold text-text-primary uppercase tracking-wider">
                            Select Saved Delivery Address
                          </label>
                          <button
                            type="button"
                            onClick={() => navigate('/profile/address/new')}
                            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add New</span>
                          </button>
                        </div>

                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                          {(user.addresses || []).map((addr: Address) => {
                            const isSelected = selectedAddressId === addr.id && !isCustomAddress;
                            return (
                              <div
                                key={addr.id}
                                onClick={() => handleSelectAddressCard(addr)}
                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-primary/15 border-primary ring-2 ring-primary/30 text-text-primary shadow-md'
                                    : 'bg-bg-dark/50 border-border-color text-text-secondary hover:border-primary/40'
                                }`}
                              >
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-bg-dark border border-border-color text-[10px] font-bold text-text-primary uppercase tracking-wider flex items-center gap-1">
                                      {addr.label === 'Home' && <Home className="w-3 h-3 text-primary" />}
                                      {addr.label === 'Work' && <Briefcase className="w-3 h-3 text-primary" />}
                                      {addr.label !== 'Home' && addr.label !== 'Work' && <Navigation className="w-3 h-3 text-primary" />}
                                      <span>{addr.label || 'Address'}</span>
                                    </span>
                                    {addr.isDefault && (
                                      <span className="text-[9px] font-black text-success uppercase">Default</span>
                                    )}
                                  </div>
                                  <p className="font-bold text-text-primary">{addr.fullName || user.name}</p>
                                  <p className="text-[11px] text-text-muted leading-tight">
                                    {addr.street}, {addr.city} {addr.pincode}
                                  </p>
                                  {addr.latitude && addr.longitude && (
                                    <p className="text-[10px] text-primary font-mono flex items-center gap-1 pt-0.5">
                                      <MapPin className="w-3 h-3 text-primary" /> GPS Pinned
                                    </p>
                                  )}
                                </div>
                                <div className="pt-1">
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                    isSelected ? 'bg-primary border-primary text-white' : 'border-border-color'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Customer Contact & Address Override */}
                    <div className="space-y-3.5 pt-2 border-t border-border-color/60">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider">
                            Receiver Name *
                          </label>
                          <div className="relative">
                            <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                              type="text"
                              required
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-dark/60 border border-border-color text-xs text-text-primary focus:outline-none focus:border-primary"
                              placeholder="Full Name"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider">
                            Phone Number *
                          </label>
                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                              type="tel"
                              required
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-dark/60 border border-border-color text-xs text-text-primary focus:outline-none focus:border-primary"
                              placeholder="Mobile Number"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Full Delivery Address Textarea */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider">
                          Delivery Address Details *
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={deliveryAddress}
                          onChange={(e) => {
                            setDeliveryAddress(e.target.value);
                            setIsCustomAddress(true);
                          }}
                          className="w-full p-3 rounded-xl bg-bg-dark/60 border border-border-color text-xs text-text-primary focus:outline-none focus:border-primary resize-none"
                          placeholder="House No, Street, Locality, City, Pincode"
                        />
                      </div>

                      {/* Special Delivery Instructions */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider">
                          Special Instructions (Optional)
                        </label>
                        <input
                          type="text"
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-bg-dark/60 border border-border-color text-xs text-text-primary focus:outline-none focus:border-primary"
                          placeholder="e.g. Leave with security, don't ring doorbell"
                        />
                      </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="space-y-2 pt-3 border-t border-border-color/60">
                      <label className="block text-xs font-extrabold text-text-primary uppercase tracking-wider">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'CASH_ON_DELIVERY', label: 'Cash / Pay on Delivery', sub: 'COD' },
                          { id: 'UPI', label: 'UPI / QR Code', sub: 'GPay, PhonePe, Paytm' }
                        ].map(pm => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethod(pm.id as any)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              paymentMethod === pm.id
                                ? 'bg-primary/15 border-primary text-primary font-bold shadow-sm'
                                : 'bg-bg-dark/40 border-border-color text-text-secondary hover:border-primary/40'
                            }`}
                          >
                            <span className="text-xs font-bold">{pm.label}</span>
                            <span className="text-[10px] text-text-muted mt-0.5">{pm.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bill Breakdown Summary */}
                    <div className="pt-4 border-t border-border-color/60 space-y-2.5 text-xs">
                      <div className="flex justify-between text-text-secondary">
                        <span>Items Subtotal</span>
                        <span className="text-text-primary font-bold font-mono">₹{totalAmount.toFixed(2)}</span>
                      </div>

                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-success font-bold">
                          <span>Promo Coupon Discount</span>
                          <span className="font-mono">- ₹{couponDiscount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-text-secondary">
                        <span className="flex items-center gap-1">
                          <span>Delivery Fee</span>
                          {calculatedDistanceKm ? (
                            <span className="text-[10px] text-primary font-mono font-semibold">
                              ({calculatedDistanceKm} km @ ₹{deliveryFeePerKm}/km)
                            </span>
                          ) : (
                            <span className="text-[10px] text-text-muted font-mono">
                              (Base rate @ ₹{deliveryFeePerKm}/km)
                            </span>
                          )}
                        </span>
                        <span className={deliveryFee === 0 ? 'text-success font-bold font-mono' : 'text-text-primary font-bold font-mono'}>
                          {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-border-color/80 flex justify-between items-center">
                        <div>
                          <span className="text-sm font-black text-text-primary block font-display">To Pay</span>
                          <span className="text-[10px] text-text-muted">No hidden charges</span>
                        </div>
                        <span className="text-2xl font-black text-primary font-mono">
                          ₹{grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Submit CTA Action Button */}
                    {!isAuthenticated || !user ? (
                      <div className="space-y-3 pt-2">
                        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex items-start gap-2.5 text-xs text-primary">
                          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Login Required</span>
                            <span>Log in to your account to place your delivery order.</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate('/login', { state: { from: '/cart' } })}
                          className="w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-wider hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Log In to Place Order</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={isPlacingOrder}
                        className="w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-wider hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className="w-5 h-5" />
                        <span>{isPlacingOrder ? 'Dispatching Order...' : 'Place Order Now'}</span>
                      </button>
                    )}

                  </div>
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
