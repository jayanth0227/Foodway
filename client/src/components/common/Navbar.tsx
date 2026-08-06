import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, User as UserIcon, Sun, Moon, Home, Compass, Store, Heart, Package, Bell, LayoutGrid, Utensils, ReceiptText, ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { MobileProfileOverlay } from './MobileProfileOverlay';

interface NavbarProps {
  onOpenAuth: (type: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('home');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const { totalItemsCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { user, role, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Home', id: 'home', hash: 'home' },
    { name: 'Restaurants', id: 'restaurants', hash: 'featured-restaurants' },
    { name: 'Contact', id: 'contact', hash: 'footer' },
  ];

  // Detect mobile soft keyboard open/close state
  useEffect(() => {
    const checkKeyboard = () => {
      if (window.visualViewport) {
        // Keyboard open usually reduces visualViewport height by > 120px
        const heightDiff = window.innerHeight - window.visualViewport.height;
        setIsKeyboardOpen(heightDiff > 120);
      } else {
        setIsKeyboardOpen(false);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          document.activeElement?.tagName || ''
        );
        if (!isInputActive) {
          if (window.visualViewport) {
            const heightDiff = window.innerHeight - window.visualViewport.height;
            setIsKeyboardOpen(heightDiff > 120);
          } else {
            setIsKeyboardOpen(false);
          }
        }
      }, 150);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', checkKeyboard);
      window.visualViewport.addEventListener('scroll', checkKeyboard);
    }
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    window.addEventListener('resize', checkKeyboard);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', checkKeyboard);
        window.visualViewport.removeEventListener('scroll', checkKeyboard);
      }
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('resize', checkKeyboard);
    };
  }, []);

  // Lock background body scroll when mobile profile overlay is open
  useEffect(() => {
    if (isProfileModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isProfileModalOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;

      setIsScrolled(scrollPosition > 20);
      setScrollProgress(totalHeight > 0 ? (scrollPosition / totalHeight) * 100 : 0);

      // Simple section detection for single page navigation
      if (location.pathname === '/') {
        const sections = ['home', 'featured-restaurants', 'categories', 'why-us', 'footer'];
        for (const section of sections) {
          const el = document.getElementById(section);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 150 && rect.bottom >= 150) {
              setActiveSection(section);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, link: typeof navLinks[0]) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: link.hash } });
    } else {
      const el = document.getElementById(link.hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSection(link.id);
      }
    }
  };

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${isScrolled
          ? 'bg-bg-dark/90 backdrop-blur-2xl border-b border-glass py-3.5 shadow-luxury'
          : 'bg-bg-dark/90 backdrop-blur-2xl border-b border-glass py-3.5 shadow-luxury lg:bg-transparent lg:border-transparent lg:py-6 lg:shadow-none'
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
                  className={`text-xs font-bold tracking-[0.12em] uppercase transition-colors duration-300 relative py-2.5 ${isActive ? 'text-primary' : 'text-text-muted hover:text-text-primary'
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
            {/* Theme Toggle Button - Desktop Only */}
            <button
              onClick={toggleTheme}
              className="hidden lg:block relative p-2.5 text-text-secondary hover:text-primary transition-all duration-300 rounded-full bg-glass-subtle border border-glass hover:border-primary/20 group cursor-pointer"
              aria-label="Toggle theme"
              title="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon size={18} className="group-hover:scale-110 group-hover:rotate-[15deg] transition-all duration-500" />
              ) : (
                <Sun size={18} className="group-hover:scale-110 group-hover:rotate-[45deg] transition-all duration-500" />
              )}
            </button>

            {/* Notification Icon - Mobile Only */}
            <button
              onClick={() => {
                if (isAuthenticated) {
                  navigate('/orders');
                } else {
                  onOpenAuth('login');
                }
              }}
              className="lg:hidden relative p-2.5 text-text-secondary hover:text-primary transition-all duration-300 rounded-full bg-glass-subtle border border-glass hover:border-primary/20 group cursor-pointer"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={18} className="group-hover:scale-110 transition-transform duration-300" />
            </button>

            {/* Profile Icon / User Initial Avatar - Mobile Only */}
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setIsProfileModalOpen(true);
                } else {
                  onOpenAuth('login');
                }
              }}
              className="lg:hidden relative p-2 text-text-secondary hover:text-primary transition-all duration-300 rounded-full bg-glass-subtle border border-glass hover:border-primary/30 group cursor-pointer shrink-0"
              title="Profile & Account"
              aria-label="Profile"
            >
              {isAuthenticated && user?.name ? (
                <div className="w-6.5 h-6.5 min-w-[26px] min-h-[26px] rounded-full bg-primary text-black font-black text-xs flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <UserIcon size={18} className="group-hover:scale-110 transition-transform duration-300" />
              )}
            </button>

            {/* Cart Button - Desktop Only */}
            {!location.pathname.startsWith('/admin') && (
              <button
                onClick={() => navigate('/cart')}
                className="hidden lg:block relative p-2.5 text-text-secondary hover:text-primary transition-all duration-300 rounded-full bg-glass-subtle border border-glass hover:border-primary/20 group cursor-pointer"
                title="View Shopping Cart"
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
            )}

            {/* Auth Buttons - Desktop */}
            <div className="hidden sm:flex items-center space-x-3 pl-3 border-l border-glass">
              {isAuthenticated && user ? (
                <>
                  {role === 'ADMIN' && location.pathname !== '/admin/dashboard' && (
                    <Link
                      to="/admin/dashboard"
                      className="text-xs font-bold tracking-[0.12em] uppercase text-primary hover:text-primary-dark transition-colors mr-2"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  {role === 'RESTAURANT' && location.pathname !== '/restaurant/dashboard' && (
                    <Link
                      to="/restaurant/dashboard"
                      className="text-xs font-bold tracking-[0.12em] uppercase text-primary hover:text-primary-dark transition-colors mr-2"
                    >
                      Restaurant Portal
                    </Link>
                  )}
                  <button
                    onClick={() => navigate('/orders')}
                    className="inline-flex items-center space-x-1 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-primary transition-colors mr-2 cursor-pointer"
                    title="My Orders & Status"
                  >
                    <Package size={14} />
                    <span>My Orders</span>
                  </button>

                  {/* Profile Indicator */}
                  <div className="flex items-center space-x-2 bg-glass-subtle border border-glass rounded-xl px-3 py-1.5">
                    <UserIcon size={14} className="text-primary" />
                    <span className="text-xs font-bold text-text-secondary">
                      Hi, {user.name.split(' ')[0]}
                    </span>
                  </div>

                  <button
                    onClick={handleLogoutClick}
                    className="btn-ghost text-xs font-bold py-2 px-4 rounded-xl uppercase tracking-wider transition-all duration-300 text-error hover:bg-error/10"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="btn-ghost text-xs font-bold py-2 px-4 rounded-xl uppercase tracking-wider transition-all duration-300"
                  >
                    Login
                  </Link>
                  <button
                    onClick={() => onOpenAuth('register')}
                    className="btn-primary text-[10px] font-bold py-2.5 px-5 rounded-xl uppercase tracking-wider transition-all duration-300"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Profile Page Overlay */}
      <MobileProfileOverlay
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        role={role}
        onLogout={handleLogoutClick}
      />

      {/* Static Solid Bottom Navigation Bar for Mobile/Tablet */}
      <div
        className={`fixed bottom-3 left-1/2 -translate-x-1/2 z-50 lg:hidden w-[calc(100%-24px)] max-w-md bg-white dark:bg-bg-cardSec border border-slate-200 dark:border-glass shadow-xl rounded-2xl px-2 py-1 flex items-center justify-around overflow-visible transition-all duration-300 ${isKeyboardOpen
            ? 'opacity-0 pointer-events-none translate-y-12 scale-95'
            : 'opacity-100 translate-y-0 scale-100'
          }`}
      >
        {/* 1. Home */}
        <button
          onClick={() => {
            navigate('/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveSection('home');
          }}
          className={`flex flex-col items-center justify-center py-0.5 px-2 rounded-xl transition-colors duration-200 cursor-pointer ${location.pathname === '/' && activeSection === 'home'
              ? 'text-primary font-black'
              : 'text-text-muted hover:text-text-primary'
            }`}
          aria-label="Home"
        >
          <Home size={19} className={location.pathname === '/' && activeSection === 'home' ? 'text-primary fill-primary/20' : ''} />
          <span className="text-[9.5px] font-bold mt-0.5 tracking-tight">Home</span>
        </button>

        {/* 2. Explore Categories */}
        <button
          onClick={() => navigate('/categories')}
          className={`flex flex-col items-center justify-center py-0.5 px-2 rounded-xl transition-colors duration-200 cursor-pointer ${location.pathname === '/categories'
              ? 'text-primary font-black'
              : 'text-text-muted hover:text-text-primary'
            }`}
          aria-label="Explore Categories"
        >
          <LayoutGrid size={19} className={location.pathname === '/categories' ? 'text-primary fill-primary/20' : ''} />
          <span className="text-[9.5px] font-bold mt-0.5 tracking-tight">Explore</span>
        </button>

        {/* 3. CENTER ACTION BUTTON: Stores & Restaurants */}
        <button
          onClick={() => navigate('/restaurants')}
          className="relative -top-3 flex flex-col items-center justify-center cursor-pointer group z-20 shrink-0"
          aria-label="Stores & Restaurants"
        >
          {/* Solid Circular FAB Button */}
          <div
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center shadow-luxury border-2 border-white dark:border-glass transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${location.pathname.startsWith('/restaurants')
                ? 'bg-gradient-to-r from-primary to-amber-400 text-black ring-2 ring-primary/40'
                : 'bg-gradient-to-r from-primary to-amber-400 text-black hover:brightness-105'
              }`}
          >
            <Utensils size={20} className="stroke-[2.5]" />
          </div>
          <span
            className={`text-[10px] font-black mt-0.5 tracking-tight ${location.pathname.startsWith('/restaurants') ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'
              }`}
          >
            Stores
          </span>
        </button>

        {/* 4. My Orders */}
        <button
          onClick={() => {
            if (isAuthenticated) {
              navigate('/orders');
            } else {
              onOpenAuth('login');
            }
          }}
          className={`flex flex-col items-center justify-center py-0.5 px-2 rounded-xl transition-colors duration-200 cursor-pointer ${location.pathname === '/orders'
              ? 'text-primary font-black'
              : 'text-text-muted hover:text-text-primary'
            }`}
          aria-label="My Orders"
        >
          <ReceiptText size={19} className={location.pathname === '/orders' ? 'text-primary' : ''} />
          <span className="text-[9.5px] font-bold mt-0.5 tracking-tight">Orders</span>
        </button>

        {/* 5. Cart */}
        {!location.pathname.startsWith('/admin') && (
          <button
            onClick={() => navigate('/cart')}
            className={`flex flex-col items-center justify-center py-0.5 px-2 rounded-xl transition-colors duration-200 cursor-pointer ${location.pathname === '/cart'
                ? 'text-primary font-black'
                : 'text-text-muted hover:text-text-primary'
              }`}
            aria-label="Shopping Cart"
          >
            <div className="relative">
              <ShoppingCart size={19} className={location.pathname === '/cart' ? 'text-primary' : ''} />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-primary text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-bg-dark shadow-sm">
                  {totalItemsCount}
                </span>
              )}
            </div>
            <span className="text-[9.5px] font-bold mt-0.5 tracking-tight">Cart</span>
          </button>
        )}
      </div>
    </>
  );
};
export default Navbar;
