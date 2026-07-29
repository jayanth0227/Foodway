import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectCoverflow, Pagination } from 'swiper/modules';
import { Copy } from 'lucide-react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

interface OfferCard {
  id: string;
  badge: string;
  title: string;
  description: string;
  code: string;
  gradient: string;
}

const OFFERS: OfferCard[] = [
  {
    id: 'offer-1',
    badge: 'Limited Privilege',
    title: '50% OFF Michelin Selections',
    description: 'Indulge in our exquisite partner menus with a complimentary 50% privilege on your first curation. Max discount $50.',
    code: 'MKROYAL50',
    gradient: 'from-[#2563EB]/40 via-[#1D4ED8]/25 to-transparent',
  },
  {
    id: 'offer-2',
    badge: 'Gold Tier Perks',
    title: 'Complimentary White-Glove Delivery',
    description: 'Savor Michelin-star meals delivered by our private couriers with active temperature protection, free of delivery fees.',
    code: 'MKESTATE',
    gradient: 'from-[#C58A6A]/40 via-[#A86C50]/25 to-transparent',
  },
  {
    id: 'offer-3',
    badge: 'Weekend Soirée',
    title: 'Complimentary Fine Champagne Box',
    description: 'Order any Private Banquet or Estate Platter during weekends and receive a curated premium dessert & champagne box.',
    code: 'MKCHAMPAGNE',
    gradient: 'from-amber-500/30 via-amber-800/15 to-transparent',
  },
];

export const Offers: React.FC = () => {
  return (
    <section id="offers-section" className="py-16 md:py-20 lg:py-30 bg-bg-darkSec border-t border-glass relative overflow-hidden">
      {/* Cinematic background light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
            Exclusive Privileges
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-gradient-gold">
            Active Estate Offers
          </h2>
          <p className="text-xs md:text-sm text-text-secondary font-medium">
            Unlock temporary dining charters and bespoke codes crafted to amplify your gastronomic experience.
          </p>
        </div>

        {/* Swiper Slider Wrapper */}
        <div className="w-full py-8">
          <Swiper
            effect={'coverflow'}
            grabCursor={true}
            centeredSlides={true}
            slidesPerView={'auto'}
            loop={true}
            coverflowEffect={{
              rotate: 15,
              stretch: 0,
              depth: 150,
              modifier: 1,
              slideShadows: false,
            }}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
            }}
            pagination={{
              clickable: true,
              bulletClass: 'swiper-pagination-bullet !bg-text-muted opacity-40',
              bulletActiveClass: '!bg-primary !opacity-100',
            }}
            modules={[EffectCoverflow, Autoplay, Pagination]}
            className="w-full max-w-4xl"
          >
            {OFFERS.map((offer) => (
              <SwiperSlide key={offer.id} className="w-[300px] sm:w-[450px] md:w-[500px]">
                <div className="relative overflow-hidden premium-card p-8 md:p-12 flex flex-col justify-between h-[300px] md:h-[350px] group">
                  {/* Decorative background radial gradient */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${offer.gradient} opacity-80 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                  />

                  {/* Top content */}
                  <div className="space-y-4 relative z-10">
                    <span className="inline-block bg-glass-subtle border border-primary/20 text-primary text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg shadow-sm">
                      {offer.badge}
                    </span>
                    <h3 className="text-xl md:text-2xl font-extrabold font-display text-text-primary leading-tight group-hover:text-primary transition-colors duration-300">
                      {offer.title}
                    </h3>
                    <p className="text-xs md:text-sm text-text-muted/90 leading-relaxed max-w-md font-medium">
                      {offer.description}
                    </p>
                  </div>

                  {/* Promo Code footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 border-t border-glass relative z-10">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-text-muted tracking-widest uppercase font-bold">
                        Privilege Charter Code
                      </span>
                      <span className="text-sm font-bold font-display text-primary tracking-wider mt-1 uppercase">
                        {offer.code}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(offer.code);
                        alert(`Code "${offer.code}" copied to clipboard!`);
                      }}
                      className="btn-ghost text-xs font-bold py-2.5 px-5 rounded-lg transition-all duration-300 flex items-center space-x-1.5"
                    >
                      <Copy size={13} />
                      <span>Copy Code</span>
                    </button>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
};
export default Offers;
