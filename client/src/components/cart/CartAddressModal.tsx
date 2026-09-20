import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MapPin,
  Home,
  Briefcase,
  Navigation,
  Crosshair,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Building,
  Tag
} from 'lucide-react';
import type { Address } from '../../types/auth.types';
import { getFastAndAccurateLocation, fastReverseGeocode } from '../../utils/geolocation';

interface CartAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressAdded: (newAddress: Address) => void;
  currentUser?: any;
  existingAddresses?: Address[];
  updateProfile: (data: any) => Promise<{ success: boolean; error?: string }>;
}

export const CartAddressModal: React.FC<CartAddressModalProps> = ({
  isOpen,
  onClose,
  onAddressAdded,
  currentUser,
  existingAddresses = [],
  updateProfile
}) => {
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [customLabel, setCustomLabel] = useState('');
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isDefault, setIsDefault] = useState(existingAddresses.length === 0);

  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  // GPS Auto-Detection & Reverse Geocoding
  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    setStatus(null);

    getFastAndAccurateLocation(
      async (result) => {
        setLat(result.latitude);
        setLng(result.longitude);

        try {
          const details = await fastReverseGeocode(result.latitude, result.longitude);
          if (details) {
            if (details.street) setStreet(details.street);
            if (details.area) setArea(details.area);
            if (details.city) setCity(details.city);
            if (details.state) setState(details.state);
            if (details.pincode) setPincode(details.pincode);
          }
          setStatus({
            type: 'success',
            message: '📍 GPS Location locked & address pre-filled!'
          });
        } catch (e) {
          setStatus({
            type: 'success',
            message: '📍 GPS Location coordinates locked!'
          });
        } finally {
          setIsLocating(false);
          setTimeout(() => setStatus(null), 3500);
        }
      },
      (errMessage) => {
        setIsLocating(false);
        setStatus({
          type: 'error',
          message: errMessage || 'Failed to detect current location. Please enter details manually.'
        });
      }
    );
  };

  // Progressive geocoding fallback if GPS was not used
  const resolveCoordinates = async (): Promise<{ lat?: number; lng?: number }> => {
    if (lat && lng) return { lat, lng };

    const searchLevels = [
      [street, area, city, pincode, 'India'].filter(Boolean).join(', '),
      [area, city, pincode, 'India'].filter(Boolean).join(', '),
      [city, pincode, 'India'].filter(Boolean).join(', '),
      [pincode, 'India'].filter(Boolean).join(', ')
    ];

    for (const query of searchLevels) {
      if (!query.trim()) continue;
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await resp.json();
        if (data && data[0] && data[0].lat && data[0].lon) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
        }
      } catch (e) {
        // proceed to next tier
      }
    }
    return {};
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!street.trim() || !city.trim() || !pincode.trim()) {
      setStatus({ type: 'error', message: 'Street Address, City, and Pincode are required.' });
      return;
    }

    if (!phone.trim()) {
      setStatus({ type: 'error', message: 'Contact Phone Number is required.' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      let finalLat = lat;
      let finalLng = lng;

      if (!finalLat || !finalLng) {
        const resolved = await resolveCoordinates();
        finalLat = resolved.lat;
        finalLng = resolved.lng;
      }

      const finalLabel = label === 'Other' ? (customLabel.trim() || 'Other') : label;

      const newAddress: Address = {
        id: `addr_${Date.now()}`,
        label: finalLabel,
        fullName: fullName.trim() || currentUser?.name || 'Customer',
        phone: phone.trim() || currentUser?.phone || '',
        street: street.trim(),
        area: area.trim(),
        city: city.trim(),
        state: state.trim() || 'Andhra Pradesh',
        pincode: pincode.trim(),
        landmark: landmark.trim(),
        latitude: finalLat,
        longitude: finalLng,
        isDefault: isDefault || existingAddresses.length === 0
      };

      let updatedAddresses = [...existingAddresses];
      if (newAddress.isDefault) {
        updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefault: false }));
      }
      updatedAddresses.push(newAddress);

      // Save to user profile in backend database
      await updateProfile({ addresses: updatedAddresses });

      // Notify parent to instantly select and recalculate delivery fees
      onAddressAdded(newAddress);
      onClose();
    } catch (err: any) {
      console.error('Failed to save address:', err);
      setStatus({ type: 'error', message: err.message || 'Failed to save address. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#12151D] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto max-h-[90vh] flex flex-col"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <MapPin className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white">
                  Add Delivery Address
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-stone-400">
                  Select or enter your location to update delivery charges
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
            {/* GPS Locate Me Button */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary text-black flex items-center justify-center shrink-0 shadow-sm">
                  <Crosshair className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    Use Current GPS Location
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-stone-400 font-medium">
                    Fastest auto-fill with exact road distance
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <Crosshair className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Locate Me</span>
                  </>
                )}
              </button>
            </div>

            {/* Status Alert */}
            {status && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  status.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}
              >
                {status.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            {/* Address Form */}
            <form id="cart-address-form" onSubmit={handleSubmit} className="space-y-3.5">
              {/* Address Label Selector */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-700 dark:text-stone-300 uppercase tracking-wider">
                  Save Address As
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Home', 'Work', 'Other'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLabel(l)}
                      className={`py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        label === l
                          ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-stone-300 hover:border-primary/40'
                      }`}
                    >
                      {l === 'Home' && <Home className="w-3.5 h-3.5" />}
                      {l === 'Work' && <Briefcase className="w-3.5 h-3.5" />}
                      {l === 'Other' && <Navigation className="w-3.5 h-3.5" />}
                      <span>{l}</span>
                    </button>
                  ))}
                </div>
                {label === 'Other' && (
                  <div className="pt-1.5">
                    <input
                      type="text"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="e.g. Friends Flat, Gym, Studio"
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-stone-500 focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-stone-400 uppercase tracking-wider">
                    Receiver Name *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-stone-400 uppercase tracking-wider">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary font-medium font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* House / Street */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-stone-400 uppercase tracking-wider">
                  House / Flat No. & Street *
                </label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. D.No 4-12, Gandhi Road, Opp SBI Bank"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary font-medium"
                />
              </div>

              {/* Area / Locality */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-stone-400 uppercase tracking-wider">
                  Area / Locality
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Powerpet / Main Market / RTC Colony"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary font-medium"
                />
              </div>

              {/* City & State */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-stone-400 uppercase tracking-wider">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Eluru / Ravulapalem"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-stone-400 uppercase tracking-wider">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary font-medium"
                  />
                </div>
              </div>

              {/* Pincode & Landmark */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-stone-400 uppercase tracking-wider">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit pincode"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary font-medium font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-stone-400 uppercase tracking-wider">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Near water tank / temple"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary font-medium"
                  />
                </div>
              </div>

              {/* Set as default toggle */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-stone-300">
                  Set as default delivery address
                </span>
              </label>
            </form>
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-stone-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="cart-address-form"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving & Calculating...</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Save & Apply</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CartAddressModal;
