import React, { useEffect, useState } from 'react';
import { VolumeX, BellRing, ArrowRight } from 'lucide-react';
import buzzerService, { type BuzzerState } from '../../services/buzzer.service';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const OrderBuzzerBanner: React.FC = () => {
  const [buzzerState, setBuzzerState] = useState<BuzzerState>(buzzerService.getState());
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribe = buzzerService.subscribe((state) => {
      setBuzzerState(state);
    });
    return () => unsubscribe();
  }, []);

  if (!buzzerState.isPlaying) {
    return null;
  }

  const handleStopBuzzer = () => {
    buzzerService.stopBuzzer();
  };

  const handleNavigateOrder = () => {
    buzzerService.stopBuzzer();
    const userRole = (user?.role || '').toUpperCase();

    if (userRole === 'ADMIN') {
      navigate('/admin/dashboard?tab=orders', { state: { activeTab: 'orders' } });
    } else if (userRole === 'SHOP' || userRole === 'RESTAURANT' || userRole === 'VENDOR') {
      navigate('/shop/dashboard?tab=orders', { state: { activeTab: 'orders' } });
    } else if (userRole === 'DELIVERY_PARTNER' || userRole === 'DELIVERY' || userRole === 'RIDER') {
      navigate('/delivery/dashboard');
    } else {
      navigate('/orders');
    }
  };

  const progressPercent = Math.max(0, Math.min(100, (buzzerState.remainingSeconds / 30) * 100));

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-lg shadow-2xl rounded-2xl overflow-hidden bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white animate-bounce-short border-2 border-amber-300/50">
      {/* Top Countdown Progress Bar */}
      <div className="w-full bg-black/20 h-1.5">
        <div
          className="bg-amber-300 h-full transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="p-4 flex items-center justify-between gap-3">
        {/* Pulsing Bell Audio Icon */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-ping absolute inset-0 opacity-75" />
          <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center relative shadow-inner">
            <BellRing className="w-6 h-6 text-amber-200 animate-wiggle" />
          </div>
        </div>

        {/* Notification Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-black uppercase tracking-wider">
              ORDER BUZZER ALARM ({buzzerState.remainingSeconds}s)
            </span>
          </div>
          <h4 className="text-sm font-bold text-white truncate mt-0.5">
            {buzzerState.title}
          </h4>
          <p className="text-xs text-rose-100 line-clamp-2 mt-0.5">
            {buzzerState.message}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {buzzerState.orderId && (
            <button
              onClick={handleNavigateOrder}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all text-xs font-semibold text-white flex items-center gap-1 active:scale-95"
              title="View Order"
            >
              <span>View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleStopBuzzer}
            className="px-3 py-2 rounded-xl bg-white text-rose-700 font-bold text-xs shadow-md hover:bg-rose-50 transition-all flex items-center gap-1.5 active:scale-95 border border-rose-200"
            title="Stop Buzzer Alarm"
          >
            <VolumeX className="w-4 h-4 text-rose-600" />
            <span>Mute</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderBuzzerBanner;
