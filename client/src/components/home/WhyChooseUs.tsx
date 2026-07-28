import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  IoBicycleOutline,
  IoLeafOutline,
  IoRibbonOutline,
  IoShieldCheckmarkOutline,
  IoNavigateOutline,
  IoHeadsetOutline,
} from 'react-icons/io5';

interface FeatureCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FEATURES: FeatureCard[] = [
  {
    id: 'feat-1',
    icon: <IoBicycleOutline size={26} />,
    title: 'Express Logistics',
    description: 'Bespoke couriers deliver your meals hot and fresh in under 30 minutes with active route optimization.',
  },
  {
    id: 'feat-2',
    icon: <IoLeafOutline size={26} />,
    title: 'Pristine Freshness',
    description: 'We source zero-compromise, fresh ingredients, packing meals hermetically to retain flavor integrity.',
  },
  {
    id: 'feat-3',
    icon: <IoRibbonOutline size={26} />,
    title: 'Premium Partnerships',
    description: 'Collaborating exclusively with Michelin-recommended kitchens and top luxury chefs of the city.',
  },
  {
    id: 'feat-4',
    icon: <IoShieldCheckmarkOutline size={26} />,
    title: 'Secure Payments',
    description: 'Encrypted end-to-end luxury payment gates supporting standard cards, Apple Pay, and cryptocurrency.',
  },
  {
    id: 'feat-5',
    icon: <IoNavigateOutline size={26} />,
    title: 'Live Fleet Tracking',
    description: 'Precision GPS satellite telemetry lets you monitor your white-glove courier’s trajectory in real-time.',
  },
  {
    id: 'feat-6',
    icon: <IoHeadsetOutline size={26} />,
    title: '24x7 Royal Support',
    description: 'Dedicated estate concierges ready to address any modifications or custom requirements at any hour.',
  },
];

export const WhyChooseUs: React.FC = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 120 } },
  };

  return (
    <section id="why-choose" ref={ref} className="py-24 bg-bg-dark border-t border-glass relative">
      {/* Glow backgrounds */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-accent/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
            The MK Standard
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-gradient-gold">
            Why Dine With Us
          </h2>
          <p className="text-sm text-text-muted">
            We transcend simple delivery services, delivering a complete, high-fidelity fine dining standard directly to your estate.
          </p>
        </div>

        {/* Feature Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {FEATURES.map((feat) => (
            <motion.div
              key={feat.id}
              variants={itemVariants}
              whileHover={{
                y: -6,
                borderColor: 'rgba(197, 138, 106, 0.25)',
                boxShadow: '0 15px 30px rgba(197, 138, 106, 0.08)',
              }}
              className="group relative overflow-hidden rounded-2xl bg-bg-card border border-glass p-8 flex flex-col items-start transition-all duration-300"
            >
              {/* Card background ambient glow on hover */}
              <div className="absolute top-0 left-0 w-20 h-20 rounded-full bg-primary/5 blur-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Icon Container */}
              <div className="w-12 h-12 rounded-xl bg-glass-subtle border border-glass flex items-center justify-center text-primary group-hover:text-black group-hover:bg-primary transition-all duration-300 mb-6 shadow-md">
                {feat.icon}
              </div>

              {/* Text */}
              <h3 className="font-display font-semibold text-lg text-text-primary group-hover:text-primary transition-colors">
                {feat.title}
              </h3>
              <p className="text-sm text-text-muted mt-3 leading-relaxed">
                {feat.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
export default WhyChooseUs;
