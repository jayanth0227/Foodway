import React from 'react';

/**
 * Mobile-Only Realistic Shimmer Skeleton Loader
 * Renders user-friendly mobile skeleton placeholders with smooth shimmer pulses.
 */
export const MobileGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="glass-panel border border-glass rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col justify-between space-y-3 animate-pulse shadow-sm"
        >
          {/* Photo Placeholder */}
          <div className="w-full aspect-[16/10] rounded-xl sm:rounded-2xl bg-bg-cardSec/80 border border-glass/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          </div>

          {/* Title & Subtext Lines */}
          <div className="space-y-2 px-0.5">
            <div className="h-3.5 bg-primary/20 rounded-md w-3/4" />
            <div className="h-2.5 bg-text-muted/20 rounded-md w-full" />
            <div className="h-2.5 bg-text-muted/15 rounded-md w-1/2" />
          </div>

          {/* Bottom Action Pill */}
          <div className="pt-2 border-t border-glass/40 flex items-center justify-between">
            <div className="h-3 bg-primary/25 rounded-md w-20" />
            <div className="w-4 h-4 rounded-full bg-primary/20" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const MobileShopCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="glass-panel border border-glass rounded-2xl sm:rounded-3xl overflow-hidden shadow-luxury animate-pulse flex flex-col justify-between"
        >
          {/* Banner Photo Placeholder */}
          <div className="w-full aspect-[16/9] max-h-44 sm:max-h-56 bg-bg-cardSec/90 relative">
            <div className="absolute top-3 right-3 w-12 h-5 bg-emerald-500/20 rounded-lg" />
            <div className="absolute bottom-3 right-3 w-16 h-5 bg-black/40 rounded-lg" />
          </div>

          {/* Info Lines */}
          <div className="p-4 space-y-3">
            <div className="h-4 bg-primary/20 rounded-md w-2/3" />
            <div className="h-3 bg-text-muted/20 rounded-md w-1/2" />
            <div className="h-9 bg-primary/10 rounded-xl border border-primary/20 w-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const MobileMenuSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="glass-panel border border-glass rounded-2xl p-3.5 sm:p-5 flex items-center justify-between gap-3 animate-pulse shadow-sm"
        >
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-primary/20 rounded-md w-1/2" />
            <div className="h-3 bg-text-muted/20 rounded-md w-3/4" />
            <div className="h-4 bg-primary/30 rounded-md w-16 mt-1" />
          </div>

          {/* Item Image Thumbnail */}
          <div className="w-20 h-20 rounded-xl bg-bg-cardSec/80 border border-glass shrink-0 relative overflow-hidden">
            <div className="absolute bottom-1 right-1 w-12 h-6 bg-primary/20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};
