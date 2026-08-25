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
  Wallet,
  ShieldCheck,
  User,
  Sun,
  Moon,
  X,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../utils/api';
import socketService from '../services/socket.service';
import { DeliveryTransitVisualTracker } from '../components/common/DeliveryTransitVisualTracker';

// Leaflet OpenStreetMap Imports
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet Dynamic View Helper Component
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Leaflet Custom SVG Markers
const createCustomMarkerIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 900;
        font-size: 16px;
      ">
        ${label}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

const partnerIcon = createCustomMarkerIcon('#3B82F6', '🚴‍♂️');
const shopIcon = createCustomMarkerIcon('#B87C44', '🏪');
const customerIcon = createCustomMarkerIcon('#10B981', '📍');

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

  // Delivery Partner Realtime Device Geolocation Coordinates State
  const [partnerCoords, setPartnerCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPartnerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setPartnerCoords({ lat: 16.5000, lng: 80.6400 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setPartnerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setPartnerCoords({ lat: 16.5000, lng: 80.6400 });
    }
  }, []);

  // Leaflet Map Modal States
  const [selectedMapOrder, setSelectedMapOrder] = useState<any | null>(null);
  const [mapTarget, setMapTarget] = useState<'SHOP' | 'CUSTOMER' | 'ROUTE'>('ROUTE');

  // Helper to resolve coordinates
  const getOrderCoordinates = (order: any) => {
    const shopLat = Number(order.restaurantLat || order.shopLat || order.restaurant?.lat || 16.5062);
    const shopLng = Number(order.restaurantLng || order.shopLng || order.restaurant?.lng || 80.6480);

    const custLat = Number(
      order.customer?.lat || order.customerLat || order.lat || 16.5142
    );
    const custLng = Number(
      order.customer?.lng || order.customerLng || order.lng || 80.6575
    );

    const riderLat = partnerCoords?.lat || 16.5000;
    const riderLng = partnerCoords?.lng || 80.6400;

    return { shopLat, shopLng, custLat, custLng, riderLat, riderLng };
  };

  // Distance calculation helper (Haversine formula in Km)
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d.toFixed(2);
  };

  // Helper for variant label resolution
  const getItemVariantLabel = (it: any): string | null => {
    if (!it) return null;
    if (it.variantLabel && typeof it.variantLabel === 'string' && it.variantLabel.trim() !== '') {
      return it.variantLabel.trim();
    }
    const v = it.selectedVariant || it.variant;
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
    if (it.portion) return String(it.portion);
    if (it.portionSize) return String(it.portionSize);
    if (it.unit && it.quantity && String(it.unit).trim() !== '') return `${it.quantity} ${it.unit}`;
    if (it.unit && String(it.unit).trim() !== '') return String(it.unit);
    if (it.size) return String(it.size);
    if (it.weight) return String(it.weight);
    return null;
  };

  // Toggle Duty Status with Backend (Backend automatically broadcasts partner_duty_updated via WebSocket)
  const handleToggleDuty = async (nextDutyState: boolean) => {
    setIsOnDuty(nextDutyState);
    try {
      await axios.put(`${API_BASE_URL}/delivery-partner/duty-status`, {
        userId: user?.id,
        name: user?.name,
        email: user?.email,
        isOnDuty: nextDutyState
      });
    } catch (e) {
      console.warn('Failed to update duty status on backend:', e);
    }
  };

  // Real-Time Incoming Order Popup Modal State
  const [incomingOrderPopup, setIncomingOrderPopup] = useState<any | null>(null);

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

    if (user) {
      socketService.joinDelivery(user.id);

      const handleNewOrderAlert = (newPickupOrder: any) => {
        console.log('⚡ [Socket Event: INSTANT REALTIME ORDER POPUP]:', newPickupOrder);
        
        // Instant update state without refreshing page
        setOrders(prev => [newPickupOrder, ...prev.filter(o => (o.id !== newPickupOrder.id && o.orderId !== newPickupOrder.orderId))]);
        setIncomingOrderPopup(newPickupOrder);

        // Sound alert chime
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => { });
        } catch (e) { }
      };

      const unsubscribePickup = socketService.onOrderReadyForPickup(handleNewOrderAlert);
      const unsubscribeAssigned = socketService.onOrderAssigned(handleNewOrderAlert);

      const unsubscribeStatus = socketService.onOrderStatusUpdated((updatedOrder: any) => {
        const targetId = updatedOrder.orderId || updatedOrder.id;
        const st = (updatedOrder.status || updatedOrder.orderStatus || '').toLowerCase();
        
        if (st === 'ready' || st === 'ready_for_pickup' || st === 'ready for pickup' || st === 'assigned') {
          handleNewOrderAlert(updatedOrder);
        } else {
          setOrders(prev => prev.map(o => (o.orderId === targetId || o.id === targetId) ? { ...o, status: updatedOrder.status, orderStatus: updatedOrder.status } : o));
        }
      });

      const unsubscribeRider = socketService.onRiderStatusUpdated((updatedOrder: any) => {
        const targetId = updatedOrder.orderId || updatedOrder.id;
        setOrders(prev => prev.map(o => (o.orderId === targetId || o.id === targetId) ? { ...o, status: updatedOrder.status, orderStatus: updatedOrder.status } : o));
      });

      return () => {
        unsubscribePickup();
        unsubscribeAssigned();
        unsubscribeStatus();
        unsubscribeRider();
      };
    }
  }, [fetchAssignedOrders, user]);

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

  const totalEarnings = completedOrders.reduce((sum, o) => sum + (o.total || 0) * 0.15 + 40, 0);

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary p-3 sm:p-6 lg:p-8 space-y-5 max-w-5xl mx-auto pb-28 sm:pb-8 font-sans animate-fadeIn">
      <Helmet>
        <title>Delivery Partner Console | MK Delivery Service</title>
      </Helmet>

      {/* TOP RIDER APP BAR & HEADER CARD - Redesigned Mobile-First Layout */}
      <header className="glass-panel border border-glass p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-luxury space-y-4 relative overflow-hidden transition-all bg-gradient-to-br from-bg-darkSec/90 to-bg-dark/95">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Glowing Rider Badge */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-inner">
              <Bike size={26} />
            </div>

            {/* Rider Info Stack */}
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black font-display text-text-primary truncate tracking-tight">
                  {user?.name || 'Delivery Partner'}
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/15 text-primary border border-primary/30">
                  ONLINE
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-text-muted truncate">
                ID: <span className="font-mono text-primary font-bold">{user?.id || 'DEL-ONLINE'}</span> • {user?.email}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-glass border border-glass text-text-secondary hover:text-primary transition-all shadow-sm cursor-pointer"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-amber-400" />}
            </button>

            <button
              type="button"
              onClick={fetchAssignedOrders}
              className="p-2.5 rounded-xl bg-glass border border-glass text-text-secondary hover:text-primary transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Refresh assigned orders"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin text-primary' : ''} />
            </button>
          </div>
        </div>

        {/* Duty Toggle & Quick Status Bar */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-glass/40">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleDuty(!isOnDuty)}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 ${
                isOnDuty
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>{isOnDuty ? 'ON DUTY' : 'OFF DUTY'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => { logout(); navigate('/login'); }}
            className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Action Toast Notification */}
      {actionSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-black flex items-center gap-2.5 shadow-lg"
        >
          <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
          <span>{actionSuccess}</span>
        </motion.div>
      )}

      {/* STATS OVERVIEW CARDS - Grid Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Assigned */}
        <div className="glass-panel border border-glass p-4 rounded-2xl space-y-1.5 transition-all hover:border-primary/30">
          <div className="flex items-center justify-between text-text-muted text-[10px] uppercase font-black tracking-wider">
            <span>Total Assigned</span>
            <div className="w-7 h-7 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Package size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-display text-text-primary tracking-tight">{orders.length}</p>
        </div>

        {/* Active Deliveries */}
        <div className="glass-panel border border-glass p-4 rounded-2xl space-y-1.5 transition-all hover:border-amber-500/30">
          <div className="flex items-center justify-between text-text-muted text-[10px] uppercase font-black tracking-wider">
            <span>Active Tasks</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Clock size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-display text-amber-500 tracking-tight">{activeOrders.length}</p>
        </div>

        {/* Completed */}
        <div className="glass-panel border border-glass p-4 rounded-2xl space-y-1.5 transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between text-text-muted text-[10px] uppercase font-black tracking-wider">
            <span>Completed</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-display text-emerald-500 tracking-tight">{completedOrders.length}</p>
        </div>

        {/* Earnings */}
        <div className="glass-panel border border-glass p-4 rounded-2xl space-y-1.5 transition-all hover:border-primary/30">
          <div className="flex items-center justify-between text-text-muted text-[10px] uppercase font-black tracking-wider">
            <span>Est. Earnings</span>
            <div className="w-7 h-7 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Wallet size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black font-display text-primary tracking-tight">₹{totalEarnings.toFixed(2)}</p>
        </div>
      </div>

      {/* TAB SELECTORS */}
      <div className="flex items-center gap-2 border-b border-glass pb-3">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'ACTIVE'
              ? 'bg-primary text-black font-black shadow-md'
              : 'bg-glass text-text-secondary hover:text-primary border border-glass'
          }`}
        >
          <Clock size={15} />
          <span>Active Tasks ({activeOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'COMPLETED'
              ? 'bg-primary text-black font-black shadow-md'
              : 'bg-glass text-text-secondary hover:text-primary border border-glass'
          }`}
        >
          <CheckCircle2 size={15} />
          <span>History ({completedOrders.length})</span>
        </button>
      </div>

      {/* MAIN TASK LIST SECTION */}
      {loading ? (
        <div className="p-12 text-center glass-panel border border-glass rounded-2xl space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-extrabold text-text-muted">Loading assigned order manifests...</p>
        </div>
      ) : activeTab === 'ACTIVE' ? (
        activeOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center glass-panel border border-glass rounded-2xl space-y-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mx-auto shadow-inner">
              <Bike size={24} />
            </div>
            <h3 className="text-base font-black font-display text-text-primary tracking-tight">
              No Active Deliveries Assigned
            </h3>
            <p className="text-xs font-medium text-text-muted leading-relaxed">
              You currently have no active orders assigned. When an Admin or Restaurant assigns an order to you, it will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {activeOrders.map((order) => {
              const orderId = order.id || order.orderId;
              const currentStatus = (order.orderStatus || order.status || 'Pending').toLowerCase();
              const isUpdating = updatingOrderId === orderId;

              let itemsList: any[] = [];
              if (Array.isArray(order.items)) {
                itemsList = order.items;
              } else if (typeof order.items === 'string' && order.items.trim().startsWith('[')) {
                try {
                  itemsList = JSON.parse(order.items);
                } catch (e) {}
              }

              const customerName = order.customer?.name || order.customerName || 'Valued Customer';
              const customerPhone = order.customer?.phone || order.customerPhone || '';
              const customerAddress = order.customer?.address || order.customerAddress || 'Customer Address';
              const restaurantName = order.restaurant || order.restaurantName || 'Gourmet Kitchen';
              const restaurantAddress = order.restaurantAddress || 'Main Hub Store';
              const totalAmount = Number(order.total || order.totalAmount || 0);

              const isOutForDelivery =
                currentStatus === 'picked up' ||
                currentStatus === 'in_transit' ||
                currentStatus === 'out for delivery' ||
                currentStatus === 'out_for_delivery';

              return (
                <motion.div
                  key={orderId}
                  layout
                  className="glass-panel border border-glass rounded-2xl p-4 sm:p-5 space-y-4 shadow-md hover:border-primary/30 transition-all text-left relative overflow-hidden"
                >
                  {/* CARD HEADER ROW */}
                  <div className="flex items-center justify-between border-b border-glass/40 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-[10px] font-black uppercase text-primary tracking-widest block">
                          Assigned Delivery Task
                        </span>
                        {order.isMultiVendor && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400">
                            🔀 Multi-Vendor Pickup
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-black font-mono text-text-primary tracking-tight">
                        #{orderId}
                      </h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider border shadow-xs ${
                      isOutForDelivery
                        ? 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    }`}>
                      {order.orderStatus || order.status || 'Assigned'}
                    </span>
                  </div>

                  {order.cancellationNotice && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-extrabold flex items-center gap-2">
                      <AlertTriangle size={15} className="shrink-0 text-rose-500" />
                      <span>{order.cancellationNotice}</span>
                    </div>
                  )}

                  {/* VISUAL TRANSIT STATUS STEPPER */}
                  <DeliveryTransitVisualTracker status={order.orderStatus || order.status} />

                  {/* MULTI-VENDOR PICKUP STOPS BREAKDOWN IF MULTI-VENDOR */}
                  {order.isMultiVendor && Array.isArray(order.vendorStatuses) && order.vendorStatuses.length > 0 ? (
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2 text-left">
                      <span className="text-[11px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Store size={14} />
                        <span>Multi-Vendor Pickup Sequence ({order.vendorStatuses.length} Shops)</span>
                      </span>
                      <div className="space-y-2">
                        {order.vendorStatuses.map((vs: any, vIdx: number) => {
                          const isCancelled = String(vs.status || '').toLowerCase().includes('cancel') || String(vs.status || '').toLowerCase().includes('reject');
                          return (
                            <div key={vIdx} className="p-2.5 rounded-lg bg-bg-dark/60 border border-glass/40 flex items-center justify-between text-xs gap-2">
                              <div>
                                <span className="font-extrabold text-text-primary block">
                                  {vIdx + 1}. {vs.restaurantName}
                                </span>
                                {vs.restaurantAddress && (
                                  <span className="text-[10px] text-text-muted block">{vs.restaurantAddress}</span>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                isCancelled ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                              }`}>
                                {vs.status || 'Preparing'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* PICKUP & CUSTOMER ADDRESS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* PICKUP LOCATION CARD */}
                    <div className="p-3.5 rounded-xl bg-bg-darkSec/40 border border-glass/40 space-y-2 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Store size={14} />
                          <span>Pickup Location</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => { setSelectedMapOrder(order); setMapTarget('SHOP'); }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black flex items-center gap-1 shadow-xs transition-all shrink-0 cursor-pointer"
                          title="View Shop exact location on Leaflet Map"
                        >
                          <Navigation size={11} />
                          <span>Shop Map</span>
                        </button>
                      </div>
                      <p className="text-xs font-extrabold text-text-primary">
                        {restaurantName}
                      </p>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        {restaurantAddress}
                      </p>
                    </div>

                    {/* CUSTOMER DELIVERY LOCATION CARD */}
                    <div className="p-3.5 rounded-xl bg-bg-darkSec/40 border border-glass/40 space-y-2 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin size={14} />
                          <span>Customer Address</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => { setSelectedMapOrder(order); setMapTarget('CUSTOMER'); }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black flex items-center gap-1 shadow-xs transition-all shrink-0 cursor-pointer"
                          title="View Customer exact location on Leaflet Map"
                        >
                          <Navigation size={11} />
                          <span>Customer Map</span>
                        </button>
                      </div>
                      <p className="text-xs font-extrabold text-text-primary">
                        {customerName}
                      </p>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        {customerAddress}
                      </p>
                    </div>
                  </div>

                  {/* COMBINED FULL ROUTE DIRECTIONS BAR (SHOP -> CUSTOMER) */}
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-left">
                    <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                      <Navigation size={14} className="text-primary shrink-0" />
                      <span>Leaflet Route Map (Shop ➔ Customer)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedMapOrder(order); setMapTarget('ROUTE'); }}
                      className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-primary text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-sm hover:brightness-105 transition-all cursor-pointer shrink-0"
                    >
                      <Navigation size={12} />
                      <span>Open Leaflet Route Map</span>
                    </button>
                  </div>

                  {/* QUICK CONTACT ACTION BUTTON */}
                  {customerPhone && (
                    <a
                      href={`tel:${customerPhone}`}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center justify-center gap-2 transition-all shadow-xs"
                    >
                      <Phone size={14} />
                      <span>Call Customer ({customerPhone})</span>
                    </a>
                  )}

                  {/* MANIFEST BREAKDOWN & PRICING */}
                  <div className="p-3.5 rounded-xl bg-bg-darkSec/30 border border-glass/30 space-y-2.5 text-left">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                      Order Manifest & Payment Status
                    </span>

                    <div className="space-y-1.5 text-xs text-text-secondary">
                      {itemsList.length > 0 ? (
                        itemsList.map((it: any, idx: number) => {
                          const name = it.foodName || it.name || it.dishName || 'Food Item';
                          const qty = it.quantity || it.qty || 1;
                          const variantLabel = getItemVariantLabel(it);

                          return (
                            <div key={idx} className="flex justify-between items-center font-semibold text-xs">
                              <span className="truncate pr-2">• {name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {variantLabel && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-black font-mono">
                                    {variantLabel}
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-black text-[10px]">
                                  x{qty}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-text-muted italic text-xs">Meal Order Manifest</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-glass/30 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-muted">Payment:</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          order.paymentStatus === 'paid' || order.paymentStatus === 'SUCCESS'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                        }`}>
                          {order.paymentStatus || 'COD'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-extrabold text-text-muted block text-[10px] uppercase">Total Value</span>
                        <span className="text-sm sm:text-base font-black text-primary font-display">
                          ₹{totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PRIMARY DELIVERABLE PROGRESSION BUTTON */}
                  <div className="pt-1">
                    {isOutForDelivery ? (
                      <button
                        onClick={() => handleUpdateOrderStatus(orderId, 'Delivered')}
                        disabled={isUpdating}
                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase tracking-wider shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                        onClick={() => handleUpdateOrderStatus(orderId, 'Out for Delivery')}
                        disabled={isUpdating}
                        className="w-full py-3.5 px-4 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
        /* COMPLETED HISTORY TAB */
        completedOrders.length === 0 ? (
          <div className="p-10 text-center glass-panel border border-glass rounded-2xl space-y-3 max-w-md mx-auto">
            <CheckCircle2 size={40} className="mx-auto text-text-muted/40" />
            <h3 className="text-base font-black text-text-primary">No Completed Deliveries Yet</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Deliveries marked as completed will be recorded in your permanent delivery log.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedOrders.map((order) => {
              const orderId = order.id || order.orderId;
              const totalAmount = Number(order.total || order.totalAmount || 0);

              return (
                <div
                  key={orderId}
                  className="glass-panel border border-glass p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-primary text-sm">#{orderId}</span>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-500">
                        Delivered
                      </span>
                    </div>
                    <p className="text-xs font-bold text-text-primary truncate">
                      {order.customer?.name || 'Customer'} • {order.restaurant || 'Store'}
                    </p>
                    <p className="text-[11px] text-text-muted truncate">
                      Address: {order.customer?.address || 'N/A'}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] font-bold text-text-muted uppercase block">Amount</span>
                    <span className="text-sm font-black font-display text-primary">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-darkSec/95 border-t border-glass backdrop-blur-xl px-2 py-2 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => { setActiveTab('ACTIVE'); setIsProfileModalOpen(false); }}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'ACTIVE' && !isProfileModalOpen 
              ? 'text-primary font-black' 
              : 'text-text-muted'
          }`}
        >
          <Bike size={20} />
          <span className="mt-1">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('ACTIVE'); setIsProfileModalOpen(false); }}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer relative ${
            activeTab === 'ACTIVE' && !isProfileModalOpen 
              ? 'text-primary font-black' 
              : 'text-text-muted'
          }`}
        >
          <MapPin size={20} />
          <span className="mt-1">Tasks</span>
          {activeOrders.length > 0 && (
            <span className="absolute top-1 right-2 bg-primary text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
              {activeOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('COMPLETED'); setIsProfileModalOpen(false); }}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'COMPLETED' && !isProfileModalOpen 
              ? 'text-primary font-black' 
              : 'text-text-muted'
          }`}
        >
          <CheckCircle2 size={20} />
          <span className="mt-1">History</span>
        </button>

        <button
          type="button"
          onClick={() => setIsProfileModalOpen(true)}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            isProfileModalOpen 
              ? 'text-primary font-black' 
              : 'text-text-muted'
          }`}
        >
          <User size={20} />
          <span className="mt-1">Profile</span>
        </button>
      </nav>

      {/* MOBILE PROFILE SHEET MODAL */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="sm:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[99990] cursor-pointer"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="sm:hidden fixed bottom-16 left-0 right-0 z-[99991] bg-bg-darkSec border-t border-glass rounded-t-3xl p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-glass pb-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                    <Bike size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-text-primary">{user?.name || 'Delivery Partner'}</h3>
                    <p className="text-xs text-text-muted font-mono">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs font-bold text-left">
                <div className="p-3.5 rounded-2xl bg-bg-dark border border-glass flex items-center justify-between">
                  <span className="text-text-muted uppercase text-[10px]">Duty Status</span>
                  <button
                    type="button"
                    onClick={() => setIsOnDuty(!isOnDuty)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-2 cursor-pointer ${isOnDuty
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                      }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span>{isOnDuty ? 'ON DUTY' : 'OFF DUTY'}</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-bg-dark border border-glass flex items-center justify-between">
                  <span className="text-text-muted uppercase text-[10px]">Partner ID</span>
                  <span className="font-mono text-primary font-bold">{user?.id || 'DEL-ONLINE'}</span>
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full p-3.5 rounded-2xl border border-glass bg-bg-dark text-text-primary text-left flex items-center justify-between cursor-pointer"
                >
                  <span className="uppercase text-[10px] text-text-muted">Display Theme</span>
                  <div className="flex items-center gap-2">
                    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-amber-400" />}
                    <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-center uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* REALTIME INCOMING ORDER POPUP MODAL */}
      <AnimatePresence>
        {incomingOrderPopup && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIncomingOrderPopup(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="relative z-10 w-full max-w-sm sm:max-w-md bg-bg-darkSec border-2 border-primary rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-glass pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary animate-bounce shrink-0">
                    <Bike size={26} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-primary tracking-widest block">
                      ⚡ Ready For Pickup!
                    </span>
                    <h3 className="text-base sm:text-lg font-black font-mono text-text-primary">
                      #{incomingOrderPopup.id || incomingOrderPopup.orderId}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIncomingOrderPopup(null)}
                  className="p-2 rounded-xl bg-glass border border-glass text-text-muted hover:text-text-primary cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-bg-dark border border-glass space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-500 uppercase tracking-wider">
                    <Store size={14} />
                    <span>Restaurant / Vendor</span>
                  </div>
                  <p className="text-xs font-extrabold text-text-primary">
                    {incomingOrderPopup.restaurant || incomingOrderPopup.restaurantName || 'Gourmet Kitchen'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-bg-dark border border-glass space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-500 uppercase tracking-wider">
                    <MapPin size={14} />
                    <span>Delivery Location</span>
                  </div>
                  <p className="text-xs font-extrabold text-text-primary">
                    {incomingOrderPopup.customer?.name || incomingOrderPopup.customerName || 'Valued Customer'}
                  </p>
                  <p className="text-[11px] text-text-muted line-clamp-2">
                    {incomingOrderPopup.customer?.address || incomingOrderPopup.deliveryAddress || 'Customer Address'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex justify-between items-center text-xs font-black">
                  <span className="text-text-muted">Order Value:</span>
                  <span className="text-primary text-base font-display font-black">
                    ₹{(incomingOrderPopup.total || incomingOrderPopup.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIncomingOrderPopup(null)}
                  className="flex-1 py-3 rounded-xl bg-glass border border-glass text-text-muted font-extrabold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateOrderStatus(incomingOrderPopup.id || incomingOrderPopup.orderId, 'Out for Delivery');
                    setIncomingOrderPopup(null);
                  }}
                  className="flex-[2] py-3 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-transform cursor-pointer flex items-center justify-center gap-2"
                >
                  <Bike size={18} />
                  <span>Accept Order</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEAFLET MAP MODAL (OPENSTREETMAP) */}
      <AnimatePresence>
        {selectedMapOrder && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMapOrder(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="relative z-10 w-full max-w-2xl bg-bg-darkSec border border-glass rounded-3xl overflow-hidden shadow-2xl space-y-0 my-auto text-left"
            >
              {/* MODAL HEADER */}
              <div className="p-4 sm:p-5 border-b border-glass bg-bg-dark/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                    <Navigation size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-primary tracking-widest block">
                      Leaflet OpenStreetMap Navigation
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-text-primary">
                      Order #{selectedMapOrder.id || selectedMapOrder.orderId}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMapOrder(null)}
                  className="p-2 rounded-xl bg-glass border border-glass text-text-muted hover:text-text-primary cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* TARGET SELECTOR PILLS & MAP BODY */}
              {(() => {
                const { shopLat, shopLng, custLat, custLng, riderLat, riderLng } = getOrderCoordinates(selectedMapOrder);
                const riderToShopKm = calculateDistanceKm(riderLat, riderLng, shopLat, shopLng);
                const shopToCustKm = calculateDistanceKm(shopLat, shopLng, custLat, custLng);
                const totalTripKm = (Number(riderToShopKm) + Number(shopToCustKm)).toFixed(2);

                const centerLat =
                  mapTarget === 'SHOP'
                    ? (riderLat + shopLat) / 2
                    : mapTarget === 'CUSTOMER'
                    ? (shopLat + custLat) / 2
                    : (riderLat + shopLat + custLat) / 3;
                const centerLng =
                  mapTarget === 'SHOP'
                    ? (riderLng + shopLng) / 2
                    : mapTarget === 'CUSTOMER'
                    ? (shopLng + custLng) / 2
                    : (riderLng + shopLng + custLng) / 3;
                const mapZoom = mapTarget === 'ROUTE' ? 12 : 14;

                const shopName = selectedMapOrder.restaurant || selectedMapOrder.restaurantName || 'Vendor Shop';
                const shopAddr = selectedMapOrder.restaurantAddress || 'Main Hub';
                const custName = selectedMapOrder.customer?.name || selectedMapOrder.customerName || 'Customer';
                const custAddr = selectedMapOrder.customer?.address || selectedMapOrder.customerAddress || 'Delivery Address';

                return (
                  <div className="space-y-0">
                    <div className="p-4 bg-bg-dark/30 flex flex-wrap items-center justify-between gap-3 border-b border-glass">
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setMapTarget('ROUTE')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                            mapTarget === 'ROUTE' ? 'bg-primary text-black font-black' : 'bg-glass text-text-muted hover:text-text-primary border border-glass'
                          }`}
                        >
                          <Navigation size={12} />
                          <span>3-Way Trip ({totalTripKm} km)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMapTarget('SHOP')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                            mapTarget === 'SHOP' ? 'bg-amber-500 text-black font-black' : 'bg-glass text-text-muted hover:text-text-primary border border-glass'
                          }`}
                        >
                          <Store size={12} />
                          <span>Rider ➔ Shop ({riderToShopKm} km)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMapTarget('CUSTOMER')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                            mapTarget === 'CUSTOMER' ? 'bg-emerald-500 text-black font-black' : 'bg-glass text-text-muted hover:text-text-primary border border-glass'
                          }`}
                        >
                          <MapPin size={12} />
                          <span>Shop ➔ Customer ({shopToCustKm} km)</span>
                        </button>
                      </div>

                      <a
                        href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${riderLat},${riderLng};${shopLat},${shopLng};${custLat},${custLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                      >
                        <ExternalLink size={12} />
                        <span>Open Full Trip on OSM</span>
                      </a>
                    </div>

                    {/* LEAFLET MAP CONTAINER CONTAINER */}
                    <div className="h-72 sm:h-96 w-full relative z-0 border-b border-glass">
                      <MapContainer
                        center={[centerLat, centerLng]}
                        zoom={mapZoom}
                        scrollWheelZoom={true}
                        style={{ width: '100%', height: '100%', borderRadius: '0' }}
                      >
                        <ChangeView center={[centerLat, centerLng]} zoom={mapZoom} />
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Delivery Partner Live Location Marker */}
                        <Marker position={[riderLat, riderLng]} icon={partnerIcon}>
                          <Popup>
                            <div className="p-1 space-y-1 font-sans">
                              <h4 className="font-extrabold text-xs text-blue-600 flex items-center gap-1">
                                🚴‍♂️ Delivery Partner (My Location)
                              </h4>
                              <p className="text-[10px] font-mono text-gray-500">Coord: {riderLat.toFixed(4)}, {riderLng.toFixed(4)}</p>
                            </div>
                          </Popup>
                        </Marker>

                        {/* Shop Marker */}
                        <Marker position={[shopLat, shopLng]} icon={shopIcon}>
                          <Popup>
                            <div className="p-1 space-y-1 font-sans">
                              <h4 className="font-extrabold text-xs text-amber-600 flex items-center gap-1">
                                🏪 {shopName} (Pickup)
                              </h4>
                              <p className="text-[11px] text-gray-700">{shopAddr}</p>
                              <p className="text-[10px] font-mono text-gray-500">Coord: {shopLat.toFixed(4)}, {shopLng.toFixed(4)}</p>
                            </div>
                          </Popup>
                        </Marker>

                        {/* Customer Marker */}
                        <Marker position={[custLat, custLng]} icon={customerIcon}>
                          <Popup>
                            <div className="p-1 space-y-1 font-sans">
                              <h4 className="font-extrabold text-xs text-emerald-600 flex items-center gap-1">
                                📍 {custName} (Customer Delivery)
                              </h4>
                              <p className="text-[11px] text-gray-700">{custAddr}</p>
                              <p className="text-[10px] font-mono text-gray-500">Coord: {custLat.toFixed(4)}, {custLng.toFixed(4)}</p>
                            </div>
                          </Popup>
                        </Marker>

                        {/* Segment 1: Rider to Shop (Blue dashed line) */}
                        <Polyline
                          positions={[
                            [riderLat, riderLng],
                            [shopLat, shopLng]
                          ]}
                          color="#3B82F6"
                          weight={4}
                          dashArray="6, 6"
                        />

                        {/* Segment 2: Shop to Customer (Amber dashed line) */}
                        <Polyline
                          positions={[
                            [shopLat, shopLng],
                            [custLat, custLng]
                          ]}
                          color="#B87C44"
                          weight={4}
                          dashArray="6, 6"
                        />
                      </MapContainer>
                    </div>

                    {/* MODAL FOOTER */}
                    <div className="p-4 sm:p-5 bg-bg-dark/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
                      <div className="space-y-0.5 text-left">
                        <p className="text-text-primary font-bold flex items-center gap-1">
                          <span>🚴‍♂️ Rider</span> ➔ <span className="text-amber-500">🏪 {shopName}</span> ➔ <span className="text-emerald-500">📍 {custName}</span>
                        </p>
                        <p className="text-text-muted text-[11px]">
                          Rider to Shop: <span className="text-blue-400 font-mono font-bold">{riderToShopKm} km</span> • Shop to Customer: <span className="text-emerald-400 font-mono font-bold">{shopToCustKm} km</span> • Total Trip: <span className="text-primary font-mono font-bold">{totalTripKm} km</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedMapOrder(null)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-glass border border-glass text-text-primary font-black uppercase text-xs hover:bg-glass-subtle cursor-pointer shrink-0"
                      >
                        Close Map
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryDashboard;
