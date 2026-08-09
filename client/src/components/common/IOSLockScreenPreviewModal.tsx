import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flashlight, Camera, Utensils, Signal, Wifi, Battery } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface LockScreenPayload {
  title: string;
  body: string;
  orderId?: string;
  actionUrl?: string;
  icon?: string;
  time?: string;
}

interface IOSLockScreenPreviewModalProps {
  payload: LockScreenPayload | null;
  isOpen: boolean;
  onClose: () => void;
}

export const IOSLockScreenPreviewModal: React.FC<IOSLockScreenPreviewModalProps> = ({ payload, isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen || !payload) return null;

  const handleNotificationTap = () => {
    onClose();
    if (payload.orderId) {
      navigate('/orders');
    } else if (payload.actionUrl) {
      navigate(payload.actionUrl);
    } else {
      navigate('/categories');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-0 sm:p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/90 backdrop-blur-2xl cursor-pointer"
        />

        {/* iPhone Frame Simulator Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative z-10 w-full max-w-sm sm:max-w-md h-full sm:h-[780px] sm:max-h-[92vh] sm:rounded-[48px] border-0 sm:border-[8px] sm:border-slate-800 bg-gradient-to-b from-indigo-950 via-slate-900 to-black text-white shadow-2xl overflow-hidden flex flex-col justify-between font-sans"
        >
          {/* Close Close Button on Top */}
          <button
            onClick={onClose}
            className="absolute top-12 right-5 z-50 p-2 rounded-full bg-black/50 text-white/80 hover:text-white border border-white/20 backdrop-blur-md cursor-pointer transition-all"
            title="Close Preview"
          >
            <X size={18} />
          </button>

          {/* iOS Status Bar */}
          <div className="pt-3 px-7 flex items-center justify-between text-xs font-semibold text-white/90 z-20">
            <span>Vi India</span>
            <div className="flex items-center gap-2 text-xs">
              <Signal size={14} />
              <Wifi size={14} />
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono">80%</span>
                <Battery size={16} className="fill-white" />
              </div>
            </div>
          </div>

          {/* iOS Lock Screen Time Header */}
          <div className="text-center pt-8 space-y-1 z-10">
            <span className="text-sm font-semibold tracking-wide text-white/80 uppercase">
              Fri 7 Aug
            </span>
            <h1 className="text-7xl font-extrabold font-display tracking-tight text-white/90 drop-shadow-lg">
              4:08
            </h1>
          </div>

          {/* iOS Notification Centre Container */}
          <div className="px-5 space-y-3 my-auto z-10">
            <div className="flex items-center justify-between text-xs font-semibold text-white/70 px-1">
              <span>Notification Centre</span>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white/60">
                <X size={14} />
              </button>
            </div>

            {/* Authentic Swiggy-Style iOS Lock Screen Notification Card */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNotificationTap}
              className="p-4 rounded-3xl bg-white/20 dark:bg-white/15 border border-white/25 backdrop-blur-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] cursor-pointer flex items-start gap-3.5 group hover:bg-white/25 transition-all"
            >
              {/* App Icon (Swiggy / Foodway Orange Pin Icon) */}
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-amber-400 to-amber-500 text-black flex items-center justify-center font-black shrink-0 shadow-lg shadow-primary/30 mt-0.5">
                <Utensils size={22} className="stroke-[2.5]" />
              </div>

              {/* Notification Text Content */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between text-xs font-extrabold text-white/90">
                  <h4 className="text-sm font-black text-white tracking-tight truncate leading-snug">
                    {payload.title}
                  </h4>
                  <span className="text-[11px] font-normal text-white/60 shrink-0">
                    {payload.time || 'now'}
                  </span>
                </div>

                <p className="text-xs text-white/85 leading-snug line-clamp-2 font-medium">
                  {payload.body}
                </p>
              </div>
            </motion.div>
          </div>

          {/* iOS Lock Screen Footer (Torch & Camera Shortcuts) */}
          <div className="p-7 flex items-center justify-between z-10">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-white/30 transition-all">
              <Flashlight size={20} />
            </div>

            {/* iOS Home Indicator Bar */}
            <div className="w-32 h-1 bg-white/60 rounded-full" />

            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-white/30 transition-all">
              <Camera size={20} />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default IOSLockScreenPreviewModal;
