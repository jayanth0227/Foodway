import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
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
  Mail,
  Phone,
  Sparkles,
  Check,
  Edit3,
  BadgeCheck,
  X,
  Save,
  Loader2,
  AlertCircle,
  MapPin,
  Plus,
  Home,
  Briefcase,
  Navigation,
  Trash2,
  CheckCircle2,
  Crosshair,
  Map as MapIcon
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import type { Language } from '../../i18n/translations';
import { getFastAndAccurateLocation, fastReverseGeocode } from '../../utils/geolocation';
import type { Address } from '../../types/auth.types';
import { ProfileSkeletonLoader } from './MobileSkeletonLoader';
import { FaWhatsapp } from 'react-icons/fa';

// Leaflet Map Imports
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';

// Fix Leaflet default icon asset paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Map View Re-centering Component
const ChangeView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// Custom Map Click & Drag Events Component
const LocationMarker: React.FC<{
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
  onLocationSelect: (lat: number, lng: number) => void;
}> = ({ position, setPosition, onLocationSelect }) => {
  useMapEvents({
    click(e) {
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
        if (marker != null) {
          const latLng = marker.getLatLng();
          const newPos: [number, number] = [latLng.lat, latLng.lng];
          setPosition(newPos);
          onLocationSelect(latLng.lat, latLng.lng);
        }
      },
    }),
    [setPosition, onLocationSelect]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
    />
  );
};

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

  // Active Toggle Switch Tab: 'DETAILS' or 'ADDRESSES'
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'ADDRESSES'>('DETAILS');

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Edit Personal Profile Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editProfileImage, setEditProfileImage] = useState('');
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [personalStatus, setPersonalStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Addresses State & Form
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressStatus, setAddressStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Map & Geocoding State
  const [mapPosition, setMapPosition] = useState<[number, number]>([16.3067, 80.4365]); // Default: Guntur, AP
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Address Form fields
  const [addrLabel, setAddrLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [addrFullName, setAddrFullName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrArea, setAddrArea] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [addrLat, setAddrLat] = useState<number | undefined>(undefined);
  const [addrLng, setAddrLng] = useState<number | undefined>(undefined);

  // Avatar presets
  const AVATAR_PRESETS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  ];

  // Sync state when user object updates
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setEditPhone(user.phone || '');
      setEditProfileImage(user.profileImage || '');
      setAddresses(user.addresses || []);
      setAddrFullName(user.name || '');
      setAddrPhone(user.phone || '');
    }
  }, [user, isOpen]);

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

  // Fast & accurate reverse geocoding
  const reverseGeocode = async (latitude: number, longitude: number) => {
    setIsGeocoding(true);
    try {
      const details = await fastReverseGeocode(latitude, longitude);
      if (details) {
        if (details.street) setAddrStreet(details.street);
        if (details.area) setAddrArea(details.area);
        if (details.city) setAddrCity(details.city);
        if (details.state) setAddrState(details.state);
        if (details.pincode) setAddrPincode(details.pincode);
      }
    } catch (err) {
      console.warn('Reverse geocoding failed:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleLocationSelect = (latitude: number, longitude: number) => {
    setAddrLat(latitude);
    setAddrLng(longitude);
    reverseGeocode(latitude, longitude);
  };

  // Handle Save Personal Profile
  const handleSavePersonalProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setPersonalStatus({ type: 'error', message: 'Name is required.' });
      return;
    }

    setIsSavingPersonal(true);
    setPersonalStatus(null);

    try {
      const res = await updateProfile({
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        profileImage: editProfileImage
      });

      if (res.success) {
        setPersonalStatus({ type: 'success', message: t('profile_updated') || 'Profile updated!' });
        setIsEditingPersonal(false);
        setTimeout(() => setPersonalStatus(null), 3000);
      } else {
        setPersonalStatus({ type: 'error', message: res.error || 'Failed to update profile.' });
      }
    } catch (err: any) {
      setPersonalStatus({ type: 'error', message: err.message || 'Error updating profile.' });
    } finally {
      setIsSavingPersonal(false);
    }
  };

  // Reset Address Form
  const resetAddressForm = () => {
    setAddrLabel('Home');
    setAddrFullName(user?.name || '');
    setAddrPhone(user?.phone || '');
    setAddrStreet('');
    setAddrArea('');
    setAddrCity('Guntur');
    setAddrState('Andhra Pradesh');
    setAddrPincode('522002');
    setAddrLandmark('');
    setAddrIsDefault(addresses.length === 0);
    setAddrLat(undefined);
    setAddrLng(undefined);
    setEditingAddressId(null);
    setIsAddingAddress(false);
  };

  // Pre-fill form for Edit Address
  const handleStartEditAddress = (addr: Address) => {
    setEditingAddressId(addr.id);
    setAddrLabel((addr.label as any) || 'Home');
    setAddrFullName(addr.fullName || user?.name || '');
    setAddrPhone(addr.phone || user?.phone || '');
    setAddrStreet(addr.street || '');
    setAddrArea(addr.area || '');
    setAddrCity(addr.city || 'Guntur');
    setAddrState(addr.state || 'Andhra Pradesh');
    setAddrPincode(addr.pincode || '');
    setAddrLandmark(addr.landmark || '');
    setAddrIsDefault(Boolean(addr.isDefault));
    if (addr.latitude && addr.longitude) {
      setAddrLat(addr.latitude);
      setAddrLng(addr.longitude);
      setMapPosition([addr.latitude, addr.longitude]);
    }
    setIsAddingAddress(true);
  };

  // Handle Save Address (Add or Edit)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrStreet.trim() || !addrCity.trim() || !addrPincode.trim()) {
      setAddressStatus({ type: 'error', message: 'Street, City, and Pincode are required.' });
      return;
    }

    setIsSavingAddress(true);
    setAddressStatus(null);

    let finalLat = addrLat;
    let finalLng = addrLng;

    if (!finalLat || !finalLng) {
      try {
        const fullAddrStr = [addrStreet, addrArea, addrCity, addrState, addrPincode].filter(Boolean).join(', ');
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddrStr)}&limit=1`);
        const data = await resp.json();
        if (data && data[0] && data[0].lat && data[0].lon) {
          finalLat = parseFloat(data[0].lat);
          finalLng = parseFloat(data[0].lon);
          setAddrLat(finalLat);
          setAddrLng(finalLng);
        }
      } catch (e) {}
    }

    let updatedAddresses: Address[] = [...addresses];

    if (editingAddressId) {
      // Edit existing
      updatedAddresses = updatedAddresses.map(a => {
        if (a.id === editingAddressId) {
          return {
            ...a,
            label: addrLabel,
            fullName: addrFullName.trim(),
            phone: addrPhone.trim(),
            street: addrStreet.trim(),
            area: addrArea.trim(),
            city: addrCity.trim(),
            state: addrState.trim(),
            pincode: addrPincode.trim(),
            landmark: addrLandmark.trim(),
            isDefault: addrIsDefault,
            latitude: finalLat,
            longitude: finalLng
          };
        }
        return addrIsDefault ? { ...a, isDefault: false } : a;
      });
    } else {
      // Add new address
      const newAddress: Address = {
        id: `addr_${Date.now()}`,
        label: addrLabel,
        fullName: addrFullName.trim() || user?.name,
        phone: addrPhone.trim() || user?.phone,
        street: addrStreet.trim(),
        area: addrArea.trim(),
        city: addrCity.trim(),
        state: addrState.trim() || 'Andhra Pradesh',
        pincode: addrPincode.trim(),
        landmark: addrLandmark.trim(),
        isDefault: addrIsDefault || addresses.length === 0,
        latitude: finalLat,
        longitude: finalLng
      };

      if (newAddress.isDefault) {
        updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefault: false }));
      }
      updatedAddresses.push(newAddress);
    }

    // Ensure at least one default
    if (updatedAddresses.length > 0 && !updatedAddresses.some(a => a.isDefault)) {
      updatedAddresses[0].isDefault = true;
    }

    const res = await updateProfile({ addresses: updatedAddresses });
    setIsSavingAddress(false);

    if (res.success) {
      setAddresses(updatedAddresses);
      setAddressStatus({
        type: 'success',
        message: editingAddressId ? 'Address updated successfully!' : 'New address saved!'
      });
      resetAddressForm();
      setTimeout(() => setAddressStatus(null), 3000);
    } else {
      setAddressStatus({ type: 'error', message: res.error || 'Failed to save address.' });
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Remove this address?')) return;

    let updatedAddresses = addresses.filter(a => a.id !== id);
    if (updatedAddresses.length > 0 && !updatedAddresses.some(a => a.isDefault)) {
      updatedAddresses[0].isDefault = true;
    }

    const res = await updateProfile({ addresses: updatedAddresses });
    if (res.success) {
      setAddresses(updatedAddresses);
      setAddressStatus({ type: 'success', message: 'Address removed.' });
      setTimeout(() => setAddressStatus(null), 3000);
    }
  };

  // Set Default Address
  const handleSetDefaultAddress = async (id: string) => {
    const updatedAddresses = addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }));

    const res = await updateProfile({ addresses: updatedAddresses });
    if (res.success) {
      setAddresses(updatedAddresses);
      setAddressStatus({ type: 'success', message: 'Default address updated.' });
      setTimeout(() => setAddressStatus(null), 3000);
    }
  };

  // Detect GPS Location
  const handleDetectGPS = () => {
    setIsGeocoding(true);
    setAddressStatus(null);

    getFastAndAccurateLocation(
      async (res) => {
        setAddrLat(res.latitude);
        setAddrLng(res.longitude);
        setMapPosition([res.latitude, res.longitude]);
        await reverseGeocode(res.latitude, res.longitude);
        if (res.isHighAccuracy) {
          setAddressStatus({ type: 'success', message: '📍 Precise GPS location pinned on map!' });
          setTimeout(() => setAddressStatus(null), 3000);
        }
      },
      (errMessage) => {
        setIsGeocoding(false);
        alert(errMessage);
      }
    );
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
          className="fixed inset-0 z-[100000] bg-bg-dark text-text-primary h-[100dvh] flex flex-col font-sans lg:hidden"
        >
          {/* 1. Top Header Bar */}
          <div className="sticky top-0 z-30 bg-bg-card/95 dark:bg-bg-cardSec/95 backdrop-blur-md border-b border-glass px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-glass-subtle hover:bg-glass border border-glass text-text-primary flex items-center justify-center transition-all cursor-pointer shrink-0"
                aria-label="Back"
              >
                <ArrowLeft size={19} />
              </button>
              <div>
                <h1 className="text-base font-black text-text-primary tracking-tight font-display">
                  {t('profile_title')}
                </h1>
                <p className="text-[10px] text-text-muted font-medium">
                  {user ? `Hi, ${user.name.split(' ')[0]}` : 'Account & Settings'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-primary/10 text-primary border border-primary/20">
                {role || 'Customer'}
              </span>
            </div>
          </div>

          {/* 2. Modern Segmented Switch Control Bar (Tab Switcher) */}
          <div className="sticky top-[57px] z-20 bg-bg-dark/95 backdrop-blur-md px-4 pt-3 pb-2 border-b border-glass shrink-0">
            <div className="relative p-1 bg-bg-cardSec/90 border border-glass rounded-2xl flex items-center shadow-inner">
              {/* Option 1: Personal Details */}
              <button
                type="button"
                onClick={() => setActiveTab('DETAILS')}
                className={`relative flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer z-10 ${
                  activeTab === 'DETAILS'
                    ? 'text-black dark:text-black font-black'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {activeTab === 'DETAILS' && (
                  <motion.div
                    layoutId="mobileProfileTabPill"
                    className="absolute inset-0 bg-primary rounded-xl shadow-md"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <User size={15} />
                  <span>Personal Details</span>
                </span>
              </button>

              {/* Option 2: Saved Addresses */}
              <button
                type="button"
                onClick={() => setActiveTab('ADDRESSES')}
                className={`relative flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer z-10 ${
                  activeTab === 'ADDRESSES'
                    ? 'text-black dark:text-black font-black'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {activeTab === 'ADDRESSES' && (
                  <motion.div
                    layoutId="mobileProfileTabPill"
                    className="absolute inset-0 bg-primary rounded-xl shadow-md"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <MapPin size={15} />
                  <span>Add / Address</span>
                  {addresses.length > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        activeTab === 'ADDRESSES'
                          ? 'bg-black/20 text-black'
                          : 'bg-primary/20 text-primary'
                      }`}
                    >
                      {addresses.length}
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* 3. Main Scrollable Container */}
          <div className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 space-y-4 pb-36 max-w-md mx-auto w-full custom-scroll">
            {isLoading ? (
              <ProfileSkeletonLoader />
            ) : (
              <AnimatePresence mode="wait">
                {/* TAB 1: PERSONAL DETAILS */}
                {activeTab === 'DETAILS' && (
                  <motion.div
                    key="details-tab"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    {/* User Hero Card */}
                    {user ? (
                      <div className="relative overflow-hidden rounded-3xl bg-bg-cardSec border border-glass p-4 shadow-luxury">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-xl pointer-events-none" />

                        <div className="relative z-10 space-y-3">
                          {/* Top Row: Avatar + Name */}
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              {user.profileImage ? (
                                <img
                                  src={user.profileImage}
                                  alt={user.name}
                                  className="w-12 h-12 rounded-2xl object-cover border-2 border-primary/40 shadow-md"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-2xl bg-primary text-black font-black text-lg flex items-center justify-center shadow-md border-2 border-primary/40">
                                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-bg-cardSec">
                                <BadgeCheck size={12} />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <User size={15} className="text-primary shrink-0" />
                                <h2 className="text-base font-black text-text-primary truncate font-display">
                                  {user.name}
                                </h2>
                              </div>
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-wider">
                                {role || 'Customer'}
                              </span>
                            </div>
                          </div>

                          {/* Email & Mobile Row + Bottom Right Edit Button */}
                          <div className="pt-2 border-t border-glass/60 flex items-end justify-between gap-2">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-start gap-1.5 text-xs text-text-muted font-medium">
                                <Mail size={14} className="text-primary/90 shrink-0 mt-0.5" />
                                <span className="break-all text-text-primary font-semibold">{user.email}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                                <Phone size={14} className="text-primary shrink-0" />
                                <span>{user.phone || 'No mobile added'}</span>
                              </div>
                            </div>

                            {/* Edit Button right next to Mobile row */}
                            <button
                              type="button"
                              onClick={() => setIsEditingPersonal(!isEditingPersonal)}
                              className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
                            >
                              <Edit3 size={14} />
                              <span>{isEditingPersonal ? 'Close' : 'Edit'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Guest Card */
                      <div className="rounded-3xl bg-bg-cardSec border border-primary/20 p-5 space-y-3 shadow-luxury relative overflow-hidden">
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
                            className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider shadow-md hover:brightness-105 transition-all cursor-pointer text-center"
                          >
                            {t('login')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Personal Details Edit Form (Expandable / Toggleable) */}
                    {user && (isEditingPersonal || !user.phone) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-bg-cardSec border border-primary/30 rounded-3xl p-4 space-y-3 shadow-lg"
                      >
                        <div className="flex items-center justify-between border-b border-glass pb-2">
                          <h3 className="text-xs font-black text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
                            <User size={14} className="text-primary" />
                            <span>Edit Personal Info</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsEditingPersonal(false)}
                            className="text-text-muted hover:text-text-primary text-xs"
                          >
                            <X size={15} />
                          </button>
                        </div>

                        {personalStatus && (
                          <div
                            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                              personalStatus.type === 'success'
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {personalStatus.type === 'success' ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <AlertCircle size={16} />
                            )}
                            <span>{personalStatus.message}</span>
                          </div>
                        )}

                        <form onSubmit={handleSavePersonalProfile} className="space-y-3 text-xs">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                              Full Name *
                            </label>
                            <div className="relative">
                              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                              <input
                                type="text"
                                required
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-card border border-glass text-text-primary font-medium text-xs focus:border-primary outline-none"
                                placeholder="Your full name"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                              Email Address
                            </label>
                            <div className="relative">
                              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                              <input
                                type="email"
                                required
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-card border border-glass text-text-primary font-medium text-xs focus:border-primary outline-none"
                                placeholder="Email address"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                              Phone Number
                            </label>
                            <div className="relative">
                              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                              <input
                                type="tel"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-card border border-glass text-text-primary font-medium text-xs focus:border-primary outline-none"
                                placeholder="+91 9876543210"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                              Choose Preset Avatar
                            </label>
                            <div className="flex items-center gap-2 flex-wrap">
                              {AVATAR_PRESETS.map((url, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setEditProfileImage(url)}
                                  className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all ${
                                    editProfileImage === url
                                      ? 'border-primary ring-2 ring-primary/40 scale-105'
                                      : 'border-glass'
                                  }`}
                                >
                                  <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                                </button>
                              ))}
                              {editProfileImage && (
                                <button
                                  type="button"
                                  onClick={() => setEditProfileImage('')}
                                  className="text-[10px] text-text-muted hover:text-error px-2 py-1"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setIsEditingPersonal(false)}
                              className="flex-1 py-2 rounded-xl bg-bg-card border border-glass text-text-primary font-bold text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingPersonal}
                              className="flex-1 py-2 rounded-xl bg-primary text-black font-black text-xs uppercase flex items-center justify-center gap-1 shadow-md"
                            >
                              {isSavingPersonal ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Save size={14} />
                              )}
                              <span>Save Details</span>
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}

                    {/* Quick Shortcuts Grid */}
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

                    {/* Language Selector */}
                    <div className="p-3 rounded-2xl bg-bg-cardSec border border-glass shadow-xs space-y-2">
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

                    {/* Theme Switcher */}
                    <div className="bg-bg-cardSec border border-glass rounded-2xl overflow-hidden shadow-luxury">
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

                    {/* Admin / Restaurant Portal links */}
                    {(role === 'ADMIN' || role === 'RESTAURANT') && (
                      <div className="bg-bg-cardSec border border-glass rounded-2xl overflow-hidden shadow-luxury">
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
                              </div>
                            </div>
                            <ChevronRight size={17} className="text-primary" />
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
                              </div>
                            </div>
                            <ChevronRight size={17} className="text-primary" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Logout Action Button - Placed right below Theme Switcher */}
                    {user && (
                      <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full py-3.5 px-4 rounded-2xl bg-error/10 hover:bg-error/20 border border-error/20 text-error font-black text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer tracking-wider uppercase shadow-xs mt-3"
                      >
                        <LogOut size={16} />
                        <span>{t('log_out') || 'Log Out'}</span>
                      </button>
                    )}
                  </motion.div>
                )}

                {/* TAB 2: ADD / SAVED ADDRESSES */}
                {activeTab === 'ADDRESSES' && (
                  <motion.div
                    key="addresses-tab"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    {/* Status Alert */}
                    {addressStatus && (
                      <div
                        className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border shadow-sm ${
                          addressStatus.type === 'success'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {addressStatus.type === 'success' ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          <AlertCircle size={17} />
                        )}
                        <span>{addressStatus.message}</span>
                      </div>
                    )}

                    {/* Top Action Header */}
                    <div className="flex items-center justify-between bg-bg-cardSec border border-glass rounded-2xl p-3.5 shadow-xs">
                      <div>
                        <h2 className="text-xs font-black text-text-primary font-display flex items-center gap-1.5">
                          <MapPin size={15} className="text-primary" />
                          <span>Delivery Locations</span>
                        </h2>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {addresses.length} saved addresses
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate('/profile/address/new');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-bg-card border border-glass text-text-primary text-xs font-bold flex items-center gap-1 hover:bg-glass transition-all cursor-pointer"
                          title="Open Full Screen Map"
                        >
                          <MapIcon size={14} className="text-primary" />
                          <span className="hidden sm:inline">Full Map</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (isAddingAddress) {
                              resetAddressForm();
                            } else {
                              resetAddressForm();
                              setIsAddingAddress(true);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-md hover:brightness-105 transition-all cursor-pointer shrink-0"
                        >
                          {isAddingAddress ? <X size={15} /> : <Plus size={15} />}
                          <span>{isAddingAddress ? 'Cancel' : '+ Add Address'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Add/Edit Address Form with Interactive Leaflet Map */}
                    {isAddingAddress && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-bg-cardSec border border-primary/40 rounded-3xl p-4 space-y-3 shadow-luxury"
                      >
                        <div className="flex items-center justify-between border-b border-glass pb-2">
                          <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                            <Plus size={14} className="text-primary" />
                            <span>{editingAddressId ? 'Edit Address' : 'Add New Delivery Address'}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={resetAddressForm}
                            className="text-text-muted hover:text-text-primary"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Interactive OpenStreetMap Leaflet Container */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] uppercase font-black text-primary tracking-wider flex items-center gap-1">
                              <MapIcon size={13} />
                              <span>Pin Location On Map (Tap / Drag Marker)</span>
                            </label>

                            <button
                              type="button"
                              onClick={handleDetectGPS}
                              disabled={isGeocoding}
                              className="px-2 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Crosshair size={12} />
                              <span>{isGeocoding ? 'Locating...' : 'Use GPS'}</span>
                            </button>
                          </div>

                          <div className="relative rounded-2xl overflow-hidden border border-glass h-48 sm:h-56 shadow-inner z-0">
                            <MapContainer
                              center={mapPosition}
                              zoom={15}
                              scrollWheelZoom={true}
                              className="w-full h-full"
                            >
                              <ChangeView center={mapPosition} />
                              <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              />
                              <LocationMarker
                                position={mapPosition}
                                setPosition={setMapPosition}
                                onLocationSelect={handleLocationSelect}
                              />
                            </MapContainer>

                            {isGeocoding && (
                              <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2 z-10 pointer-events-none">
                                <Loader2 size={16} className="animate-spin text-primary" />
                                <span>Auto-detecting location...</span>
                              </div>
                            )}
                          </div>

                          {addrLat && addrLng && (
                            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                              <Check size={12} />
                              <span>Map Pinned ({addrLat.toFixed(4)}, {addrLng.toFixed(4)})</span>
                            </p>
                          )}
                        </div>

                        <form onSubmit={handleSaveAddress} className="space-y-3 text-xs pt-1">
                          {/* Tag selector */}
                          <div>
                            <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                              Address Type Label
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                                <button
                                  key={lbl}
                                  type="button"
                                  onClick={() => setAddrLabel(lbl)}
                                  className={`py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1 border transition-all ${
                                    addrLabel === lbl
                                      ? 'bg-primary text-black border-primary shadow-xs'
                                      : 'bg-bg-card border-glass text-text-primary'
                                  }`}
                                >
                                  {lbl === 'Home' && <Home size={13} />}
                                  {lbl === 'Work' && <Briefcase size={13} />}
                                  {lbl === 'Other' && <Navigation size={13} />}
                                  <span>{lbl}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Full Name & Phone */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                                Contact Name
                              </label>
                              <input
                                type="text"
                                value={addrFullName}
                                onChange={(e) => setAddrFullName(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-bg-card border border-glass dark:border-white/15 dark:bg-[#121620] text-text-primary font-medium text-xs focus:border-primary outline-none"
                                placeholder="Receiver name"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                                Mobile Number
                              </label>
                              <input
                                type="tel"
                                value={addrPhone}
                                onChange={(e) => setAddrPhone(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-bg-card border border-glass dark:border-white/15 dark:bg-[#121620] text-text-primary font-medium text-xs focus:border-primary outline-none"
                                placeholder="Phone number"
                              />
                            </div>
                          </div>

                          {/* House / Street */}
                          <div>
                            <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                              Flat, House No, Street Address *
                            </label>
                            <input
                              type="text"
                              required
                              value={addrStreet}
                              onChange={(e) => setAddrStreet(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-bg-card border border-glass dark:border-white/15 dark:bg-[#121620] text-text-primary font-medium text-xs focus:border-primary outline-none"
                              placeholder="House No 12-3, Brodipet 4th line"
                            />
                          </div>

                          {/* Area & Landmark */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                                Area / Locality
                              </label>
                              <input
                                type="text"
                                value={addrArea}
                                onChange={(e) => setAddrArea(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-bg-card border border-glass dark:border-white/15 dark:bg-[#121620] text-text-primary font-medium text-xs focus:border-primary outline-none"
                                placeholder="Area name"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                                Landmark
                              </label>
                              <input
                                type="text"
                                value={addrLandmark}
                                onChange={(e) => setAddrLandmark(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-bg-card border border-glass dark:border-white/15 dark:bg-[#121620] text-text-primary font-medium text-xs focus:border-primary outline-none"
                                placeholder="Near Water Tank"
                              />
                            </div>
                          </div>

                          {/* City & Pincode */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                                City *
                              </label>
                              <input
                                type="text"
                                required
                                value={addrCity}
                                onChange={(e) => setAddrCity(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-bg-card border border-glass text-text-primary font-medium text-xs focus:border-primary outline-none"
                                placeholder="City"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                                Pincode *
                              </label>
                              <input
                                type="text"
                                required
                                value={addrPincode}
                                onChange={(e) => setAddrPincode(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-bg-card border border-glass text-text-primary font-medium text-xs focus:border-primary outline-none"
                                placeholder="522002"
                              />
                            </div>
                          </div>

                          {/* Set default checkbox */}
                          <label className="flex items-center space-x-2 text-xs font-bold text-text-primary cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={addrIsDefault}
                              onChange={(e) => setAddrIsDefault(e.target.checked)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary"
                            />
                            <span>Make this my default delivery address</span>
                          </label>

                          <div className="flex items-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={resetAddressForm}
                              className="flex-1 py-2.5 rounded-xl bg-bg-card border border-glass text-text-primary font-bold text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingAddress}
                              className="flex-1 py-2.5 rounded-xl bg-primary text-black font-black text-xs uppercase flex items-center justify-center gap-1 shadow-md"
                            >
                              {isSavingAddress ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Save size={14} />
                              )}
                              <span>Save Address</span>
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}

                    {/* Address List */}
                    {addresses.length === 0 && !isAddingAddress ? (
                      <div className="bg-bg-cardSec border border-dashed border-glass rounded-3xl p-8 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                          <MapPin size={24} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-text-primary">No Saved Addresses</h3>
                          <p className="text-xs text-text-muted mt-1">
                            Add a delivery address to speed up order checkout.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              resetAddressForm();
                              setIsAddingAddress(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-md cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Add First Address</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate('/profile/address/new');
                            }}
                            className="px-4 py-2 rounded-xl bg-bg-card border border-glass text-text-primary text-xs font-bold inline-flex items-center gap-1 cursor-pointer hover:bg-glass"
                          >
                            <MapIcon size={14} className="text-primary" />
                            <span>Full Map View</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {addresses.map((addr) => (
                          <div
                            key={addr.id}
                            className={`relative bg-bg-cardSec border rounded-2xl p-4 shadow-xs transition-all ${
                              addr.isDefault
                                ? 'border-primary/60 ring-1 ring-primary/30'
                                : 'border-glass'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-full bg-bg-card border border-glass text-text-primary text-[10px] font-black uppercase flex items-center gap-1">
                                {addr.label === 'Home' && <Home size={12} className="text-primary" />}
                                {addr.label === 'Work' && <Briefcase size={12} className="text-secondary" />}
                                {addr.label === 'Other' && <Navigation size={12} className="text-info" />}
                                <span>{addr.label || 'Home'}</span>
                              </span>

                              {addr.isDefault ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[9px] font-black uppercase flex items-center gap-1">
                                  <Check size={11} />
                                  DEFAULT
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(addr.id)}
                                  className="text-[10px] font-bold text-text-muted hover:text-primary transition-colors cursor-pointer"
                                >
                                  Set Default
                                </button>
                              )}
                            </div>

                            <div className="mt-2.5 space-y-1">
                              <h4 className="text-xs font-black text-text-primary">
                                {addr.fullName || user?.name}
                              </h4>
                              {addr.phone && (
                                <p className="text-[11px] text-text-muted flex items-center gap-1">
                                  <span>📞 {addr.phone}</span>
                                </p>
                              )}
                              <p className="text-xs text-text-secondary leading-snug pt-1">
                                {addr.street}
                                {addr.area ? `, ${addr.area}` : ''}
                                {addr.city ? `, ${addr.city}` : ''}
                                {addr.pincode ? ` - ${addr.pincode}` : ''}
                              </p>
                              {addr.landmark && (
                                <p className="text-[10px] text-text-muted italic">
                                  Landmark: {addr.landmark}
                                </p>
                              )}
                              {addr.latitude && addr.longitude && (
                                <p className="text-[10px] text-primary font-mono mt-1 flex items-center gap-1">
                                  <MapPin size={11} />
                                  <span>Pinned on Map ({addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)})</span>
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end space-x-2 pt-3 mt-2 border-t border-glass">
                              <button
                                type="button"
                                onClick={() => handleStartEditAddress(addr)}
                                className="px-2.5 py-1 rounded-lg bg-bg-card hover:bg-glass border border-glass text-[11px] font-bold text-text-primary flex items-center gap-1 transition-all"
                              >
                                <Edit3 size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAddress(addr.id)}
                                className="px-2.5 py-1 rounded-lg bg-bg-card hover:bg-rose-500/10 border border-glass text-[11px] font-bold text-error flex items-center gap-1 transition-all"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

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
