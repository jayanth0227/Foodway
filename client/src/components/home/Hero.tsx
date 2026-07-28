import React, { useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { IoSearchOutline, IoChevronForwardOutline } from 'react-icons/io5';

interface HeroProps {
  onOpenAuth: (type: 'login' | 'register') => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenAuth }) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mouse positions for parallax effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Springs for smoother movement
  const springX = useSpring(mouseX, { damping: 50, stiffness: 200 });
  const springY = useSpring(mouseY, { damping: 50, stiffness: 200 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const x = (clientX - window.innerWidth / 2) / 30; // parallax factor
    const y = (clientY - window.innerHeight / 2) / 30;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const el = document.getElementById('featured-restaurants');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleExploreClick = () => {
    const el = document.getElementById('popular-dishes');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section
      id="home"
      onMouseMove={handleMouseMove}
      className="relative min-h-[95vh] flex items-center justify-center pt-24 pb-16 overflow-hidden bg-bg-dark"
    >
      {/* Background Cinematic Gradients and Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full bg-primary/5 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-accent/5 blur-[120px] pointer-events-none animate-glow-slow" />

      {/* Floating Sparkles and Rings */}
      <motion.div
        style={{ x: springX, y: springY }}
        className="absolute top-1/3 left-10 md:left-20 w-8 h-8 rounded-full border border-primary/20 opacity-30 pointer-events-none hidden sm:block"
      />
      <motion.div
        style={{ x: springX, y: springY }}
        className="absolute bottom-1/3 right-10 md:right-20 w-12 h-12 rounded-full border border-accent/25 opacity-30 pointer-events-none hidden sm:block"
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        {/* Left Content Text Column */}
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center space-x-2 bg-glass-subtle border border-glass px-4 py-1.5 rounded-full backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-[10px] font-semibold tracking-[0.2em] text-primary uppercase">
              Michelin Star Deliveries
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-display leading-[1.1] tracking-tight"
          >
            The Art of Culinary Gastronomy, <br />
            <span className="text-gradient-gold text-glow-gold">Delivered to Your Estate.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-base md:text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto lg:mx-0"
          >
            Savor gourmet masterpieces curated by Michelin-star culinary artisans, transported to you with white-glove logistics in temperature-controlled hermetic containment.
          </motion.p>

          {/* Search bar & CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl mx-auto lg:mx-0"
          >
            <form
              onSubmit={handleSearchSubmit}
              className={`flex items-center bg-bg-cardSec border rounded-2xl p-2 transition-all duration-300 ${
                searchFocused ? 'border-primary/50 shadow-[0_0_20px_rgba(197,138,106,0.15)]' : 'border-glass'
              }`}
            >
              <div className="flex-1 flex items-center px-3 space-x-3">
                <IoSearchOutline size={20} className="text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search michelin venues, royal cuisines..."
                  className="w-full bg-transparent border-none outline-none text-text-primary text-sm placeholder-text-muted py-2.5"
                />
              </div>
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark text-black px-6 py-3 rounded-xl font-semibold text-xs transition-all duration-300 shadow-md flex items-center space-x-1 shrink-0"
              >
                <span>Find Dishes</span>
                <IoChevronForwardOutline size={12} />
              </button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4"
          >
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-black font-bold text-xs py-4 px-8 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-primary/10 hover:shadow-primary/20"
            >
              Order Now
            </button>
            <button
              onClick={handleExploreClick}
              className="w-full sm:w-auto bg-glass-subtle border border-glass hover:bg-glass-subtleHover hover:border-primary/30 text-text-primary font-semibold text-xs py-4 px-8 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              Explore Menu
            </button>
          </motion.div>
        </div>

        {/* Right Floating Food Imagery Column */}
        <div className="lg:col-span-5 relative h-[380px] md:h-[500px] w-full flex items-center justify-center lg:justify-end">
          {/* Main Floating Platter (Sushi) */}
          <motion.div
            style={{ x: springX, y: springY }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-[280px] h-[280px] md:w-[350px] md:h-[350px] rounded-full overflow-hidden border border-glass shadow-2xl relative z-20 hover:scale-[1.03] transition-all duration-500 hover:shadow-primary/10 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
            <img
              src="https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=85"
              alt="Premium Omakase Platter"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-6 left-6 right-6 z-20 text-left">
              <span className="text-[9px] font-bold tracking-[0.2em] text-primary uppercase">
                Featured Culinary Partner
              </span>
              <h4 className="text-sm font-semibold font-display text-text-primary mt-1">
                Grand Omakase Collection
              </h4>
            </div>
          </motion.div>

          {/* Secondary Floating Asset (Dessert) */}
          <motion.div
            style={{
              x: useSpring(useMotionValue(0), { damping: 40, stiffness: 180 }),
              y: useSpring(useMotionValue(0), { damping: 40, stiffness: 180 }),
            }}
            initial={{ opacity: 0, scale: 0.8, x: 60, y: -40 }}
            animate={{ opacity: 1, scale: 1, x: 40, y: -80 }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[20%] right-[-10px] md:right-[20px] w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border border-glass shadow-2xl z-30 hover:scale-105 transition-transform duration-300 hidden sm:block"
          >
            <img
              src="https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=400&q=85"
              alt="Gourmet Fondant"
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Tertiary Floating Asset (Steak) */}
          <motion.div
            style={{
              x: useSpring(useMotionValue(0), { damping: 40, stiffness: 220 }),
              y: useSpring(useMotionValue(0), { damping: 40, stiffness: 220 }),
            }}
            initial={{ opacity: 0, scale: 0.8, x: -60, y: 80 }}
            animate={{ opacity: 1, scale: 1, x: -80, y: 120 }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-[10%] left-0 md:left-[50px] w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border border-glass shadow-2xl z-10 hover:scale-105 transition-transform duration-300 hidden sm:block"
          >
            <img
              src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=85"
              alt="Woodfired Tomahawk Steak"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
export default Hero;
