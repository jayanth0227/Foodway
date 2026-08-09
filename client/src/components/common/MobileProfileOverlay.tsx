import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Phone,
  ShieldCheck,
  Package,
  Heart,
  Moon,
  Sun,
  ShoppingBag,
  Store,
  ChevronRight,
  LogOut,
  Globe,
  User,
  Sparkles,
  Check,
  Edit3,
  BadgeCheck,
  X,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import type { Language } from '../../i18n/translations';
import { FaWhatsapp } from 'react-icons/fa';

interface MobileProfileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  role: string | null;
  onLogout: () => void;
  onOpenAuth?: (type: 'login' | 'register') => void;
  isLoading?: boolean;
}

export const MobileProfileOverlay: React.FC<MobileProfileOverlayProps> = ({
  isOpen,
  onClose,
  user,
  role,
  onLogout,
  onOpenAuth,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const { totalItemsCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { updateProfile } = useAuth();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Edit Profile Form State
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState((user as any)?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync edit form with user object whenever modal opens
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setEditPhone((user as any)?.phone || '');
    }
  }, [user, showDetailsModal]);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editEmail.trim()) {
      setSaveStatus({ type: 'error', message: 'Name and email are required.' });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      const res = await updateProfile({ name: editName, email: editEmail, phone: editPhone });
      if (res.success) {
        setSaveStatus({ type: 'success', message: t('profile_updated') || 'Profile updated in database!' });
        setTimeout(() => {
          setShowDetailsModal(false);
          setSaveStatus(null);
        }, 1200);
      } else {
        setSaveStatus({ type: 'error', message: res.error || 'Failed to update profile.' });
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || 'Error updating profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const languagesList: { id: Language; label: string }[] = [
    { id: 'en', label: 'English' },
    { id: 'te', label: 'తెలుగు' },
    { id: 'hi', label: 'हिंदी' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-0 z-[100] bg-bg-dark text-text-primary overflow-y-auto overscroll-y-contain touch-pan-y lg:hidden min-h-screen flex flex-col font-sans"
        >
          {/* 1. Header Bar (Clean back arrow + Page Title matching website theme) */}
          <div className="sticky top-0 z-20 bg-bg-card/90 dark:bg-bg-cardSec/90 backdrop-blur-md border-b border-glass px-4 py-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-glass-subtle hover:bg-glass border border-glass text-text-primary flex items-center justify-center transition-all cursor-pointer shrink-0"
                aria-label="Back"
              >
                <ArrowLeft size={19} />
              </button>
              <h1 className="text-base font-black text-text-primary tracking-tight font-display">
                {t('profile_title')}
              </h1>
            </div>

            {/* Role / Region Tag Badge */}
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-primary/10 text-primary border border-primary/20">
              {role || 'Customer'}
            </span>
          </div>

          {/* 2. Main Scrollable Body */}
          <div className="flex-1 px-4 py-4 space-y-4 pb-28 max-w-md mx-auto w-full">
            {isLoading ? (
              /* Skeleton loader */
              <div className="space-y-4 animate-pulse">
                <div className="h-28 rounded-3xl bg-bg-cardSec border border-glass" />
                <div className="grid grid-cols-4 gap-2 h-20 bg-bg-cardSec rounded-2xl border border-glass" />
                <div className="h-40 rounded-3xl bg-bg-cardSec border border-glass" />
              </div>
            ) : (
              <>
                {/* User Hero Card */}
                {user ? (
                  <div className="relative overflow-hidden rounded-3xl bg-bg-cardSec border border-glass p-4 shadow-luxury">
                    {/* Ambient Glow matching MK Delivery website palette */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-xl pointer-events-none" />

                    <div className="flex items-center space-x-3.5 relative z-10">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-primary text-black font-black text-xl flex items-center justify-center shadow-md border-2 border-primary/40">
                          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-bg-cardSec">
                          <BadgeCheck size={12} />
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h2 className="text-base font-black text-text-primary truncate font-display">
                            {user.name}
                          </h2>
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-primary/15 text-primary border border-primary/25 shrink-0">
                            {role || 'User'}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted truncate mt-0.5 font-normal">
                          {user.email}
                        </p>
                      </div>

                      {/* Info Detail Trigger */}
                      <button
                        type="button"
                        onClick={() => setShowDetailsModal(true)}
                        className="w-9 h-9 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all cursor-pointer shrink-0 border border-primary/20"
                        title={t('account_info')}
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Guest Card */
                  <div className="rounded-3xl bg-bg-cardSec border border-primary/20 p-5 space-y-3 shadow-luxury relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                    <div className="flex items-center space-x-3 relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-primary text-black flex items-center justify-center font-black shadow-md">
                        <Sparkles size={22} />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-text-primary font-display">
                          {t('profile_welcome')}
                        </h2>
                        <p className="text-xs text-text-muted font-normal">
                          {t('profile_guest_subtitle')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-1 relative z-10">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onOpenAuth) onOpenAuth('login');
                          else navigate('/login');
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider shadow-md hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer text-center"
                      >
                        {t('login')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onOpenAuth) onOpenAuth('register');
                          else navigate('/login');
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-bg-card border border-glass text-text-primary font-black text-xs uppercase tracking-wider hover:bg-glass active:scale-[0.98] transition-all cursor-pointer text-center"
                      >
                        {t('register')}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Quick Action Buttons Grid */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/orders');
                    }}
                    className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-bg-cardSec border border-glass shadow-xs hover:border-primary/50 transition-all cursor-pointer text-center group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                      <Package size={19} />
                    </div>
                    <span className="text-[11px] font-bold text-text-primary">{t('orders')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/wishlist');
                    }}
                    className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-bg-cardSec border border-glass shadow-xs hover:border-primary/50 transition-all cursor-pointer text-center group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                      <Heart size={19} />
                    </div>
                    <span className="text-[11px] font-bold text-text-primary">{t('favourites')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/cart');
                    }}
                    className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-bg-cardSec border border-glass shadow-xs hover:border-primary/50 transition-all cursor-pointer text-center group relative"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform relative">
                      <ShoppingBag size={19} />
                      {totalItemsCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                          {totalItemsCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-text-primary">{t('cart')}</span>
                  </button>

                  <a
                    href="https://wa.me/919573041191"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-bg-cardSec border border-glass shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer text-center group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                      <FaWhatsapp size={20} className="text-[#25D366]" />
                    </div>
                    <span className="text-[11px] font-bold text-text-primary">{t('support')}</span>
                  </a>
                </div>

                {/* 4. Language Quick Selector Section */}
                <div className="p-3.5 rounded-2xl bg-bg-cardSec border border-glass shadow-xs space-y-2">
                  <div className="flex items-center space-x-2 text-text-muted px-1">
                    <Globe size={15} className="text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      {t('app_language')}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {languagesList.map((lang) => {
                      const isActive = language === lang.id;
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => setLanguage(lang.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer border ${
                            isActive
                              ? 'bg-primary text-black border-primary shadow-xs'
                              : 'bg-bg-card border-glass text-text-primary hover:bg-glass'
                          }`}
                        >
                          {isActive && <Check size={13} className="stroke-[3]" />}
                          <span>{lang.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Menu Options Group */}
                <div className="space-y-3">
                  {/* Primary Activity Options */}
                  <div className="bg-bg-cardSec border border-glass rounded-2xl divide-y divide-glass shadow-luxury overflow-hidden">
                    {/* My Orders & Live Tracking */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/orders');
                      }}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-left cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Package size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">
                            {t('my_orders_live')}
                          </p>
                          <p className="text-[10px] text-text-muted font-normal">
                            {t('my_orders_sub')}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={17} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Saved Favourites */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/wishlist');
                      }}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-left cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                          <Heart size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">
                            {t('saved_favs')}
                          </p>
                          <p className="text-[10px] text-text-muted font-normal">
                            {t('saved_favs_sub')}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={17} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Browse Restaurants */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/restaurants');
                      }}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-left cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Store size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">
                            {t('browse_restaurants')}
                          </p>
                          <p className="text-[10px] text-text-muted font-normal">
                            {t('browse_res_sub')}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={17} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Theme Switcher Card RIGHT BELOW Browse Restaurants */}
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-left cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">
                            {t('app_theme')}
                          </p>
                          <p className="text-[10px] text-text-muted font-normal">
                            {theme === 'light' ? t('light_mode') : t('dark_mode')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-primary/15 text-primary border border-primary/25">
                          {theme === 'light' ? t('light_mode') : t('dark_mode')}
                        </span>
                        <ChevronRight size={17} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  </div>

                  {/* Portals (Admin / Restaurant) if Applicable */}
                  {(role === 'ADMIN' || role === 'RESTAURANT') && (
                    <div className="bg-bg-cardSec border border-glass rounded-2xl divide-y divide-glass shadow-luxury overflow-hidden">
                      {role === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate('/admin/dashboard');
                          }}
                          className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-left cursor-pointer group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-primary text-black flex items-center justify-center font-bold shrink-0">
                              <ShieldCheck size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-primary">
                                Admin Dashboard
                              </p>
                              <p className="text-[10px] text-text-muted font-normal">
                                {t('admin_dashboard_sub')}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={17} className="text-primary group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      )}

                      {role === 'RESTAURANT' && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate('/restaurant/dashboard');
                          }}
                          className="w-full flex items-center justify-between p-3.5 hover:bg-glass transition-colors text-left cursor-pointer group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-primary text-black flex items-center justify-center font-bold shrink-0">
                              <Store size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-primary">
                                {t('restaurant_profile')}
                              </p>
                              <p className="text-[10px] text-text-muted font-normal">
                                {t('restaurant_portal_sub')}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={17} className="text-primary group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Customer Care Direct Bar */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="https://wa.me/919573041191"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 text-xs font-extrabold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                    >
                      <FaWhatsapp size={18} className="text-[#25D366]" />
                      <span>{t('whatsapp_support')}</span>
                    </a>

                    <a
                      href="tel:9573041191"
                      className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-xs font-extrabold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Phone size={16} />
                      <span>{t('call_support')}</span>
                    </a>
                  </div>
                </div>

                {/* 6. Logout Action Button */}
                {user && (
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-error/10 hover:bg-error/20 border border-error/20 text-error font-black text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer tracking-wider uppercase mt-4"
                  >
                    <LogOut size={16} />
                    <span>{t('log_out')}</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* User Details & Edit Profile Modal */}
          <AnimatePresence>
            {showDetailsModal && user && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-bg-cardSec border border-glass rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-left"
                >
                  <div className="flex items-center justify-between border-b border-glass pb-3">
                    <div className="flex items-center space-x-2">
                      <Edit3 size={18} className="text-primary" />
                      <h3 className="text-sm font-black text-text-primary font-display">
                        Edit & Save Profile
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailsModal(false);
                        setSaveStatus(null);
                      }}
                      className="p-1 rounded-lg text-text-muted hover:text-text-primary cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {saveStatus && (
                    <div
                      className={`p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 border ${
                        saveStatus.type === 'success'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {saveStatus.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                      <span>{saveStatus.message}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-text-muted block px-1">
                        {t('full_name')}
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-card border border-glass focus:border-primary text-text-primary font-bold text-xs outline-none transition-all"
                          placeholder="Your Full Name"
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-text-muted block px-1">
                        {t('email_address')}
                      </label>
                      <div className="relative">
                        <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-card border border-glass focus:border-primary text-text-primary font-bold text-xs outline-none transition-all"
                          placeholder="your.email@example.com"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-text-muted block px-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-card border border-glass focus:border-primary text-text-primary font-bold text-xs outline-none transition-all"
                          placeholder="Your Mobile Number"
                        />
                      </div>
                    </div>

                    {/* Role Readonly Indicator */}
                    <div className="p-2.5 rounded-xl bg-bg-card/50 border border-glass flex items-center justify-between text-[11px]">
                      <span className="text-text-muted font-medium">{t('role_type')}:</span>
                      <span className="font-bold text-primary uppercase">{role || 'Customer'}</span>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDetailsModal(false);
                          setSaveStatus(null);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-bg-card border border-glass text-text-primary font-black text-xs uppercase tracking-wider hover:bg-glass cursor-pointer"
                      >
                        {t('cancel')}
                      </button>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider shadow-md hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save size={15} />
                            <span>Save Profile</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Logout Confirmation Alert Modal */}
          <AnimatePresence>
            {showLogoutConfirm && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="bg-bg-cardSec border border-glass rounded-3xl p-5 max-w-xs w-full shadow-2xl text-center space-y-4 relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-full bg-error/15 text-error border border-error/30 flex items-center justify-center mx-auto shadow-xs">
                    <LogOut size={22} className="stroke-[2.5]" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-black text-text-primary font-display">
                      {t('logging_out_title')}
                    </h3>
                    <p className="text-xs text-text-muted font-normal leading-snug">
                      {t('logging_out_msg')}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 py-3 px-3 rounded-xl bg-slate-200 dark:bg-bg-card border border-slate-300 dark:border-glass text-slate-900 dark:text-text-primary font-black text-xs uppercase tracking-wider hover:brightness-95 dark:hover:bg-glass transition-all cursor-pointer shadow-xs"
                    >
                      {t('logout_cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogoutConfirm(false);
                        onClose();
                        onLogout();
                      }}
                      className="flex-1 py-3 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 border border-red-500/50 transition-all cursor-pointer"
                    >
                      {t('log_out')}
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
