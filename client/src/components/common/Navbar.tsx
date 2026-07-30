import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, User, Sun, Moon, Home, Compass } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  onOpenAuth: (type: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('home');

  const { totalItemsCount, setCartOpen } = useCart();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Home', id: 'home', hash: 'home' },
    { name: 'Restaurants', id: 'restaurants', hash: 'featured-restaurants' },
    { name: 'Contact', id: 'contact', hash: 'footer' },
  ];

  // Track scroll position for header glass state and progress bar
  useEffect(() => {
    const handleScroll = () => {
      // Glass background toggle
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // Scroll progress computation
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }

      // Active section highlight during scroll
      if (location.pathname === '/') {
        for (const link of navLinks) {
          const el = document.getElementById(link.hash);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 120 && rect.bottom >= 120) {
              setActiveSection(link.id);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleNavClick = (e: React.MouseEvent, link: typeof navLinks[0]) => {
    e.preventDefault();

    if (location.pathname !== '/') {
      navigate('/#' + link.hash);
      setActiveSection(link.id);
    } else {
      const el = document.getElementById(link.hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSection(link.id);
      }
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          isScrolled
            ? 'bg-bg-dark/80 backdrop-blur-2xl border-b border-glass py-3.5 shadow-luxury'
            : 'bg-transparent py-6 border-b border-transparent'
        }`}
      >
        {/* Scroll Progress Bar */}
        <div
          className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-primary via-secondary to-primary-dark transition-all duration-75"
          style={{ width: `${scrollProgress}%` }}
        />

        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Logo Brand */}
          <Link
            to="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setActiveSection('home');
            }}
            className="flex items-center space-x-3 group relative z-10"
          >
            <img
              src="/logo.jpeg"
              alt="MK Delivery Services Logo"
              className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border border-primary/20 group-hover:border-primary/60 group-hover:scale-105 transition-all duration-500 shadow-md"
            />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-[0.2em] font-display text-text-primary uppercase group-hover:text-primary transition-colors duration-300">
                MK
              </span>
              <span className="text-[9px] font-medium tracking-[0.25em] text-primary group-hover:text-text-primary transition-colors mt-0.5 uppercase">
                Delivery
              </span>
            </div>
          </Link>

          {/* Navigation Links - Desktop */}
          <nav className="hidden lg:flex items-center space-x-9">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id && location.pathname === '/';
              return (
                <a
                  key={link.id}
                  href={`#${link.hash}`}
                  onClick={(e) => handleNavClick(e, link)}
                  className={`text-xs font-bold tracking-[0.12em] uppercase transition-colors duration-300 relative py-2.5 ${
                    isActive ? 'text-primary' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <motion.span
                      layoutId="navUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full shadow-[0_0_8px_rgba(197,147,99,0.5)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="relative p-2.5 text-text-secondary hover:text-primary transition-all duration-300 rounded-full bg-glass-subtle border border-glass hover:border-primary/20 group"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon size={18} className="group-hover:scale-110 group-hover:rotate-[15deg] transition-all duration-500" />
              ) : (
                <Sun size={18} className="group-hover:scale-110 group-hover:rotate-[45deg] transition-all duration-500" />
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2.5 text-text-secondary hover:text-primary transition-all duration-300 rounded-full bg-glass-subtle border border-glass hover:border-primary/20 group"
            >
              <ShoppingBag size={18} className="group-hover:scale-110 transition-transform duration-300" />
              <AnimatePresence>
                {totalItemsCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 bg-primary text-black text-[9px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-bg-dark shadow-[0_0_10px_rgba(197,147,99,0.3)]"
                  >
                    {totalItemsCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Auth Buttons - Desktop */}
            <div className="hidden sm:flex items-center space-x-3 pl-3 border-l border-glass">
              <button
                onClick={() => onOpenAuth('login')}
                className="btn-ghost text-xs font-bold py-2 px-4 rounded-xl uppercase tracking-wider transition-all duration-300"
              >
                Login
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="btn-primary text-[10px] font-bold py-2.5 px-5 rounded-xl uppercase tracking-wider transition-all duration-300"
              >
                Register
              </button>
            </div>

            {/* Removed Hamburger toggle button */}
          </div>
        </div>
      </header>

      {/* Floating Bottom Navigation Bar for Mobile/Tablet */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:hidden w-[calc(100%-32px)] max-w-sm premium-bottom-nav py-2 rounded-full flex items-center justify-around">
        {/* Home */}
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveSection('home');
          }}
          className={`flex flex-col items-center justify-center p-2 rounded-full transition-colors duration-300 ${
            activeSection === 'home' ? 'text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
          aria-label="Home"
        >
          <Home size={18} />
          <span className="text-[9px] font-bold mt-1 tracking-wider">Home</span>
        </button>

        {/* Explore / Restaurants */}
        <button
          onClick={(e) => handleNavClick(e, { name: 'Restaurants', id: 'restaurants', hash: 'featured-restaurants' })}
          className={`flex flex-col items-center justify-center p-2 rounded-full transition-colors duration-300 ${
            activeSection === 'restaurants' ? 'text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
          aria-label="Explore Restaurants"
        >
          <Compass size={18} />
          <span className="text-[9px] font-bold mt-1 tracking-wider">Explore</span>
        </button>

        {/* Cart */}
        <button
          onClick={() => setCartOpen(true)}
          className="flex flex-col items-center justify-center p-2 rounded-full text-text-muted hover:text-text-primary transition-colors duration-300 relative"
          aria-label="Shopping Cart"
        >
          <ShoppingBag size={18} />
          <span className="text-[9px] font-bold mt-1 tracking-wider">Cart</span>
          {totalItemsCount > 0 && (
            <span className="absolute top-1 right-2 bg-primary text-black text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-bg-dark shadow-[0_0_8px_rgba(197,147,99,0.3)]">
              {totalItemsCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <button
          onClick={() => onOpenAuth('login')}
          className="flex flex-col items-center justify-center p-2 rounded-full text-text-muted hover:text-text-primary transition-colors duration-300"
          aria-label="User Account"
        >
          <User size={18} />
          <span className="text-[9px] font-bold mt-1 tracking-wider">Account</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center p-2 rounded-full text-text-muted hover:text-text-primary transition-colors duration-300"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          <span className="text-[9px] font-bold mt-1 tracking-wider">Theme</span>
        </button>
      </div>
    </>
  );
};
export default Navbar;
