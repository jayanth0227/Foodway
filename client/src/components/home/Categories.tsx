import React from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../../utils/mockData';

export const Categories: React.FC = () => {
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
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 20 } },
  };

  return (
    <section id="categories" className="py-24 bg-bg-dark border-t border-glass relative">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 space-y-4 md:space-y-0">
          <div className="space-y-4 text-center md:text-left">
            <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
              Curate Your Appetite
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-gradient-gold">
              Elite Categories
            </h2>
          </div>
          <p className="text-sm text-text-muted max-w-md text-center md:text-left">
            Select from our refined classifications of culinary styles, each prepared by specialised masters of the craft.
          </p>
        </div>

        {/* Categories Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {CATEGORIES.map((category) => (
            <motion.div
              key={category.id}
              variants={itemVariants}
              whileHover={{
                y: -8,
                boxShadow: '0 15px 35px rgba(197, 138, 106, 0.15)',
                borderColor: 'rgba(197, 138, 106, 0.3)',
              }}
              className="group relative overflow-hidden rounded-2xl bg-bg-card border border-glass p-5 flex flex-col justify-between transition-all duration-500 cursor-pointer"
            >
              {/* Card background glowing indicator */}
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/5 blur-[25px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="space-y-4">
                {/* Rounded Image Container */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border border-glass group-hover:border-primary/30 transition-colors duration-500">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>

                {/* Text Description */}
                <div>
                  <h3 className="font-display font-semibold text-text-primary group-hover:text-primary transition-colors text-base">
                    {category.name}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {category.description}
                  </p>
                </div>
              </div>

              {/* Footer item counter */}
              <div className="flex items-center justify-between pt-6 border-t border-glass/40 mt-6 text-text-muted group-hover:text-text-secondary transition-colors text-[11px] font-semibold tracking-wide">
                <span>{category.itemCount} Selections</span>
                <span className="text-primary group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
export default Categories;
