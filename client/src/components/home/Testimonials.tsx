import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { IoStar } from 'react-icons/io5';
import { TESTIMONIALS } from '../../utils/mockData';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';

export const Testimonials: React.FC = () => {
  return (
    <section id="testimonials" className="py-24 bg-bg-dark border-t border-glass relative overflow-hidden">
      {/* Decorative ambient background orb */}
      <div className="absolute top-1/2 left-0 w-96 h-96 rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
            Client Appreciative Reviews
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-gradient-gold">
            Testimonials of Prestige
          </h2>
          <p className="text-sm text-text-muted">
            Hear from our elite patrons, food critics, and gourmet connoisseurs who rely on our services.
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="w-full max-w-4xl mx-auto py-4">
          <Swiper
            spaceBetween={30}
            slidesPerView={1}
            loop={true}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            pagination={{
              clickable: true,
              bulletClass: 'swiper-pagination-bullet !bg-text-muted opacity-40',
              bulletActiveClass: '!bg-primary !opacity-100',
            }}
            breakpoints={{
              768: {
                slidesPerView: 2,
              },
            }}
            modules={[Autoplay, Pagination]}
            className="pb-12"
          >
            {TESTIMONIALS.map((test) => (
              <SwiperSlide key={test.id}>
                <div className="glass-panel rounded-3xl p-8 border border-glass h-full flex flex-col justify-between hover:border-primary/20 hover:shadow-luxury-hover transition-all duration-500 group relative">
                  {/* Glowing card dot */}
                  <div className="absolute top-6 right-6 w-12 h-12 rounded-full bg-primary/5 blur-[15px] pointer-events-none" />

                  {/* Stars Rating */}
                  <div className="flex items-center space-x-1 mb-6 text-[#FBBF24]">
                    {[...Array(test.rating)].map((_, i) => (
                      <IoStar key={i} size={15} />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-sm md:text-base text-text-secondary leading-relaxed font-medium italic">
                    "{test.review}"
                  </p>

                  {/* Critic Info */}
                  <div className="flex items-center space-x-4 mt-8 pt-6 border-t border-glass/40">
                    <img
                      src={test.image}
                      alt={test.name}
                      className="w-12 h-12 rounded-full object-cover border border-primary/30 group-hover:border-primary/70 transition-colors"
                    />
                    <div>
                      <h4 className="font-display font-bold text-text-primary text-sm">
                        {test.name}
                      </h4>
                      <p className="text-[11px] text-primary font-semibold tracking-wider uppercase mt-0.5">
                        {test.designation}
                      </p>
                    </div>
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
export default Testimonials;
