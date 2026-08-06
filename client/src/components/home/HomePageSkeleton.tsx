import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'rounded-xl',
}) => {
  return (
    <div
      style={{ width, height }}
      className={`skeleton-box ${rounded} ${className}`}
    />
  );
};

export const CategoryCardSkeleton: React.FC = () => {
  return (
    <div className="glass-panel border border-glass rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 flex flex-col justify-between h-48 sm:h-56 md:h-64 shadow-luxury">
      <div className="space-y-2.5 sm:space-y-4">
        {/* Category Image Avatar */}
        <Skeleton className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl" />

        {/* Text Details */}
        <div className="space-y-1.5 sm:space-y-2">
          <Skeleton className="w-3/4 h-4 sm:h-5 rounded-md" />
          <Skeleton className="w-full h-3 sm:h-3.5 rounded-md" />
        </div>
      </div>

      {/* Footer item counter */}
      <div className="pt-2.5 sm:pt-4 md:pt-5 border-t border-glass flex justify-between items-center">
        <Skeleton className="w-16 sm:w-24 h-3 sm:h-3.5 rounded-md" />
        <Skeleton className="w-3 sm:w-4 h-3 sm:h-4 rounded-full" />
      </div>
    </div>
  );
};

export const HomeDishCardSkeleton: React.FC = () => {
  return (
    <div className="glass-panel border border-glass rounded-3xl overflow-hidden shadow-luxury flex flex-col justify-between h-[450px]">
      {/* Food Image Skeleton */}
      <div className="relative h-56 shrink-0 skeleton-box">
        <div className="absolute top-4 left-4">
          <Skeleton className="w-24 h-6 rounded-lg" />
        </div>
        <div className="absolute top-4 right-4">
          <Skeleton className="w-24 h-6 rounded-lg" />
        </div>
        <div className="absolute bottom-3 left-4">
          <Skeleton className="w-20 h-7 rounded-lg" />
        </div>
      </div>

      {/* Card Details Skeleton */}
      <div className="p-6 flex flex-col justify-between flex-grow bg-bg-darkSec space-y-4">
        <div className="space-y-3">
          <Skeleton className="w-4/5 h-6 rounded-lg" />
          <Skeleton className="w-full h-4 rounded-md" />
          <Skeleton className="w-2/3 h-4 rounded-md" />
        </div>

        <div className="pt-4 border-t border-glass flex items-center justify-between">
          <Skeleton className="w-32 h-4 rounded-md" />
          <Skeleton className="w-28 h-9 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export default HomeDishCardSkeleton;
