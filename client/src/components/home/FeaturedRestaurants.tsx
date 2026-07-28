import React from 'react';
import { motion } from 'framer-motion';
import { IoStar, IoTimeOutline, IoLocationOutline } from 'react-icons/io5';
import { RESTAURANTS } from '../../utils/mockData';

export const FeaturedRestaurants: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22 } },
  };

  return (
    <section id="featured-restaurants" className="py-24 bg-bg-darkSec border-t border-glass relative">
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
          <p className="text-sm text-text-muted max-w-md text-center md:text-left">
            Dine from the city's most prestigious culinary kitchens, vetted for exceptional flavor profiles and hygiene standards.
          </p>
        </div>

        {/* Restaurant List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {RESTAURANTS.map((res) => (
            <motion.div
              key={res.id}
              variants={cardVariants}
              whileHover={{ y: -8 }}
              className="group overflow-hidden rounded-2xl bg-bg-card border border-glass transition-all duration-500 cursor-pointer shadow-luxury hover:shadow-luxury-hover relative flex flex-col h-[420px]"
            >
              {/* Image Container with zoom */}
              <div className="relative h-56 overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                <img
                  src={res.image}
                  alt={res.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Offer Badge overlays */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="bg-primary/95 text-black text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-lg tracking-wider shadow-lg">
                    {res.offerBadge}
                  </span>
                </div>

                {/* Popularity badge */}
                {res.isPopular && (
                  <div className="absolute top-4 right-4 z-20">
                    <span className="bg-accent/95 text-white text-[9px] font-bold uppercase px-2.5 py-1 rounded-md tracking-wider shadow-lg">
                      Elite Choice
                    </span>
                  </div>
                )}
              </div>

              {/* Card Details */}
              <div className="p-6 flex flex-col justify-between flex-grow">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {res.cuisine}
                    </span>
                    {/* Rating badge */}
                    <div className="flex items-center space-x-1.5 bg-glass-subtle border border-glass px-2.5 py-1 rounded-lg">
                      <IoStar className="text-[#FBBF24]" size={12} />
                      <span className="text-xs font-bold text-text-primary">{res.rating}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold font-display text-text-primary mt-3 group-hover:text-primary transition-colors">
                    {res.name}
                  </h3>
                </div>

                {/* Restaurant Meta footer */}
                <div className="flex items-center justify-between pt-6 border-t border-glass/40 text-text-muted text-xs font-medium">
                  <div className="flex items-center space-x-1.5">
                    <IoTimeOutline size={15} className="text-primary" />
                    <span>{res.deliveryTime}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <IoLocationOutline size={15} className="text-primary" />
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
