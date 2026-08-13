import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';
import hdGhostMascot from '../../assets/hd_ghost_mascot.png';

export const OfflineDetector: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsRetrying(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleNetworkErr = () => {
      setIsOffline(true);
    };

    window.addEventListener('foodway_network_error', handleNetworkErr);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('foodway_network_error', handleNetworkErr);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (navigator.onLine) {
        const res = await fetch(`${API_BASE_URL}/healthcheck`, { cache: 'no-store' }).catch(() => null);
        if (res || navigator.onLine) {
          setIsOffline(false);
          setIsRetrying(false);
          return;
        }
      }
    } catch (e) { }

    setTimeout(() => {
      setIsRetrying(false);
      if (!navigator.onLine) {
        setIsOffline(true);
      }
    }, 1200);
  };

  if (!isOffline) return null;

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[100] bg-gradient-to-b from-[#e8f0f4] via-[#dce6eb] to-[#ccd7de] text-slate-800 flex flex-col justify-center items-center p-6 sm:p-10 select-none font-sans overflow-y-auto"
        >


          {/* Center Mascot & Message Container matching Screenshot */}
          <div className="max-w-sm w-full mx-auto my-auto flex flex-col items-center text-center space-y-8 py-4 z-10">

            {/* Animated Floating HD Ghost Character in Circular 3D Glass Disc */}
            <div className="relative flex flex-col items-center justify-center w-full py-2">
              <motion.div
                animate={{
                  y: [0, -8, 0],
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative z-10 w-52 h-52 sm:w-60 sm:h-60 rounded-full border-4 border-white/95 bg-gradient-to-b from-white/95 via-slate-100/90 to-slate-200/70 shadow-2xl backdrop-blur-xl flex items-center justify-center overflow-hidden p-1"
              >
                <img
                  src={hdGhostMascot}
                  alt="Offline Ghost Mascot"
                  className="w-full h-full object-cover rounded-full scale-105"
                />
              </motion.div>

              {/* Dynamic Bobbing Ground Shadow */}
              <motion.div
                animate={{
                  scaleX: [1, 0.85, 1],
                  opacity: [0.3, 0.15, 0.3],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-36 h-2.5 bg-slate-500/30 rounded-full blur-sm mt-3"
              />
            </div>




            {/* BOOO! Headline matching Screenshot */}
            <div className="space-y-2.5 px-2">
              <h1 className="text-3xl sm:text-4xl font-black font-display tracking-widest text-[#1e252b] uppercase">
                BOOO!
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
                Something went wrong. Try refreshing the page or checking your connection. We'll see you in a moment.
              </p>
            </div>

            {/* Dark Capsule Button for "Try again" */}
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full max-w-xs py-4 px-8 rounded-2xl bg-[#1e232a] hover:bg-[#111419] active:scale-95 text-white font-bold text-sm tracking-wide shadow-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw size={16} className={isRetrying ? "animate-spin text-white" : "text-white"} />
              <span>{isRetrying ? "Checking..." : "Try again"}</span>
            </button>
          </div>

          {/* Bottom Footer Info */}
          <div className="w-full max-w-sm pb-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest z-10">
            MK Delivery Connection Shield
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineDetector;
