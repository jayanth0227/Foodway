import React from 'react';
import { Clock, PackageCheck, Bike, CheckCircle2, AlertCircle, Store, KeyRound } from 'lucide-react';

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
      <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-extrabold flex items-center justify-between shadow-sm my-2">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} />
          <span>Order Cancelled or Rejected</span>
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
    { title: 'Order Placed', subtitle: 'Accepted', icon: Clock },
    { title: 'Order Preparing', subtitle: 'Packing at Store', icon: PackageCheck },
    { title: 'Out for Delivery', subtitle: 'In Transit', icon: Bike },
    { title: 'Delivered', subtitle: 'Completed', icon: CheckCircle2 }
  ];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-bg-darkSec/90 via-bg-darkSec/60 to-bg-dark border border-glass/70 space-y-4 text-left shadow-luxury my-3">
      {/* Top Banner Status Headline */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-glass/40 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3 shrink-0">
            {currentStep < 3 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${currentStep === 3 ? 'bg-emerald-500' : 'bg-primary'}`}></span>
          </span>
          <span className="text-xs sm:text-sm font-black text-text-primary tracking-tight">
            {currentStep === 0 && '⚡ Order Placed & Confirmed'}
            {currentStep === 1 && (riderName ? `🚴‍♂️ Rider ${riderName} Assigned • Store Preparing Package` : '📦 Items Being Packed & Prepared at Store')}
            {currentStep === 2 && '🛵 Package Picked Up & On the Way to You!'}
            {currentStep === 3 && '🎉 Order Delivered Successfully!'}
          </span>
        </div>

        {riderName && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-primary font-mono bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/25">
              🚴‍♂️ Rider: {riderName}
            </span>
            {riderPhone && (
              <a
                href={`tel:${riderPhone}`}
                className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25 hover:bg-emerald-500/20 transition-colors"
              >
                📞 Call Rider
              </a>
            )}
          </div>
        )}
      </div>

      {/* 4-DIGIT DELIVERY VERIFICATION PIN (OTP) BOX FOR CUSTOMER */}
      {deliveryPin && currentStep < 3 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-primary/20 to-amber-500/15 border border-primary/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-luxury">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-xl bg-primary text-black font-black shrink-0 shadow-md">
              <KeyRound size={20} />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-primary tracking-wider">
                Delivery Verification OTP
              </div>
              <div className="text-[11px] text-text-secondary font-semibold">
                Tell this 4-digit PIN to your delivery partner upon arrival to confirm delivery.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/70 border border-primary/50 shrink-0">
            {deliveryPin.split('').map((digit, i) => (
              <span
                key={i}
                className="w-7 h-8 sm:w-8 sm:h-9 rounded-lg bg-primary/25 border border-primary/50 text-primary font-mono text-base sm:text-lg font-black flex items-center justify-center shadow-inner"
              >
                {digit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Visual Stepper Tracker Bar with Flex Alignment */}
      <div className="pt-2 pb-1 px-1">
        <div className="flex items-start justify-between w-full">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <React.Fragment key={idx}>
                {/* Step Node */}
                <div className="flex flex-col items-center text-center space-y-2 z-10 shrink-0 min-w-[70px] sm:min-w-[90px]">
                  <div
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-500 border shadow-md ${
                      isCurrent
                        ? 'bg-primary text-black border-primary ring-4 ring-primary/25 scale-110 font-black'
                        : isCompleted
                        ? 'bg-emerald-500 text-black border-emerald-500'
                        : 'bg-bg-darkSec text-text-muted border-glass'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={20} className="stroke-[3]" />
                    ) : (
                      <Icon size={20} className={isCurrent && idx === 2 ? 'animate-bounce' : ''} />
                    )}
                  </div>

                  <p
                    className={`text-[10px] sm:text-xs font-extrabold leading-tight ${
                      isCurrent
                        ? 'text-primary font-black'
                        : isCompleted
                        ? 'text-emerald-400 font-bold'
                        : 'text-text-muted'
                    }`}
                  >
                    {st.title}
                  </p>
                </div>

                {/* Connecting Connector Line Segment between Nodes */}
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-1.5 mx-1 sm:mx-2 rounded-full overflow-hidden bg-glass border border-glass/40 relative mt-4">
                    <div
                      className={`h-full transition-all duration-700 ${
                        idx < currentStep
                          ? 'bg-gradient-to-r from-amber-500 via-primary to-emerald-500'
                          : 'bg-transparent'
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
