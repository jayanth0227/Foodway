import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ShoppingBag, Clock, CheckCircle2, Package, MapPin, ArrowLeft, RefreshCw, AlertCircle, AlertTriangle, Utensils, Store, Search, Calendar, ArrowUpDown, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../utils/api';
import socketService from '../services/socket.service';
import { DeliveryTransitVisualTracker } from '../components/common/DeliveryTransitVisualTracker';
import { MobileOrderCardSkeleton } from '../components/common/MobileSkeletonLoader';

export const CustomerOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { addToCart } = useCart();
  const { t } = useLanguage();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  const toggleOrderExpand = (id: string) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (orders.length > 0) {
      const activeIds = orders
        .filter(o => !['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'REJECT'].includes((o.status || '').toUpperCase()))
        .map(o => o.orderId || o.id);
      
      const defaultExpanded = activeIds.length > 0 ? activeIds : [orders[0].orderId || orders[0].id];
      setExpandedOrderIds(new Set(defaultExpanded));
    }
  }, [orders]);

  // Helper: Play Pleasant Audio Beep Alarm for Customer Status Updates
  const playOrderAlertBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const playTone = (freq: number, start: number, dur: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
          gain.gain.setValueAtTime(0.5, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + dur);
        };

        // 3 pleasant confirmation beeps (C5 -> E5 -> G5)
        playTone(523.25, 0.0, 0.15);
        playTone(659.25, 0.18, 0.15);
        playTone(783.99, 0.36, 0.3);
      }
    } catch (e) {}

    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    if (user) {
      fetchCustomerOrders();
      const custId = user.id || user.email;
      socketService.joinCustomer(custId);

      const unsubscribeStatus = socketService.onOrderStatusUpdated((updatedOrder: any) => {
        console.log('⚡ [Socket Event: ORDER_STATUS_UPDATED]:', updatedOrder);
        const targetId = updatedOrder.orderId || updatedOrder.id;
        const parentId = updatedOrder.parentOrderId;
        const newStatus = updatedOrder.status || updatedOrder.orderStatus;

        setOrders(prev => prev.map(o => {
          const match = (o.orderId === targetId || o.id === targetId || (parentId && (o.orderId === parentId || o.parentOrderId === parentId)));
          if (match) {
            return { ...o, status: newStatus, orderStatus: newStatus };
          }
          return o;
        }));
        playOrderAlertBeep();
      });

      const unsubscribeRider = socketService.onRiderStatusUpdated((updatedOrder: any) => {
        console.log('⚡ [Socket Event: RIDER_STATUS_UPDATED]:', updatedOrder);
        const targetId = updatedOrder.orderId || updatedOrder.id;
        const parentId = updatedOrder.parentOrderId;
        const newStatus = updatedOrder.status || updatedOrder.orderStatus;

        setOrders(prev => prev.map(o => {
          const match = (o.orderId === targetId || o.id === targetId || (parentId && (o.orderId === parentId || o.parentOrderId === parentId)));
          if (match) {
            return { ...o, status: newStatus, orderStatus: newStatus };
          }
          return o;
        }));
        playOrderAlertBeep();
      });

      return () => {
        unsubscribeStatus();
        unsubscribeRider();
      };
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchCustomerOrders = async () => {
    setLoading(true);
    try {
      const custId = user?.id || user?.email;
      const response = await axios.get(`${API_BASE_URL}/customer/orders/${custId}`);
      if (response.data.success && Array.isArray(response.data.orders)) {
        setOrders(response.data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn('Error fetching customer orders from DB:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPaymentMethod = (pm: string) => {
    if (!pm) return 'Cash on Delivery (COD)';
    const upper = pm.toUpperCase().replace(/\s+/g, '_');
    if (upper === 'CASH_ON_DELIVERY' || upper === 'COD') return 'Cash on Delivery (COD)';
    if (upper === 'ONLINE' || upper === 'RAZORPAY' || upper === 'UPI' || upper === 'ONLINE_PAYMENT') return 'Online Payment';
    return pm.replace(/_/g, ' ');
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'PENDING').toUpperCase();
    switch (s) {
      case 'PENDING':
        return <span className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-black bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1.5 shrink-0 shadow-sm"><Clock size={15} /> Order Placed</span>;
      case 'ACCEPTED':
      case 'CONFIRMED':
        return <span className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-black bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 inline-flex items-center gap-1.5 shrink-0 shadow-sm"><CheckCircle2 size={15} /> Order Accepted</span>;
      case 'PREPARING':
        return <span className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-black bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 inline-flex items-center gap-1.5 shrink-0 shadow-sm"><Utensils size={15} /> Preparing</span>;
      case 'READY':
        return <span className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5 shrink-0 shadow-sm"><Package size={15} /> Food Ready</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-black bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 inline-flex items-center gap-1.5 shrink-0 shadow-sm"><Package size={15} /> Out for Delivery</span>;
      case 'REJECTED':
      case 'REJECT':
      case 'CANCELLED':
        return <span className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-black bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1.5 shrink-0 shadow-sm"><AlertCircle size={15} /> Cancelled</span>;
      case 'DELIVERED':
      case 'COMPLETED':
        return (
          <span className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5 shrink-0 shadow-sm">
            <CheckCircle2 size={15} />
            <span className="sm:hidden">Delivered</span>
            <span className="hidden sm:inline">Delivered & Completed</span>
          </span>
        );
      default:
        return <span className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-black bg-glass text-text-muted border border-glass inline-flex items-center gap-1.5 shrink-0 shadow-sm">{status}</span>;
    }
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  const isOrderFinished = (statusStr: string) => {
    const s = (statusStr || '').toUpperCase();
    return ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'REJECT'].includes(s);
  };

  // Sort orders date/day-wise (Newest first by default)
  const sortedOrders = [...orders].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.orderedAt || 0).getTime();
    const timeB = new Date(b.createdAt || b.orderedAt || 0).getTime();
    return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
  });

  // Filter orders by search query
  const searchFilteredOrders = sortedOrders.filter(order => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const orderId = (order.orderId || order.id || '').toLowerCase();
    const restaurantName = (order.restaurantName || '').toLowerCase();
    const itemsList = Array.isArray(order.items) ? order.items : Array.isArray(order.rawItems) ? order.rawItems : [];
    const itemNames = itemsList.map((i: any) => (i.foodName || i.name || '').toLowerCase()).join(' ');

    return orderId.includes(query) || restaurantName.includes(query) || itemNames.includes(query);
  });

  const activeOrders = searchFilteredOrders.filter(o => !isOrderFinished(o.status || (o as any).orderStatus));
  const pastOrders = searchFilteredOrders.filter(o => isOrderFinished(o.status || (o as any).orderStatus));
  const displayedOrders = activeTab === 'ACTIVE' ? activeOrders : pastOrders;

  const [reorderLoadingId, setReorderLoadingId] = useState<string | null>(null);
  const [stockWarningToast, setStockWarningToast] = useState<{
    isOpen: boolean;
    items: string[];
  } | null>(null);

  const handleReorder = async (order: any) => {
    const orderId = order.id || order.orderId;
    setReorderLoadingId(orderId);

    const itemsList = Array.isArray(order.items) && order.items.length > 0
      ? order.items
      : Array.isArray(order.rawItems) ? order.rawItems : [];

    if (itemsList.length === 0) {
      alert('No items found in this order.');
      setReorderLoadingId(null);
      return;
    }

    const resId = order.restaurantId || order.shopId || (itemsList[0] as any)?.restaurantId;

    try {
      // 1. Fetch fresh live menu for this vendor from backend
      let liveMenu: any[] = [];
      if (resId) {
        try {
          const resp = await axios.get(`${API_BASE_URL}/restaurant/menu/${resId}`);
          if (resp.data) {
            const fetched = resp.data.items || resp.data.menu || resp.data.data || [];
            if (Array.isArray(fetched) && fetched.length > 0) {
              liveMenu = fetched;
            }
          }
        } catch (e) {
          console.warn('Failed to fetch shop menu by ID, fallback to all live menu items', e);
        }
      }

      if (liveMenu.length === 0) {
        // Fallback: fetch all active menu items
        try {
          const respAll = await axios.get(`${API_BASE_URL}/restaurant/menu/all`);
          if (respAll.data) {
            const fetchedAll = respAll.data.items || respAll.data.menu || respAll.data.data || [];
            if (Array.isArray(fetchedAll) && fetchedAll.length > 0) {
              liveMenu = fetchedAll;
            }
          }
        } catch (e) {}
      }

      const unavailableItemNames: string[] = [];
      let addedCount = 0;

      for (const item of itemsList) {
        const itemTargetId = String(item.menuItemId || item.id || item.itemId || '').toLowerCase().trim();
        const itemTargetName = (item.foodName || item.name || item.dishName || '').trim().toLowerCase();

        // Match in live menu
        const liveDish = liveMenu.find((m: any) => {
          const mId = String(m.id || m.menuItemId || m.itemId || '').toLowerCase().trim();
          const mName = (m.name || m.foodName || m.dishName || '').trim().toLowerCase();

          const idMatches = itemTargetId && mId && (mId === itemTargetId || mId.includes(itemTargetId) || itemTargetId.includes(mId));
          const nameMatches = itemTargetName && mName && (mName === itemTargetName || mName.includes(itemTargetName) || itemTargetName.includes(mName));

          return idMatches || nameMatches;
        });

        const displayName = item.foodName || item.name || liveDish?.name || 'Item';

        // Check if item was removed from menu
        if (!liveDish) {
          unavailableItemNames.push(`${displayName} (no longer in vendor menu)`);
          continue;
        }

        // Check if item is out of stock or disabled
        const isAvail = liveDish.isAvailable !== false && (liveDish.status || '').toLowerCase() !== 'disabled';
        if (!isAvail) {
          unavailableItemNames.push(`${displayName} (out of stock)`);
          continue;
        }

        const origVariantObj = item.selectedVariant || item.variant;
        const origVarId = String((origVariantObj as any)?.id || (origVariantObj as any)?.variantId || (item as any)?.variantId || '').toLowerCase().trim();
        const origVarLabel = (
          item.variantLabel ||
          (origVariantObj?.label) ||
          (origVariantObj?.name) ||
          (origVariantObj?.variantName) ||
          (origVariantObj?.quantity ? `${origVariantObj.quantity} ${origVariantObj.unit || ''}` : '') ||
          (typeof origVariantObj === 'string' ? origVariantObj : '') ||
          item.portion ||
          item.portionSize ||
          (item.weight ? `${item.weight} ${item.unit || ''}` : '') ||
          ''
        ).toString().toLowerCase().trim();

        const targetPrice = Number(item.price || (origVariantObj ? origVariantObj.price : 0) || 0);

        let selectedVariantToUse: any = null;
        let freshPrice = Number(liveDish.price || 0);

        if (Array.isArray(liveDish.variants) && liveDish.variants.length > 0) {
          let matchedVar: any = null;

          // 1. Match by variant ID
          if (origVarId) {
            matchedVar = liveDish.variants.find((v: any) => String(v.id || v.variantId || '').toLowerCase() === origVarId);
          }

          // 2. Match by label / portion string (e.g. "1 kg")
          if (!matchedVar && origVarLabel) {
            matchedVar = liveDish.variants.find((v: any) => {
              const vLabel = String(v.label || v.name || (v.quantity ? `${v.quantity} ${v.unit || ''}` : '')).toLowerCase().trim();
              return vLabel === origVarLabel || vLabel.includes(origVarLabel) || origVarLabel.includes(vLabel);
            });
          }

          // 3. Match by exact target price
          if (!matchedVar && targetPrice > 0) {
            matchedVar = liveDish.variants.find((v: any) => Math.abs(Number(v.price) - targetPrice) < 0.01);
          }

          // 4. Match by closest variant price (Handles vendor price changes e.g. ₹75 -> ₹80 for 1kg variant)
          if (!matchedVar && targetPrice > 0) {
            let minDiff = Infinity;
            let closestVar = null;
            for (const v of liveDish.variants) {
              const vPrice = Number(v.price || 0);
              if (vPrice > 0) {
                const diff = Math.abs(vPrice - targetPrice);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestVar = v;
                }
              }
            }
            if (closestVar) {
              matchedVar = closestVar;
            }
          }

          if (matchedVar) {
            selectedVariantToUse = matchedVar;
            freshPrice = Number(matchedVar.price);
          } else if (origVariantObj) {
            selectedVariantToUse = origVariantObj;
            freshPrice = Number(origVariantObj.price || liveDish.price || targetPrice);
          } else {
            selectedVariantToUse = liveDish.variants[0];
            freshPrice = Number(liveDish.variants[0].price);
          }
        } else if (origVariantObj) {
          selectedVariantToUse = origVariantObj;
          freshPrice = Number(origVariantObj.price || liveDish.price || targetPrice);
        } else {
          freshPrice = Number(liveDish.price || targetPrice);
        }

        const qtyToReorder = Number(item.quantity || item.qty || 1);
        const dishPayload = {
          id: liveDish.id || liveDish.menuItemId || item.id,
          name: liveDish.name || item.foodName || item.name,
          description: liveDish.description || '',
          price: freshPrice,
          category: liveDish.category || 'Main Course',
          image: liveDish.image || item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
          type: liveDish.type || 'non-veg',
          isVeg: liveDish.isVeg !== undefined ? liveDish.isVeg : true,
          isAvailable: true,
          rating: 4.8,
          restaurantId: resId,
          restaurantName: order.restaurantName || liveDish.restaurantName
        };

        for (let q = 0; q < qtyToReorder; q++) {
          addToCart(dishPayload, selectedVariantToUse);
        }
        addedCount++;
      }

      setReorderLoadingId(null);

      if (unavailableItemNames.length > 0) {
        setStockWarningToast({
          isOpen: true,
          items: unavailableItemNames
        });
      }

      if (addedCount > 0) {
        // Short delay if warning toast exists so user sees the warning banner
        if (unavailableItemNames.length > 0) {
          setTimeout(() => {
            navigate('/cart');
          }, 1400);
        } else {
          navigate('/cart');
        }
      }
    } catch (err) {
      console.error('Reorder resolution error:', err);
      setReorderLoadingId(null);
      navigate('/cart');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Restoring Session...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-bg-dark pt-32 pb-20 px-4 text-center">
        <div className="max-w-md mx-auto glass-panel border border-amber-500/40 rounded-3xl p-8 space-y-4">
          <AlertCircle size={44} className="mx-auto text-amber-500" />
          <h2 className="text-2xl font-black font-display text-text-primary">Login Required</h2>
          <p className="text-xs text-text-muted">Please log in to view your live and past order history.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3.5 rounded-2xl bg-amber-500 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-md"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Orders | MK Delivery Services</title>
      </Helmet>

      <div className="min-h-screen bg-bg-dark pt-28 pb-24 px-4 sm:px-6 lg:px-12 relative overflow-hidden transition-colors">
        {/* Ambient background decoration */}
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto space-y-8 relative z-10">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-6">
            <div className="space-y-1">
              {/* DESKTOP ONLY: Explore Restaurants Back Link */}
              <button
                onClick={() => navigate('/restaurants')}
                className="hidden sm:flex text-xs font-bold text-text-muted hover:text-primary transition-colors items-center gap-1 mb-2 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>{t('browse_restaurants_btn')}</span>
              </button>

              {/* Title Section: Mobile shows Back Arrow button beside My Orders */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/restaurants')}
                  className="sm:hidden p-2 rounded-2xl bg-glass border border-glass text-text-primary hover:text-primary transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center shrink-0"
                  title="Back to Restaurants"
                  aria-label="Back to Restaurants"
                >
                  <ArrowLeft size={18} className="text-primary" />
                </button>
                <h1 className="text-3xl sm:text-4xl font-black font-display text-gradient-gold">
                  {t('my_orders_title')}
                </h1>
              </div>

              <p className="text-xs text-text-secondary pl-0.5 sm:pl-0">
                Track live delivery updates and view your past order history directly from Database.
              </p>
            </div>

            <button
              onClick={fetchCustomerOrders}
              className="px-4 py-2.5 rounded-xl bg-glass border border-glass hover:border-primary/40 text-text-primary font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Orders</span>
            </button>
          </div>

          {/* Search & Date Sort Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* User Friendly Search Input */}
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders, dishes, or stores..."
                className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-2xl bg-glass border border-glass/80 focus:border-primary focus:ring-2 focus:ring-primary/20 text-text-primary placeholder:text-text-muted text-xs sm:text-sm font-semibold focus:outline-none transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 rounded-full transition-colors cursor-pointer bg-glass hover:bg-glass-subtle"
                  title="Clear search query"
                  aria-label="Clear search query"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Date/Day Wise Sort Selector Button */}
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
              className="px-4 py-2.5 sm:py-3 rounded-2xl bg-glass border border-glass hover:border-primary/50 text-text-primary text-xs font-black flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer transition-all shadow-sm active:scale-95 group shrink-0"
              title="Click to toggle order sorting"
            >
              <Calendar size={15} className="text-primary group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-text-muted font-bold">Sort:</span>
              <span className="text-primary font-black">{sortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}</span>
              <ArrowUpDown size={13} className="text-primary shrink-0 group-hover:rotate-180 transition-transform duration-300 ml-0.5" />
            </button>
          </div>

          {/* Active vs Past Order Tabs */}
          <div className="flex items-center gap-2 border-b border-glass/60 pb-2">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'ACTIVE'
                ? 'bg-primary text-black font-black shadow-md'
                : 'bg-glass text-text-secondary hover:text-text-primary'
                }`}
            >
              <Clock size={15} />
              <span>Live Orders ({activeOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'HISTORY'
                ? 'bg-primary text-black font-black shadow-md'
                : 'bg-glass text-text-secondary hover:text-text-primary'
                }`}
            >
              <Package size={15} />
              <span>Order History ({pastOrders.length})</span>
            </button>
          </div>

          {/* Orders List Skeleton Loader */}
          {loading ? (
            <MobileOrderCardSkeleton count={3} />
          ) : displayedOrders.length === 0 ? (
            <div className="py-20 text-center glass-panel border border-glass rounded-3xl p-12 max-w-md mx-auto space-y-4">
              <ShoppingBag size={48} className="mx-auto text-text-muted opacity-50" />
              <h3 className="text-xl font-bold font-display text-text-primary">
                No {activeTab === 'ACTIVE' ? 'Live' : 'Past'} Orders Found
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {activeTab === 'ACTIVE'
                  ? 'You currently have no active orders in preparation or delivery.'
                  : 'You have not completed any past orders yet.'}
              </p>
              <button
                onClick={() => navigate('/restaurants')}
                className="px-6 py-3 rounded-2xl bg-primary text-black font-extrabold text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                Order Now
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {displayedOrders.map((order) => {
                const orderId = order.orderId || order.id || 'ORD-000';
                const itemsList = Array.isArray(order.items) && order.items.length > 0
                  ? order.items
                  : Array.isArray(order.rawItems) ? order.rawItems : [];

                const itemShopName = itemsList[0]?.restaurantName;
                const rawResName = itemShopName || order.restaurantName || order.restaurantId || '';
                const restaurantDisplayName = (!rawResName || rawResName.includes('RES_') || rawResName === 'RES_DEFAULT' || rawResName === 'Partner Restaurant')
                  ? 'Gourmet Kitchen'
                  : rawResName;
                const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : 'Recently';

                const isExpanded = expandedOrderIds.has(orderId);
                const orderTotal = Number(order.totalAmount || order.total || 0);

                return (
                  <motion.div
                    key={orderId}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel border border-glass hover:border-primary/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-luxury transition-all"
                  >
                    {/* ACCORDION CLICKABLE HEADER */}
                    <div
                      onClick={() => toggleOrderExpand(orderId)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs sm:text-sm font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-lg tracking-wider">
                            #{orderId}
                          </span>
                          <span className="text-xs text-text-muted font-medium">• {formattedDate}</span>
                          <div className="inline-flex items-center gap-1.5 text-xs font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/25">
                            <Store size={13} className="shrink-0" />
                            <span className="truncate max-w-[140px] sm:max-w-none">{restaurantDisplayName}</span>
                          </div>
                          {order.isMultiVendor && (
                            <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-md">
                              🔀 Multi-Vendor
                            </span>
                          )}
                        </div>

                        {order.cancellationNotice && (
                          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-extrabold flex items-center gap-2 mt-1">
                            <AlertTriangle size={15} className="shrink-0 text-rose-500" />
                            <span>{order.cancellationNotice}</span>
                          </div>
                        )}

                        {order.deliveryAddress && !isExpanded && (
                          <p className="text-xs text-text-secondary truncate max-w-lg">
                            📍 {order.deliveryAddress}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-left sm:text-right">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(order.status)}
                            <span className="text-sm sm:text-base font-black text-primary font-display">
                              ₹{orderTotal.toFixed(2)}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-text-muted block mt-0.5">
                            {itemsList.length} {itemsList.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-glass border border-glass hover:border-primary/40 text-primary flex items-center gap-1 text-xs font-extrabold shrink-0 transition-all">
                          <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>

                    {/* ACCORDION EXPANDED BODY DETAILS */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-4 pt-3 border-t border-glass/40 overflow-hidden"
                        >
                          {/* VISUAL DELIVERY TRANSIT PROGRESS STEPPER */}
                          <DeliveryTransitVisualTracker
                            status={order.status}
                            riderName={order.assignedRider || order.deliveryPartnerName}
                            riderPhone={order.deliveryPartnerPhone}
                          />

                          {/* Delivery Address */}
                          {order.deliveryAddress && (
                            <p className="text-xs text-text-secondary flex items-start gap-1.5 pt-0.5">
                              <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
                              <span className="font-medium">{order.deliveryAddress}</span>
                            </p>
                          )}

                          {/* Ordered Items Full Breakdown */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                                <Utensils size={14} className="text-primary" />
                                <span>Ordered Food Items ({itemsList.length})</span>
                              </span>
                            </div>

                            {itemsList.length === 0 ? (
                              <div className="p-3 rounded-xl bg-bg-dark/40 border border-glass text-xs text-text-muted italic">
                                Item details saved in database order record #{orderId}.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {itemsList.map((item: any, idx: number) => {
                                  const itemName = item.foodName || item.name || 'Food Item';
                                  const itemQty = Number(item.quantity || 1);
                                  const itemPrice = Number(item.price || 0);
                                  const itemTotal = itemPrice * itemQty;
                                  const itemImage = item.image || item.foodImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300';
                                  
                                  const variantLabel = (() => {
                                    if (item.variantLabel && typeof item.variantLabel === 'string' && item.variantLabel.trim() !== '') {
                                      return item.variantLabel.trim();
                                    }
                                    const v = item.selectedVariant || item.variant;
                                    if (v) {
                                      if (typeof v === 'string' && v.trim() !== '') return v.trim();
                                      if (typeof v === 'object') {
                                        const name = v.name || v.label || v.variantName || v.portionName || v.title;
                                        const qty = v.quantity || v.qty || v.weight || v.packSize;
                                        const unit = v.unit || v.type || '';
                                        const qtyUnit = (qty || unit) ? `${qty || ''} ${unit}`.trim() : '';

                                        if (name && qtyUnit && name !== qtyUnit) return `${name} (${qtyUnit})`;
                                        if (name) return name;
                                        if (qtyUnit) return qtyUnit;
                                      }
                                    }
                                    if (item.portion) return String(item.portion);
                                    if (item.portionSize) return String(item.portionSize);
                                    if (item.unit && item.quantity && String(item.unit).trim() !== '') return `${item.quantity} ${item.unit}`;
                                    if (item.unit && String(item.unit).trim() !== '') return String(item.unit);
                                    if (item.size) return String(item.size);
                                    if (item.weight) return String(item.weight);
                                    return null;
                                  })();

                                  return (
                                    <div
                                      key={idx}
                                      className="p-3 rounded-xl bg-glass/60 border border-glass flex items-center justify-between gap-3 hover:border-primary/40 transition-all shadow-sm"
                                    >
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <img
                                          src={itemImage}
                                          alt={itemName}
                                          className="rounded-xl object-cover border border-glass shrink-0 bg-bg-dark shadow-xs"
                                          style={{ width: '52px', height: '52px', minWidth: '52px', minHeight: '52px' }}
                                        />
                                        <div className="min-w-0 space-y-1 flex-1">
                                          <h4 className="text-xs sm:text-sm font-black text-text-primary truncate">
                                            {itemName}
                                          </h4>
                                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 font-black text-[11px] font-mono shadow-xs">
                                              QTY: {itemQty}
                                            </span>
                                            {variantLabel ? (
                                              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-black text-[11px] font-mono shadow-xs flex items-center gap-1">
                                                <Package size={11} className="shrink-0" />
                                                <span>{variantLabel}</span>
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded-md bg-glass text-text-muted border border-glass/60 font-bold text-[10px] font-mono">
                                                Standard Portion
                                              </span>
                                            )}
                                            <span className="text-text-muted font-bold text-[11px]">
                                              • ₹{Number.isInteger(itemPrice) ? itemPrice : itemPrice.toFixed(2)} each
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className="text-xs sm:text-sm font-black text-primary font-display block">
                                          ₹{Number.isInteger(itemTotal) ? itemTotal : itemTotal.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Footer Info & Pricing & REORDER Button */}
                          <div className="pt-4 border-t border-glass flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center justify-between sm:justify-start gap-4 text-xs font-semibold w-full sm:w-auto">
                              <div>
                                <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider">Grand Total</span>
                                <span className="text-lg sm:text-xl font-black text-text-primary font-display">
                                  ₹{orderTotal.toFixed(2)}
                                </span>
                              </div>

                              <div className="h-8 w-px bg-glass" />

                              <div>
                                <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider">Payment Mode</span>
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] inline-block mt-0.5 font-sans">
                                  {formatPaymentMethod(order.paymentMethod)}
                                </span>
                              </div>
                            </div>

                            <button
                              disabled={reorderLoadingId === (order.id || order.orderId)}
                              onClick={() => handleReorder(order)}
                              className="px-4 py-2.5 rounded-xl bg-primary text-black hover:bg-primary/90 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0 disabled:opacity-50"
                            >
                              <RefreshCw size={14} className={reorderLoadingId === (order.id || order.orderId) ? 'animate-spin' : ''} />
                              <span>{reorderLoadingId === (order.id || order.orderId) ? 'Checking Prices...' : 'REORDER'}</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Floating Glassmorphism Out of Stock Warning Toast Banner */}
      <AnimatePresence>
        {stockWarningToast && stockWarningToast.isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 right-4 sm:right-8 z-[99999] max-w-md w-full p-4 sm:p-5 rounded-2xl bg-amber-500/15 dark:bg-amber-500/10 border border-amber-500/40 backdrop-blur-xl shadow-2xl space-y-2 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-sm font-display">
                <AlertTriangle size={18} className="shrink-0 text-amber-500 animate-bounce" />
                <span>Out of Stock Notice</span>
              </div>
              <button
                onClick={() => setStockWarningToast(null)}
                className="p-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-glass cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed font-semibold">
              The following item(s) are currently unavailable and were skipped:
            </p>

            <div className="space-y-1 text-xs font-bold text-amber-600 dark:text-amber-300">
              {stockWarningToast.items.map((itemStr, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{itemStr}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CustomerOrdersPage;
