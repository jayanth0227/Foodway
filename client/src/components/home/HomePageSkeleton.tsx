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

export const HeroSkeleton: React.FC = () => {
  return (
    <div className="relative min-h-[85vh] sm:min-h-screen flex items-center justify-center pt-20 sm:pt-28 pb-12 sm:pb-20 overflow-hidden bg-bg-dark bg-cover select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-16 items-center w-full relative z-10">
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          {/* Tagline Pill Skeleton */}
          <Skeleton className="w-48 h-7 rounded-full mx-auto lg:mx-0" />
          
          {/* Large Heading Skeleton Lines */}
          <div className="space-y-3">
            <Skeleton className="w-full h-10 sm:h-14 rounded-2xl" />
            <Skeleton className="w-4/5 h-10 sm:h-14 rounded-2xl mx-auto lg:mx-0" />
          </div>

          {/* Search Box Skeleton */}
          <Skeleton className="w-full max-w-lg h-14 sm:h-16 rounded-2xl mx-auto lg:mx-0 mt-4" />

          {/* CTA Buttons Skeleton */}
          <div className="flex items-center justify-center lg:justify-start gap-4 pt-2">
            <Skeleton className="w-36 h-12 rounded-2xl" />
            <Skeleton className="w-36 h-12 rounded-2xl" />
          </div>
        </div>

        {/* Right Graphic/Video Container Skeleton */}
        <div className="lg:col-span-5 hidden lg:block">
          <Skeleton className="w-full h-96 rounded-3xl" />
        </div>
      </div>
    </div>
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

export const DeliveryLocationsSkeleton: React.FC = () => {
  return (
    <div className="py-4 sm:py-5 bg-gradient-to-r from-bg-dark/95 via-bg-darkSec/90 to-bg-dark/95 border-y border-glass/60 backdrop-blur-xl overflow-hidden relative shadow-2xl">
      <div className="flex items-center gap-5 sm:gap-7 px-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-glass-subtle border border-glass/80 shrink-0">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="w-28 h-4 rounded-md" />
              <Skeleton className="w-20 h-3 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DeliveryProcessSkeleton: React.FC = () => {
  return (
    <section className="py-16 md:py-20 bg-bg-darkSec border-t border-glass relative">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <Skeleton className="w-64 h-8 rounded-xl mx-auto" />
          <Skeleton className="w-full h-4 rounded-md mx-auto" />
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col md:flex-row items-center gap-6">
              <Skeleton className="w-full md:w-1/2 h-36 rounded-3xl" />
              <Skeleton className="hidden md:block w-1/2 h-36 rounded-3xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const TestimonialsSkeleton: React.FC = () => {
  return (
    <section className="py-16 md:py-20 bg-bg-dark border-t border-glass relative">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Skeleton className="w-40 h-4 rounded-md mx-auto" />
          <Skeleton className="w-72 h-8 rounded-xl mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[1, 2].map((i) => (
            <div key={i} className="border border-glass rounded-3xl p-8 space-y-4 bg-glass-subtle">
              <Skeleton className="w-3/4 h-5 rounded-md" />
              <Skeleton className="w-full h-4 rounded-md" />
              <Skeleton className="w-2/3 h-4 rounded-md" />
              <div className="pt-4 border-t border-glass flex items-center justify-between">
                <Skeleton className="w-32 h-4 rounded-md" />
                <Skeleton className="w-20 h-4 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const FAQSkeleton: React.FC = () => {
  return (
    <section className="py-16 md:py-20 bg-bg-darkSec border-t border-glass relative">
      <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10 space-y-4">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Skeleton className="w-64 h-8 rounded-xl mx-auto" />
          <Skeleton className="w-full h-4 rounded-md mx-auto" />
        </div>

        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="w-full h-16 rounded-2xl" />
        ))}
      </div>
    </section>
  );
};

export const NewsletterSkeleton: React.FC = () => {
  return (
    <section className="py-16 md:py-20 bg-bg-dark border-t border-glass relative">
      <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10">
        <div className="glass-panel p-8 md:p-14 text-center space-y-6">
          <Skeleton className="w-36 h-4 rounded-md mx-auto" />
          <Skeleton className="w-72 h-8 rounded-xl mx-auto" />
          <Skeleton className="w-full max-w-lg h-4 rounded-md mx-auto" />
          <Skeleton className="w-full max-w-md h-14 rounded-2xl mx-auto" />
        </div>
      </div>
    </section>
  );
};

export default HomeDishCardSkeleton;
