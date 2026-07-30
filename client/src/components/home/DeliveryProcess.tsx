import React, { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { TIMELINE_STEPS } from '../../utils/mockData';

export const DeliveryProcess: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track scroll inside the timeline container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start center', 'end center'],
  });

  // Smooth scroll progression line
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <section
      id="delivery-process"
      ref={containerRef}
      className="py-16 md:py-20 lg:py-30 bg-bg-darkSec border-t border-glass relative"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
            Bespoke Logistics
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-gradient-gold">
            The Gourmet Journey
          </h2>
          <p className="text-xs md:text-sm text-text-secondary font-medium">
            Follow the meticulous progression of your gourmet order, from organic prep to temperature-sealed delivery.
          </p>
        </div>

        {/* Timeline Component Container */}
        <div className="relative mt-16 max-w-4xl mx-auto">
          {/* Vertical progress bar line */}
          <div className="absolute left-[16px] md:left-1/2 top-0 bottom-0 w-[2px] bg-glass-subtle -translate-x-[1px]" />
          
          <motion.div
            style={{ scaleY }}
            className="absolute left-[16px] md:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary to-accent -translate-x-[1px] origin-top z-10"
          />

          {/* Steps list */}
          <div className="space-y-16 relative z-20">
            {TIMELINE_STEPS.map((step, idx) => {
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col md:flex-row items-start ${
                    isEven ? 'md:flex-row-reverse' : ''
                  } relative`}
                >
                  {/* Glowing bubble anchor */}
                  <div className="absolute left-[16px] md:left-1/2 w-8.5 h-8.5 rounded-full bg-bg-card border border-glass group flex items-center justify-center -translate-x-1/2 z-20 shadow-md">
                    <motion.div
                      initial={{ scale: 0.7, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                      whileInView={{
                        scale: 1,
                        backgroundColor: 'var(--color-primary)',
                        boxShadow: '0 0 15px var(--color-primary)',
                      }}
                      viewport={{ once: false, margin: '-100px 0px -50% 0px' }}
                      transition={{ duration: 0.5 }}
                      className="w-3.5 h-3.5 rounded-full"
                    />
                  </div>

                  {/* Card Content Column */}
                  <div className={`w-full md:w-1/2 pl-12 md:pl-0 ${isEven ? 'md:pr-12 text-left md:text-right' : 'md:pl-12 text-left'}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 25, scale: 0.98 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as any }}
                      className="premium-card p-6 inline-block w-full max-w-md relative group"
                    >
                      {/* Card Header (Title & Badge side-by-side) */}
                      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5 ${isEven ? 'sm:flex-row-reverse' : ''}`}>
                        <h3 className="font-display font-bold text-text-primary group-hover:text-primary transition-colors duration-300 tracking-tight text-sm sm:text-base">
                          {step.title}
                        </h3>
                        <span className="self-start sm:self-center text-[9px] font-bold uppercase tracking-wider text-primary bg-glass-subtle border border-primary/20 px-2.5 py-1 rounded-md whitespace-nowrap">
                          {step.timeEstimate}
                        </span>
                      </div>

                      <p className="text-xs text-text-muted mt-2 leading-relaxed font-medium">
                        {step.description}
                      </p>
                    </motion.div>
                  </div>

                  {/* Spacer column for desktop */}
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
