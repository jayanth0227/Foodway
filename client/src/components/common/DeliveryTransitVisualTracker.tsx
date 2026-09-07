import React from 'react';
import { Clock, PackageCheck, Bike, CheckCircle2, AlertCircle, KeyRound, Phone } from 'lucide-react';

interface DeliveryTransitVisualTrackerProps {
  status: string;
  riderName?: string;
  riderPhone?: string;
  deliveryPin?: string;
}

export const DeliveryTransitVisualTracker: React.FC<DeliveryTransitVisualTrackerProps> = ({
  status,
  riderName,
  riderPhone,
  deliveryPin
}) => {
  const normalizedStatus = (status || 'PENDING').toLowerCase().replace(/\s+/g, '_');

  if (normalizedStatus === 'cancelled' || normalizedStatus === 'rejected' || normalizedStatus === 'reject') {
    return (
      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-extrabold flex items-center justify-between shadow-xs my-2">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-rose-500" />
          <span>This order was cancelled or rejected.</span>
        </div>
      </div>
    );
  }

  // Determine current step index (0 to 3)
  let currentStep = 0;
  if (normalizedStatus === 'pending' || normalizedStatus === 'placed' || normalizedStatus === 'order_placed') {
    currentStep = 0;
  } else if (normalizedStatus === 'accepted' || normalizedStatus === 'confirmed' || normalizedStatus === 'preparing' || normalizedStatus === 'ready' || normalizedStatus === 'ready_for_pickup' || normalizedStatus === 'assigned' || normalizedStatus === 'accepted_by_rider') {
    currentStep = 1;
  } else if (normalizedStatus === 'out_for_delivery' || normalizedStatus === 'in_transit' || normalizedStatus === 'picked_up') {
    currentStep = 2;
  } else if (normalizedStatus === 'delivered' || normalizedStatus === 'completed') {
    currentStep = 3;
  }

  const steps = [
    {
      title: 'Order Placed',
      subtitle: 'Confirmed',
      icon: Clock,
      activeStyle: 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500 ring-4 ring-sky-500/25 shadow-sky-500/30 font-black scale-105',
      completedStyle: 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400',
      activeText: 'text-sky-600 dark:text-sky-400 font-black',
      lineColor: 'from-sky-500 to-amber-500'
    },
    {
      title: 'Preparing',
      subtitle: 'Kitchen / Store',
      icon: PackageCheck,
      activeStyle: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500 ring-4 ring-amber-500/25 shadow-amber-500/30 font-black scale-105',
      completedStyle: 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400',
      activeText: 'text-amber-600 dark:text-amber-400 font-black',
      lineColor: 'from-amber-500 to-purple-500'
    },
    {
      title: 'Out for Delivery',
      subtitle: 'In Transit',
      icon: Bike,
      activeStyle: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500 ring-4 ring-purple-500/25 shadow-purple-500/30 font-black scale-105',
      completedStyle: 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400',
      activeText: 'text-purple-600 dark:text-purple-400 font-black',
      lineColor: 'from-purple-500 to-emerald-500'
    },
    {
      title: 'Delivered',
      subtitle: 'Completed',
      icon: CheckCircle2,
      activeStyle: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500 ring-4 ring-emerald-500/25 shadow-emerald-500/30 font-black scale-105',
      completedStyle: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
      activeText: 'text-emerald-600 dark:text-emerald-400 font-black',
      lineColor: 'from-emerald-500 to-emerald-600'
    }
  ];

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 dark:bg-bg-cardSec/90 border border-slate-200/80 dark:border-white/10 space-y-3 text-left shadow-sm my-2.5 backdrop-blur-md">
      {/* Rider Info Header (If Rider Assigned) */}
      {riderName && (
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-white/10 w-full min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-text-muted shrink-0 whitespace-nowrap">
              Delivery Partner:
            </span>
            <span className="inline-flex items-center text-[11px] sm:text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 sm:px-3 py-1.5 rounded-lg border border-blue-500/20 whitespace-nowrap truncate max-w-[260px] sm:max-w-none">
              {riderName}
            </span>
          </div>

          {riderPhone && (
            <a
              href={`tel:${riderPhone}`}
              title={`Call Rider (${riderPhone})`}
              aria-label="Call Rider"
              className="inline-flex items-center justify-center w-8 h-8 text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-all active:scale-95 shrink-0 ml-auto"
            >
              <Phone size={15} />
            </a>
          )}
        </div>
      )}

      {/* COMPACT 4-DIGIT DELIVERY VERIFICATION PIN (OTP) CARD FOR CUSTOMER */}
      {deliveryPin && currentStep < 3 && (
        <div className="p-3 rounded-xl bg-slate-900 text-white dark:bg-bg-dark border border-emerald-500/40 space-y-2 shadow-md relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <KeyRound size={13} />
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                Delivery Verification OTP
              </span>
            </div>

            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/70 border border-emerald-500/40 shrink-0">
              {deliveryPin.split('').map((digit, i) => (
                <span
                  key={i}
                  className="w-6 h-7 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-sm font-black flex items-center justify-center shadow-xs shadow-emerald-500/20"
                >
                  {digit}
                </span>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-slate-300 font-medium leading-tight">
            Share this 4-digit PIN with your delivery partner upon arrival to confirm delivery.
          </p>
        </div>
      )}

      {/* Visual Stepper Tracker Bar */}
      <div className="pt-1 pb-0.5 px-0.5">
        <div className="flex items-start justify-between w-full">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <React.Fragment key={idx}>
                {/* Step Node */}
                <div className="flex flex-col items-center text-center space-y-1 z-10 shrink-0 min-w-[65px] sm:min-w-[85px]">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-500 border shadow-xs backdrop-blur-md ${
                      isCurrent
                        ? st.activeStyle
                        : isCompleted
                        ? st.completedStyle
                        : 'bg-slate-200/80 dark:bg-white/10 text-text-muted border-slate-300/80 dark:border-white/10'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={16} className="stroke-[2.5]" />
                    ) : (
                      <Icon size={16} className={isCurrent && idx === 2 ? 'animate-bounce' : ''} />
                    )}
                  </div>

                  <p
                    className={`text-[10px] sm:text-[11px] font-extrabold leading-tight ${
                      isCurrent
                        ? st.activeText
                        : isCompleted
                        ? 'text-text-primary font-bold'
                        : 'text-text-muted'
                    }`}
                  >
                    {st.title}
                  </p>
                </div>

                {/* Connecting Connector Line Segment between Nodes */}
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-1 sm:mx-2 rounded-full overflow-hidden bg-slate-200/80 dark:bg-white/10 relative mt-3.5">
                    <div
                      className={`h-full transition-all duration-700 bg-gradient-to-r ${
                        idx < currentStep ? st.lineColor : 'bg-transparent'
                      }`}
                      style={{ width: idx < currentStep ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DeliveryTransitVisualTracker;
