import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion';
import { Search, ChevronRight, User, Store, Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface HeroProps {
  onOpenAuth: (type: 'login' | 'register') => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenAuth }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    setIsMobile(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  // Simulated loading states for premium feel
  const [isOrdering, setIsOrdering] = useState(false);
  const [isExploring, setIsExploring] = useState(false);

  // Keyboard navigation & accessibility states
  const [isPrimaryFocused, setIsPrimaryFocused] = useState(false);
  const [isSecondaryFocused, setIsSecondaryFocused] = useState(false);

  // Mouse positions for parallax effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Springs for smoother mouse parallax movement
  const springX = useSpring(mouseX, { damping: 55, stiffness: 150 });
  const springY = useSpring(mouseY, { damping: 55, stiffness: 150 });

  // Scroll Tracking
  const { scrollY } = useScroll();
  
  // Parallax elements scroll rates
  const leafScrollY1 = useTransform(scrollY, [0, 800], [0, -160]);
  const leafScrollY2 = useTransform(scrollY, [0, 800], [0, -260]);
  const particleScrollY = useTransform(scrollY, [0, 800], [0, -200]);

  // Mouse-driven parallax transforms for background elements
  const bgBlob1X = useTransform(springX, (mx) => -mx * 0.5);
  const bgBlob1Y = useTransform(springY, (my) => -my * 0.5);
  const bgBlob2X = useTransform(springX, (mx) => mx * 0.3);
  const bgBlob2Y = useTransform(springY, (my) => -my * 0.3);



  // Combined MotionValues for Leaf 1 (Scroll Y + Mouse Parallax)
  const leaf1X = useTransform(springX, (mx) => mx * -2.2);
  const leaf1Y = useTransform(
    [leafScrollY1, springY],
    ([sy, my]) => (sy as number) + (my as number) * -2.2
  );

  // Combined MotionValues for Leaf 2 (Scroll Y + Mouse Parallax)
  const leaf2X = useTransform(springX, (mx) => mx * 1.8);
  const leaf2Y = useTransform(
    [leafScrollY2, springY],
    ([sy, my]) => (sy as number) + (my as number) * 1.8
  );

  // Combined MotionValues for Ingredients/Food particles
  const food1X = useTransform(springX, (mx) => mx * -1.5);
  const food1Y = useTransform(
    [particleScrollY, springY],
    ([sy, my]) => (sy as number) + (my as number) * -1.5
  );

  // Combined MotionValues for Sparkles
  const sparklesX = useTransform(springX, (mx) => mx * 0.8);
  const sparklesY = useTransform(springY, (my) => my * 0.8);

  // Animated search placeholder typing logic
  const placeholders = [
    "Search woodfired truffle pizzas...",
    "Search gold-leaf lobster biryani...",
    "Search Wagyu A5 brioche burgers...",
    "Search caviar-ghee roast dosas...",
    "Search Grand Omakase...",
    "Search vintage dessert fondants..."
  ];
  const [currentPlaceholderIdx, setCurrentPlaceholderIdx] = useState(0);
  const [placeholderText, setPlaceholderText] = useState('');

  useEffect(() => {
    let timer: any;
    let isDeleting = false;
    let textIdx = 0;
    let currentWord = placeholders[currentPlaceholderIdx];

    const type = () => {
      if (!isDeleting) {
        setPlaceholderText(currentWord.substring(0, textIdx + 1));
        textIdx++;
        if (textIdx === currentWord.length) {
          isDeleting = true;
          timer = setTimeout(type, 2000); // Hold placeholder when typed out
        } else {
          timer = setTimeout(type, 50); // Typing speed
        }
      } else {
        setPlaceholderText(currentWord.substring(0, textIdx - 1));
        textIdx--;
        if (textIdx === 0) {
          isDeleting = false;
          setCurrentPlaceholderIdx((prev) => (prev + 1) % placeholders.length);
        }
        timer = setTimeout(type, 30); // Deleting speed
      }
    };

    timer = setTimeout(type, 200);
    return () => clearTimeout(timer);
  }, [currentPlaceholderIdx]);

  // Track mouse coordinates inside section
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    // Calculate difference from center of screen
    const x = (clientX - window.innerWidth / 2) / 35;
    const y = (clientY - window.innerHeight / 2) / 35;
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

  // Simulate premium concierge order response
  const handleOrderClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOrdering(true);
    setTimeout(() => {
      setIsOrdering(false);
      onOpenAuth('register');
    }, 1200);
  };

  // Simulate premium loading and scroll to restaurants
  const handleExploreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExploring(true);
    setTimeout(() => {
      setIsExploring(false);
      const el = document.getElementById('featured-restaurants');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 1000);
  };

  return (
    <section
      id="home"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex items-center justify-center pt-28 pb-20 overflow-hidden bg-bg-dark bg-cover bg-[80%_center] lg:bg-center bg-no-repeat select-none"
    >
      {/* Background Video */}
      <video
        key={`${theme}-${isMobile}`}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      >
        <source
          src={theme === 'dark' ? (isMobile ? "/dark_mobile.mp4" : "/darkest.mp4") : (isMobile ? "/light_mobile.mp4" : "/lightest.mp4")}
          type="video/mp4"
        />
      </video>

      {/* Premium left-to-right gradient overlay optimized for mobile contrast & readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-bg-dark-color/95 via-bg-dark-color/80 to-bg-dark-color/40 md:from-bg-dark-color/90 md:via-bg-dark-color/50 md:to-transparent pointer-events-none z-0" />
      {/* Background Cinematic Gradients and Orbs (Mouse-driven parallax) */}
      <motion.div 
        style={{ x: bgBlob1X, y: bgBlob1Y }}
        className="absolute top-[15%] left-[20%] w-[550px] h-[550px] rounded-full bg-primary/10 blur-[130px] pointer-events-none animate-pulse-slow" 
      />
      <motion.div 
        style={{ x: bgBlob2X, y: bgBlob2Y }}
        className="absolute bottom-[20%] right-[15%] w-[550px] h-[550px] rounded-full bg-accent/5 blur-[130px] pointer-events-none animate-glow-slow" 
      />
      <div className="absolute top-[40%] right-[35%] w-[350px] h-[350px] rounded-full bg-secondary/5 blur-[100px] pointer-events-none" />

      {/* Floating Sparkles and Rings with Parallax */}
      <motion.div
        style={{ x: sparklesX, y: sparklesY }}
        className="absolute top-1/4 left-10 md:left-24 w-12 h-12 rounded-full border border-primary/20 opacity-30 pointer-events-none hidden sm:block shadow-[0_0_15px_rgba(197,147,99,0.05)]"
      />
      <motion.div
        style={{ x: sparklesX, y: sparklesY }}
        className="absolute bottom-1/3 right-12 md:right-28 w-16 h-16 rounded-full border border-accent/15 opacity-25 pointer-events-none hidden sm:block shadow-[0_0_20px_rgba(59,130,246,0.03)]"
      />

      {/* Floating Leaves (Parallax & Drift Animation) */}
      <motion.div
        style={{ x: leaf1X, y: leaf1Y }}
        className="absolute top-[20%] right-[45%] w-6 h-6 opacity-60 pointer-events-none hidden md:block animate-leaf-drift"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-primary/30">
          <path d="M2,21 C8,21 16,17 20,10 C22,6.5 21,3 19,2 C17,1 13.5,2 10,4 C3,8 2,16 2,21 Z" fill="currentColor" />
          <path d="M2,21 C8,17 13.5,12.5 19,2" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        </svg>
      </motion.div>

      <motion.div
        style={{ x: leaf2X, y: leaf2Y, animationDelay: '1.5s' } as any}
        className="absolute bottom-[25%] right-[10%] w-7 h-7 opacity-50 pointer-events-none hidden md:block animate-leaf-drift"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-primary/20">
          <path d="M2,21 C8,21 16,17 20,10 C22,6.5 21,3 19,2 C17,1 13.5,2 10,4 C3,8 2,16 2,21 Z" fill="currentColor" />
        </svg>
      </motion.div>

      {/* Floating Food Ingredient (Tomato slice / Basil - Parallax & drift) */}
      <motion.div
        style={{ x: food1X, y: food1Y, animationDelay: '0.8s' } as any}
        className="absolute top-[60%] right-[42%] w-5 h-5 opacity-40 pointer-events-none hidden lg:block animate-leaf-drift"
      >
        {/* Sparkle particle */}
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-primary/60">
          <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" fill="currentColor" />
        </svg>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10">
        
        {/* Left Content Text Column */}
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          
          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center space-x-2 bg-glass-subtle border border-primary/20 px-4.5 py-1.8 rounded-full backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
              Now Serving Your Location
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl md:text-6.5xl lg:text-7xl font-extrabold font-display leading-[1.05] tracking-[-0.03em] text-text-primary"
          >
            Delicious food <br />
            <span className="text-gradient-gold text-glow-gold">delivered home.</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm md:text-base text-text-secondary/90 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium"
          >
            From breakfast to dinner, get everything delivered to your doorstep. Your favorite restaurants, now online.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl mx-auto lg:mx-0"
          >
            <form
              onSubmit={handleSearchSubmit}
              className={`flex items-center bg-bg-cardSec/70 backdrop-blur-xl border rounded-[22px] p-2 transition-all duration-500 ${
                searchFocused ? 'border-primary/60 shadow-[0_0_35px_rgba(197,147,99,0.18)]' : 'border-glass'
              }`}
            >
              <div className="flex-1 flex items-center px-4 space-x-3">
                <Search size={18} className={`transition-colors duration-300 ${searchFocused ? 'text-primary' : 'text-text-muted'}`} />
                <div className="relative flex-grow">
                  {/* Real Search Input */}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    aria-label="Search restaurants and cuisines"
                    className="w-full bg-transparent border-none outline-none text-text-primary text-sm py-3 font-medium relative z-10"
                  />
                  {/* Dynamic placeholder typing overlay */}
                  {!searchQuery && (
                    <span className="absolute left-0 right-2 top-1/2 -translate-y-1/2 text-text-muted/60 text-sm font-medium pointer-events-none select-none z-0 truncate">
                      {placeholderText}
                      <span className="w-[1.5px] h-4 bg-primary/70 inline-block align-middle ml-0.5 animate-pulse" />
                    </span>
                  )}
                </div>
              </div>
              <button
                type="submit"
                aria-label="Submit search query"
                className="btn-primary px-6 py-3.5 rounded-[15px] font-bold text-xs uppercase tracking-wider flex items-center space-x-1 shrink-0"
              >
                <span>Find Dishes</span>
                <ChevronRight size={14} />
              </button>
            </form>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4 pt-2"
          >
            <button
              onClick={handleOrderClick}
              onFocus={() => setIsPrimaryFocused(true)}
              onBlur={() => setIsPrimaryFocused(false)}
              disabled={isOrdering}
              className={`w-full sm:w-auto btn-primary font-bold text-xs py-4 px-9 rounded-xl uppercase tracking-widest text-center shadow-lg relative flex items-center justify-center min-w-[170px] ${
                isPrimaryFocused ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg-dark' : ''
              } ${isOrdering ? 'opacity-85 cursor-not-allowed' : ''}`}
            >
              {isOrdering ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Dispatching...</span>
                </div>
              ) : (
                <span>Order Now</span>
              )}
            </button>

            <button
              onClick={handleExploreClick}
              onFocus={() => setIsSecondaryFocused(true)}
              onBlur={() => setIsSecondaryFocused(false)}
              disabled={isExploring}
              className={`w-full sm:w-auto btn-secondary font-bold text-xs py-4 px-9 rounded-xl text-center uppercase tracking-widest min-w-[170px] relative flex items-center justify-center ${
                isSecondaryFocused ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg-dark' : ''
              } ${isExploring ? 'opacity-85 cursor-not-allowed' : ''}`}
            >
              {isExploring ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Exploring...</span>
                </div>
              ) : (
                <span>Explore Restaurants</span>
              )}
            </button>
          </motion.div>

          {/* Stats Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="grid grid-cols-3 gap-2.5 pt-6 w-full max-w-xl mx-auto lg:mx-0 lg:flex lg:flex-wrap lg:w-auto lg:gap-4"
          >
            <div className="flex items-center space-x-1.5 sm:space-x-2.5 premium-badge-glass px-2.5 py-2 sm:px-4.5 sm:py-2.5 rounded-2xl">
              <User className="text-primary shrink-0" size={15} />
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs sm:text-sm font-bold text-text-primary leading-tight">20K+</span>
                <span className="text-[7px] sm:text-[8px] font-bold text-text-muted uppercase tracking-wider truncate leading-tight">Happy Customers</span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-2.5 premium-badge-glass px-2.5 py-2 sm:px-4.5 sm:py-2.5 rounded-2xl">
              <Store className="text-primary shrink-0" size={15} />
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs sm:text-sm font-bold text-text-primary leading-tight">500+</span>
                <span className="text-[7px] sm:text-[8px] font-bold text-text-muted uppercase tracking-wider truncate leading-tight">Restaurants</span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-2.5 premium-badge-glass px-2.5 py-2 sm:px-4.5 sm:py-2.5 rounded-2xl">
              <Clock className="text-primary shrink-0" size={15} />
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs sm:text-sm font-bold text-text-primary leading-tight">30 min</span>
                <span className="text-[7px] sm:text-[8px] font-bold text-text-muted uppercase tracking-wider truncate leading-tight">Fast Delivery</span>
              </div>
            </div>
          </motion.div>
          
        </div>

        {/* Right Content Column empty to let background image show through */}
        <div className="lg:col-span-5 relative h-[380px] md:h-[500px] w-full pointer-events-none" />
      </div>
    </section>
  );
};

export default Hero;
