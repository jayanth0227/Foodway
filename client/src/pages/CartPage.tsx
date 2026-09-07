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
  ShieldCheck,
  Utensils,
  Lock,
  ArrowRight,
  Clock,
  Home,
  Briefcase,
  Navigation,
  CheckCircle2,
  IndianRupee,
  AlertTriangle,
  AlertCircle,
  Package,
  X,
  Ban,
  MapPinOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../utils/api';
import ItemImageOrIcon from '../components/common/ItemImageOrIcon';
import { getCurrentUser, getToken, saveSession } from '../utils/auth.utils';
import socketService from '../services/socket.service';
import authService from '../services/auth.service';
import { CartPageSkeleton } from '../components/common/MobileSkeletonLoader';
import type { Address } from '../types/auth.types';
import { getItemVariantLabel } from '../utils/variantUtils';

// Celebration Confetti Explosion Overlay Component
const CelebrationConfetti: React.FC = () => {
  const pieces = Array.from({ length: 50 });
  const colors = ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6', '#F43F5E', '#10B981', '#FBBF24'];
  const shapes = ['rounded-full', 'rounded-sm', 'rotate-45 rounded-xs', 'rounded-md'];

  return (
    <div className="fixed inset-0 pointer-events-none z-[120] overflow-hidden">
      {pieces.map((_, i) => {
        const color = colors[i % colors.length];
        const shape = shapes[i % shapes.length];
        const size = (i % 8) + 6;
        const targetX = (i % 2 === 0 ? 1 : -1) * ((i * 23) % 360);
        const targetY = -((i * 29) % 300 + 160);
        const fallY = (i * 31) % 550 + 380;
        const rotation = (i * 53) % 720 - 360;
        const duration = ((i * 13) % 15) / 10 + 2.4;
        const delay = ((i * 7) % 12) / 25;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 1, x: `calc(50vw + ${targetX * 0.1}px)`, y: '40vh', scale: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              x: `calc(50vw + ${targetX}px)`,
              y: ['40vh', `calc(40vh + ${targetY}px)`, `calc(40vh + ${fallY}px)`],
              scale: [0, 1.4, 0.9, 0.4],
              rotate: [0, rotation]
            }}
            transition={{
              duration: duration,
              delay: delay,
              ease: [0.25, 0.1, 0.25, 1],
              times: [0, 0.2, 0.7, 1]
            }}
            style={{
              position: 'absolute',
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color
            }}
            className={shape}
          />
        );
      })}
    </div>
  );
};

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, incrementQuantity, reduceQuantity, removeFromCart, clearCart, totalAmount, totalItemsCount } = useCart();
  const { user, isAuthenticated, updateProfile } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);

  // Delivery & Contact State
  const [savedAddresses, setSavedAddresses] = useState<Address[]>(() => {
    if (!isAuthenticated || !user) return [];
    return user.addresses || [];
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedLat, setSelectedLat] = useState<number | undefined>(undefined);
  const [selectedLng, setSelectedLng] = useState<number | undefined>(undefined);
  const [isCustomAddress, setIsCustomAddress] = useState(false);
  const [instructions, setInstructions] = useState('');

  // Fixed Payment Method (Cash / Pay on Delivery)
  const paymentMethod = 'CASH_ON_DELIVERY';

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null);

  // 1. Always scroll to top when CartPage mounts or orderSuccess changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [orderSuccess]);

  // 2. Pre-fill Customer details and default saved address strictly for logged in users
  useEffect(() => {
    const syncUserAddresses = async () => {
      if (!isAuthenticated || !user) {
        setSavedAddresses([]);
        setSelectedAddressId('');
        setCustomerName('');
        setCustomerPhone('');
        setDeliveryAddress('');
        return;
      }

      setCustomerName(user.name || '');
      setCustomerPhone(user.phone || '');

      const userAddresses: Address[] = user.addresses || [];
      if (userAddresses.length > 0) {
        setSavedAddresses(userAddresses);
        const defaultAddr = userAddresses.find(a => a.isDefault) || userAddresses[0];
        setSelectedAddressId(defaultAddr.id);
        applyAddress(defaultAddr);
      } else if ((user as any).address) {
        setDeliveryAddress((user as any).address);
      }

      // Fetch fresh user profile & addresses from backend API silently
      try {
        const res = await authService.getCurrentUser();
        if (res && res.success && res.user && Array.isArray(res.user.addresses)) {
          const token = getToken() || 'active_session';
          saveSession(token, res.user);
          const freshAddresses: Address[] = res.user.addresses;
          if (freshAddresses.length > 0) {
            setSavedAddresses(freshAddresses);
            const defaultAddr = freshAddresses.find(a => a.isDefault) || freshAddresses[0];
            setSelectedAddressId(defaultAddr.id);
            applyAddress(defaultAddr);
          }
        }
      } catch (e) {
        console.warn('Silent user address sync warning:', e);
      }
    };

    syncUserAddresses();
  }, [user, isAuthenticated]);

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

  const handleDeleteSavedAddress = (e: React.MouseEvent, addr: Address) => {
    e.stopPropagation();
    setAddressToDelete(addr);
  };

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return;
    const addrId = addressToDelete.id;

    const updatedAddresses = savedAddresses.filter(a => a.id !== addrId);
    if (updatedAddresses.length > 0 && !updatedAddresses.some(a => a.isDefault)) {
      updatedAddresses[0].isDefault = true;
    }

    try {
      const res = await updateProfile({ addresses: updatedAddresses });
      if (res && res.success) {
        setSavedAddresses(updatedAddresses);
        if (selectedAddressId === addrId) {
          if (updatedAddresses.length > 0) {
            const nextAddr = updatedAddresses[0];
            setSelectedAddressId(nextAddr.id);
            applyAddress(nextAddr);
          } else {
            setSelectedAddressId('');
            setDeliveryAddress('');
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete address:', err);
    } finally {
      setAddressToDelete(null);
    }
  };

  // Platform Delivery Fee Rate State (from Admin Settings)
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState<number>(15);
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number>(25);
  const [storeLat, setStoreLat] = useState<number | undefined>(undefined);
  const [storeLng, setStoreLng] = useState<number | undefined>(undefined);
  const [calculatedDistanceKm, setCalculatedDistanceKm] = useState<number | null>(null);

  // Store Open / Closed State & Unavailable Items tracking
  const [isStoreClosed, setIsStoreClosed] = useState<boolean>(false);
  const [closedStoreName, setClosedStoreName] = useState<string>('');

  const unavailableCartItems = React.useMemo(() => {
    return cartItems.filter(item => item.dish.isAvailable === false || (item.dish as any).isAvailable === 'false');
  }, [cartItems]);

  const handleRemoveUnavailableItems = () => {
    unavailableCartItems.forEach(item => {
      removeFromCart(item.itemKey);
    });
  };

  // Fetch & Subscribe to Live Delivery Rates Config from Admin Settings API & Real-Time Sockets
  useEffect(() => {
    const fetchDeliveryConfig = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/settings/delivery`);
        const rate = res.data?.deliveryFeePerKm ?? res.data?.settings?.deliveryFeePerKm;
        if (typeof rate === 'number') {
          setDeliveryFeePerKm(rate);
        }
        if (res.data && typeof res.data.baseDeliveryFee === 'number') {
          setBaseDeliveryFee(res.data.baseDeliveryFee);
        }
      } catch (e) {
        console.warn('Could not fetch delivery rate config:', e);
      }
    };
    fetchDeliveryConfig();

    const unsubscribeDelivery = socketService.onDeliverySettingsUpdated((settings) => {
      const rate = settings?.deliveryFeePerKm ?? settings?.settings?.deliveryFeePerKm;
      const base = settings?.baseDeliveryFee ?? settings?.settings?.baseDeliveryFee;
      if (typeof rate === 'number' && !isNaN(rate)) {
        setDeliveryFeePerKm(rate);
      }
      if (typeof base === 'number' && !isNaN(base)) {
        setBaseDeliveryFee(base);
      }
    });

    return () => {
      unsubscribeDelivery();
    };
  }, []);

  // Fetch Store / Restaurant Coordinates & Store Status
  useEffect(() => {
    if (cartItems.length > 0) {
      const firstDish = cartItems[0]?.dish;
      const targetResId = (firstDish as any)?.restaurantId || (firstDish as any)?.shopId;

      const resLat = (firstDish as any)?.restaurantLatitude ?? (firstDish as any)?.latitude ?? (firstDish as any)?.lat;
      const resLng = (firstDish as any)?.restaurantLongitude ?? (firstDish as any)?.longitude ?? (firstDish as any)?.lng;

      if (resLat && resLng && !isNaN(Number(resLat)) && !isNaN(Number(resLng))) {
        setStoreLat(Number(resLat));
        setStoreLng(Number(resLng));
      }

      if (targetResId) {
        axios.get(`${API_BASE_URL}/shops/${targetResId}`)
          .then(res => {
            const shop = res.data?.shop || res.data?.restaurant || res.data;
            const shopLat = shop?.latitude ?? shop?.lat;
            const shopLng = shop?.longitude ?? shop?.lng;
            const isClosed = shop?.isOpen === false || shop?.isOpen === 'false' || shop?.status === 'closed' || shop?.status === 'inactive' || shop?.status === 'offline';
            setIsStoreClosed(isClosed);
            setClosedStoreName(shop?.name || shop?.shopName || shop?.restaurantName || (firstDish as any)?.restaurantName || 'Store');

            if (shopLat && shopLng && !isNaN(Number(shopLat)) && !isNaN(Number(shopLng))) {
              setStoreLat(Number(shopLat));
              setStoreLng(Number(shopLng));
            } else if (!resLat || !resLng) {
              setStoreLat(17.3616);
              setStoreLng(78.4850);
            }
          })
          .catch(() => {
            if (!resLat || !resLng) {
              setStoreLat(17.3616);
              setStoreLng(78.4850);
            }
          });
      } else {
        if (!resLat || !resLng) {
          setStoreLat(17.3616);
          setStoreLng(78.4850);
        }
      }
    } else {
      setIsStoreClosed(false);
    }
  }, [cartItems]);

  // Real-Time Socket Subscription for Live Store Open/Closed Status & Menu Updates
  useEffect(() => {
    if (cartItems.length > 0) {
      const firstDish = cartItems[0]?.dish;
      const targetResId = String((firstDish as any)?.restaurantId || (firstDish as any)?.shopId || '').toLowerCase().replace(/[-_]/g, '');

      const unsubscribeStatus = socketService.onShopStatusUpdated((data: any) => {
        if (!data) return;
        const eventResId = String(data.shopId || data.restaurantId || data.id || '').toLowerCase().replace(/[-_]/g, '');

        if (!targetResId || !eventResId || eventResId === targetResId || targetResId.includes(eventResId) || eventResId.includes(targetResId)) {
          const isClosed = data.isOpen === false || data.isOpen === 'false' || data.status === 'closed' || data.status === 'inactive' || data.status === 'offline';
          setIsStoreClosed(isClosed);
          if (data.name || data.restaurantName || data.shopName) {
            setClosedStoreName(data.name || data.restaurantName || data.shopName);
          }
        }
      });

      const unsubscribeShop = socketService.onShopUpdated((updatedShop: any) => {
        if (!updatedShop) return;
        const uId = String(updatedShop.id || updatedShop.shopId || updatedShop.restaurantId || '').toLowerCase().replace(/[-_]/g, '');

        if (!targetResId || !uId || uId === targetResId || targetResId.includes(uId) || uId.includes(targetResId)) {
          const newLat = updatedShop.latitude ?? updatedShop.lat;
          const newLng = updatedShop.longitude ?? updatedShop.lng;

          if (newLat !== undefined && newLng !== undefined && !isNaN(Number(newLat)) && !isNaN(Number(newLng))) {
            setStoreLat(Number(newLat));
            setStoreLng(Number(newLng));
          }
        }
      });

      return () => {
        unsubscribeStatus();
        unsubscribeShop();
      };
    }
  }, [cartItems]);

  // Geocode delivery address if lat/lng are missing
  useEffect(() => {
    if ((!selectedLat || !selectedLng) && deliveryAddress && deliveryAddress.trim().length > 3) {
      const controller = new AbortController();
      const geocode = async () => {
        try {
          const query = encodeURIComponent(deliveryAddress.trim());
          const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
            signal: controller.signal
          });
          const data = await resp.json();
          if (data && data.length > 0) {
            setSelectedLat(parseFloat(data[0].lat));
            setSelectedLng(parseFloat(data[0].lon));
          }
        } catch (e) { }
      };
      const timer = setTimeout(geocode, 500);
      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    }
  }, [deliveryAddress, selectedLat, selectedLng]);

  // Compute 100% Real Road Driving Distance via OSRM OpenStreetMap Routing API
  useEffect(() => {
    if (storeLat && storeLng && selectedLat && selectedLng) {
      let isCancelled = false;
      const fetchDrivingDistance = async () => {
        try {
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

        // Fallback: Haversine Geodesic Distance * 1.3 (Road curve factor)
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
          const roadKm = Math.round((directKm * 1.3) * 10) / 10;
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

  // Delivery Fee Calculation (Strictly Distance in KM * Price per KM set by Admin, respecting Base Minimum Fee)
  const effectiveDistance = calculatedDistanceKm ?? 2.0;
  const rawCalculatedFee = Math.round(effectiveDistance * deliveryFeePerKm);
  const deliveryFee = baseDeliveryFee ? Math.max(baseDeliveryFee, rawCalculatedFee) : rawCalculatedFee;
  const grandTotal = Math.max(0, totalAmount + deliveryFee);
  const isDistanceTooFar = effectiveDistance > 20.0;

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

    if (isStoreClosed) {
      alert(`Order cannot be placed: ${closedStoreName || 'The store'} is currently closed.`);
      return;
    }

    if (unavailableCartItems.length > 0) {
      alert(`Order cannot be placed: Cart contains ${unavailableCartItems.length} unavailable item(s). Please remove them to proceed.`);
      return;
    }

    if (isDistanceTooFar) {
      setShowRangeModal(true);
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
        items: cartItems.map(item => {
          const v = item.selectedVariant;
          const effectivePrice = v ? Number(v.price) : Number(item.dish.price);
          const variantLabel = getItemVariantLabel({ ...item.dish, selectedVariant: v });

          return {
            id: item.dish.id,
            menuItemId: item.dish.id,
            name: item.dish.name,
            foodName: item.dish.name,
            price: effectivePrice,
            quantity: item.quantity,
            image: item.dish.image,
            selectedVariant: v || null,
            variantLabel,
            restaurantId: (item.dish as any).restaurantId || targetRestaurantId,
            restaurantName: (item.dish as any).restaurantName || targetRestaurantName
          };
        }),
        subtotal: totalAmount,
        discount: 0,
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

      <div className="min-h-screen bg-bg-dark text-text-primary pt-24 sm:pt-28 lg:pt-28 pb-44 lg:pb-24 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Clean Page Header */}
          <div className="flex items-center justify-between border-b border-glass pb-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (mobileStep === 2) {
                    setMobileStep(1);
                  } else if (window.history.state && window.history.state.idx > 0) {
                    navigate(-1);
                  } else {
                    navigate('/');
                  }
                }}
                className="w-10 h-10 rounded-2xl bg-white dark:bg-white/10 border border-slate-200/90 dark:border-white/15 text-[#B87B4B] dark:text-[#D4986A] shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer shrink-0 group"
                title="Go Back"
                aria-label="Go Back"
              >
                <ArrowLeft size={18} className="text-[#B87B4B] dark:text-[#D4986A] stroke-[2.2] group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div>
                <h1 className="text-xl sm:text-3xl font-black font-display text-text-primary tracking-tight">
                  {mobileStep === 2 ? 'Checkout & Delivery' : 'Shopping Cart'}
                </h1>
                <p className="text-[11px] sm:text-xs text-text-muted mt-0.5">
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} selected for fast delivery
                </p>
              </div>
            </div>
          </div>

          {/* SLEEK TICKET & RECEIPT STYLE ORDER SUCCESS CARD WITH CELEBRATIONS */}
          {orderSuccess ? (
            <>
              {/* Animated Celebration Explosion Particles Overlay */}
              <CelebrationConfetti />

              <div className="relative max-w-sm mx-auto my-3 px-2 sm:px-0">
                {/* Background Emerald Ambient Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 rounded-3xl blur-xl opacity-70 -z-10 pointer-events-none" />

                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                  className="bg-white dark:bg-bg-card border border-emerald-500/30 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl relative overflow-hidden text-center backdrop-blur-xl"
                >
                  {/* Header Row: Check Icon Beside Order Confirmed Title */}
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-md shadow-emerald-500/25 flex items-center justify-center shrink-0 ring-4 ring-emerald-500/15">
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Order Confirmed</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black font-display text-text-primary tracking-tight truncate">
                        Order Placed Successfully! 🎉
                      </h3>
                    </div>
                  </div>

                  {/* COMPACT TICKET RECEIPT CONTAINER */}
                  <div className="bg-slate-50/80 dark:bg-bg-cardSec/80 border border-slate-200/80 dark:border-white/10 rounded-xl p-3 sm:p-3.5 text-left text-xs space-y-2.5 relative shadow-inner">
                    
                    {/* Left & Right Scalloped Ticket Cutout Notches */}
                    <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-bg-dark border-r border-emerald-500/20" />
                    <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-bg-dark border-l border-emerald-500/20" />

                    {/* Header Row: Order ID */}
                    <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-300 dark:border-white/15">
                      <div className="flex items-center gap-1.5 text-text-muted font-extrabold uppercase text-[10px] tracking-wider">
                        <Package className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Order ID</span>
                      </div>
                      <span className="font-black font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/25">
                        #{orderSuccess}
                      </span>
                    </div>

                    {/* ETA & Payment Info */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-white/90 dark:bg-bg-card/90 p-2 rounded-lg border border-glass space-y-0.5">
                        <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Estimated Delivery</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>25 - 35 Mins</span>
                        </span>
                      </div>
                      <div className="bg-white/90 dark:bg-bg-card/90 p-2 rounded-lg border border-glass space-y-0.5">
                        <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Payment Method</span>
                        <span className="font-black text-text-primary text-[11px] truncate block">
                          Cash on Delivery
                        </span>
                      </div>
                    </div>

                    {/* Total Paid Highlight Banner */}
                    <div className="bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-2 rounded-lg flex items-center justify-between">
                      <span className="text-text-primary font-black uppercase text-[10px] tracking-wide flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Total Paid</span>
                      </span>
                      <span className="font-black font-mono text-base text-emerald-600 dark:text-emerald-400">
                        ₹{grandTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Delivery Location Section */}
                    {deliveryAddress && (
                      <div className="pt-1.5 border-t border-dashed border-slate-300 dark:border-white/15 space-y-0.5">
                        <div className="flex items-center gap-1 text-text-muted font-black text-[9px] uppercase tracking-wider">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span>Delivery Location</span>
                        </div>
                        <p className="font-black text-text-primary text-[11px] truncate">
                          {customerName || 'Customer'} • {customerPhone}
                        </p>
                        <p className="text-[10px] text-text-muted leading-tight line-clamp-1">
                          {deliveryAddress}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Compact Bottom Action CTAs */}
                  <div className="pt-0.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/orders')}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Track Order</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="py-2.5 px-4 rounded-xl border border-glass bg-bg-darkSec hover:bg-bg-dark text-xs font-black text-text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 text-center"
                    >
                      <Home className="w-3.5 h-3.5 text-primary" />
                      <span>Home</span>
                    </button>
                  </div>
                </motion.div>
              </div>
          </>
          ) : isLoading ? (
            <CartPageSkeleton />
          ) : cartItems.length === 0 ? (
            /* EMPTY CART SCREEN */
            <div className="text-center py-20 bg-bg-card border border-glass rounded-3xl p-8 max-w-lg mx-auto space-y-6 shadow-luxury">
              <div className="w-24 h-24 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto border border-primary/30">
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
                onClick={() => navigate('/shops')}
                className="px-8 py-3.5 rounded-2xl bg-primary text-white dark:text-black text-xs font-bold hover:bg-primary-dark transition-all inline-flex items-center gap-2 cursor-pointer shadow-luxury"
              >
                <Utensils className="w-4 h-4" />
                <span>Explore Shops & Supermarkets</span>
              </button>
            </div>
          ) : (
            /* MAIN CART & CHECKOUT GRID */
            <div className="space-y-6">


              {/* Live Store Closed Warning Banner */}
              {isStoreClosed && (
                <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-4 sm:p-5 flex items-center justify-between text-rose-500 shadow-luxury">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <AlertTriangle size={24} className="shrink-0 mt-0.5 sm:mt-0 text-rose-500" />
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider">Store Currently Closed</h4>
                      <p className="text-[11px] sm:text-xs text-text-secondary dark:text-text-muted mt-0.5">
                        <strong>{closedStoreName || 'The store'}</strong> is currently closed and not accepting online orders right now.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Unavailable Items Warning Banner */}
              {unavailableCartItems.length > 0 && (
                <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 sm:p-5 text-amber-500 space-y-3 shadow-luxury">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <AlertCircle size={24} className="shrink-0 mt-0.5 sm:mt-0 text-amber-500" />
                      <div>
                        <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider">Unavailable Item(s) in Cart</h4>
                        <p className="text-[11px] sm:text-xs text-text-secondary dark:text-text-muted mt-0.5">
                          The store marked <strong>{unavailableCartItems.length} item(s)</strong> as currently unavailable. Please remove unavailable items to place your order.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveUnavailableItems}
                      className="self-start sm:self-auto px-4 py-2 rounded-xl bg-amber-500 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-105 transition-all shrink-0"
                    >
                      <Trash2 size={14} />
                      <span>Remove {unavailableCartItems.length} Unavailable Item{unavailableCartItems.length > 1 ? 's' : ''}</span>
                    </button>
                  </div>
                  <ul className="text-[11px] font-semibold text-text-secondary dark:text-text-muted pl-9 list-disc space-y-0.5">
                    {unavailableCartItems.map(i => (
                      <li key={i.itemKey}>{i.dish.name || (i.dish as any).foodName}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* LEFT COLUMN: Cart Items List (7 cols) */}
                <div className={`lg:col-span-7 space-y-6 ${mobileStep === 2 ? 'hidden lg:block' : 'block'}`}>

                  {/* Cart Items Cards (Scrollable List when many items added) */}
                  <div className="space-y-4 max-h-[58vh] sm:max-h-[62vh] lg:max-h-[70vh] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-border-color/80">
                    {cartItems.map((item) => {
                      const unitPrice = item.selectedVariant ? Number(item.selectedVariant.price) : Number(item.dish.price);
                      const itemSubtotal = unitPrice * item.quantity;
                      const itemKey = item.itemKey || item.dish.id;
                      const isVeg = (item.dish as any).isVeg ?? true;
                      const isItemUnavailable = item.dish.isAvailable === false || (item.dish as any).isAvailable === 'false';

                      return (
                        <motion.div
                          key={itemKey}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`bg-white dark:bg-bg-card border rounded-2xl p-4 sm:p-5 transition-all space-y-3.5 group shadow-sm ${isItemUnavailable ? 'border-amber-500/50 bg-amber-500/5' : 'border-glass hover:border-primary/40'}`}
                        >
                          {/* Top: Image, Title, Category & Unit Price */}
                          <div className="flex items-start gap-3.5 sm:gap-4">
                            {/* Dish Image */}
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-2xl overflow-hidden border border-glass shrink-0 bg-bg-dark">
                              <ItemImageOrIcon
                                image={item.dish.image}
                                name={item.dish.name}
                                category={item.dish.category}
                                isVeg={item.dish.isVeg}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                containerClassName="w-full h-full"
                                iconSize={24}
                                showCategoryLabel={false}
                              />
                            </div>

                            {/* Details Stack */}
                            <div className="flex-1 min-w-0 space-y-1">
                              {/* 1. Category & Remove Button */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                  {isItemUnavailable && (
                                    <span className="inline-block text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 uppercase tracking-wider">
                                      UNAVAILABLE AT STORE
                                    </span>
                                  )}
                                  {item.dish.category && (
                                    <span className="inline-block text-[10px] font-bold text-text-secondary dark:text-text-muted bg-glass-subtle px-2 py-0.5 rounded-md border border-glass">
                                      {item.dish.category}
                                    </span>
                                  )}
                                </div>

                                {/* Remove Item Trash Button */}
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(itemKey)}
                                  className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* 2. Product / Item Name Row */}
                              <div className="flex items-center gap-1.5 min-w-0 pt-0.5">
                                {/* Veg / Non-Veg Icon Indicator */}
                                <span className={`w-3.5 h-3.5 border-2 flex items-center justify-center rounded-xs shrink-0 ${isVeg ? 'border-emerald-600' : 'border-rose-600'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                </span>
                                <h4 className="text-sm sm:text-base font-black text-text-primary font-display leading-tight truncate">
                                  {item.dish.name}
                                </h4>
                              </div>

                              {/* 3. Portion Badge & Unit Price Display Inline */}
                              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-text-muted bg-transparent px-2 py-0.5 rounded-md border border-slate-300/80 dark:border-white/15">
                                  <Package size={10} className="shrink-0 text-primary" />
                                  <span>{getItemVariantLabel({ ...item.dish, selectedVariant: item.selectedVariant })}</span>
                                </span>
                                <p className="text-xs font-bold text-text-muted font-mono">
                                  ₹{unitPrice.toFixed(2)} <span className="text-[10px] font-medium text-text-muted/70 font-sans">each</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Row: Quantity Stepper & Item Subtotal */}
                          <div className="flex items-center justify-between pt-3 border-t border-glass gap-3">
                            {/* Quantity Stepper Box (Transparent Container) */}
                            <div className="flex items-center bg-transparent border border-slate-300/80 dark:border-white/20 rounded-full p-1 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => reduceQuantity(itemKey)}
                                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 text-text-primary hover:bg-primary hover:text-black font-bold flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-xs"
                                title="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-black text-sm text-text-primary font-mono">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => incrementQuantity(itemKey)}
                                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 text-text-primary hover:bg-primary hover:text-black font-bold flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-xs"
                                title="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Subtotal Pill */}
                            <div className="flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/25 px-3 py-1.5 rounded-xl">
                              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                Subtotal
                              </span>
                              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                ₹{itemSubtotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Mobile Step 1 -> Step 2 Button (Inline below items list) */}
                  <div className="pt-2 lg:hidden">
                    <button
                      type="button"
                      onClick={() => setMobileStep(2)}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white font-black flex items-center justify-between cursor-pointer active:scale-98 transition-all border border-white/20 shadow-md"
                    >
                      <div className="text-left">
                        <span className="text-[9px] uppercase tracking-wider block opacity-90 font-bold">Cart Subtotal</span>
                        <span className="text-base font-black font-mono leading-none">₹{totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white text-emerald-700 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors">
                        <span>Proceed to Checkout</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN: Checkout & Saved Address Selector (5 cols) */}
                <div className={`lg:col-span-5 space-y-6 ${mobileStep === 1 ? 'hidden lg:block' : 'block'}`}>
                  <form onSubmit={handlePlaceOrder} className="bg-bg-card border border-glass rounded-3xl p-5 sm:p-7 space-y-5 relative overflow-hidden shadow-luxury">
                    {/* Header Title */}
                    <div className="flex items-center justify-between border-b border-glass pb-3.5 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <MapPin className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black font-display text-text-primary">
                            Delivery Details
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4.5 relative z-10">

                      {/* SAVED ADDRESSES SELECTOR */}
                      {(isAuthenticated || !!getCurrentUser()) && savedAddresses.length > 0 && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-black text-text-primary uppercase tracking-wider">
                              Select Saved Address
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

                          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-transparent">
                            {savedAddresses.map((addr: Address) => {
                              const isSelected = selectedAddressId === addr.id && !isCustomAddress;
                              return (
                                <div
                                  key={addr.id}
                                  onClick={() => handleSelectAddressCard(addr)}
                                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${isSelected
                                      ? 'bg-primary/10 border-primary ring-2 ring-primary/20 text-text-primary'
                                      : 'bg-bg-cardSec border-glass text-text-secondary hover:border-primary/40'
                                    }`}
                                >
                                  <div className="space-y-1 text-xs min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded-md bg-bg-dark border border-glass text-[10px] font-extrabold text-text-primary uppercase tracking-wider flex items-center gap-1">
                                        {addr.label === 'Home' && <Home className="w-3 h-3 text-primary" />}
                                        {addr.label === 'Work' && <Briefcase className="w-3 h-3 text-primary" />}
                                        {addr.label !== 'Home' && addr.label !== 'Work' && <Navigation className="w-3 h-3 text-primary" />}
                                        <span>{addr.label || 'Address'}</span>
                                      </span>
                                      {addr.isDefault && (
                                        <span className="text-[9px] font-black text-emerald-500 uppercase">Default</span>
                                      )}
                                    </div>
                                    <p className="font-extrabold text-text-primary truncate">{addr.fullName || user?.name}</p>
                                    <p className="text-[11px] text-text-muted leading-tight line-clamp-2">
                                      {addr.street}, {addr.city} {addr.pincode}
                                    </p>
                                  </div>
                                  <div className="pt-0.5 shrink-0 flex items-center gap-2">
                                    <button
                                      type="button"
                                      title="Delete Address"
                                      onClick={(e) => handleDeleteSavedAddress(e, addr)}
                                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-all cursor-pointer active:scale-95"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-white dark:text-black' : 'border-glass'
                                      }`}>
                                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Customer Contact & Address Inputs */}
                      <div className="space-y-3 pt-1 border-t border-glass">
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
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-cardSec border border-glass text-xs text-text-primary focus:outline-none focus:border-primary font-medium"
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
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-cardSec border border-glass text-xs text-text-primary focus:outline-none focus:border-primary font-medium font-mono"
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
                            className="w-full p-3 rounded-xl bg-bg-cardSec border border-glass text-xs text-text-primary focus:outline-none focus:border-primary resize-none font-medium leading-relaxed"
                            placeholder="House No, Flat, Street, Locality, City, Pincode"
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
                            className="w-full px-3 py-2 rounded-xl bg-bg-cardSec border border-glass text-xs text-text-primary focus:outline-none focus:border-primary font-medium"
                            placeholder="e.g. Ring the doorbell, leave at front gate"
                          />
                        </div>
                      </div>

                      {/* Simplified Payment Method Reassurance Badge (Cash on Delivery) */}
                      <div className="space-y-1.5 pt-2 border-t border-glass">
                        <label className="block text-[11px] font-extrabold text-text-primary uppercase tracking-wider">
                          Payment Method
                        </label>
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="font-extrabold text-text-primary">Cash / Pay on Delivery (COD)</span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-500/15 px-2 py-0.5 rounded-md">
                            Verified
                          </span>
                        </div>
                      </div>

                      {/* Bill Breakdown Summary */}
                      <div className="pt-2 border-t border-glass space-y-3">
                        <div className="bg-bg-cardSec/70 border border-glass rounded-2xl p-4 space-y-3 text-xs">
                          {/* Items Subtotal */}
                          <div className="flex justify-between items-center text-text-secondary">
                            <span className="flex items-center gap-2 font-bold text-text-primary">
                              <IndianRupee className="w-4 h-4 text-emerald-500" />
                              <span>Items Subtotal</span>
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold font-mono text-sm">
                              ₹{totalAmount.toFixed(2)}
                            </span>
                          </div>

                          {/* Delivery Fee */}
                          <div className="flex justify-between items-center text-text-secondary pt-2.5 border-t border-glass/60">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-text-primary">Delivery Fee</span>
                              {calculatedDistanceKm ? (
                                <span className="text-[10px] text-text-muted font-mono bg-bg-dark px-2 py-0.5 rounded-md border border-glass">
                                  {calculatedDistanceKm} km @ ₹{deliveryFeePerKm}/km
                                </span>
                              ) : (
                                <span className="text-[10px] text-text-muted font-mono bg-bg-dark px-2 py-0.5 rounded-md border border-glass">
                                  Base rate @ ₹{deliveryFeePerKm}/km
                                </span>
                              )}
                            </div>
                            <span className={deliveryFee === 0 ? 'text-emerald-500 font-black font-mono text-xs bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20' : 'text-text-primary font-bold font-mono text-sm'}>
                              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                            </span>
                          </div>
                        </div>

                        {/* Final To Pay Grand Total Banner */}
                        <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-4 flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-text-primary uppercase tracking-wider block font-display">
                              Total Amount To Pay
                            </span>
                            <span className="text-[10px] text-text-muted font-medium">Includes taxes & charges</span>
                          </div>
                          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                            ₹{grandTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Submit CTA Action Button (with clear top spacing gap) */}
                      <div className="pt-3 sm:pt-4 space-y-3">


                        {!isAuthenticated || !user ? (
                          <div className="space-y-2.5">
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400">
                              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block">Login Required</span>
                                <span>Log in to your account to place your delivery order.</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => navigate('/login', { state: { from: '/cart' } })}
                              className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-dark text-white font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-md"
                            >
                              <Lock className="w-4 h-4" />
                              <span>Log In to Place Order</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="submit"
                            disabled={isPlacingOrder || isStoreClosed || unavailableCartItems.length > 0}
                            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md ${isStoreClosed
                                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30 cursor-not-allowed'
                                : unavailableCartItems.length > 0
                                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 cursor-not-allowed'
                                  : isDistanceTooFar
                                    ? 'bg-rose-500 hover:bg-rose-600 text-white cursor-pointer active:scale-98'
                                    : 'bg-primary hover:bg-primary-dark text-white active:scale-98 cursor-pointer'
                              }`}
                          >
                            {isPlacingOrder ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Dispatching Order...</span>
                              </>
                            ) : isStoreClosed ? (
                              <>
                                <AlertTriangle className="w-5 h-5 text-rose-500" />
                                <span>Store Closed — Cannot Place Order</span>
                              </>
                            ) : unavailableCartItems.length > 0 ? (
                              <>
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                <span>Remove Unavailable Items To Proceed</span>
                              </>
                            ) : isDistanceTooFar ? (
                              <>
                                <AlertTriangle className="w-5 h-5 text-rose-500" />
                                <span>Distance Exceeds 20 KM — Cannot Book</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-5 h-5" />
                                <span>Place Order Now</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                    </div>
                  </form>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* CUSTOM IN-APP DELIVERY OUT OF RANGE POPUP MODAL (MODERN PREMIUM CARD UI) */}
      <AnimatePresence>
        {showRangeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-white dark:bg-bg-card border border-rose-500/30 rounded-3xl p-5 max-w-[360px] w-full shadow-2xl relative overflow-hidden space-y-3.5"
            >
              {/* Close Button (Clean Circle Badge) */}
              <button
                type="button"
                onClick={() => setShowRangeModal(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 text-text-muted hover:text-text-primary hover:bg-slate-200 dark:hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer z-10 active:scale-90"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* Header: Icon + Title */}
              <div className="flex items-center gap-3 pr-8">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0 shadow-inner relative overflow-hidden">
                  <MapPinOff className="w-5.5 h-5.5 text-rose-500" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-black font-display text-text-primary leading-tight">
                    Delivery Out of Range
                  </h3>
                  <span className="text-[11px] font-extrabold text-rose-500 uppercase tracking-wider block mt-0.5">
                    Max Radius Limit: 20 KM
                  </span>
                </div>
              </div>

              {/* Body: Distance Info Box */}
              <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted font-bold">Store Distance:</span>
                  <span className="font-black text-rose-500 bg-rose-500/15 px-2 py-0.5 rounded-md border border-rose-500/30">
                    {effectiveDistance.toFixed(1)} KM
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary dark:text-text-muted leading-relaxed">
                  This store is too far for delivery. Please select a closer address or choose another store.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRangeModal(false)}
                  className="py-2.5 px-3 rounded-xl border border-glass text-text-secondary hover:bg-bg-darkSec font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRangeModal(false);
                    setMobileStep(2);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="py-2.5 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Change</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* DELETE ADDRESS CONFIRMATION POPUP MODAL */}
      <AnimatePresence>
        {addressToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-white dark:bg-bg-card border border-glass rounded-3xl p-5 sm:p-6 max-w-[320px] w-full shadow-2xl space-y-4 text-center relative overflow-hidden"
            >
              {/* Glowing Top Accent Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />

              {/* Title & Subtitle */}
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black font-display text-text-primary tracking-tight">
                  Delete Saved Address?
                </h3>
                <p className="text-[11px] text-text-secondary dark:text-text-muted leading-snug">
                  Are you sure you want to delete <strong className="text-text-primary">"{addressToDelete.label || 'this address'}"</strong> ({addressToDelete.street}, {addressToDelete.city})?
                </p>
              </div>

              {/* Action Buttons with Icons */}
              <div className="pt-1 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAddressToDelete(null)}
                  className="py-2.5 px-3 rounded-xl border border-glass text-text-secondary hover:bg-bg-darkSec font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Ban className="w-3.5 h-3.5 opacity-80" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAddress}
                  className="py-2.5 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CartPage;
