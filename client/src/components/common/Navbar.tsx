import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IoMenuOutline, IoCloseOutline, IoCartOutline, IoPersonOutline, IoSunnyOutline, IoMoonOutline } from 'react-icons/io5';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  onOpenAuth: (type: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('home');

  const { totalItemsCount, setCartOpen } = useCart();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Home', id: 'home', hash: 'home' },
    { name: 'Restaurants', id: 'restaurants', hash: 'featured-restaurants' },
    { name: 'Offers', id: 'offers', hash: 'offers-section' },
    { name: 'About', id: 'about', hash: 'why-choose' },
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
    setIsMobileMenuOpen(false);

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
            ? 'bg-bg-dark/70 backdrop-blur-xl border-b border-glass py-4 shadow-lg'
            : 'bg-transparent py-6 border-b border-transparent'
        }`}
      >
        {/* Scroll Progress Bar */}
        <div
          className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-primary via-accent to-primary-dark transition-all duration-75"
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
            className="flex items-center space-x-3 group"
          >
            <img
              src="/logo.jpeg"
              alt="MK Delivery Services Logo"
              className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-primary/20 group-hover:border-primary/50 transition-all duration-300 shadow-md"
            />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-[0.15em] font-display text-text-primary uppercase group-hover:text-primary transition-colors">
                MK
              </span>
              <span className="text-[9px] font-medium tracking-[0.25em] text-primary group-hover:text-text-primary transition-colors mt-0.5 uppercase">
                Delivery Services
              </span>
            </div>
          </Link>

          {/* Navigation Links - Desktop */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id && location.pathname === '/';
              return (
                <a
                  key={link.id}
                  href={`#${link.hash}`}
                  onClick={(e) => handleNavClick(e, link)}
                  className={`text-sm font-medium tracking-wide transition-colors relative py-2 ${
                    isActive ? 'text-primary' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <motion.span
                      layoutId="navUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
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
              className="relative p-2 text-text-secondary hover:text-primary transition-all duration-300 rounded-full hover:bg-glass-subtleHover group border border-transparent hover:border-glass"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <IoMoonOutline size={20} className="group-hover:scale-105 transition-transform" />
              ) : (
                <IoSunnyOutline size={20} className="group-hover:scale-105 transition-transform" />
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 text-text-secondary hover:text-primary transition-all duration-300 rounded-full hover:bg-glass-subtleHover group border border-transparent hover:border-glass"
            >
              <IoCartOutline size={22} className="group-hover:scale-105 transition-transform" />
              <AnimatePresence>
                {totalItemsCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 bg-accent text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-bg-dark"
                  >
                    {totalItemsCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Auth Buttons - Desktop */}
            <div className="hidden sm:flex items-center space-x-3 pl-2 border-l border-glass">
              <button
                onClick={() => onOpenAuth('login')}
                className="text-xs font-semibold text-text-secondary hover:text-primary transition-colors py-2 px-3 rounded-lg hover:bg-glass-subtleHover"
              >
                Login
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="bg-primary hover:bg-primary-dark text-black text-xs font-bold py-2 px-4 rounded-lg transition-all shadow-md shadow-primary/5 hover:shadow-primary/20 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Register
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-text-secondary hover:text-primary transition-colors rounded-full hover:bg-glass-subtleHover"
            >
              {isMobileMenuOpen ? <IoCloseOutline size={26} /> : <IoMenuOutline size={26} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden bg-bg-card border-b border-glass overflow-hidden"
            >
              <div className="px-6 py-6 space-y-4 flex flex-col">
                {navLinks.map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.hash}`}
                    onClick={(e) => handleNavClick(e, link)}
                    className="text-base font-medium py-2 border-b border-glass/30 text-text-secondary hover:text-primary transition-colors"
                  >
                    {link.name}
                  </a>
                ))}
                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAuth('login');
                    }}
                    className="text-sm font-semibold text-text-secondary hover:text-primary py-2 px-4 rounded-lg bg-glass-subtle flex items-center space-x-2"
                  >
                    <IoPersonOutline size={16} />
                    <span>Login</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAuth('register');
                    }}
                    className="bg-primary hover:bg-primary-dark text-black text-sm font-bold py-2.5 px-6 rounded-lg transition-all"
                  >
                    Register
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};
export default Navbar;
