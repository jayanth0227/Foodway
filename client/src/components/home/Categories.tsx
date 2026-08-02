import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Utensils } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/public/categories`);
        if (response.data.success && Array.isArray(response.data.categories)) {
          setCategories(response.data.categories);
        } else {
          setCategories([]);
        }
      } catch (err) {
        console.warn('Error fetching categories from DB:', err);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <section id="categories" className="py-16 md:py-20 lg:py-30 bg-bg-dark border-t border-glass relative">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 space-y-4 md:space-y-0">
          <div className="space-y-4 text-center md:text-left">
           
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-gradient-gold">
              Explore Our Categories. 
            </h2>
          </div>
          <p className="text-xs md:text-sm text-text-secondary font-medium max-w-md text-center md:text-left">
             From breakfast to desserts, browse everything you need from trusted restaurants and stores across Konaseema. 
 
          </p>
        </div>

        {/* Categories Grid */}
        {categories.length === 0 ? (
          <div className="text-center py-12 glass-panel border border-glass rounded-2xl p-8 max-w-md mx-auto space-y-2">
            <Utensils size={36} className="mx-auto text-text-muted opacity-50" />
            <h3 className="font-bold text-base text-text-primary">No Database Categories Found</h3>
            <p className="text-xs text-text-muted">Categories added by partner restaurants will automatically appear here.</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {categories.map((category) => (
              <motion.div
                key={category.id}
                variants={itemVariants}
                className="group premium-card p-6 flex flex-col justify-between cursor-pointer"
              >
                {/* Card background glowing indicator */}
                <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-primary/5 blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="space-y-4">
                  {/* Rounded Image Container */}
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border border-glass group-hover:border-primary/40 group-hover:shadow-[0_0_20px_rgba(197,147,99,0.15)] transition-all duration-500">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>

                  {/* Text Description */}
                  <div>
                    <h3 className="font-display font-bold text-text-primary group-hover:text-primary transition-colors text-base tracking-tight duration-300">
                      {category.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-1.5 leading-relaxed font-medium">
                      {category.description}
                    </p>
                  </div>
                </div>

                {/* Footer item counter */}
                <div className="flex items-center justify-between pt-5 border-t border-glass mt-5 text-text-muted group-hover:text-text-secondary transition-colors text-[10px] font-bold tracking-wider uppercase">
                  <span>{category.itemCount} Selections</span>
                  <ArrowRight size={12} className="text-primary group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};
export default Categories;
