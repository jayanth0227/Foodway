import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  HelpCircle,
  Phone,
  Mail,
  ShieldCheck,
  Package,
  Heart,
  Moon,
  Sun,
  ShoppingBag,
  Store,
  Compass,
  ChevronRight,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';

interface MobileProfileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  role: string | null;
  onLogout: () => void;
  isLoading?: boolean;
}

export const MobileProfileOverlay: React.FC<MobileProfileOverlayProps> = ({
  isOpen,
  onClose,
  user,
  role,
  onLogout,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const { totalItemsCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Lock background body scroll when mobile profile overlay is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-0 z-[100] bg-bg-dark text-text-primary overflow-y-auto overscroll-y-contain touch-pan-y lg:hidden min-h-screen"
        >
          {/* 1. Header Banner matching MK Delivery Luxury Theme */}
          <div className="bg-bg-cardSec border-b border-glass pt-4 pb-4 px-4 rounded-b-3xl shadow-luxury relative overflow-hidden shrink-0">
            {/* Gold ambient glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            {isLoading ? (
              /* Profile Header Skeleton Loader */
              <div className="flex items-center space-x-3 relative z-10 animate-pulse">
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-glass-subtle border border-glass flex items-center justify-center text-text-primary shrink-0"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-11 h-11 rounded-full bg-primary/20 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-primary/25 rounded-md" />
                  <div className="w-24 h-3 bg-glass rounded-md" />
                </div>
              </div>
            ) : (
              /* Straight Horizontal Row: Back Arrow + User Avatar + Details */
              <div className="flex items-center space-x-3 relative z-10">
                {/* Back Arrow */}
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-glass-subtle hover:bg-glass border border-glass flex items-center justify-center text-text-primary transition-colors cursor-pointer shrink-0"
                  aria-label="Back"
                >
                  <ArrowLeft size={18} />
                </button>

                {/* User Avatar */}
                <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-primary text-black font-bold text-lg flex items-center justify-center shrink-0 aspect-square shadow-sm border border-primary/40">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>

                {/* User Name, Role & Email */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <h2 className="text-sm font-semibold text-text-primary truncate">
                      {user?.name || 'User Account'}
                    </h2>
                    <span className="px-1.5 py-0.5 text-[8.5px] font-medium uppercase rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {role || 'Customer'}
                    </span>
                  </div>

                  <p className="text-[11px] font-normal text-text-muted truncate mt-0.5">
                    {user?.email || 'Logged in'}
                  </p>
                </div>
              </div>
            )}

            {/* Express Region Status Strip */}
            <div className="mt-3 pt-2 border-t border-glass/60 flex items-center justify-between text-[10.5px] text-text-muted font-normal">
              <span className="flex items-center space-x-1 text-primary font-medium">
                <span>⚡ Express Fast Delivery Enabled</span>
              </span>
              <span className="text-[9.5px] uppercase text-text-muted font-normal">Konaseema Region</span>
            </div>
          </div>

          {/* Main Profile Body Content */}
          <div className="px-5 py-5 space-y-5 pb-40 max-w-md mx-auto">
            {isLoading ? (
              /* Profile Body Skeleton Loader */
              <div className="space-y-5 animate-pulse">
                {/* 4 Utility Cards Skeleton */}
                <div className="grid grid-cols-4 gap-2.5">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-bg-cardSec border border-glass h-20 space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/20" />
                      <div className="w-12 h-2.5 bg-glass rounded-md" />
                    </div>
                  ))}
                </div>

                {/* Categorized Detailed Menu Skeleton */}
                <div className="space-y-2">
                  <div className="w-24 h-3 bg-glass rounded-md px-2" />
                  <div className="bg-bg-cardSec border border-glass rounded-3xl divide-y divide-glass overflow-hidden">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="p-3.5 flex items-center justify-between">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-8.5 h-8.5 rounded-xl bg-primary/20 shrink-0" />
                          <div className="w-36 h-3.5 bg-glass rounded-md" />
                        </div>
                        <div className="w-4 h-4 bg-glass rounded-md" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* 2. Quick Utility Cards (4 Swiggy Grid Items) */}
                <div className="grid grid-cols-4 gap-2.5">
                  {/* My Orders */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onClose();
                      navigate('/orders');
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-bg-cardSec border border-glass shadow-sm hover:border-primary/40 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <Package size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-text-primary leading-tight">My Orders</span>
                  </motion.button>

                  {/* Wishlist */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onClose();
                      navigate('/wishlist');
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-bg-cardSec border border-glass shadow-sm hover:border-primary/40 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <Heart size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-text-primary leading-tight">Favourites</span>
                  </motion.button>

                  {/* App Theme Toggle */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleTheme}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-bg-cardSec border border-glass shadow-sm hover:border-primary/40 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </div>
                    <span className="text-[10px] font-bold text-text-primary leading-tight">
                      {theme === 'light' ? 'Dark' : 'Light'} Theme
                    </span>
                  </motion.button>

                  {/* Cart */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onClose();
                      navigate('/cart');
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-bg-cardSec border border-glass shadow-sm hover:border-primary/40 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform relative">
                      <ShoppingBag size={18} />
                      {totalItemsCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-black text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                          {totalItemsCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-text-primary leading-tight">Cart</span>
                  </motion.button>
                </div>

                {/* 3. Categorized Detailed Menu List */}
                <div className="space-y-4">
                  {/* Category 1: Food & Orders */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted px-2">
                      Food & Orders
                    </h4>
                    <div className="bg-bg-cardSec border border-glass rounded-3xl divide-y divide-glass shadow-luxury overflow-hidden">
                      {/* My Orders & Track */}
                      <button
                        onClick={() => {
                          onClose();
                          navigate('/orders');
                        }}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-xs font-bold text-text-primary group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-8.5 h-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Package size={17} />
                          </div>
                          <span className="text-xs font-bold">My Orders & Live Status</span>
                        </div>
                        <ChevronRight size={17} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      {/* My Saved Favourites */}
                      <button
                        onClick={() => {
                          onClose();
                          navigate('/wishlist');
                        }}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-xs font-bold text-text-primary group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-8.5 h-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Heart size={17} />
                          </div>
                          <span className="text-xs font-bold">My Saved Favourites</span>
                        </div>
                        <ChevronRight size={17} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      {/* Browse All Restaurants */}
                      <button
                        onClick={() => {
                          onClose();
                          navigate('/restaurants');
                        }}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-xs font-bold text-text-primary group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-8.5 h-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Store size={17} />
                          </div>
                          <span className="text-xs font-bold">Browse All Restaurants</span>
                        </div>
                        <ChevronRight size={17} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      {/* Explore Food Categories */}
                      <button
                        onClick={() => {
                          onClose();
                          navigate('/categories');
                        }}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-xs font-bold text-text-primary group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-8.5 h-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Compass size={17} />
                          </div>
                          <span className="text-xs font-bold">Explore Food Categories</span>
                        </div>
                        <ChevronRight size={17} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Category 2: Preferences & Support */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted px-2">
                      Preferences & Support
                    </h4>
                    <div className="bg-bg-cardSec border border-glass rounded-3xl divide-y divide-glass shadow-luxury overflow-hidden">
                      {/* Theme Switcher */}
                      <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-xs font-bold text-text-primary group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-8.5 h-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
                          </div>
                          <span className="text-xs font-bold">App Appearance Theme</span>
                        </div>
                        <span className="text-[9.5px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                          {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                        </span>
                      </button>

                      {/* Admin Portal (If role is ADMIN) */}
                      {role === 'ADMIN' && (
                        <button
                          onClick={() => {
                            onClose();
                            navigate('/admin/dashboard');
                          }}
                          className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-xs font-bold text-primary group cursor-pointer"
                        >
                          <div className="flex items-center space-x-3.5">
                            <div className="w-8.5 h-8.5 rounded-xl bg-primary text-black flex items-center justify-center font-bold">
                              <ShieldCheck size={17} />
                            </div>
                            <span className="text-xs font-bold">Admin Dashboard</span>
                          </div>
                          <ChevronRight size={17} className="text-primary group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      )}

                      {/* Restaurant Portal (If role is RESTAURANT) */}
                      {role === 'RESTAURANT' && (
                        <button
                          onClick={() => {
                            onClose();
                            navigate('/restaurant/dashboard');
                          }}
                          className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-xs font-bold text-primary group cursor-pointer"
                        >
                          <div className="flex items-center space-x-3.5">
                            <div className="w-8.5 h-8.5 rounded-xl bg-primary text-black flex items-center justify-center font-bold">
                              <Store size={17} />
                            </div>
                            <span className="text-xs font-bold">Restaurant Portal</span>
                          </div>
                          <ChevronRight size={17} className="text-primary group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      )}

                      {/* WhatsApp Support Link */}
                      <a
                        href="https://wa.me/919573041191"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-xs font-bold text-text-primary group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-8.5 h-8.5 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <HelpCircle size={17} />
                          </div>
                          <span className="text-xs font-bold">WhatsApp Customer Support</span>
                        </div>
                        <ChevronRight size={17} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* 4. Dual Instant Support Bar */}
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href="https://wa.me/919573041191"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <HelpCircle size={15} />
                    <span>WhatsApp Desk</span>
                  </a>

                  <a
                    href="tel:9573041191"
                    className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Phone size={15} />
                    <span>Call Helpline</span>
                  </a>
                </div>

                {/* 4. Logout Account Action Button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full py-3.5 px-6 rounded-2xl bg-error/10 hover:bg-error/20 border border-error/20 text-error font-black text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-md tracking-wider uppercase"
                >
                  <LogOut size={16} />
                  <span>Log Out of Account</span>
                </motion.button>
              </>
            )}
          </div>

          {/* Logout Confirmation Alert Dialog Modal */}
          <AnimatePresence>
            {showLogoutConfirm && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-bg-dark border border-glass rounded-[28px] p-6 max-w-xs w-full shadow-2xl text-center space-y-4 relative overflow-hidden"
                >
                  {/* Red Glow Ambient Decorator */}
                  <div className="absolute -top-12 -left-12 w-28 h-28 bg-red-500/15 rounded-full blur-xl pointer-events-none" />

                  {/* Icon Badge */}
                  <div className="w-14 h-14 rounded-full bg-red-500/15 text-red-500 border border-red-500/30 flex items-center justify-center mx-auto shadow-md ring-4 ring-red-500/10">
                    <LogOut size={24} className="stroke-[2.5]" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xl font-black text-text-primary font-display">
                      Logging Out?
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed font-medium">
                      Are you sure you want to log out{user?.name ? `, ${user.name.split(' ')[0]}` : ''}? You will need to sign in again to place orders.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 py-3 px-3 rounded-2xl bg-glass border border-glass text-text-primary font-black text-xs uppercase tracking-wider hover:bg-glass-hover active:scale-[0.97] transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogoutConfirm(false);
                        onClose();
                        onLogout();
                      }}
                      className="flex-1 py-3 px-3 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/30 border border-red-400/30 hover:brightness-110 active:scale-[0.97] transition-all cursor-pointer"
                    >
                      Log Out
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
