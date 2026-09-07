import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ShoppingBag, Clock, CheckCircle2, Package, MapPin, ArrowLeft, RefreshCw, AlertCircle, AlertTriangle, Utensils, Store, Search, Calendar, ArrowUpDown, X, ChevronDown, ChevronUp, Star, MessageSquare, Lock, XCircle, Info, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../utils/api';
import socketService from '../services/socket.service';
import { DeliveryTransitVisualTracker } from '../components/common/DeliveryTransitVisualTracker';
import { MobileOrderCardSkeleton } from '../components/common/MobileSkeletonLoader';
import { getItemVariantLabel } from '../utils/variantUtils';
import ItemImageOrIcon from '../components/common/ItemImageOrIcon';

export const CustomerOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { addToCart } = useCart();
  const { t } = useLanguage();

  const [orders, setOrders] = useState<any[]>([]);
  const [liveDishesMap, setLiveDishesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/restaurants');
    }
  };

  const toggleOrderExpand = (id: string) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Orders start collapsed by default ("View Details"). User clicks "View Details" to expand card details.



  useEffect(() => {
    if (user) {
      fetchCustomerOrders(false);
      const custId = user.id || user.email;
      socketService.joinCustomer(custId);

      const handleOrderUpdate = (_updatedOrder: any) => {
        fetchCustomerOrders(true);
      };

      const unsubscribeStatus = socketService.onOrderStatusUpdated(handleOrderUpdate);
      const unsubscribeRider = socketService.onRiderStatusUpdated(handleOrderUpdate);
      const unsubscribeAssigned = socketService.onOrderAssigned(handleOrderUpdate);

      // Live 3-second background sync interval for instant tracking updates without manual refresh
      const syncInterval = setInterval(() => {
        fetchCustomerOrders(true);
      }, 3000);

      const handleFocus = () => {
        fetchCustomerOrders(true);
      };
      window.addEventListener('focus', handleFocus);

      return () => {
        unsubscribeStatus();
        unsubscribeRider();
        unsubscribeAssigned();
        clearInterval(syncInterval);
        window.removeEventListener('focus', handleFocus);
      };
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchCustomerOrders = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const custId = user?.id || user?.email;
      if (!custId) return;
      const response = await axios.get(`${API_BASE_URL}/customer/orders/${custId}`);
      if (response.data.success && Array.isArray(response.data.orders)) {
        setOrders(response.data.orders);
      } else if (!isSilent) {
        setOrders([]);
      }

      try {
        const dishResp = await axios.get(`${API_BASE_URL}/public/dishes`);
        const dishList = Array.isArray(dishResp.data) ? dishResp.data : (dishResp.data?.dishes || []);
        const dMap: Record<string, any> = {};
        dishList.forEach((d: any) => {
          if (d.id) dMap[d.id] = d;
          if (d.menuItemId) dMap[d.menuItemId] = d;
          if (d.name) dMap[d.name.toLowerCase().trim()] = d;
          if (d.foodName) dMap[d.foodName.toLowerCase().trim()] = d;
        });
        setLiveDishesMap(dMap);
      } catch (e) {}
    } catch (err) {
      console.warn('Error fetching customer orders from DB:', err);
      if (!isSilent) setOrders([]);
    } finally {
      if (!isSilent) setLoading(false);
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
      case 'PLACED':
      case 'ORDER_PLACED':
        return (
          <span className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-sky-50/90 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700/80 inline-flex items-center gap-2 shrink-0 shadow-2xs uppercase tracking-wider">
            <Clock size={16} className="text-sky-600 dark:text-sky-400 stroke-[2.2]" />
            <span>ORDER PLACED</span>
          </span>
        );
      case 'ASSIGNED':
      case 'RIDER_ASSIGNED':
      case 'DRIVER_ASSIGNED':
      case 'PARTNER_ASSIGNED':
        return (
          <span className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-slate-50/90 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-300/90 dark:border-white/20 inline-flex items-center gap-2 shrink-0 shadow-2xs uppercase tracking-wider">
            <span>ASSIGNED</span>
          </span>
        );
      case 'ACCEPTED':
      case 'CONFIRMED':
      case 'PREPARING':
        return (
          <span className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-amber-50/90 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 inline-flex items-center gap-2 shrink-0 shadow-2xs uppercase tracking-wider">
            <Utensils size={16} className="text-amber-600 dark:text-amber-400 stroke-[2.2]" />
            <span>PREPARING</span>
          </span>
        );
      case 'READY':
      case 'OUT_FOR_DELIVERY':
      case 'IN_TRANSIT':
        return (
          <span className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-purple-50/90 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/80 inline-flex items-center gap-2 shrink-0 shadow-2xs uppercase tracking-wider">
            <Bike size={16} className="text-purple-600 dark:text-purple-400 stroke-[2.2]" />
            <span>OUT FOR DELIVERY</span>
          </span>
        );
      case 'REJECTED':
      case 'REJECT':
      case 'CANCELLED':
        return (
          <span className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-rose-50/90 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700/80 inline-flex items-center gap-2 shrink-0 shadow-2xs uppercase tracking-wider">
            <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 stroke-[2.2]" />
            <span>CANCELLED</span>
          </span>
        );
      case 'DELIVERED':
      case 'COMPLETED':
        return (
          <span className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 inline-flex items-center gap-2 shrink-0 shadow-2xs uppercase tracking-wider">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
            <span>DELIVERED</span>
          </span>
        );
      default:
        return (
          <span className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-slate-50/90 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-300/90 dark:border-white/20 inline-flex items-center gap-2 shrink-0 shadow-2xs uppercase tracking-wider">
            <span>{s.replace(/_/g, ' ')}</span>
          </span>
        );
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

  // Rating & Review Modal State
  const [reviewModalOrder, setReviewModalOrder] = useState<any | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewSuccessToast, setReviewSuccessToast] = useState<string | null>(null);

  // Cancellation Modal State
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const isOrderCancellableByCustomer = (order: any) => {
    const statusUpper = (order?.status || order?.orderStatus || '').toUpperCase();
    const cancellableStatuses = ['PENDING', 'PLACED', 'ORDER_PLACED', 'UNACCEPTED'];
    return cancellableStatuses.includes(statusUpper);
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancelModalOrder) return;
    const targetId = cancelModalOrder.id || cancelModalOrder.orderId;
    setCancelLoading(true);
    setCancelError(null);

    try {
      const response = await axios.put(`${API_BASE_URL}/orders/${targetId}/status`, {
        status: 'CANCELLED',
        cancelledBy: 'CUSTOMER'
      });

      if (response.data && response.data.success) {
        setOrders(prev => prev.map(o => {
          if ((o.id || o.orderId) === targetId) {
            return {
              ...o,
              status: 'CANCELLED',
              orderStatus: 'CANCELLED',
              cancellationNotice: 'Order cancelled by customer.'
            };
          }
          return o;
        }));
        setCancelModalOrder(null);
      } else {
        setCancelError(response.data?.error || 'Failed to cancel order. Please try again.');
      }
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      const errMsg = err.response?.data?.error || 'Order cannot be cancelled after the store has accepted it.';
      setCancelError(errMsg);
    } finally {
      setCancelLoading(false);
    }
  };

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
          image: liveDish.image || item.image || '',
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
      <div className="min-h-screen bg-bg-dark pt-20 pb-20 px-4 text-center">
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
        <title>My Orders | Foodway Services</title>
      </Helmet>

      <div className="min-h-screen bg-bg-dark pt-24 sm:pt-28 lg:pt-28 pb-32 lg:pb-16 px-4 sm:px-6 lg:px-12 relative overflow-hidden transition-colors">
        {/* Ambient background decoration */}
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto space-y-4 relative z-10">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-3.5">
            <div className="space-y-1">
              {/* Title Section with Back Button beside text */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-10 h-10 rounded-2xl bg-white dark:bg-white/10 border border-slate-200/90 dark:border-white/15 text-[#B87B4B] dark:text-[#D4986A] shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer shrink-0 group"
                  title="Go Back"
                  aria-label="Go Back"
                >
                  <ArrowLeft size={18} className="text-[#B87B4B] dark:text-[#D4986A] stroke-[2.2] group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black font-display text-text-primary tracking-tight leading-none">
                    {t('my_orders_title')}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-text-muted mt-1 font-medium">
                    Track live delivery updates & order history
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Controls Row: Refresh Orders (Left) | Search Input (Middle) | Sort Selector (Right) */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full">
            {/* Refresh Orders Button (Left) */}
            <button
              onClick={fetchCustomerOrders}
              className="h-11 px-3.5 sm:px-4 rounded-2xl bg-white dark:bg-white/10 border border-slate-200/90 dark:border-white/15 hover:border-primary/50 text-text-primary font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
            >
              <RefreshCw size={14} className={`text-primary ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline sm:inline">Refresh</span>
            </button>

            {/* Search Input (Middle / Center flex-1) */}
            <div className="relative flex-1 min-w-0">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders, dishes, or stores..."
                className="w-full h-11 pl-10 pr-9 rounded-2xl bg-white dark:bg-white/10 border border-slate-200/90 dark:border-white/15 focus:border-primary focus:ring-2 focus:ring-primary/20 text-text-primary placeholder:text-text-muted text-xs sm:text-sm font-semibold focus:outline-none transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 rounded-full transition-colors cursor-pointer bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20"
                  title="Clear search query"
                  aria-label="Clear search query"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort Selector Button (Right) */}
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
              className="h-11 px-3.5 sm:px-4 rounded-2xl bg-white dark:bg-white/10 border border-slate-200/90 dark:border-white/15 hover:border-primary/50 text-text-primary text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95 group shrink-0 whitespace-nowrap"
              title="Click to toggle order sorting"
            >
              <Calendar size={15} className="text-primary group-hover:scale-110 transition-transform shrink-0" />
              <span className="hidden sm:inline text-text-muted font-bold">Sort:</span>
              <span className="text-primary font-black">{sortOrder === 'NEWEST' ? 'Newest' : 'Oldest'}</span>
              <ArrowUpDown size={13} className="text-primary shrink-0 group-hover:rotate-180 transition-transform duration-300 ml-0.5" />
            </button>
          </div>

          {/* Active vs Past Order Tabs */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-2.5 w-full">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'ACTIVE'
                ? 'bg-primary text-black font-black shadow-md'
                : 'bg-transparent border border-slate-300/80 dark:border-white/15 text-text-secondary hover:text-text-primary hover:bg-slate-100/50 dark:hover:bg-white/5'
                }`}
            >
              <Clock size={15} />
              <span>Live Orders ({activeOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'HISTORY'
                ? 'bg-primary text-black font-black shadow-md'
                : 'bg-transparent border border-slate-300/80 dark:border-white/15 text-text-secondary hover:text-text-primary hover:bg-slate-100/50 dark:hover:bg-white/5'
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
              {displayedOrders.map((order, idx) => {
                const orderId = order.orderId || order.id || `ORD-${idx}`;
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
                const statusUpper = (order.status || order.orderStatus || '').toUpperCase();
                const isCompleted = statusUpper === 'DELIVERED' || statusUpper === 'COMPLETED' || activeTab === 'HISTORY';

                return (
                  <motion.div
                    key={orderId}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-bg-card border border-slate-200/90 dark:border-white/10 hover:border-emerald-500/40 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                  >
                    {/* ACCORDION CLICKABLE HEADER */}
                    <div
                      onClick={() => toggleOrderExpand(orderId)}
                      className="space-y-2.5 cursor-pointer select-none"
                    >
                      {/* ROW 1: Store Name & Icon + Status Badge */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                            <Store size={18} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-black text-text-primary truncate leading-snug">
                              {restaurantDisplayName}
                            </h3>
                            <span className="text-[11px] font-bold text-text-muted block mt-0.5">
                              {formattedDate}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {getStatusBadge(order.status)}
                        </div>
                      </div>

                      {/* ROW 2: ORDER ID (Strict Single Line) + View Details Toggle Button */}
                      <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 px-2.5 py-1 rounded-lg tracking-wider whitespace-nowrap shrink-0">
                            #{orderId}
                          </span>
                          {order.isMultiVendor && (
                            <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-md whitespace-nowrap">
                              🔀 Multi-Vendor
                            </span>
                          )}
                        </div>

                        <div className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all duration-200 flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95 ${
                          isExpanded
                            ? 'bg-slate-800 text-white dark:bg-slate-700 border border-slate-700 dark:border-slate-600 shadow-sm'
                            : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200 dark:border-white/15 text-text-primary'
                        }`}>
                          <Eye size={13} className={isExpanded ? 'text-slate-300' : 'text-text-muted'} />
                          <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                          <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-slate-300' : 'text-text-muted'}`} />
                        </div>
                      </div>

                      {/* ROW 3: Item Quantity (Left) & Total Price (Right) */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-xs font-extrabold text-text-muted">
                          {itemsList.length} {itemsList.length === 1 ? 'item' : 'items'} ordered
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-text-muted">Total:</span>
                          <span className="text-base sm:text-lg font-black text-text-primary font-mono tracking-tight">
                            ₹{orderTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {order.cancellationNotice && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-extrabold flex items-center gap-2">
                          <AlertTriangle size={15} className="shrink-0 text-rose-500" />
                          <span>{order.cancellationNotice}</span>
                        </div>
                      )}

                      {order.deliveryAddress && !isExpanded && (
                        <p className="text-xs text-text-secondary truncate font-medium pt-0.5 flex items-center gap-1.5 min-w-0">
                          <MapPin size={13} className="text-emerald-500 shrink-0" />
                          <span className="truncate">{order.deliveryAddress}</span>
                        </p>
                      )}
                    </div>

                    {/* ACCORDION EXPANDED BODY DETAILS */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-4 pt-3 border-t border-slate-200/80 dark:border-white/10 overflow-hidden"
                        >
                          {/* VISUAL DELIVERY TRANSIT PROGRESS STEPPER */}
                          <DeliveryTransitVisualTracker
                            status={order.status}
                            riderName={order.assignedRider || order.deliveryPartnerName}
                            riderPhone={order.deliveryPartnerPhone}
                            deliveryPin={order.deliveryPin || order.deliveryOtp}
                          />

                          {/* Delivery Address */}
                          {order.deliveryAddress && (
                            <p className="text-xs text-text-secondary flex items-start gap-1.5 pt-0.5">
                              <MapPin size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                              <span className="font-medium">{order.deliveryAddress}</span>
                            </p>
                          )}

                          {/* Ordered Items Full Breakdown */}
                          <div className="space-y-3 pt-1">
                            <div className="flex items-center gap-2 pb-0.5">
                              <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                                <Utensils size={14} />
                              </div>
                              <h4 className="text-xs sm:text-sm font-black text-text-primary uppercase tracking-wider">
                                ORDERED FOOD ITEMS ({itemsList.length})
                              </h4>
                            </div>

                            {itemsList.length === 0 ? (
                              <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-text-muted italic">
                                Item details saved in database order record #{orderId}.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {itemsList.map((item: any, idx: number) => {
                                  const itemName = item.foodName || item.name || 'Food Item';
                                  const itemQty = Number(item.quantity || 1);
                                  const itemPrice = Number(item.price || 0);
                                  const itemTotal = itemPrice * itemQty;
                                  const targetId = item.id || item.menuItemId || item.itemId;
                                  const targetName = (itemName || '').toLowerCase().trim();
                                  const liveDish = liveDishesMap[targetId] || liveDishesMap[targetName];
                                  const itemImage = (liveDish && liveDish.image && !liveDish.image.includes('photo-1546069901-ba9599a7e63c'))
                                    ? liveDish.image
                                    : (item.image || item.foodImage || liveDish?.image || '');
                                  const variantLabel = getItemVariantLabel(item);

                                  return (
                                    <div
                                      key={item.id || item.menuItemId || `item-${idx}`}
                                      className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 dark:bg-bg-cardSec/90 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-all shadow-xs backdrop-blur-md"
                                    >
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <ItemImageOrIcon
                                          image={itemImage}
                                          name={itemName}
                                          category={item.category || liveDish?.category}
                                          isVeg={item.isVeg}
                                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0 bg-bg-dark shadow-xs"
                                          containerClassName="w-14 h-14 rounded-xl border border-slate-200 dark:border-white/10 shrink-0 bg-bg-dark shadow-xs"
                                          iconSize={18}
                                          showCategoryLabel={false}
                                        />
                                        <div className="min-w-0 space-y-1.5 flex-1">
                                          <h4 className="text-xs sm:text-sm font-black text-text-primary truncate">
                                            {itemName}
                                          </h4>
                                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-black text-[11px] font-mono shadow-xs">
                                              QTY: {itemQty}
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-lg bg-slate-200/80 dark:bg-white/10 text-text-primary border border-slate-300/80 dark:border-white/15 font-extrabold text-[11px] flex items-center gap-1">
                                              <Package size={11} className="shrink-0 text-emerald-500" />
                                              <span>{variantLabel}</span>
                                            </span>
                                            {itemQty > 1 && (
                                              <span className="text-text-muted font-bold text-[11px]">
                                                • ₹{Number.isInteger(itemPrice) ? itemPrice : itemPrice.toFixed(2)} each
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className="text-base sm:text-lg font-black text-text-primary font-mono block tracking-tight">
                                          ₹{Number.isInteger(itemTotal) ? itemTotal : itemTotal.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Footer Info & Pricing Summary Card & Action Buttons */}
                          <div className="pt-3">
                            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 dark:bg-bg-cardSec/90 border border-slate-200/80 dark:border-white/10 space-y-3 shadow-xs backdrop-blur-md">
                              {/* TOP ROW: Grand Total (Left) & Payment Mode (Right) */}
                              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
                                <div>
                                  <span className="text-text-muted block text-[10px] uppercase font-black tracking-wider">Grand Total</span>
                                  <span className="text-2xl sm:text-3xl font-black text-text-primary font-mono tracking-tight">
                                    ₹{orderTotal.toFixed(2)}
                                  </span>
                                </div>

                                <div className="text-center flex flex-col items-center justify-center">
                                  <span className="text-text-muted block text-[10px] uppercase font-black tracking-wider text-center">Payment Mode</span>
                                  <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-[11px] inline-flex items-center justify-center gap-1.5 mt-1 shadow-xs text-center">
                                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                    <span>{formatPaymentMethod(order.paymentMethod)}</span>
                                  </span>
                                </div>
                              </div>

                              {/* BOTTOM ROW: Equal-sized Cancel Order & Reorder Action Buttons */}
                              <div className="flex items-center gap-2.5 pt-1 w-full">
                                {/* Customer Cancel Order Button / Locked Badge */}
                                {!isCompleted && !['CANCELLED', 'REJECTED', 'REJECT'].includes((order.status || '').toUpperCase()) && (
                                  isOrderCancellableByCustomer(order) ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancelError(null);
                                        setCancelModalOrder(order);
                                      }}
                                      className="flex-1 h-11 px-2 sm:px-4 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap min-w-0"
                                    >
                                      <XCircle size={15} className="shrink-0" />
                                      <span className="whitespace-nowrap">CANCEL ORDER</span>
                                    </button>
                                  ) : (
                                    <div className="flex-1 h-11 px-2 sm:px-4 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0" title="Order accepted by store - cancellation is locked">
                                      <Lock size={14} className="text-amber-500 shrink-0" />
                                      <span className="whitespace-nowrap">Accepted by Store</span>
                                    </div>
                                  )
                                )}

                                {/* Rate & Review Button for Completed/Delivered Orders */}
                                {isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReviewModalOrder(order);
                                      setSelectedRating(order.rating || 0);
                                      setFeedbackText(order.feedback || order.reviewText || '');
                                    }}
                                    className={`flex-1 h-11 px-2 sm:px-4 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap min-w-0 ${
                                      order.rating
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                        : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/25'
                                    }`}
                                  >
                                    <Star size={15} className={`shrink-0 ${order.rating ? 'fill-emerald-500 text-emerald-500' : 'fill-blue-500 text-blue-500'}`} />
                                    <span className="whitespace-nowrap">{order.rating ? `RATED ${order.rating}★` : 'RATE ORDER'}</span>
                                  </button>
                                )}

                                <button
                                   disabled={reorderLoadingId === (order.id || order.orderId)}
                                   onClick={() => handleReorder(order)}
                                   className="flex-1 h-11 px-2 sm:px-4 rounded-xl bg-[#B87B4B]/15 text-[#B87B4B] dark:text-[#D4986A] border border-[#B87B4B]/30 hover:bg-[#B87B4B]/25 font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 whitespace-nowrap min-w-0"
                                 >
                                   <RefreshCw size={15} className={`shrink-0 text-[#B87B4B] dark:text-[#D4986A] ${reorderLoadingId === (order.id || order.orderId) ? 'animate-spin' : ''}`} />
                                   <span className="whitespace-nowrap">{reorderLoadingId === (order.id || order.orderId) ? 'Checking...' : 'REORDER'}</span>
                                 </button>
                              </div>
                            </div>
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

      {/* RATING & REVIEW MODAL */}
      <AnimatePresence>
        {reviewModalOrder && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewModalOrder(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-md bg-[#FAF5EE] dark:bg-bg-card border border-[#E8DEC9] dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-left my-auto text-slate-800 dark:text-text-primary"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E8DEC9] dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#FCE8BD] border border-[#F5D48B] flex items-center justify-center text-amber-500 shadow-xs shrink-0">
                    <Star size={24} className="fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black font-display text-slate-900 dark:text-text-primary leading-tight">
                      Rate & Review Order
                    </h3>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-text-muted mt-0.5 block">
                      #{reviewModalOrder.id || reviewModalOrder.orderId}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewModalOrder(null)}
                  className="w-10 h-10 rounded-2xl bg-[#EFE6D8] dark:bg-white/10 text-slate-600 dark:text-text-muted hover:text-slate-900 hover:bg-[#E2D6C3] transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                  title="Close"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Star Rating Selection */}
              <div className="space-y-3 text-center pt-1">
                <label className="text-xs font-black text-slate-500 dark:text-text-muted uppercase tracking-wider block">
                  HOW WAS YOUR EXPERIENCE?
                </label>
                <div className="flex items-center justify-center gap-2.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(star)}
                      className="p-1 transition-all duration-200 hover:scale-125 cursor-pointer active:scale-95"
                    >
                      <Star
                        size={38}
                        className={star <= selectedRating ? 'fill-[#FBBC04] text-[#FBBC04] drop-shadow-md scale-110' : 'text-slate-300 dark:text-slate-700 hover:text-amber-300'}
                      />
                    </button>
                  ))}
                </div>
                <div className="pt-1">
                  {selectedRating > 0 && (
                    <span className="text-sm font-black text-[#E37400] dark:text-amber-400 block font-display">
                      {selectedRating === 5 && 'Excellent! Loved it!'}
                      {selectedRating === 4 && 'Very Good!'}
                      {selectedRating === 3 && 'Good'}
                      {selectedRating === 2 && 'Average'}
                      {selectedRating === 1 && 'Poor'}
                    </span>
                  )}
                </div>
              </div>

              {/* Feedback Text Input */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 dark:text-text-primary flex items-center gap-2">
                  <MessageSquare size={15} className="text-[#B87B4B]" />
                  <span>Write your feedback / review (optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share details about the food quality, taste, packaging, or delivery..."
                  className="w-full p-3.5 rounded-2xl bg-white dark:bg-white/5 border border-[#E0D4BE] dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-text-primary placeholder:text-slate-400 dark:placeholder:text-text-muted/60 outline-none focus:border-[#B87B4B] focus:ring-2 focus:ring-[#B87B4B]/20 transition-all font-medium resize-none shadow-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOrder(null)}
                  className="flex-1 h-12 rounded-2xl bg-[#EFE6D8] dark:bg-white/10 hover:bg-[#E2D6C3] dark:hover:bg-white/20 text-slate-700 dark:text-text-primary font-black text-xs uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  disabled={submittingReview || selectedRating === 0}
                  onClick={async () => {
                    if (!reviewModalOrder || selectedRating === 0) return;
                    const targetOrderId = reviewModalOrder.id || reviewModalOrder.orderId;
                    setSubmittingReview(true);
                    try {
                      const response = await axios.post(`${API_BASE_URL}/orders/${targetOrderId}/review`, {
                        rating: selectedRating,
                        feedback: feedbackText,
                        reviewText: feedbackText,
                        customerName: user?.name || reviewModalOrder.customer?.name || reviewModalOrder.customerName || 'Valued Patron'
                      });

                      if (response.data && response.data.success) {
                        setOrders(prev => prev.map(o => {
                          if ((o.id || o.orderId) === targetOrderId) {
                            return { ...o, rating: selectedRating, feedback: feedbackText, reviewText: feedbackText };
                          }
                          return o;
                        }));
                        setReviewSuccessToast('Thank you! Your rating and review have been saved to database.');
                        setTimeout(() => setReviewSuccessToast(null), 4000);
                        setReviewModalOrder(null);
                        setFeedbackText('');
                      }
                    } catch (err) {
                      console.error('Error submitting review:', err);
                    } finally {
                      setSubmittingReview(false);
                    }
                  }}
                  className="flex-[1.4] h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {submittingReview ? <RefreshCw size={16} className="animate-spin" /> : <Star size={16} className="fill-white text-white" />}
                  <span>{submittingReview ? 'SAVING...' : 'SUBMIT'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS TOAST BANNER */}
      <AnimatePresence>
        {reviewSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 right-4 sm:right-8 z-[99999] max-w-md w-full p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
              <span>{reviewSuccessToast}</span>
            </div>
            <button onClick={() => setReviewSuccessToast(null)} className="text-text-muted hover:text-text-primary p-1 cursor-pointer">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      <AnimatePresence>
        {cancelModalOrder && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!cancelLoading) setCancelModalOrder(null);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-md bg-bg-darkSec border border-glass rounded-3xl p-6 shadow-2xl space-y-5 text-left my-auto"
            >
              <div className="flex items-center justify-between border-b border-glass pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500">
                    <XCircle size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black font-display text-text-primary">
                      Cancel Order?
                    </h3>
                    <p className="text-[11px] text-text-muted font-mono">
                      #{cancelModalOrder.id || cancelModalOrder.orderId}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={() => setCancelModalOrder(null)}
                  className="p-2 rounded-xl bg-glass border border-glass text-text-muted hover:text-text-primary cursor-pointer disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Policy Explanation Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-500 uppercase tracking-wider">
                  <Info size={15} />
                  <span>Cancellation Policy</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed font-medium">
                  You can cancel your order <strong className="text-amber-400 font-bold">only until the store accepts it</strong>. Once accepted by the store, cancellation is locked.
                </p>
              </div>

              {cancelError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span>{cancelError}</span>
                </div>
              )}

              <p className="text-xs text-text-muted font-medium">
                Are you sure you want to cancel order <strong className="text-text-primary">#{cancelModalOrder.id || cancelModalOrder.orderId}</strong>?
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={() => setCancelModalOrder(null)}
                  className="flex-1 py-3 rounded-xl bg-glass border border-glass text-text-muted font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  No, Keep Order
                </button>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={handleConfirmCancelOrder}
                  className="flex-[1.5] py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {cancelLoading ? <RefreshCw size={16} className="animate-spin" /> : <XCircle size={16} />}
                  <span>{cancelLoading ? 'Cancelling...' : 'Yes, Cancel Order'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CustomerOrdersPage;
