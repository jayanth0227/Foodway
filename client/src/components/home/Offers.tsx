import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, Copy, CheckCircle } from 'lucide-react';
import { OFFERS } from '../../utils/mockData';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/pagination';

export const Offers: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <section className="py-16 md:py-24 bg-bg-darkSec/60 border-t border-glass relative overflow-hidden">
      {/* Glow orb */}
      <div className="absolute top-1/2 left-0 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none -translate-y-1/2" />

      {/* Floating Copied Toast Notification */}
      {copiedCode && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 shadow-2xl backdrop-blur-xl flex items-center gap-3 font-bold text-xs"
        >
          <CheckCircle size={18} className="shrink-0 text-emerald-400" />
          <span>Promo Code "{copiedCode}" copied to clipboard!</span>
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 space-y-4 md:space-y-0">
          <div className="space-y-3 text-center md:text-left">
            <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
              Exclusive Privileges
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-gradient-gold">
              Curated Offers & Charters
            </h2>
          </div>
          <p className="text-xs md:text-sm text-text-secondary font-medium max-w-md text-center md:text-left">
            Experience bespoke dining privileges tailored exclusively for members of MK Delivery Services.
          </p>
        </div>

        {/* Offers Swiper Carousel */}
        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={24}
          slidesPerView={1}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          className="offers-swiper pb-14"
        >
          {OFFERS.map((offer) => (
            <SwiperSlide key={offer.id} className="h-full">
              <div className="group premium-card p-6 h-full flex flex-col justify-between relative overflow-hidden">
                {/* Subtle card glow */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/5 blur-[40px] group-hover:bg-primary/10 transition-all duration-500" />

                <div>
                  {/* Badge & Discount */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                      {offer.badge}
                    </span>
                    <div className="flex items-center space-x-1 text-primary">
                      <Tag size={14} />
                      <span className="font-display font-extrabold text-lg">
                        {offer.discount}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-display font-bold text-lg text-text-primary group-hover:text-primary transition-colors duration-300">
                    {offer.title}
                  </h3>
                  <p className="text-xs text-text-muted mt-2 leading-relaxed font-medium">
                    {offer.description}
                  </p>
                </div>

                {/* Promo Code & Action */}
                <div className="pt-5 border-t border-glass mt-6 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-text-muted tracking-widest uppercase font-bold">
                      Privilege Charter Code
                    </span>
                    <span className="text-sm font-bold font-display text-primary tracking-wider mt-1 uppercase">
                      {offer.code}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(offer.code)}
                    className="btn-ghost text-xs font-bold py-2.5 px-5 rounded-lg transition-all duration-300 flex items-center space-x-1.5"
                  >
                    {copiedCode === offer.code ? (
                      <>
                        <CheckCircle size={13} className="text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default Offers;
