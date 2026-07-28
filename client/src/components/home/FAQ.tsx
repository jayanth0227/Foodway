import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoAddOutline, IoRemoveOutline } from 'react-icons/io5';
import { FAQS } from '../../utils/mockData';

export const FAQ: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="py-24 bg-bg-darkSec border-t border-glass relative">
      {/* Decorative ambient gradients */}
      <div className="absolute bottom-12 left-12 w-80 h-80 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
            Inquiries & Support
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-gradient-gold">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-text-muted">
            Explore basic information details about our premium service operations and logistics charter.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id;

            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-glass bg-bg-card overflow-hidden hover:border-primary/25 transition-colors duration-300"
              >
                {/* Header/Question Trigger */}
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full flex items-center justify-between p-6 text-left outline-none"
                >
                  <span className="font-display font-semibold text-text-primary text-sm sm:text-base group-hover:text-primary transition-colors">
                    {faq.question}
                  </span>
                  <span className="ml-4 shrink-0 w-8 h-8 rounded-full bg-glass-subtle border border-glass flex items-center justify-center text-primary transition-colors">
                    {isOpen ? <IoRemoveOutline size={18} /> : <IoAddOutline size={18} />}
                  </span>
                </button>

                {/* Animated Body/Answer */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 pt-2 text-xs sm:text-sm text-text-muted leading-relaxed border-t border-glass/30 bg-bg-dark/50">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
export default FAQ;
