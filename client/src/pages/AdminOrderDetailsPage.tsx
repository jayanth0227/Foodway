import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  Receipt,
  User,
  Phone,
  MapPin,
  Store,
  CreditCard,
  ChefHat,
  AlertTriangle,
  Bike,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Utensils
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

export const AdminOrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [dbPartners, setDbPartners] = useState<any[]>([]);

  const fetchDeliveryPartners = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/delivery-partners`);
      if (res.data.success) {
        setDbPartners(res.data.deliveryPartners || []);
      }
    } catch (err) {
      console.warn('Error fetching partners in details page:', err);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    }
    fetchDeliveryPartners();
  }, [orderId]);

  const allRiderOptions = Array.from(new Set(
    dbPartners
      .map(p => p.name || p.email)
      .filter((name): name is string => Boolean(name && name.trim()))
  ));

  const fetchOrderDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/orders`);
      if (res.data.success && Array.isArray(res.data.orders)) {
        const found = res.data.orders.find(
          (o: any) => o.id === id || o.orderId === id || o.id?.toLowerCase() === id.toLowerCase()
        );
        if (found) {
          setOrder(found);
        } else {
          setError(`Order #${id} was not found in the database system.`);
        }
      } else {
        setError('Failed to load orders record.');
      }
    } catch (err: any) {
      console.error('Error loading admin order details:', err);
      setError('Server connection error while fetching order details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOrderId = () => {
    if (order?.id || orderId) {
      navigator.clipboard.writeText(order?.id || orderId || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAssignRider = async (riderName: string) => {
    if (!orderId) return;
    setUpdatingStatus(true);
    try {
      await axios.put(`${API_BASE_URL}/admin/orders/${orderId}/assign-rider`, { assignedRider: riderName });
      setOrder((prev: any) => (prev ? { ...prev, assignedRider: riderName } : prev));
    } catch (e) {
      console.error('Error assigning rider to order:', e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadgeStyle = (st: string) => {
    const s = (st || '').toLowerCase();
    if (s === 'completed' || s === 'delivered') {
      return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
    }
    if (s === 'accepted' || s === 'preparing' || s === 'ready') {
      return 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400';
    }
    if (s === 'rejected' || s === 'cancelled') {
      return 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400';
    }
    return 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400';
  };

  return (
    <>
      <Helmet>
        <title>Order #{orderId || ''} | Admin Console | MK Delivery Services</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50 dark:bg-bg-dark text-slate-900 dark:text-text-primary p-4 sm:p-6 lg:p-10 transition-colors duration-300">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Top Bar Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-glass pb-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-glass bg-white dark:bg-glass hover:bg-slate-100 dark:hover:bg-glass-subtle text-slate-700 dark:text-text-secondary hover:text-primary transition-all shadow-sm cursor-pointer"
                title="Back to Admin Dashboard"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-primary block">
                  Admin Inspection Console
                </span>
                <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Order Details</span>
                  <span className="font-mono text-primary font-bold">#{orderId}</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyOrderId}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-glass bg-white dark:bg-glass hover:bg-slate-100 dark:hover:bg-glass-subtle text-slate-700 dark:text-text-primary font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copied ? 'Copied Order ID' : 'Copy Order ID'}</span>
              </button>

              <button
                type="button"
                onClick={() => fetchOrderDetails(orderId || '')}
                className="p-2 rounded-xl border border-slate-200 dark:border-glass bg-white dark:bg-glass hover:bg-slate-100 dark:hover:bg-glass-subtle text-slate-700 dark:text-text-primary transition-all shadow-sm cursor-pointer"
                title="Refresh Order Data"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-glass bg-white dark:bg-bg-darkSec space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-600 dark:text-text-muted">Loading order records from database...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center rounded-3xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 space-y-4 shadow-sm">
              <AlertTriangle size={36} className="mx-auto text-rose-500" />
              <h3 className="text-lg font-black">{error}</h3>
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-6 py-2.5 rounded-xl bg-primary text-black font-extrabold text-xs uppercase tracking-wider shadow-md"
              >
                Back to Dashboard
              </button>
            </div>
          ) : order && (
            <div className="space-y-6 animate-fadeIn">

              {/* Status Header Banner */}
              <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-glass bg-white dark:bg-bg-darkSec shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-primary shrink-0">
                    <Receipt size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-text-muted">Current Status:</span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase border ${getStatusBadgeStyle(order.orderStatus || order.status)}`}>
                        {order.orderStatus || order.status || 'Pending'}
                      </span>
                      {order.isMultiVendor && (
                        <span className="px-3 py-1 rounded-lg text-xs font-black uppercase border bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-400">
                          🔀 MULTI-VENDOR ORDER
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-text-muted mt-1 font-medium">
                      Placed on {new Date(order.createdTime || order.orderedAt || Date.now()).toLocaleString()}
                    </p>
                    {order.cancellationNotice && (
                      <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                        <AlertTriangle size={14} />
                        <span>{order.cancellationNotice}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Delivery Boy Assignment Control */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold uppercase text-slate-600 dark:text-text-muted shrink-0 flex items-center gap-1.5">
                    <Bike size={16} className="text-primary" />
                    <span>Assign Delivery Boy:</span>
                  </span>
                  <select
                    value={order.assignedRider || 'Unassigned'}
                    onChange={(e) => handleAssignRider(e.target.value)}
                    disabled={updatingStatus}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-bg-dark border border-slate-300 dark:border-glass rounded-xl text-xs font-extrabold text-slate-800 dark:text-text-primary outline-none focus:border-primary cursor-pointer shadow-sm w-full sm:w-auto"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {allRiderOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3 Detail Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. Customer Details */}
                <div className="p-5 rounded-3xl border border-slate-200 dark:border-glass bg-white dark:bg-bg-darkSec shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-glass pb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-primary flex items-center gap-1.5">
                      <User size={15} />
                      <span>Customer Details</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-glass text-slate-600 dark:text-text-muted">
                      ID: {order.customerId || 'Customer'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-text-muted uppercase tracking-wider block font-bold">Full Name</span>
                      <p className="font-extrabold text-sm text-slate-900 dark:text-text-primary mt-0.5">
                        {order.customer?.name || order.customerName || 'Valued Customer'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-text-muted uppercase tracking-wider block font-bold">Phone Number</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-text-secondary flex items-center gap-1.5 mt-0.5">
                        <Phone size={13} className="text-primary" />
                        <span>{order.customer?.phone || order.customerPhone || 'N/A'}</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-text-muted uppercase tracking-wider block font-bold">Delivery Address</span>
                      <p className="text-slate-700 dark:text-text-secondary font-medium leading-relaxed flex items-start gap-1.5 mt-0.5 bg-slate-50 dark:bg-bg-dark/50 p-2.5 rounded-xl border border-slate-200 dark:border-glass/40">
                        <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                        <span>{order.customer?.address || order.customerAddress || order.deliveryAddress || 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Restaurant Details */}
                <div className="p-5 rounded-3xl border border-slate-200 dark:border-glass bg-white dark:bg-bg-darkSec shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-glass pb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-primary flex items-center gap-1.5">
                      <Store size={15} />
                      <span>Establishment Info</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-glass text-slate-600 dark:text-text-muted">
                      {order.restaurantId || 'RES'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-text-muted uppercase tracking-wider block font-bold">Restaurant Name</span>
                      <p className="font-extrabold text-sm text-slate-900 dark:text-text-primary mt-0.5">
                        {order.restaurant || order.restaurantName || 'Partner Restaurant'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-text-muted uppercase tracking-wider block font-bold">Assigned Rider</span>
                      <p className="font-bold text-slate-800 dark:text-text-secondary flex items-center gap-1.5 mt-0.5">
                        <Bike size={14} className="text-primary" />
                        <span>{order.assignedRider || 'Unassigned Rider'}</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-text-muted uppercase tracking-wider block font-bold">Verification</span>
                      <p className="text-slate-700 dark:text-text-secondary font-medium leading-relaxed flex items-center gap-1.5 mt-0.5">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        <span>Verified Foodway Restaurant</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Financial Summary */}
                <div className="p-5 rounded-3xl border border-slate-200 dark:border-glass bg-white dark:bg-bg-darkSec shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-glass pb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-primary flex items-center gap-1.5">
                      <CreditCard size={15} />
                      <span>Payment Summary</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {order.paymentStatus || 'Success'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-text-muted uppercase tracking-wider block font-bold">Payment Method</span>
                      <p className="font-extrabold text-sm text-slate-900 dark:text-text-primary mt-0.5">
                        {order.paymentMethod || 'Cash on Delivery'}
                      </p>
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-glass/40">
                      <span className="text-[10px] text-slate-500 dark:text-text-muted uppercase tracking-wider block font-bold">Total Order Price</span>
                      <p className="text-2xl font-black font-display text-primary mt-0.5">
                        ₹{Number(order.total || order.totalAmount || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Itemized Food Items Section */}
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-glass bg-white dark:bg-bg-darkSec shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-glass pb-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ChefHat size={18} className="text-primary" />
                    <span>Itemized Food Order ({Array.isArray(order.items) ? order.items.length : 1})</span>
                  </h3>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-glass bg-slate-50/50 dark:bg-bg-dark/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-bg-dark/80 text-[10px] uppercase tracking-wider text-slate-600 dark:text-text-muted font-bold border-b border-slate-200 dark:border-glass">
                      <tr>
                        <th className="p-4">Food Item</th>
                        <th className="p-4 text-center">Quantity</th>
                        <th className="p-4 text-right">Price per Unit</th>
                        <th className="p-4 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-glass font-medium text-slate-800 dark:text-text-secondary">
                      {Array.isArray(order.items) && order.items.length > 0 ? (
                        order.items.map((it: any, idx: number) => {
                          const qty = Number(it.quantity || 1);
                          const prc = Number(it.price || 0);
                          return (
                            <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-glass/30 transition-colors">
                              <td className="p-4 flex items-center gap-3">
                                {it.image ? (
                                  <img src={it.image} alt={it.name || it.foodName} className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-glass shrink-0 shadow-sm" />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-slate-200 dark:border-glass flex items-center justify-center text-primary font-bold text-lg shrink-0">
                                    <Utensils size={20} />
                                  </div>
                                )}
                                <div>
                                  <span className="font-extrabold text-sm text-slate-900 dark:text-text-primary block">
                                    {it.foodName || it.name || 'Food Item'}
                                  </span>
                                  {it.category && (
                                    <span className="text-[10px] text-slate-500 dark:text-text-muted font-semibold">
                                      {it.category}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-primary font-black text-xs">
                                  x{qty}
                                </span>
                              </td>
                              <td className="p-4 text-right font-semibold text-slate-700 dark:text-text-secondary">₹{prc.toFixed(2)}</td>
                              <td className="p-4 text-right font-black text-slate-900 dark:text-primary text-sm">₹{(qty * prc).toFixed(2)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-500 dark:text-text-muted">
                            {typeof order.items === 'string' ? order.items : 'No itemized list available for this order.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </>
  );
};
