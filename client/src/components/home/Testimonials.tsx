import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { Star, ChevronLeft, ChevronRight, MessageSquareHeart } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';
import { TestimonialsSkeleton } from './HomePageSkeleton';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

export const Testimonials: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicReviews = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/public/reviews`);
        if (response.data && response.data.reviews && Array.isArray(response.data.reviews)) {
          setReviews(response.data.reviews);
        }
      } catch (err) {
        console.warn('Error fetching public reviews:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicReviews();
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
            Real feedback and appreciations from verified customers across Konaseema.
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="max-w-md mx-auto p-8 rounded-3xl bg-bg-card border border-glass text-center space-y-3 shadow-luxury">
            <MessageSquareHeart size={36} className="text-primary mx-auto animate-pulse" />
            <h3 className="text-base font-black text-text-primary">No Customer Reviews Yet</h3>
            <p className="text-xs text-text-muted">
              Place an order and leave the first rating to be featured right here!
            </p>
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto relative px-2 sm:px-8">
            {/* Custom Navigation Buttons (Desktop & Tablet) */}
            <button
              id="testimonial-prev-btn"
              className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-bg-card border border-glass text-primary items-center justify-center shadow-luxury hover:bg-primary hover:text-white transition-all duration-300 cursor-pointer"
              aria-label="Previous Review"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              id="testimonial-next-btn"
              className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-bg-card border border-glass text-primary items-center justify-center shadow-luxury hover:bg-primary hover:text-white transition-all duration-300 cursor-pointer"
              aria-label="Next Review"
            >
              <ChevronRight size={18} />
            </button>

            <Swiper
              spaceBetween={20}
              slidesPerView={1}
              loop={reviews.length > 2}
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
                  slidesPerView: Math.min(reviews.length, 1.2),
                  spaceBetween: 24,
                },
                768: {
                  slidesPerView: Math.min(reviews.length, 2),
                  spaceBetween: 28,
                },
              }}
              modules={[Autoplay, Pagination, Navigation]}
              className="pb-12 !overflow-hidden"
            >
              {reviews.map((rev, index) => {
                const numRating = Number(rev.rating || 5);
                const customerName = rev.customerName || 'Verified Patron';
                const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=f59e0b&color=000&bold=true`;
                const text = rev.feedback || rev.reviewText || 'Great food quality and super fast delivery!';

                return (
                  <SwiperSlide key={rev.reviewId || index} className="!h-auto flex">
                    <div className="bg-bg-card border border-glass rounded-2xl sm:rounded-3xl p-5 sm:p-7 h-full w-full flex flex-col justify-between group relative hover:border-primary/50 transition-all duration-300 shadow-luxury hover:shadow-luxury-hover">
                      <div className="relative z-10 space-y-4">
                        {/* Top Row: Quote Mark & Rating Pill */}
                        <div className="flex items-center justify-between">
                          <span className="text-3xl sm:text-4xl font-serif text-primary/40 font-black leading-none select-none">
                            “
                          </span>

                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                            <div className="flex items-center space-x-0.5 text-amber-400">
                              {[...Array(numRating)].map((_, i) => (
                                <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                            <span className="text-[10px] font-black text-primary">{numRating.toFixed(1)}</span>
                          </div>
                        </div>

                        {/* Review Text */}
                        <p className="text-xs sm:text-sm text-text-primary/90 leading-relaxed font-medium">
                          "{text}"
                        </p>
                      </div>

                      {/* Bottom Row: User Avatar & Info */}
                      <div className="flex items-center space-x-3 mt-6 pt-4 border-t border-glass relative z-10">
                        <img
                          src={avatar}
                          alt={customerName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary/30 group-hover:border-primary transition-colors duration-300 shadow-xs shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-display font-bold text-text-primary text-xs sm:text-sm truncate">
                            {customerName}
                          </h4>
                          <p className="text-[10px] text-primary/80 font-bold tracking-wider uppercase mt-0.5 truncate">
                            {rev.restaurantName ? `Ordered from ${rev.restaurantName}` : 'Verified Customer Order'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
