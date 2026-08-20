import React from 'react';

/**
 * Mobile & Desktop Shimmer Skeleton Loaders
 * High-end Swiggy/Zomato style realistic shimmer skeleton placeholders.
 */

export const HeroBannerSkeleton: React.FC = () => {
  return (
    <div className="w-full aspect-[16/8] sm:aspect-[21/9] rounded-2xl sm:rounded-3xl skeleton-box animate-pulse relative overflow-hidden shadow-luxury">
      <div className="absolute inset-0 p-4 sm:p-8 flex flex-col justify-end space-y-3">
        <div className="w-32 sm:w-48 h-6 sm:h-8 rounded-xl skeleton-box" />
        <div className="w-48 sm:w-72 h-4 sm:h-5 rounded-lg skeleton-box" />
        <div className="w-28 sm:w-36 h-9 sm:h-11 rounded-full skeleton-box mt-2" />
      </div>
    </div>
  );
};

export const CategorySliderSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div
      className="flex items-center gap-4 sm:gap-6 overflow-x-auto py-2.5 -mx-3 px-3 sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex flex-col items-center gap-2 shrink-0 animate-pulse">
          {/* Swiggy Circular Dish Image Skeleton */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0 skeleton-box" />
          {/* Category Title Line */}
          <div className="w-14 sm:w-16 h-3 rounded-md skeleton-box" />
        </div>
      ))}
    </div>
  );
};

export const MobileShopCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-bg-cardSec border border-glass rounded-2xl sm:rounded-3xl overflow-hidden shadow-luxury animate-pulse flex flex-col justify-between"
        >
          <div>
            {/* Banner Cover Image Placeholder */}
            <div className="relative aspect-[16/9] w-full skeleton-box">
              {/* Top Left Tag Skeleton */}
              <div className="absolute top-2.5 left-2.5 w-20 h-5 rounded-full skeleton-box" />
              {/* Top Right Rating Skeleton */}
              <div className="absolute top-2.5 right-2.5 w-12 h-5 rounded-full skeleton-box" />
              {/* Bottom Left Delivery Time Skeleton */}
              <div className="absolute bottom-2.5 left-2.5 w-24 h-5 rounded-full skeleton-box" />
            </div>

            {/* Info Lines Placeholder */}
            <div className="p-3.5 sm:p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="h-5 skeleton-box rounded-lg w-3/5" />
                <div className="w-4 h-4 rounded-full skeleton-box" />
              </div>
              <div className="h-3.5 skeleton-box rounded-md w-2/5" />
              <div className="w-28 h-4 rounded-md skeleton-box mt-1" />
            </div>
          </div>

          {/* Action Button Placeholder */}
          <div className="p-3.5 sm:p-5 pt-0">
            <div className="h-10 rounded-xl bg-primary/10 border border-primary/20 w-full skeleton-box" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const MobileGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-bg-cardSec border border-glass rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col justify-between space-y-3 animate-pulse shadow-sm"
        >
          {/* Photo Placeholder */}
          <div className="w-full aspect-[16/10] rounded-xl sm:rounded-2xl skeleton-box relative overflow-hidden" />

          {/* Title & Subtext Lines */}
          <div className="space-y-2 px-0.5">
            <div className="h-4 skeleton-box rounded-md w-3/4" />
            <div className="h-3 skeleton-box rounded-md w-full" />
            <div className="h-3 skeleton-box rounded-md w-1/2" />
          </div>

          {/* Bottom Action Pill */}
          <div className="pt-2 border-t border-glass flex items-center justify-between">
            <div className="h-3.5 skeleton-box rounded-md w-20" />
            <div className="w-4 h-4 rounded-full skeleton-box" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DishCardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-bg-card border-2 border-glass rounded-3xl overflow-hidden shadow-md animate-pulse flex flex-col justify-between"
        >
          <div>
            {/* Food Image Banner Placeholder */}
            <div className="relative aspect-[16/10] w-full skeleton-box">
              {/* Top Left Veg Icon Skeleton */}
              <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-md skeleton-box" />
              {/* Top Right Rating Skeleton */}
              <div className="absolute top-2.5 right-2.5 w-12 h-5 rounded-md skeleton-box" />
            </div>

            {/* Content Body Placeholder */}
            <div className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 skeleton-box rounded-md w-1/3" />
                <div className="h-4 skeleton-box rounded-md w-16" />
              </div>
              <div className="h-5 skeleton-box rounded-lg w-3/4" />
              <div className="h-3.5 skeleton-box rounded-md w-full" />
              <div className="h-3.5 skeleton-box rounded-md w-2/3" />
            </div>
          </div>

          {/* Footer Placeholder */}
          <div className="px-4 py-3 border-t-2 border-glass flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-3 skeleton-box rounded w-10" />
              <div className="h-6 skeleton-box rounded-lg w-20" />
            </div>
            <div className="h-8 w-20 rounded-full skeleton-box" />
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
          className="bg-bg-cardSec border border-glass rounded-2xl p-3.5 sm:p-5 flex items-center justify-between gap-3 animate-pulse shadow-sm"
        >
          <div className="space-y-2 flex-1">
            <div className="h-4.5 skeleton-box rounded-md w-1/2" />
            <div className="h-3.5 skeleton-box rounded-md w-3/4" />
            <div className="h-4 skeleton-box rounded-md w-20 mt-1" />
          </div>

          {/* Item Image Thumbnail */}
          <div className="w-20 h-20 rounded-xl skeleton-box shrink-0 relative overflow-hidden" />
        </div>
      ))}
    </div>
  );
};

export const MobileOrderCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-bg-cardSec border border-glass rounded-3xl p-4 sm:p-5 space-y-4 animate-pulse shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-glass pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl skeleton-box" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 rounded-md skeleton-box" />
                <div className="h-3 w-20 rounded-md skeleton-box" />
              </div>
            </div>
            <div className="w-20 h-6 rounded-full skeleton-box" />
          </div>

          <div className="space-y-2">
            <div className="h-3.5 w-full rounded-md skeleton-box" />
            <div className="h-3.5 w-2/3 rounded-md skeleton-box" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-glass">
            <div className="h-5 w-24 rounded-md skeleton-box" />
            <div className="h-9 w-28 rounded-xl skeleton-box" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const CartPageSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 animate-pulse">
      {/* Left Column Cart Items Skeletons */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md skeleton-box" />
          <div className="h-5 w-44 rounded-lg skeleton-box" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="bg-bg-cardSec border border-glass rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl skeleton-box shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="h-4 w-32 rounded-md skeleton-box" />
                  <div className="h-3 w-20 rounded-md skeleton-box" />
                  <div className="h-4 w-24 rounded-md skeleton-box mt-1" />
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto pt-2 sm:pt-0">
                <div className="w-24 h-9 rounded-xl skeleton-box" />
                <div className="w-16 h-7 rounded-lg skeleton-box" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column Summary Skeleton */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-bg-cardSec border border-glass rounded-3xl p-6 space-y-5 shadow-luxury">
          <div className="h-6 w-36 rounded-lg skeleton-box border-b border-glass pb-4" />
          <div className="space-y-3 pt-2">
            <div className="h-10 w-full rounded-xl skeleton-box" />
            <div className="h-10 w-full rounded-xl skeleton-box" />
            <div className="h-20 w-full rounded-xl skeleton-box" />
          </div>
          <div className="pt-4 border-t border-glass space-y-2.5">
            <div className="h-4 w-full rounded-md skeleton-box" />
            <div className="h-4 w-full rounded-md skeleton-box" />
            <div className="h-7 w-full rounded-lg skeleton-box mt-2" />
          </div>
          <div className="h-12 w-full rounded-2xl skeleton-box mt-4" />
        </div>
      </div>
    </div>
  );
};

export const ProfileSkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Tab Switcher Skeleton */}
      <div className="p-1 bg-bg-cardSec/80 border border-glass rounded-2xl flex items-center h-12">
        <div className="flex-1 h-9 rounded-xl bg-glass-subtle skeleton-box" />
        <div className="flex-1 h-9 rounded-xl bg-glass-subtle ml-2 skeleton-box" />
      </div>

      {/* User Hero Profile Card Skeleton */}
      <div className="rounded-3xl bg-bg-cardSec border border-glass p-5 space-y-4 shadow-luxury relative overflow-hidden">
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 rounded-2xl skeleton-box shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-40 rounded-lg skeleton-box" />
            <div className="h-3.5 w-24 rounded-md skeleton-box" />
          </div>
        </div>
        <div className="pt-3 border-t border-glass flex justify-between items-center">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-48 rounded-md skeleton-box" />
            <div className="h-3.5 w-32 rounded-md skeleton-box" />
          </div>
          <div className="w-20 h-9 rounded-xl skeleton-box" />
        </div>
      </div>

      {/* Quick Action Grid Skeleton */}
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-bg-cardSec border border-glass flex flex-col items-center justify-center space-y-2 p-2">
            <div className="w-9 h-9 rounded-xl skeleton-box" />
            <div className="w-12 h-3 rounded-md skeleton-box" />
          </div>
        ))}
      </div>

      {/* Options Stack Skeleton */}
      <div className="space-y-2.5">
        <div className="h-14 rounded-2xl bg-bg-cardSec border border-glass skeleton-box" />
        <div className="h-14 rounded-2xl bg-bg-cardSec border border-glass skeleton-box" />
        <div className="h-14 rounded-2xl bg-bg-cardSec border border-glass skeleton-box" />
      </div>
    </div>
  );
};

