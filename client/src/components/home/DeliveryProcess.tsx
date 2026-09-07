import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Zap, MapPin, ShieldCheck, Utensils, HeartHandshake, Smile } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';

const ICON_MAP: Record<string, any> = {
  Utensils,
  Zap,
  MapPin,
  ShieldCheck,
  HeartHandshake,
  Smile,
  Package
};

const DEFAULT_FEATURES = [
  {
    id: 1,
    title: 'Fresh & Quality Food',
    badge: 'FRESH',
    description: 'We partner with trusted local restaurants to ensure every meal is prepared fresh and delivered with care.',
    Icon: Utensils,
    iconBg: 'bg-orange-500/15 border-orange-500/30',
    iconColor: 'text-orange-500'
  },
  {
    id: 2,
    title: 'Fast Delivery',
    badge: '20–30 MINS',
    description: 'Get your favorite food, groceries, and daily essentials delivered quickly to your doorstep without unnecessary waiting.',
    Icon: Zap,
    iconBg: 'bg-amber-400/15 border-amber-400/30',
    iconColor: 'text-amber-400'
  },
  {
    id: 3,
    title: 'Live Order Tracking',
    badge: 'LIVE',
    description: 'Track your order in real time from restaurant confirmation until it reaches your doorstep.',
    Icon: MapPin,
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400'
  },
  {
    id: 4,
    title: 'Safe & Reliable Delivery',
    badge: 'SAFE',
    description: 'Every order is packed carefully and delivered safely by trusted delivery partners because your trust is our responsibility.',
    Icon: ShieldCheck,
    iconBg: 'bg-indigo-500/15 border-indigo-500/30',
    iconColor: 'text-indigo-400'
  },
  {
    id: 5,
    title: 'Local Service You Can Trust',
    badge: 'TRUSTED',
    description: 'Proudly serving families across Konaseema with reliable delivery and friendly customer support every day.',
    Icon: HeartHandshake,
    iconBg: 'bg-rose-500/15 border-rose-500/30',
    iconColor: 'text-rose-400'
  },
  {
    id: 6,
    title: 'Customer Happiness',
    badge: 'HAPPY',
    description: 'Your smile after every delivery is what motivates us to serve you better every day.',
    Icon: Smile,
    iconBg: 'bg-purple-500/15 border-purple-500/30',
    iconColor: 'text-purple-400'
  }
];

export const DeliveryProcess: React.FC = () => {
  const [cmsConfig, setCmsConfig] = useState<{ title?: string; subtitle?: string; features?: any[] }>({
    title: 'Why Choose MK Delivery..!',
    subtitle: 'From hygienic kitchen preparation to temperature-sealed express transport, discover how we deliver happiness to your doorstep.',
    features: DEFAULT_FEATURES
  });

  useEffect(() => {
    const fetchCMS = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/cms/homepage`);
        if (res.data?.success && res.data?.cms?.whyChooseUs) {
          const cmsData = res.data.cms.whyChooseUs;
          setCmsConfig({
            title: cmsData.title || 'Why Choose MK Delivery..!',
            subtitle: cmsData.subtitle || 'From hygienic kitchen preparation to temperature-sealed express transport, discover how we deliver happiness to your doorstep.',
            features: Array.isArray(cmsData.features) && cmsData.features.length > 0 ? cmsData.features : DEFAULT_FEATURES
          });
        }
      } catch (err) {
        // Fallback to default multi-essential config
      }
    };
    fetchCMS();
  }, []);

  const featureIcons = [Utensils, Zap, MapPin, ShieldCheck, HeartHandshake, Smile];
  const iconBgs = [
    'bg-orange-500/15 border-orange-500/30',
    'bg-amber-400/15 border-amber-400/30',
    'bg-emerald-500/15 border-emerald-500/30',
    'bg-indigo-500/15 border-indigo-500/30',
    'bg-rose-500/15 border-rose-500/30',
    'bg-purple-500/15 border-purple-500/30'
  ];
  const iconColors = ['text-orange-500', 'text-amber-400', 'text-emerald-400', 'text-indigo-400', 'text-rose-400', 'text-purple-400'];

  const displayFeatures = (cmsConfig.features || DEFAULT_FEATURES).map((f: any, idx: number) => {
    const IconComp = (f.iconName && ICON_MAP[f.iconName]) || DEFAULT_FEATURES[idx]?.Icon || featureIcons[idx % featureIcons.length];
    const iconBg = f.iconBg || DEFAULT_FEATURES[idx]?.iconBg || iconBgs[idx % iconBgs.length];
    const iconColor = f.iconColor || DEFAULT_FEATURES[idx]?.iconColor || iconColors[idx % iconColors.length];
    return {
      id: f.id || `feat_${idx}`,
      title: f.title,
      badge: f.badge || f.timeEstimate || 'EXPRESS',
      description: f.description,
      Icon: IconComp,
      iconBg,
      iconColor
    };
  });

  return (
    <section
      id="delivery-process"
      className="py-16 sm:py-24 lg:py-32 bg-bg-darkSec border-t border-glass relative overflow-hidden selection:bg-primary/30"
    >
      {/* Background Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-8 sm:mb-24 space-y-1.5 sm:space-y-3"
        >
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-display text-gradient-gold tracking-tight leading-tight">
            {cmsConfig.title}
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-text-muted font-medium max-w-xl mx-auto leading-relaxed">
            {cmsConfig.subtitle}
          </p>
        </motion.div>

        {/* Timeline Steps Container */}
        <div className="relative mt-6 sm:mt-12 max-w-4xl mx-auto">
          {/* Solid Connecting Line */}
          <div className="absolute left-[14px] md:left-1/2 top-4 bottom-4 w-[2.5px] bg-primary -translate-x-[1.25px] z-10 shadow-[0_0_8px_var(--color-primary)] rounded-full" />

          {/* Timeline Step Cards */}
          <div className="space-y-10 sm:space-y-14 relative z-20">
            {displayFeatures.map((step, idx) => {
              const isEven = idx % 2 === 0;
              const IconComp = step.Icon;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col md:flex-row items-start ${
                    isEven ? 'md:flex-row-reverse' : ''
                  } relative group`}
                >
                  {/* Micro Glowing Anchor Dot */}
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

                  {/* Premium Card Content */}
                  <div className={`w-full md:w-1/2 pl-10 md:pl-0 ${isEven ? 'md:pr-8 text-left md:text-right' : 'md:pl-8 text-left'}`}>
                    <div className="premium-card p-4 sm:p-5 inline-block w-full max-w-md relative group bg-gradient-to-br from-secondary/15 via-bg-cardSec to-secondary/10 border border-secondary/30 hover:border-primary/60 shadow-luxury transition-all duration-300">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-lg border ${step.iconBg} ${step.iconColor} flex items-center justify-center shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-110`}>
                            <IconComp size={15} />
                          </div>
                          <h3 className="font-display font-bold text-text-primary group-hover:text-primary transition-colors duration-300 tracking-tight text-xs sm:text-sm truncate">
                            {step.title}
                          </h3>
                        </div>

                        <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-wider text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-md whitespace-nowrap ml-auto">
                          {step.badge}
                        </span>
                      </div>

                      <p className="text-[11px] sm:text-xs text-text-muted mt-1.5 leading-relaxed font-medium">
                        {step.description}
                      </p>
                    </div>
                  </div>

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