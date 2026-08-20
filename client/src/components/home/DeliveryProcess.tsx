import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Utensils, Zap, MapPin, ShieldCheck, HeartHandshake, Smile, Sparkles, CheckCircle2, Award, Star } from 'lucide-react';
import { TIMELINE_STEPS } from '../../utils/mockData';
import { DeliveryProcessSkeleton } from './HomePageSkeleton';

// Map icon names to Lucide icons
const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Utensils,
  Zap,
  MapPin,
  ShieldCheck,
  HeartHandshake,
  Smile
};

export const DeliveryProcess: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(timer);
  }, []);



  if (loading) return <DeliveryProcessSkeleton />;

  return (
    <section
      id="delivery-process"
      ref={containerRef}
      className="py-16 sm:py-24 lg:py-32 bg-bg-darkSec border-t border-glass relative overflow-hidden selection:bg-primary/30"
    >
      {/* Dynamic Background Glowing Spheres */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10">

        {/* Animated Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-8 sm:mb-24 space-y-1.5 sm:space-y-3"
        >
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-display text-gradient-gold tracking-tight leading-tight">
            Why Choose MK Delivery..!
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-text-muted font-medium max-w-xl mx-auto leading-relaxed">
            From hygienic kitchen preparation to temperature-sealed express transport, discover how we deliver happiness to your doorstep.
          </p>
        </motion.div>

        {/* Interactive Timeline Component Container */}
        <div className="relative mt-6 sm:mt-12 max-w-4xl mx-auto">
          {/* 100% Full-Height Solid Connecting Line (No Scroll Shift) */}
          <div className="absolute left-[14px] md:left-1/2 top-4 bottom-4 w-[2.5px] bg-primary -translate-x-[1.25px] z-10 shadow-[0_0_8px_var(--color-primary)] rounded-full" />

          {/* Timeline Step Cards */}
          <div className="space-y-10 sm:space-y-14 relative z-20">
            {TIMELINE_STEPS.map((step, idx) => {
              const isEven = idx % 2 === 0;
              const IconComp = iconMap[step.iconName] || Utensils;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col md:flex-row items-start ${
                    isEven ? 'md:flex-row-reverse' : ''
                  } relative group`}
                >
                  {/* Micro-sized Glowing Dot Anchor Node (Website Primary Theme) */}
                  <div className="absolute left-[14px] md:left-1/2 top-4 w-5 h-5 rounded-full bg-bg-dark border border-primary/50 flex items-center justify-center -translate-x-1/2 z-30 shadow-sm transition-all duration-300 group-hover:scale-125 group-hover:border-primary group-hover:shadow-[0_0_10px_var(--color-primary)]">
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0.3 }}
                      whileInView={{
                        scale: [0.7, 1.2, 1],
                        opacity: 1,
                        backgroundColor: 'var(--color-primary)',
                        boxShadow: '0 0 8px var(--color-primary)'
                      }}
                      viewport={{ once: false, margin: '-20px' }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                  </div>

                  {/* Original Compact Premium Card Content with Foodway Brown Accent Background */}
                  <div className={`w-full md:w-1/2 pl-10 md:pl-0 ${isEven ? 'md:pr-8 text-left md:text-right' : 'md:pl-8 text-left'}`}>
                    <div className="premium-card p-4 sm:p-5 inline-block w-full max-w-md relative group bg-gradient-to-br from-secondary/15 via-bg-cardSec to-secondary/10 border border-secondary/30 hover:border-primary/60 shadow-luxury transition-all duration-300">
                      {/* Card Header (Title on left, Tag Line Right-Aligned) */}
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-lg border ${step.iconBg || 'bg-primary/20 border-primary/40'} ${step.iconColor || 'text-primary'} flex items-center justify-center shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-110`}>
                            <IconComp size={15} />
                          </div>
                          <h3 className="font-display font-bold text-text-primary group-hover:text-primary transition-colors duration-300 tracking-tight text-xs sm:text-sm truncate">
                            {step.title}
                          </h3>
                        </div>

                        {/* Tagline Badge Right Aligned */}
                        <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-wider text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-md whitespace-nowrap ml-auto">
                          {step.timeEstimate}
                        </span>
                      </div>

                      <p className="text-[11px] sm:text-xs text-text-muted mt-1.5 leading-relaxed font-medium">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Spacer column for desktop symmetry */}
                  <div className="hidden md:block w-1/2" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DeliveryProcess;