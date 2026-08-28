import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Package,
  Heart,
  Save,
  X,
  Loader2,
  AlertCircle,
  Home,
  Briefcase,
  Navigation,
  ArrowLeft,
  Sparkles,
  Check,
  LogOut
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ProfileSkeletonLoader } from '../components/common/MobileSkeletonLoader';
import type { Address } from '../types/auth.types';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading, updateProfile, refreshAuth, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'ADDRESSES'>(
    (location.state as any)?.activeTab || 'DETAILS'
  );

  // Edit Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Avatar presets
  const AVATAR_PRESETS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  ];

  useEffect(() => {
    if ((location.state as any)?.activeTab) {
      setActiveTab((location.state as any).activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !user) {
      navigate('/login', { state: { from: '/profile' } });
      return;
    }

    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setProfileImage(user.profileImage || '');
      setAddresses(user.addresses || []);

      // Also refresh user data from server to get latest
      refreshAuth();
    }
  }, [user, isAuthenticated]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileStatus({ type: 'error', message: 'Name cannot be empty.' });
      return;
    }

    setIsSavingProfile(true);
    setProfileStatus(null);

    const res = await updateProfile({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      profileImage
    });

    setIsSavingProfile(false);
    if (res.success) {
      setProfileStatus({ type: 'success', message: 'Profile updated successfully!' });
      setIsEditingProfile(false);
      setTimeout(() => setProfileStatus(null), 3000);
    } else {
      setProfileStatus({ type: 'error', message: res.error || 'Failed to update profile.' });
    }
  };

  // Delete address
  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this address?')) return;

    const updatedAddresses = addresses.filter(a => a.id !== id);
    if (updatedAddresses.length > 0 && !updatedAddresses.some(a => a.isDefault)) {
      updatedAddresses[0].isDefault = true;
    }

    const res = await updateProfile({ addresses: updatedAddresses });
    if (res.success) {
      setAddresses(updatedAddresses);
      setProfileStatus({ type: 'success', message: 'Address removed.' });
      setTimeout(() => setProfileStatus(null), 3000);
    }
  };

  // Set default address
  const handleSetDefaultAddress = async (id: string) => {
    const updatedAddresses = addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }));

    const res = await updateProfile({ addresses: updatedAddresses });
    if (res.success) {
      setAddresses(updatedAddresses);
      setProfileStatus({ type: 'success', message: 'Default address updated.' });
      setTimeout(() => setProfileStatus(null), 3000);
    }
  };

  return (
    <>
      <Helmet>
        <title>My Profile | Foodway Delivery Service</title>
        <meta name="description" content="View and update your personal details and delivery addresses on Foodway." />
      </Helmet>

      <div className="min-h-screen bg-bg-dark text-text-primary pt-24 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-primary transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Home</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/orders')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-card border border-glass text-xs font-semibold text-text-secondary hover:text-primary hover:border-primary/40 transition-all shadow-sm"
              >
                <Package className="w-4 h-4 text-primary" />
                <span>My Orders</span>
              </button>
              <button
                onClick={() => navigate('/wishlist')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-card border border-glass text-xs font-semibold text-text-secondary hover:text-primary hover:border-primary/40 transition-all shadow-sm"
              >
                <Heart className="w-4 h-4 text-error" />
                <span>Wishlist</span>
              </button>
            </div>
          </div>

          {/* Profile Status Notification Banner */}
          <AnimatePresence>
            {profileStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-medium border shadow-lg ${
                  profileStatus.type === 'success'
                    ? 'bg-success/15 border-success/30 text-success'
                    : 'bg-error/15 border-error/30 text-error'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {profileStatus.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  )}
                  <span>{profileStatus.message}</span>
                </div>
                <button onClick={() => setProfileStatus(null)} className="hover:opacity-70">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!user ? (
            <ProfileSkeletonLoader />
          ) : (
            <>
              {/* Header Card / Hero Profile Container */}
              <div className="relative rounded-3xl bg-gradient-to-r from-primary/10 via-bg-card to-bg-card border border-glass p-6 sm:p-8 overflow-hidden shadow-luxury">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
              {/* Profile Avatar */}
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-primary/40 shadow-2xl bg-bg-card flex items-center justify-center">
                  {profileImage || user?.profileImage ? (
                    <img
                      src={profileImage || user?.profileImage}
                      alt={user?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-black text-3xl">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-primary text-white dark:text-black shadow-lg hover:scale-105 transition-transform"
                  title="Change avatar"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* User Bio & Meta info */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <h1 className="text-2xl sm:text-3xl font-black font-display text-text-primary tracking-tight">
                    {user?.name || 'Valued Customer'}
                  </h1>
                  <span className="px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {user?.role || 'CUSTOMER'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs sm:text-sm text-text-secondary">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-primary" />
                    <span>{user?.email || 'No email provided'}</span>
                  </div>
                  {user?.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-primary" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user?.createdAt && (
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-text-muted pt-1">
                  Manage your personal account information, preferred delivery locations, and security settings.
                </p>
              </div>

              {/* Action Buttons: Edit Profile & Logout */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(!isEditingProfile);
                    setActiveTab('DETAILS');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white dark:hover:text-black transition-all text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login', { replace: true });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-error/10 border border-error/30 text-error hover:bg-error hover:text-white transition-all text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                  title="Logout from account"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Segmented Switch Control */}
          <div className="relative p-1.5 bg-bg-card border border-glass rounded-2xl flex items-center shadow-sm max-w-md mx-auto sm:mx-0">
            <button
              type="button"
              onClick={() => setActiveTab('DETAILS')}
              className={`relative flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center space-x-2 cursor-pointer z-10 ${
                activeTab === 'DETAILS'
                  ? 'text-black font-black'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {activeTab === 'DETAILS' && (
                <motion.div
                  layoutId="profilePageTabPill"
                  className="absolute inset-0 bg-primary rounded-xl shadow-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                <span>Personal Details</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ADDRESSES')}
              className={`relative flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center space-x-2 cursor-pointer z-10 ${
                activeTab === 'ADDRESSES'
                  ? 'text-black font-black'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {activeTab === 'ADDRESSES' && (
                <motion.div
                  layoutId="profilePageTabPill"
                  className="absolute inset-0 bg-primary rounded-xl shadow-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Saved Addresses</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    activeTab === 'ADDRESSES' ? 'bg-black/20 text-black' : 'bg-primary/20 text-primary'
                  }`}
                >
                  {addresses.length}
                </span>
              </span>
            </button>
          </div>

          {/* TAB 1: Personal Details View & Edit Form */}
          {activeTab === 'DETAILS' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-card border border-glass rounded-3xl p-6 sm:p-8 shadow-luxury space-y-6"
            >
              <div className="flex items-center justify-between border-b border-glass pb-4">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Personal Account Info</h2>
                  <p className="text-xs text-text-muted">Update your profile name, mobile number, and avatar image.</p>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Info</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                      Full Name *
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        value={name}
                        disabled={!isEditingProfile}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-cardSec border border-glass text-sm text-text-primary focus:outline-none focus:border-primary disabled:opacity-60 transition-colors"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                      Email Address (Account ID)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="email"
                        value={email}
                        disabled={!isEditingProfile}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-cardSec border border-glass text-sm text-text-primary focus:outline-none focus:border-primary disabled:opacity-60 transition-colors"
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="tel"
                        value={phone}
                        disabled={!isEditingProfile}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-cardSec border border-glass text-sm text-text-primary focus:outline-none focus:border-primary disabled:opacity-60 transition-colors"
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>

                  {/* Profile Image URL */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                      Profile Avatar URL
                    </label>
                    <div className="relative">
                      <Sparkles className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        value={profileImage}
                        disabled={!isEditingProfile}
                        onChange={(e) => setProfileImage(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-cardSec border border-glass text-sm text-text-primary focus:outline-none focus:border-primary disabled:opacity-60 transition-colors"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Avatars Selection (Visible when editing) */}
                {isEditingProfile && (
                  <div className="space-y-2 pt-2 border-t border-glass">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                      Or Choose Preset Avatar
                    </label>
                    <div className="flex items-center gap-4 flex-wrap">
                      {AVATAR_PRESETS.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setProfileImage(url)}
                          className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-transform hover:scale-105 cursor-pointer ${
                            profileImage === url ? 'border-primary ring-2 ring-primary/40' : 'border-glass'
                          }`}
                        >
                          <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                      {profileImage && (
                        <button
                          type="button"
                          onClick={() => setProfileImage('')}
                          className="px-3 py-1.5 rounded-lg bg-bg-cardSec text-xs text-text-muted hover:text-error border border-glass cursor-pointer"
                        >
                          Reset Default
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                {isEditingProfile && (
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-glass">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setName(user?.name || '');
                        setEmail(user?.email || '');
                        setPhone(user?.phone || '');
                        setProfileImage(user?.profileImage || '');
                      }}
                      className="px-5 py-2.5 rounded-xl border border-glass text-xs font-bold text-text-secondary hover:bg-bg-cardSec transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 rounded-xl bg-primary text-white dark:text-black text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-2 shadow-luxury disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          )}

          {/* TAB 2: Addresses Column / Management */}
          {activeTab === 'ADDRESSES' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header and Add Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-card border border-glass rounded-3xl p-6 shadow-luxury">
                <div>
                  <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span>Saved Delivery Addresses</span>
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    Manage your home, work, and custom delivery addresses for faster order checkout.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/profile/address/new')}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white dark:text-black text-xs font-bold flex items-center gap-2 hover:bg-primary-dark transition-all shadow-luxury shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Address</span>
                </button>
              </div>

              {/* Addresses List Grid / Column */}
              {addresses.length === 0 ? (
                <div className="bg-bg-card border border-dashed border-glass rounded-3xl p-12 text-center space-y-4 shadow-luxury">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-text-primary">No Saved Addresses Found</h3>
                    <p className="text-xs text-text-muted max-w-sm mx-auto">
                      Save your address now so you won't have to type it every time you place an order.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/profile/address/new')}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white dark:text-black text-xs font-bold inline-flex items-center gap-2 hover:bg-primary-dark transition-all shadow-luxury cursor-pointer"
                  >
                    <span>Add Address Now</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`relative bg-bg-card border rounded-3xl p-6 shadow-luxury transition-all hover:border-primary/40 flex flex-col justify-between ${
                        addr.isDefault ? 'border-primary/60 ring-1 ring-primary/30' : 'border-glass'
                      }`}
                    >
                      {/* Top Header Badge & Type */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full bg-bg-cardSec border border-glass text-text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                            {addr.label === 'Home' && <Home className="w-3.5 h-3.5 text-primary" />}
                            {addr.label === 'Work' && <Briefcase className="w-3.5 h-3.5 text-secondary" />}
                            {addr.label === 'Other' && <Navigation className="w-3.5 h-3.5 text-info" />}
                            <span>{addr.label || 'Home'}</span>
                          </span>

                          {addr.isDefault ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-success/15 border border-success/30 text-success text-[10px] font-black uppercase flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[3]" />
                              Default Address
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-[11px] font-bold text-text-muted hover:text-primary transition-colors cursor-pointer"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>

                        {/* Receiver Details */}
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-text-primary">{addr.fullName || user?.name}</h4>
                          {addr.phone && (
                            <p className="text-xs text-text-muted flex items-center gap-1">
                              <Phone className="w-3 h-3 text-primary" />
                              <span>{addr.phone}</span>
                            </p>
                          )}
                        </div>

                        {/* Street & Location Address */}
                        <div className="text-xs text-text-secondary leading-relaxed bg-bg-cardSec p-3 rounded-xl border border-glass">
                          <p className="font-medium">{addr.street}</p>
                          {addr.area && <p>{addr.area}</p>}
                          <p>{addr.city}{addr.state ? `, ${addr.state}` : ''}, {addr.pincode}</p>
                          {addr.landmark && (
                            <p className="text-[11px] text-text-muted mt-1 italic">Landmark: {addr.landmark}</p>
                          )}
                          {addr.latitude && addr.longitude && (
                            <p className="text-[10px] text-primary font-mono mt-1.5 flex items-center gap-1 pt-1 border-t border-glass">
                              <MapPin className="w-3 h-3 text-primary" />
                              <span>GPS Pinned ({addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)})</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-glass">
                        <button
                          onClick={() => navigate(`/profile/address/edit/${addr.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-bg-cardSec hover:bg-primary/10 border border-glass hover:border-primary/40 text-xs font-bold text-text-secondary hover:text-primary transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="px-3 py-1.5 rounded-lg bg-bg-cardSec hover:bg-error/10 border border-glass hover:border-error/40 text-xs font-bold text-text-secondary hover:text-error transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
            </>
          )}

        </div>
      </div>
    </>
  );
};

export default ProfilePage;
