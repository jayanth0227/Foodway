import React, { useEffect, useState, useMemo } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { deliveryLocationService } from '../../services/deliveryLocation.service';
import type { DeliveryLocation } from '../../types/deliveryLocation';
import { DeliveryLocationsSkeleton } from './HomePageSkeleton';

export const DeliveryLocations: React.FC = () => {
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    deliveryLocationService
      .getPublicLocations()
      .then((data) => {
        setLocations(data);
      })
      .catch((err) => console.error('Failed to fetch delivery locations:', err))
      .finally(() => setLoading(false));
  }, []);

  // Multiply items list for infinite smooth marquee scrolling
  const marqueeItems = useMemo(() => {
    if (locations.length === 0) return [];
    return [...locations, ...locations, ...locations, ...locations];
  }, [locations]);

  if (loading) return <DeliveryLocationsSkeleton />;
  if (locations.length === 0) return null;


  return (
    <div className="py-4 sm:py-5 bg-gradient-to-r from-bg-dark/95 via-bg-darkSec/90 to-bg-dark/95 border-y border-glass/60 backdrop-blur-xl overflow-hidden relative select-none shadow-2xl">
      {/* Left Fade Mask */}
      <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-bg-dark via-bg-dark/80 to-transparent z-10 pointer-events-none" />
      {/* Right Fade Mask */}
      <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-bg-dark via-bg-dark/80 to-transparent z-10 pointer-events-none" />

      {/* Pure Continuous Auto-Scrolling Ribbon with Larger Luxury Cards */}
      <div className="animate-marquee-slow flex items-center gap-5 sm:gap-7 hover:[animation-play-state:paused]">
        {marqueeItems.map((loc, idx) => (
          <div
            key={`${loc.locationId}-${idx}`}
            className="flex items-center gap-3.5 px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-glass-subtle border border-glass/80 hover:border-primary/60 hover:bg-glass hover:scale-105 shadow-xl transition-all duration-300 shrink-0 cursor-pointer group"
          >
            {/* Location Pin Icon in Glow Box */}
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-black transition-all">
              <MapPin size={18} />
            </div>

            {/* Location Info & Region */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black font-display tracking-tight text-text-primary group-hover:text-primary transition-colors whitespace-nowrap">
                  {loc.name}
                </span>
                
                {/* Active Light Green Badge */}
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted flex items-center gap-1">
                  <Navigation size={10} className="text-primary" />
                  <span>{loc.region}</span>
                </span>
                {loc.pincode && (
                  <span className="text-[10px] font-mono text-text-muted/80 bg-bg-dark/70 px-1.5 py-0.2 rounded border border-glass">
                    PIN: {loc.pincode}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeliveryLocations;
