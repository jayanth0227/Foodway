import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { Star, ChevronLeft, ChevronRight, MessageSquareHeart } from 'lucide-react';
import { TESTIMONIALS } from '../../utils/mockData';
import { TestimonialsSkeleton } from './HomePageSkeleton';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

export const Testimonials: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <TestimonialsSkeleton />;

  return (
    <section id="testimonials" className="py-12 sm:py-20 lg:py-28 bg-bg-dark border-t border-glass relative overflow-hidden">
      {/* Decorative ambient background orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-[500px] h-80 sm:h-[500px] rounded-full bg-primary/5 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-14 space-y-2.5 sm:space-y-4">


          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-display text-gradient-gold tracking-tight">
            What Our Patrons Say
          </h2>

          <p className="text-xs sm:text-sm text-text-muted font-medium max-w-lg mx-auto leading-relaxed">
            Real feedback and appreciations from food lovers across Konaseema.
          </p>
        </div>

        {/* Testimonial Carousel - Ultra User-Friendly */}
        <div className="w-full max-w-4xl mx-auto relative px-2 sm:px-8">

          {/* Custom Navigation Buttons (Desktop & Tablet) */}
          <button
            id="testimonial-prev-btn"
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-bg-card border border-glass text-primary items-center justify-center shadow-luxury hover:bg-primary hover:text-white transition-all duration-300"
            aria-label="Previous Review"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            id="testimonial-next-btn"
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-bg-card border border-glass text-primary items-center justify-center shadow-luxury hover:bg-primary hover:text-white transition-all duration-300"
            aria-label="Next Review"
          >
            <ChevronRight size={18} />
          </button>

          <Swiper
            spaceBetween={20}
            slidesPerView={1}
            loop={true}
            autoplay={{
              delay: 4500,
              disableOnInteraction: false,
            }}
            navigation={{
              prevEl: '#testimonial-prev-btn',
              nextEl: '#testimonial-next-btn',
            }}
            pagination={{
              clickable: true,
              bulletClass: 'swiper-pagination-bullet !bg-primary/30 !w-2.5 !h-2.5 transition-all duration-300',
              bulletActiveClass: '!bg-primary !w-6 !rounded-full !opacity-100 shadow-xs',
            }}
            breakpoints={{
              640: {
                slidesPerView: 1.2,
                spaceBetween: 24,
              },
              768: {
                slidesPerView: 2,
                spaceBetween: 28,
              },
            }}
            modules={[Autoplay, Pagination, Navigation]}
            className="pb-12 !overflow-hidden"
          >
            {TESTIMONIALS.map((test) => (
              <SwiperSlide key={test.id} className="!h-auto flex">
                <div className="bg-bg-card border border-glass rounded-2xl sm:rounded-3xl p-5 sm:p-7 h-full w-full flex flex-col justify-between group relative hover:border-primary/50 transition-all duration-300 shadow-luxury hover:shadow-luxury-hover">

                  <div className="relative z-10 space-y-4">
                    {/* Top Row: Large Decorative Quote Mark & Rating Pill */}
                    <div className="flex items-center justify-between">
                      <span className="text-3xl sm:text-4xl font-serif text-primary/40 font-black leading-none select-none">
                        “
                      </span>

                      {/* Clean Rating Badge Pill */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <div className="flex items-center space-x-0.5 text-amber-400">
                          {[...Array(test.rating)].map((_, i) => (
                            <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-[10px] font-black text-primary">5.0</span>
                      </div>
                    </div>

                    {/* Review Text */}
                    <p className="text-xs sm:text-sm text-text-primary/90 leading-relaxed font-medium">
                      {test.review}
                    </p>
                  </div>

                  {/* Bottom Row: User Avatar & Info */}
                  <div className="flex items-center space-x-3 mt-6 pt-4 border-t border-glass relative z-10">
                    <img
                      src={test.image}
                      alt={test.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-primary/30 group-hover:border-primary transition-colors duration-300 shadow-xs shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-display font-bold text-text-primary text-xs sm:text-sm truncate">
                        {test.name}
                      </h4>
                      <p className="text-[10px] text-primary/80 font-bold tracking-wider uppercase mt-0.5 truncate">
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
