import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Utensils } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';
import { CategoryCardSkeleton } from './HomePageSkeleton';
import { useNavigate } from "react-router-dom";
import { useLanguage } from '../../context/LanguageContext';
import { getMergedCategories, getTranslatedCategoryName } from '../../utils/categoryUtils';

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/public/categories`);
        const dbCats = response.data.success && Array.isArray(response.data.categories) ? response.data.categories : [];
        setCategories(getMergedCategories(dbCats));
      } catch (err) {
        console.warn('Error fetching categories from DB:', err);
        setCategories(getMergedCategories([]));
      } finally {
        setLoading(false);
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
    <section id="categories" className="py-8 sm:py-12 md:py-16 bg-bg-dark border-t border-glass relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 relative z-10">

        {/* Section Header */}
        <div className="flex items-end justify-between mb-4 sm:mb-6 pb-3 border-b border-glass/40 gap-3">
          <div className="space-y-1 text-left max-w-xl">
            <h2 className="text-lg sm:text-3xl md:text-4xl font-extrabold font-display text-gradient-gold tracking-tight">
              Discover Stores & Cuisines
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary font-medium leading-relaxed mt-0.5">
              Browse food, groceries, bakery, fruits, beverages, and more from trusted local partners.
            </p>
          </div>

          <button
            onClick={() => navigate('/categories')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 border border-primary/25 hover:border-primary hover:bg-primary/20 text-primary font-black text-[11px] sm:text-xs tracking-wider uppercase transition-all duration-300 shadow-sm hover:scale-105 group shrink-0 cursor-pointer"
          >
            <span>See All</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[1, 2, 3, 4].map(i => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 sm:py-12 glass-panel border border-glass rounded-2xl p-6 sm:p-8 max-w-md mx-auto space-y-2">
            <Utensils size={32} className="mx-auto text-text-muted opacity-50" />
            <h3 className="font-bold text-sm sm:text-base text-text-primary">No Categories Found</h3>
            <p className="text-xs text-text-muted">Categories added by partner restaurants will automatically appear here.</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
          >
            {categories.slice(0, 8).map((category) => {
              const cleanName = (category.name || '').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
              const cleanDesc = (category.description || '').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

              return (
                <motion.div
                  key={category.id || category.name}
                  variants={itemVariants}
                  className="group premium-card p-3.5 sm:p-5 md:p-6 flex flex-col justify-between cursor-pointer rounded-2xl sm:rounded-3xl border border-glass hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-luxury"
                  onClick={() => navigate(`/categories?category=${encodeURIComponent(cleanName)}`)}
                >
                  {/* Card background glowing indicator */}
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/5 blur-[25px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div className="space-y-2.5 sm:space-y-4">
                    {/* Rounded Image Container */}
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl overflow-hidden border border-glass group-hover:border-primary/40 group-hover:shadow-[0_0_20px_rgba(197,147,99,0.15)] transition-all duration-500 shrink-0">
                      <img
                        src={category.image || "/images/category-placeholder.png"}
                        alt={cleanName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>

                    {/* Text Description */}
                    <div>
                      <h3 className="font-display font-bold text-text-primary group-hover:text-primary transition-colors text-xs sm:text-sm md:text-base tracking-tight duration-300 line-clamp-1">
                        {getTranslatedCategoryName(cleanName, t)}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-text-muted mt-1 leading-snug sm:leading-relaxed font-medium line-clamp-2">
                        {cleanDesc}
                      </p>
                    </div>
                  </div>

                  {/* Footer item counter */}
                  <div className="flex items-center justify-between pt-2.5 sm:pt-4 md:pt-5 border-t border-glass mt-3 sm:mt-4 md:mt-5 text-text-muted group-hover:text-text-secondary transition-colors text-[9px] sm:text-[10px] font-bold tracking-wider uppercase">
                    <span>Explore Items</span>
                    <ArrowRight size={12} className="text-primary group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default Categories;
