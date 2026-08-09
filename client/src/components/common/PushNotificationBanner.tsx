import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, ChevronRight, XCircle } from 'lucide-react';
import { NotificationDetailModal, type NotificationDetailData } from './NotificationDetailModal';

export interface PushNotificationPayload {
  id: string;
  title: string;
  body: string;
  orderId?: string;
  actionUrl?: string;
  timestamp?: string;
  status?: string;
  restaurantName?: string;
}

export const PushNotificationBanner: React.FC = () => {
  const [currentPush, setCurrentPush] = useState<PushNotificationPayload | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<NotificationDetailData | null>(null);

  useEffect(() => {
    const handlePushEvent = (e: Event) => {
      const customEvt = e as CustomEvent<PushNotificationPayload>;
      if (customEvt.detail) {
        setCurrentPush(customEvt.detail);
        // Play subtle alert sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        } catch (err) {}
      }
    };

    window.addEventListener('foodway_push_notification', handlePushEvent);
    return () => {
      window.removeEventListener('foodway_push_notification', handlePushEvent);
    };
  }, []);

  useEffect(() => {
    if (currentPush) {
      const timer = setTimeout(() => {
        setCurrentPush(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [currentPush]);

  if (!currentPush && !selectedDetail) return null;

  const handleBannerClick = () => {
    if (currentPush) {
      const payload = currentPush;
      setCurrentPush(null);
      setSelectedDetail({
        ...payload,
        timestamp: payload.timestamp || 'Just now',
        status: (payload.status as any) || (payload.title?.toLowerCase().includes('reject') ? 'Rejected' : 'Pending')
      });
    }
  };

  const isRejected = currentPush?.title?.toLowerCase().includes('reject') ||
    currentPush?.body?.toLowerCase().includes('reject') ||
    currentPush?.status?.toLowerCase().includes('reject') ||
    currentPush?.title?.toLowerCase().includes('cancel') ||
    currentPush?.body?.toLowerCase().includes('cancel');

  return (
    <>
      <AnimatePresence>
        {currentPush && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100000] w-[94vw] max-w-md pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -60, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={handleBannerClick}
              className={`pointer-events-auto cursor-pointer border backdrop-blur-2xl rounded-3xl p-3.5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] text-white flex items-start gap-3.5 group transition-all active:scale-[0.98] ${
                isRejected
                  ? 'bg-rose-950/95 border-rose-500/80 shadow-rose-950/60 hover:border-rose-400'
                  : 'bg-slate-950/95 border-slate-700/80 hover:border-primary/50'
              }`}
            >
              {/* App / Notification Icon */}
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-lg mt-0.5 ${
                isRejected ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-gradient-to-br from-primary via-amber-400 to-amber-500 text-black shadow-primary/20'
              }`}>
                {isRejected ? <XCircle size={22} /> : <MessageSquare size={20} className="fill-black/20" />}
              </div>

              {/* Message Content Body */}
              <div className="min-w-0 flex-1 space-y-1">
                {/* SMS Header / App Name & Timestamp */}
                <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <div className={`flex items-center gap-1.5 ${isRejected ? 'text-rose-400' : 'text-primary'}`}>
                    <span>FOODWAY</span>
                    <span>•</span>
                    <span>{isRejected ? 'ORDER REJECTED' : 'PUSH ALERT'}</span>
                  </div>
                  <span className="text-[9.5px] font-semibold text-slate-400">now</span>
                </div>

                {/* Notification Title */}
                <h4 className={`font-extrabold text-xs truncate ${isRejected ? 'text-rose-300' : 'text-white group-hover:text-primary'}`}>
                  {currentPush.title}
                </h4>

                {/* Notification Body */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-snug font-medium">
                  {currentPush.body}
                </p>

                {/* Action pill */}
                <div className={`pt-1 flex items-center gap-1 text-[10px] font-black ${isRejected ? 'text-rose-400' : 'text-primary'}`}>
                  <span>Tap for Full Screen Details</span>
                  <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPush(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <X size={15} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Screen Notification Detail Screen Modal */}
      <NotificationDetailModal
        notification={selectedDetail}
        isOpen={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
      />
    </>
  );
};

export default PushNotificationBanner;
