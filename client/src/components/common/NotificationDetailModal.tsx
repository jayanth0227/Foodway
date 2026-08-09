import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, XCircle, CheckCircle2, ChefHat, Bike, ShoppingBag, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface NotificationDetailData {
  id: string;
  orderId?: string;
  title: string;
  body: string;
  timestamp: string;
  read?: boolean;
  type?: 'order' | 'offer' | 'system';
  status?: 'Pending' | 'Accepted' | 'Preparing' | 'Ready' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Rejected';
  restaurantName?: string;
  total?: number;
  items?: Array<{ name: string; quantity: number; price?: number }>;
}

interface NotificationDetailModalProps {
  notification: NotificationDetailData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({ notification, isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen || !notification) return null;

  const rawStatus = (notification.status || '').toLowerCase();
  const rawBody = (notification.body || '').toLowerCase();
  const rawTitle = (notification.title || '').toLowerCase();

  const isRejected = rawStatus.includes('reject') || rawStatus.includes('cancel') || rawBody.includes('reject') || rawBody.includes('cancel') || rawTitle.includes('reject') || rawTitle.includes('cancel');
  const isPreparing = rawStatus.includes('prepare') || rawStatus.includes('accept') || rawBody.includes('prepare') || rawBody.includes('accept') || rawTitle.includes('accept');
  const isOutForDelivery = rawStatus.includes('delivery') || rawBody.includes('delivery') || rawTitle.includes('delivery');
  const isDelivered = (rawStatus.includes('deliver') && !isOutForDelivery) || rawBody.includes('delivered') || rawTitle.includes('delivered');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
        {/* Dim Blur Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl cursor-pointer"
        />

        {/* Ultra Premium Glassmorphic Overlay Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-md bg-[#0b1329]/95 border border-glass rounded-3xl shadow-luxury overflow-hidden text-white flex flex-col max-h-[85vh] font-sans"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Header Banner */}
          <div className={`p-6 text-center space-y-3 relative overflow-hidden border-b ${
            isRejected
              ? 'bg-rose-500/10 border-rose-500/20'
              : isPreparing
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : isOutForDelivery
              ? 'bg-sky-500/10 border-sky-500/20'
              : 'bg-primary/10 border-primary/20'
          }`}>
            {/* Icon Avatar Box */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-luxury border ${
              isRejected
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : isPreparing
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : isOutForDelivery
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                : 'bg-primary/20 text-primary border-primary/30'
            }`}>
              {isRejected ? (
                <XCircle size={36} className="text-rose-500" />
              ) : isPreparing ? (
                <ChefHat size={36} className="text-emerald-400" />
              ) : isOutForDelivery ? (
                <Bike size={36} className="text-sky-400" />
              ) : (
                <CheckCircle2 size={36} className="text-primary" />
              )}
            </div>

            <div className="space-y-1">
              <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                isRejected
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : isPreparing
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : isOutForDelivery
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                  : 'bg-primary/20 text-primary border-primary/30'
              }`}>
                {isRejected ? 'ORDER REJECTED' : isPreparing ? 'ORDER PREPARING' : isOutForDelivery ? 'OUT FOR DELIVERY' : 'ORDER DELIVERED'}
              </span>

              <h3 className={`text-xl font-black font-display tracking-tight ${
                isRejected ? 'text-rose-400' : 'text-white'
              }`}>
                {isRejected
                  ? 'Order Declined by Restaurant'
                  : isPreparing
                  ? 'Chef is Preparing Order'
                  : isOutForDelivery
                  ? 'Rider is On The Way'
                  : notification.title}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                {isRejected
                  ? 'The restaurant is currently unable to fulfill your order. Any paid amount will be refunded immediately.'
                  : notification.body}
              </p>
            </div>
          </div>

          {/* Progress Tracker Bar */}
          <div className="px-6 py-4 bg-black/30 border-b border-glass space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted block text-center">
              Order Status Timeline
            </span>

            <div className="flex items-center justify-between relative px-4 pt-1">
              <div className="absolute top-4 left-8 right-8 h-1 bg-glass rounded-full z-0" />
              <div className={`absolute top-4 left-8 h-1 rounded-full z-0 transition-all ${
                isRejected ? 'bg-rose-500 w-1/2' : isDelivered ? 'bg-emerald-500 w-full' : isOutForDelivery ? 'bg-sky-500 w-3/4' : 'bg-emerald-500 w-1/2'
              }`} />

              {/* Step 1 */}
              <div className="flex flex-col items-center gap-1 relative z-10">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs">
                  <CheckCircle2 size={14} />
                </div>
                <span className="text-[9px] font-bold text-emerald-400 uppercase">Placed</span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center gap-1 relative z-10">
                {isRejected ? (
                  <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs shadow-luxury">
                    <X size={14} />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs">
                    <ChefHat size={14} />
                  </div>
                )}
                <span className={`text-[9px] font-bold uppercase ${isRejected ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isRejected ? 'Rejected' : 'Accepted'}
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center gap-1 relative z-10">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  isOutForDelivery || isDelivered ? 'bg-sky-500 text-black' : 'bg-glass text-text-muted'
                }`}>
                  <Bike size={14} />
                </div>
                <span className={`text-[9px] font-bold uppercase ${isOutForDelivery || isDelivered ? 'text-sky-400' : 'text-text-muted'}`}>
                  Delivery
                </span>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center gap-1 relative z-10">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  isDelivered ? 'bg-emerald-500 text-black' : 'bg-glass text-text-muted'
                }`}>
                  <CheckCircle2 size={14} />
                </div>
                <span className={`text-[9px] font-bold uppercase ${isDelivered ? 'text-emerald-400' : 'text-text-muted'}`}>
                  Delivered
                </span>
              </div>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-5 space-y-3 overflow-y-auto flex-1 scrollbar-thin">
            <div className="p-4 rounded-2xl bg-glass-subtle border border-glass space-y-2 text-xs">
              <div className="flex items-center justify-between text-text-muted">
                <span>Order Reference</span>
                <span className="text-primary font-mono font-bold">{notification.orderId || '#ORD-8942'}</span>
              </div>

              <div className="flex items-center justify-between text-text-muted">
                <span>Date & Time</span>
                <span className="text-text-primary font-medium">{notification.timestamp}</span>
              </div>

              {notification.restaurantName && (
                <div className="flex items-center justify-between text-text-muted">
                  <span>Restaurant</span>
                  <span className="text-text-primary font-extrabold">{notification.restaurantName}</span>
                </div>
              )}
            </div>
          </div>

          {/* CTA Footer */}
          <div className="p-4 bg-black/40 border-t border-glass space-y-2">
            {isRejected ? (
              <button
                onClick={() => {
                  onClose();
                  navigate('/restaurants');
                }}
                className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-luxury cursor-pointer transition-all"
              >
                <Utensils size={16} />
                <span>Explore Other Restaurants</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  navigate('/orders');
                }}
                className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-dark text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-luxury cursor-pointer transition-all"
              >
                <ShoppingBag size={16} />
                <span>Go To Orders Manager</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NotificationDetailModal;
