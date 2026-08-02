import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bike,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Store,
  RefreshCw,
  LogOut,
  Navigation,
  DollarSign,
  ShieldCheck,
  User,
  Sun,
  Moon,
  X
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../utils/api';

export const DeliveryDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isOnDuty, setIsOnDuty] = useState<boolean>(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchAssignedOrders = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const partnerId = encodeURIComponent(user.name || user.email || user.id);
      const res = await axios.get(`${API_BASE_URL}/delivery-partner/orders/${partnerId}`);
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.warn('Error fetching assigned orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAssignedOrders();
    const interval = setInterval(fetchAssignedOrders, 15000); // Auto refresh every 15s
    return () => clearInterval(interval);
  }, [fetchAssignedOrders]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await axios.put(`${API_BASE_URL}/delivery-partner/orders/${orderId}/status`, { status: newStatus });
      
      // Update local state
      setOrders(prev => prev.map(o => {
        if (o.id === orderId || o.orderId === orderId) {
          return { ...o, orderStatus: newStatus, status: newStatus };
        }
        return o;
      }));

      setActionSuccess(`Order #${orderId} status updated to ${newStatus.toUpperCase()}!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error('Error updating order status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const activeOrders = orders.filter(o => {
    const st = (o.orderStatus || o.status || '').toLowerCase();
    return st !== 'delivered' && st !== 'completed' && st !== 'cancelled' && st !== 'rejected';
  });

  const completedOrders = orders.filter(o => {
    const st = (o.orderStatus || o.status || '').toLowerCase();
    return st === 'delivered' || st === 'completed';
  });

  const totalEarnings = completedOrders.reduce((sum, o) => sum + (o.total || 0) * 0.15 + 40, 0); // Mock earnings per order

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto pb-28 sm:pb-8 font-sans animate-fadeIn">
      <Helmet>
        <title>Delivery Partner Console | MK Delivery Service</title>
      </Helmet>

      {/* Top Header Navigation */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-bg-darkSec border border-glass shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-inner">
            <Bike size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black font-display text-white tracking-tight">
                {user?.name || 'Delivery Partner'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                Active Fleet
              </span>
            </div>
            <p className="text-xs text-text-muted font-medium">
              ID: {user?.id || 'DEL-ONLINE'} • {user?.email}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Duty Toggle */}
          <button
            onClick={() => setIsOnDuty(!isOnDuty)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-2 transition-all cursor-pointer ${
              isOnDuty
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isOnDuty ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span>{isOnDuty ? 'ON DUTY' : 'OFF DUTY'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchAssignedOrders}
            className="p-2.5 rounded-xl border border-glass bg-glass hover:bg-glass-subtle text-text-secondary transition-all shadow-sm cursor-pointer"
            title="Refresh assigned orders"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin text-primary' : ''} />
          </button>

          {/* Logout */}
          <button
            onClick={() => { logout(); navigate('/delivery/login'); }}
            className="px-3.5 py-2 rounded-xl border border-glass bg-glass hover:bg-rose-500/20 hover:border-rose-500/40 text-text-secondary hover:text-rose-300 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Action Notification Toast */}
      {actionSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black flex items-center gap-2.5 shadow-lg"
        >
          <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </motion.div>
      )}

      {/* Stats Overview Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-bg-darkSec border border-glass space-y-1">
          <div className="flex items-center justify-between text-text-muted text-[10px] uppercase font-bold tracking-wider">
            <span>Total Assigned</span>
            <Package size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-black font-display text-white">{orders.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-bg-darkSec border border-glass space-y-1">
          <div className="flex items-center justify-between text-text-muted text-[10px] uppercase font-bold tracking-wider">
            <span>Active Deliveries</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black font-display text-amber-400">{activeOrders.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-bg-darkSec border border-glass space-y-1">
          <div className="flex items-center justify-between text-text-muted text-[10px] uppercase font-bold tracking-wider">
            <span>Completed</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black font-display text-emerald-400">{completedOrders.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-bg-darkSec border border-glass space-y-1">
          <div className="flex items-center justify-between text-text-muted text-[10px] uppercase font-bold tracking-wider">
            <span>Partner Earnings</span>
            <DollarSign size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-black font-display text-primary">₹{totalEarnings.toFixed(2)}</p>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex items-center gap-2 border-b border-glass pb-3">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'ACTIVE'
              ? 'bg-primary text-black shadow-lg shadow-primary/20'
              : 'bg-glass text-text-muted hover:text-text-primary border border-glass'
          }`}
        >
          <Clock size={16} />
          <span>Active Tasks ({activeOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'COMPLETED'
              ? 'bg-primary text-black shadow-lg shadow-primary/20'
              : 'bg-glass text-text-muted hover:text-text-primary border border-glass'
          }`}
        >
          <CheckCircle2 size={16} />
          <span>History ({completedOrders.length})</span>
        </button>
      </div>

      {/* Main Task List */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-bg-darkSec border border-glass space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-text-muted">Loading assigned order manifests...</p>
        </div>
      ) : activeTab === 'ACTIVE' ? (
        activeOrders.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-bg-darkSec border border-glass space-y-3">
            <Bike size={44} className="mx-auto text-text-muted/40" />
            <h3 className="text-base font-black text-white">No Active Deliveries Assigned</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              You currently have no active deliveries. When Admin assigns an order to you, it will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeOrders.map((order) => {
              const currentStatus = (order.orderStatus || order.status || 'Pending').toLowerCase();
              const isUpdating = updatingOrderId === (order.id || order.orderId);

              return (
                <motion.div
                  key={order.id || order.orderId}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-3xl bg-bg-darkSec border border-glass shadow-xl space-y-5 hover:border-primary/30 transition-all relative overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-glass/40 pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-primary tracking-widest block">
                        Assigned Delivery Task
                      </span>
                      <h3 className="text-lg font-black font-mono text-white">
                        #{order.id || order.orderId}
                      </h3>
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase border ${
                      currentStatus === 'picked up' || currentStatus === 'in_transit'
                        ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    }`}>
                      {order.orderStatus || order.status || 'Assigned'}
                    </span>
                  </div>

                  {/* Pickup & Dropoff Addresses Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pickup Address */}
                    <div className="p-3.5 rounded-2xl bg-bg-dark/60 border border-glass/30 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wider">
                        <Store size={15} />
                        <span>Pickup Location</span>
                      </div>
                      <p className="text-xs font-bold text-white">
                        {order.restaurant || 'Gourmet Kitchen'}
                      </p>
                      <p className="text-[11px] text-text-muted leading-snug">
                        {order.restaurantAddress || 'Main Food Hub, Sector 4'}
                      </p>
                    </div>

                    {/* Delivery Address */}
                    <div className="p-3.5 rounded-2xl bg-bg-dark/60 border border-glass/30 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase tracking-wider">
                        <MapPin size={15} />
                        <span>Customer Address</span>
                      </div>
                      <p className="text-xs font-bold text-white">
                        {order.customer?.name || 'Valued Customer'}
                      </p>
                      <p className="text-[11px] text-text-muted leading-snug">
                        {order.customer?.address || 'Flat 302, Landmark Residency'}
                      </p>
                    </div>
                  </div>

                  {/* Contact Action Buttons */}
                  <div className="flex items-center gap-3">
                    {order.customer?.phone && (
                      <a
                        href={`tel:${order.customer.phone}`}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-glass border border-glass hover:bg-glass-subtle text-text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Phone size={14} className="text-emerald-400" />
                        <span>Call Customer ({order.customer.phone})</span>
                      </a>
                    )}

                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(order.customer?.address || order.restaurant || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-glass border border-glass hover:bg-glass-subtle text-text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0"
                      title="Open Navigation"
                    >
                      <Navigation size={14} className="text-primary" />
                      <span>Map</span>
                    </a>
                  </div>

                  {/* Ordered Items Breakdown */}
                  <div className="p-3.5 rounded-2xl bg-bg-dark/40 border border-glass/20 space-y-2">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                      Manifest Items:
                    </span>
                    <div className="space-y-1 text-xs text-text-secondary">
                      {Array.isArray(order.items) && order.items.length > 0 ? (
                        order.items.map((it: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center font-medium">
                            <span>• {it.foodName || it.name || 'Food Item'}</span>
                            <span className="text-primary font-bold">x{it.quantity || 1}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-text-muted italic">Standard Meal Order</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-glass/30 flex justify-between items-center text-xs font-black">
                      <span>Total Amount:</span>
                      <span className="text-primary font-display text-sm">₹{(order.total || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Live Progression Action Button */}
                  <div className="pt-2">
                    {currentStatus === 'picked up' || currentStatus === 'in_transit' || currentStatus === 'out for delivery' || currentStatus === 'out_for_delivery' ? (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id || order.orderId, 'Delivered')}
                        disabled={isUpdating}
                        className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={18} />
                            <span>Complete Delivery to Customer</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id || order.orderId, 'Out for Delivery')}
                        disabled={isUpdating}
                        className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 dark:bg-primary text-black font-extrabold text-xs uppercase tracking-wider shadow-lg hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <>
                            <Bike size={18} />
                            <span>Accept Order & Start Delivery</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        /* Completed History Tab */
        completedOrders.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-bg-darkSec border border-glass space-y-3">
            <CheckCircle2 size={44} className="mx-auto text-text-muted/40" />
            <h3 className="text-base font-black text-white">No Completed Deliveries Yet</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Deliveries marked as completed will be recorded in your permanent activity history.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {completedOrders.map((order) => (
              <div
                key={order.id || order.orderId}
                className="p-5 rounded-2xl bg-bg-darkSec border border-glass flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">#{order.id || order.orderId}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                      Delivered
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white">
                    {order.customer?.name || 'Customer'} • {order.restaurant}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Address: {order.customer?.address || 'N/A'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-text-muted uppercase block">Amount:</span>
                  <span className="text-base font-black font-display text-primary">₹{(order.total || 0).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
      {/* Delivery Partner Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-bg-darkSec/95 border-t border-slate-200 dark:border-glass backdrop-blur-xl px-2 py-2 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => { setActiveTab('ACTIVE'); setIsProfileModalOpen(false); }}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'ACTIVE' && !isProfileModalOpen ? 'text-amber-600 dark:text-primary font-black' : 'text-slate-500 dark:text-text-muted'
          }`}
        >
          <Bike size={20} />
          <span className="mt-1">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('ACTIVE'); setIsProfileModalOpen(false); }}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer relative ${
            activeTab === 'ACTIVE' && !isProfileModalOpen ? 'text-amber-600 dark:text-primary font-black' : 'text-slate-500 dark:text-text-muted'
          }`}
        >
          <MapPin size={20} />
          <span className="mt-1">Deliveries</span>
          {activeOrders.length > 0 && (
            <span className="absolute top-1 right-2 bg-amber-500 text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {activeOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('COMPLETED'); setIsProfileModalOpen(false); }}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'COMPLETED' && !isProfileModalOpen ? 'text-amber-600 dark:text-primary font-black' : 'text-slate-500 dark:text-text-muted'
          }`}
        >
          <CheckCircle2 size={20} />
          <span className="mt-1">History</span>
        </button>

        <button
          type="button"
          onClick={() => setIsProfileModalOpen(true)}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            isProfileModalOpen ? 'text-amber-600 dark:text-primary font-black' : 'text-slate-500 dark:text-text-muted'
          }`}
        >
          <User size={20} />
          <span className="mt-1">Profile</span>
        </button>
      </nav>

      {/* Delivery Partner Mobile Profile Drawer */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[99990] cursor-pointer"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="sm:hidden fixed bottom-16 left-0 right-0 z-[99991] bg-white dark:bg-bg-darkSec border-t border-slate-200 dark:border-glass rounded-t-3xl p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-glass pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-primary">
                    <Bike size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">{user?.name || 'Delivery Partner'}</h3>
                    <p className="text-xs text-slate-500 dark:text-text-muted font-mono">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="p-1 rounded-lg text-slate-500 dark:text-text-muted"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs font-bold">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-bg-dark/60 border border-slate-200 dark:border-glass flex items-center justify-between">
                  <span className="text-slate-600 dark:text-text-muted uppercase text-[10px]">Duty Status</span>
                  <button
                    type="button"
                    onClick={() => setIsOnDuty(!isOnDuty)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-2 cursor-pointer ${
                      isOnDuty
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span>{isOnDuty ? 'ON DUTY' : 'OFF DUTY'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-bg-dark/60 border border-slate-200 dark:border-glass flex items-center justify-between">
                  <span className="text-slate-600 dark:text-text-muted uppercase text-[10px]">Partner ID</span>
                  <span className="font-mono text-amber-700 dark:text-primary">{user?.id || 'DEL-ONLINE'}</span>
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-glass bg-slate-50 dark:bg-bg-dark/60 text-slate-800 dark:text-white text-left flex items-center justify-between cursor-pointer"
                >
                  <span className="uppercase text-[10px] text-slate-600 dark:text-text-muted">Display Theme</span>
                  <div className="flex items-center gap-2">
                    {theme === 'light' ? <Moon size={16} className="text-slate-700" /> : <Sun size={16} className="text-amber-400" />}
                    <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-center uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
