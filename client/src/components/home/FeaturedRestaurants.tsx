import React from 'react';
import { motion } from 'framer-motion';
import { Star, Clock, MapPin } from 'lucide-react';
import { RESTAURANTS } from '../../utils/mockData';

export const FeaturedRestaurants: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <section id="featured-restaurants" className="py-16 md:py-20 lg:py-30 bg-bg-darkSec border-t border-glass relative">
      {/* Ambient background decoration */}
      <div className="absolute top-1/2 left-0 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 space-y-4 md:space-y-0">
          <div className="space-y-4 text-center md:text-left">
            <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
              Michelin Partners
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-gradient-gold">
              Featured Establishments
            </h2>
          </div>
          <p className="text-xs md:text-sm text-text-secondary font-medium max-w-md text-center md:text-left">
            Dine from the city's most prestigious culinary kitchens, vetted for exceptional flavor profiles and hygiene standards.
          </p>
        </div>

        {/* Restaurant List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {RESTAURANTS.map((res) => (
            <motion.div
              key={res.id}
              variants={cardVariants}
              className="group premium-card cursor-pointer relative flex flex-col h-[430px]"
            >
              {/* Image Container with zoom */}
              <div className="relative h-56 overflow-hidden shrink-0 border-b border-glass">
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10" />
                <img
                  src={res.image}
                  alt={res.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.2s] ease-out"
                />

                {/* Offer Badge overlays */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="bg-primary/95 text-black text-[9px] font-extrabold uppercase px-3 py-1.5 rounded-lg tracking-widest shadow-lg">
                    {res.offerBadge}
                  </span>
                </div>

                {/* Popularity badge */}
                {res.isPopular && (
                  <div className="absolute top-4 right-4 z-20">
                    <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[9px] font-extrabold uppercase px-3 py-1 rounded-lg tracking-widest shadow-lg">
                      Elite Choice
                    </span>
                  </div>
                )}
              </div>

              {/* Card Details */}
              <div className="p-6 flex flex-col justify-between flex-grow">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                      {res.cuisine}
                    </span>
                    {/* Rating badge */}
                    <div className="flex items-center space-x-1 bg-glass-subtle border border-primary/20 px-2.5 py-1 rounded-lg">
                      <Star className="text-[#FBBF24] fill-[#FBBF24]" size={11} />
                      <span className="text-[11px] font-bold text-text-primary">{res.rating}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold font-display text-text-primary mt-3 group-hover:text-primary transition-colors duration-300">
                    {res.name}
                  </h3>
                </div>

                {/* Restaurant Meta footer */}
                <div className="flex items-center justify-between pt-5 border-t border-glass text-text-muted text-[11px] font-semibold uppercase tracking-wider">
                  <div className="flex items-center space-x-1.5">
                    <Clock size={13} className="text-primary" />
                    <span>{res.deliveryTime}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin size={13} className="text-primary" />
                    <span>{res.distance}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
export default FeaturedRestaurants;
