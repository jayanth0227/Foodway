import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ShoppingBag, Clock, CheckCircle2, Package, MapPin, ArrowLeft, RefreshCw, AlertCircle, Utensils, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../utils/api';
import socketService from '../services/socket.service';
import { MobileOrderCardSkeleton } from '../components/common/MobileSkeletonLoader';

export const CustomerOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { t } = useLanguage();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  useEffect(() => {
    if (user) {
      fetchCustomerOrders();
      const custId = user.id || user.email;
      socketService.joinCustomer(custId);

      const unsubscribeStatus = socketService.onOrderStatusUpdated((updatedOrder: any) => {
        console.log('⚡ [Socket Event: ORDER_STATUS_UPDATED]:', updatedOrder);
        const targetId = updatedOrder.orderId || updatedOrder.id;
        const newStatus = updatedOrder.status || updatedOrder.orderStatus;
        setOrders(prev => prev.map(o => (o.orderId === targetId || o.id === targetId) ? { ...o, status: newStatus } : o));
      });

      const unsubscribeRider = socketService.onRiderStatusUpdated((updatedOrder: any) => {
        console.log('⚡ [Socket Event: RIDER_STATUS_UPDATED]:', updatedOrder);
        const targetId = updatedOrder.orderId || updatedOrder.id;
        const newStatus = updatedOrder.status || updatedOrder.orderStatus;
        setOrders(prev => prev.map(o => (o.orderId === targetId || o.id === targetId) ? { ...o, status: newStatus } : o));
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

  const getStatusBadge = (status: string) => {
    const s = (status || 'PENDING').toUpperCase();
    switch (s) {
      case 'PENDING':
        return <span className="h-10 px-3.5 rounded-2xl text-xs font-black bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center gap-1.5 whitespace-nowrap w-full"><Clock size={14} /> Order Placed & Pending</span>;
      case 'ACCEPTED':
      case 'CONFIRMED':
        return <span className="h-10 px-3.5 rounded-2xl text-xs font-black bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center gap-1.5 whitespace-nowrap w-full"><CheckCircle2 size={14} /> Order Accepted</span>;
      case 'PREPARING':
        return <span className="h-10 px-3.5 rounded-2xl text-xs font-black bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center gap-1.5 whitespace-nowrap w-full"><Utensils size={14} /> Kitchen Preparing</span>;
      case 'READY':
        return <span className="h-10 px-3.5 rounded-2xl text-xs font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 whitespace-nowrap w-full"><Package size={14} /> Food Ready for Pickup</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="h-10 px-3.5 rounded-2xl text-xs font-black bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center gap-1.5 whitespace-nowrap w-full"><Package size={14} /> Out for Delivery</span>;
      case 'REJECTED':
      case 'REJECT':
      case 'CANCELLED':
        return <span className="h-10 px-3.5 rounded-2xl text-xs font-black bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center gap-1.5 whitespace-nowrap w-full"><AlertCircle size={14} /> Order Rejected</span>;
      case 'DELIVERED':
      case 'COMPLETED':
        return <span className="h-10 px-3.5 rounded-2xl text-xs font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 whitespace-nowrap w-full"><CheckCircle2 size={14} /> Delivered & Completed</span>;
      default:
        return <span className="h-10 px-3.5 rounded-2xl text-xs font-black bg-glass text-text-muted border border-glass flex items-center justify-center whitespace-nowrap w-full">{status}</span>;
    }
  };

  const isOrderFinished = (statusStr: string) => {
    const s = (statusStr || '').toUpperCase();
    return ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'REJECT'].includes(s);
  };

  const activeOrders = orders.filter(o => !isOrderFinished(o.status || (o as any).orderStatus));
  const pastOrders = orders.filter(o => isOrderFinished(o.status || (o as any).orderStatus));
  const displayedOrders = activeTab === 'ACTIVE' ? activeOrders : pastOrders;

  const handleReorder = (order: any) => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        addToCart({
          id: item.menuItemId || item.id,
          name: item.foodName || item.name,
          description: '',
          price: Number(item.price),
          category: 'Main Course',
          image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
          type: 'non-veg',
          isVeg: true,
          isAvailable: true,
          rating: 4.8
        });
      });
      navigate('/cart');
    }
  };

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

                const rawResName = order.restaurantName || order.restaurantId || '';
                const restaurantDisplayName = (!rawResName || rawResName.includes('RES_') || rawResName === 'RES_DEFAULT')
                  ? 'Likhith foods'
                  : rawResName;
                const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : 'Recently';

                return (
                  <motion.div
                    key={orderId}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel border border-glass hover:border-primary/40 rounded-3xl p-6 space-y-5 shadow-luxury transition-all"
                  >
                    {/* Card Top Header & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-black text-primary">{orderId}</span>
                          <span className="text-xs text-text-muted font-medium">• {formattedDate}</span>

                          {/* Restaurant Name Badge */}
                          <div className="flex items-center gap-1.5 text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/25">
                            <Store size={13} className="shrink-0" />
                            <span>{restaurantDisplayName}</span>
                          </div>
                        </div>

                        {order.deliveryAddress && (
                          <p className="text-xs text-text-secondary flex items-center gap-1.5">
                            <MapPin size={13} className="text-primary shrink-0" />
                            <span className="font-medium">{order.deliveryAddress}</span>
                          </p>
                        )}
                      </div>

                      {/* DESKTOP VIEW: Full Width Status Badge */}
                      <div className="hidden sm:block shrink-0">{getStatusBadge(order.status)}</div>

                      {/* MOBILE VIEW: Status Badge & Reorder Side-by-Side with Equal Height */}
                      <div className="sm:hidden flex items-center justify-between gap-2.5 w-full">
                        <div className="flex-1 min-w-0 flex items-center h-10">{getStatusBadge(order.status)}</div>
                        <button
                          onClick={() => handleReorder(order)}
                          className="h-10 px-4 rounded-2xl bg-primary text-black hover:bg-primary/90 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0 focus:outline-none focus:ring-0 active:bg-primary-dark"
                        >
                          <RefreshCw size={13} />
                          <span>REORDER</span>
                        </button>
                      </div>
                    </div>

                    {/* Ordered Items Full Breakdown */}
                    <div className="space-y-3">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {itemsList.map((item: any, idx: number) => {
                            const itemName = item.foodName || item.name || 'Food Item';
                            const itemQty = Number(item.quantity || 1);
                            const itemPrice = Number(item.price || 0);
                            const itemTotal = itemPrice * itemQty;
                            const itemImage = item.image || item.foodImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300';

                            return (
                              <div
                                key={idx}
                                className="p-3 rounded-2xl bg-glass/60 border border-glass flex items-center justify-between gap-3 hover:border-primary/30 transition-all shadow-sm"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <img
                                    src={itemImage}
                                    alt={itemName}
                                    className="w-12 h-12 rounded-xl object-cover border border-glass shrink-0 bg-bg-dark"
                                  />
                                  <div className="min-w-0 space-y-0.5">
                                    <h4 className="text-xs font-extrabold text-text-primary truncate">
                                      {itemName}
                                    </h4>
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary font-black">
                                        x{itemQty}
                                      </span>
                                      <span className="text-text-muted font-medium">
                                        ₹{itemPrice.toFixed(2)} each
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-xs font-black text-text-primary font-display block">
                                    ₹{itemTotal.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer Info & Total Pricing */}
                    <div className="pt-4 border-t border-glass flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center justify-between sm:justify-start gap-4 text-xs font-semibold w-full sm:w-auto">
                        <div>
                          <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider">Grand Total</span>
                          <span className="text-lg sm:text-xl font-black text-text-primary font-display">
                            ₹{Number(order.totalAmount || 0).toFixed(2)}
                          </span>
                        </div>

                        <div className="h-8 w-px bg-glass hidden sm:block" />

                        <div className="text-right sm:text-left">
                          <span className="text-text-muted block text-[10px] uppercase font-bold tracking-wider">Payment Mode</span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] inline-block mt-0.5 uppercase">
                            {order.paymentMethod || 'Cash on Delivery (COD)'}
                          </span>
                        </div>
                      </div>

                      {/* DESKTOP ONLY: Reorder All Items Button */}
                      <button
                        onClick={() => handleReorder(order)}
                        className="hidden sm:flex px-5 py-2.5 rounded-xl bg-primary text-black hover:bg-primary/90 font-black text-xs uppercase tracking-wider transition-all items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-105 focus:outline-none focus:ring-0"
                      >
                        <RefreshCw size={14} />
                        <span>Reorder All Items</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default CustomerOrdersPage;
