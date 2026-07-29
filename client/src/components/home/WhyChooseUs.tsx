import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Truck, Leaf, Award, ShieldCheck, Compass, Headphones } from 'lucide-react';

interface FeatureCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FEATURES: FeatureCard[] = [
  {
    id: 'feat-1',
    icon: <Truck size={22} />,
    title: 'Express Logistics',
    description: 'Bespoke couriers deliver your meals hot and fresh in under 30 minutes with active route optimization.',
  },
  {
    id: 'feat-2',
    icon: <Leaf size={22} />,
    title: 'Pristine Freshness',
    description: 'We source zero-compromise, fresh ingredients, packing meals hermetically to retain flavor integrity.',
  },
  {
    id: 'feat-3',
    icon: <Award size={22} />,
    title: 'Premium Partnerships',
    description: 'Collaborating exclusively with Michelin-recommended kitchens and top luxury chefs of the city.',
  },
  {
    id: 'feat-4',
    icon: <ShieldCheck size={22} />,
    title: 'Secure Payments',
    description: 'Encrypted end-to-end luxury payment gates supporting standard cards, Apple Pay, and cryptocurrency.',
  },
  {
    id: 'feat-5',
    icon: <Compass size={22} />,
    title: 'Live Fleet Tracking',
    description: 'Precision GPS satellite telemetry lets you monitor your white-glove courier’s trajectory in real-time.',
  },
  {
    id: 'feat-6',
    icon: <Headphones size={22} />,
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
        staggerChildren: 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <section id="why-choose" ref={ref} className="py-16 md:py-20 lg:py-30 bg-bg-dark border-t border-glass relative">
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
          <p className="text-xs md:text-sm text-text-secondary font-medium">
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
              className="group premium-card p-8 flex flex-col items-start"
            >
              {/* Card background ambient glow on hover */}
              <div className="absolute top-0 left-0 w-20 h-20 rounded-full bg-primary/5 blur-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Icon Container */}
              <div className="w-12 h-12 rounded-xl bg-glass-subtle border border-primary/20 flex items-center justify-center text-primary group-hover:text-black group-hover:bg-primary transition-all duration-500 mb-6 shadow-md group-hover:shadow-[0_0_15px_rgba(197,147,99,0.3)]">
                {feat.icon}
              </div>

              {/* Text */}
              <h3 className="font-display font-bold text-lg text-text-primary group-hover:text-primary transition-colors duration-300 tracking-tight">
                {feat.title}
              </h3>
              <p className="text-xs text-text-muted mt-3 leading-relaxed font-medium">
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
