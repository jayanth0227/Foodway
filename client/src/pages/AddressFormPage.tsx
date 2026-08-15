import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Home,
  Briefcase,
  Navigation,
  User as UserIcon,
  Phone,
  Building2,
  Map as MapIcon,
  Compass,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  Loader2,
  Check,
  X,
  Crosshair,
  Globe,
  Tag
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Address } from '../types/auth.types';

// Leaflet Imports
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';

// Fix Leaflet default icon asset paths in bundled Vite environments
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
  const map = useMapEvents({
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
      position={position}
      draggable={true}
      eventHandlers={eventHandlers}
    />
  );
};

export const AddressFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { addressId } = useParams<{ addressId?: string }>();
  const { user, isAuthenticated, updateProfile } = useAuth();

  const isEditing = Boolean(addressId);

  // Address Form State
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [customLabel, setCustomLabel] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Coordinates State (Default to Hyderabad center)
  const DEFAULT_LAT = 17.3850;
  const DEFAULT_LNG = 78.4867;
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapPosition, setMapPosition] = useState<[number, number]>([DEFAULT_LAT, DEFAULT_LNG]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated && !user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    if (user) {
      if (isEditing && addressId) {
        const existing = (user.addresses || []).find((a: Address) => a.id === addressId);
        if (existing) {
          const rawLabel = existing.label || 'Home';
          if (rawLabel === 'Home' || rawLabel === 'Work') {
            setLabel(rawLabel as any);
            setCustomLabel('');
          } else {
            setLabel('Other');
            setCustomLabel(rawLabel === 'Other' ? '' : rawLabel);
          }
          setFullName(existing.fullName || user.name || '');
          setPhone(existing.phone || user.phone || '');
          setStreet(existing.street || '');
          setArea(existing.area || '');
          setCity(existing.city || '');
          setState(existing.state || '');
          setPincode(existing.pincode || '');
          setLandmark(existing.landmark || '');
          setIsDefault(!!existing.isDefault);

          if (existing.latitude && existing.longitude) {
            setLat(existing.latitude);
            setLng(existing.longitude);
            setMapPosition([existing.latitude, existing.longitude]);
          }
        } else {
          setStatus({ type: 'error', message: 'Address not found.' });
        }
      } else {
        // Defaults for new address
        setFullName(user.name || '');
        setPhone(user.phone || '');
        setIsDefault((user.addresses || []).length === 0);

        // Try getting user's current GPS location on initial load for new address
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const latitude = pos.coords.latitude;
              const longitude = pos.coords.longitude;
              setLat(latitude);
              setLng(longitude);
              setMapPosition([latitude, longitude]);
              reverseGeocode(latitude, longitude);
            },
            () => {},
            { timeout: 5000 }
          );
        }
      }
    }
  }, [user, isAuthenticated, addressId, isEditing]);

  // Reverse Geocoding using OpenStreetMap Nominatim API
  const reverseGeocode = async (latitude: number, longitude: number) => {
    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9'
          }
        }
      );
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || fontSub(addr) || addr.pedestrian || addr.street || '';
        const houseNo = addr.house_number || addr.building || '';
        const combinedStreet = [houseNo, road].filter(Boolean).join(', ');

        if (combinedStreet) setStreet(combinedStreet);
        if (addr.suburb || addr.neighbourhood || fontSub(addr)) {
          setArea(addr.suburb || addr.neighbourhood || fontSub(addr));
        }
        if (addr.city || addr.town || addr.village || addr.county) {
          setCity(addr.city || addr.town || addr.village || addr.county);
        }
        if (addr.state) setState(addr.state);
        if (addr.postcode) setPincode(addr.postcode);
      }
    } catch (err) {
      console.warn('Reverse geocoding failed:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const fontSub = (addrObj: any) => {
    return addrObj.residential || addrObj.subdivision || addrObj.commercial || '';
  };

  // Locate Me GPS Action Button
  const handleLocateMe = () => {
    setIsGeocoding(true);
    setStatus(null);

    const useIPFallback = async () => {
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        if (ipData && ipData.latitude && ipData.longitude) {
          const latitude = Number(ipData.latitude);
          const longitude = Number(ipData.longitude);
          setLat(latitude);
          setLng(longitude);
          setMapPosition([latitude, longitude]);
          reverseGeocode(latitude, longitude);
          return;
        }
      } catch (err) { }

      try {
        const ipRes2 = await fetch('https://ipinfo.io/json');
        const ipData2 = await ipRes2.json();
        if (ipData2 && ipData2.loc) {
          const [latStr, lngStr] = ipData2.loc.split(',');
          const latitude = Number(latStr);
          const longitude = Number(lngStr);
          if (!isNaN(latitude) && !isNaN(longitude)) {
            setLat(latitude);
            setLng(longitude);
            setMapPosition([latitude, longitude]);
            reverseGeocode(latitude, longitude);
            return;
          }
        }
      } catch (err2) { }

      setIsGeocoding(false);
      setStatus({ type: 'error', message: 'Could not auto-detect GPS location. Click anywhere on the Leaflet map below to pick location.' });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          setLat(latitude);
          setLng(longitude);
          setMapPosition([latitude, longitude]);
          reverseGeocode(latitude, longitude);
        },
        () => {
          useIPFallback();
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      useIPFallback();
    }
  };

  const handleLocationSelect = (selectedLat: number, selectedLng: number) => {
    setLat(selectedLat);
    setLng(selectedLng);
    setMapPosition([selectedLat, selectedLng]);
    reverseGeocode(selectedLat, selectedLng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!street.trim() || !city.trim() || !pincode.trim()) {
      setStatus({ type: 'error', message: 'Street Address, City, and Pincode are required.' });
      return;
    }

    setIsSaving(true);
    setStatus(null);

    const existingAddresses: Address[] = user?.addresses || [];
    let updatedAddresses: Address[] = [...existingAddresses];

    const finalLabel = label === 'Other' ? (customLabel.trim() || 'Other') : label;

    if (isEditing && addressId) {
      updatedAddresses = updatedAddresses.map(a => {
        if (a.id === addressId) {
          return {
            ...a,
            label: finalLabel,
            fullName: fullName.trim(),
            phone: phone.trim(),
            street: street.trim(),
            area: area.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            landmark: landmark.trim(),
            latitude: lat ?? undefined,
            longitude: lng ?? undefined,
            isDefault
          };
        }
        return isDefault ? { ...a, isDefault: false } : a;
      });
    } else {
      const newAddress: Address = {
        id: `addr_${Date.now()}`,
        label: finalLabel,
        fullName: fullName.trim() || user?.name || '',
        phone: phone.trim() || user?.phone || '',
        street: street.trim(),
        area: area.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim(),
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
        isDefault: isDefault || existingAddresses.length === 0
      };

      if (isDefault) {
        updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefault: false }));
      }
      updatedAddresses.push(newAddress);
    }

    const res = await updateProfile({ addresses: updatedAddresses });
    setIsSaving(false);

    if (res.success) {
      setStatus({ type: 'success', message: isEditing ? 'Address updated successfully!' : 'Address added successfully!' });
      setTimeout(() => {
        navigate('/profile', { state: { activeTab: 'ADDRESSES' } });
      }, 1000);
    } else {
      setStatus({ type: 'error', message: res.error || 'Failed to save address.' });
    }
  };

  return (
    <>
      <Helmet>
        <title>{isEditing ? 'Edit Address' : 'Add New Address'} | Foodway</title>
        <meta name="description" content="Add or edit your saved delivery addresses with Leaflet map location picker on Foodway." />
      </Helmet>

      <div className="min-h-screen bg-bg-dark text-text-primary pt-24 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Back to Profile Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-primary transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Saved Addresses</span>
            </button>
          </div>

          {/* Form Card */}
          <div className="bg-card-bg border border-border-color rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
            {/* Header Ambient Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Title */}
            <div className="flex items-center gap-4 border-b border-border-color/60 pb-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shadow-lg shrink-0">
                <MapPin className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black font-display text-text-primary tracking-tight">
                  {isEditing ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                </h1>
                <p className="text-xs sm:text-sm text-text-muted mt-1">
                  Pin your exact location on the Leaflet map and save your delivery preferences.
                </p>
              </div>
            </div>

            {/* Status Alert Banner */}
            <AnimatePresence>
              {status && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-medium border shadow-lg ${
                    status.type === 'success'
                      ? 'bg-success/15 border-success/30 text-success'
                      : 'bg-error/15 border-error/30 text-error'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {status.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 shrink-0" />
                    )}
                    <span>{status.message}</span>
                  </div>
                  <button onClick={() => setStatus(null)} className="hover:opacity-70">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">

              {/* LEAFLET INTERACTIVE MAP SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <label className="text-xs font-extrabold text-text-primary uppercase tracking-wider">
                      Pin Location on Leaflet Map
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Use My Current GPS</span>
                  </button>
                </div>

                {/* Leaflet Map Frame */}
                <div className="relative rounded-2xl overflow-hidden border border-border-color h-72 sm:h-80 shadow-inner z-0">
                  <MapContainer
                    center={mapPosition}
                    zoom={15}
                    scrollWheelZoom={true}
                    className="w-full h-full"
                  >
                    <ChangeView center={mapPosition} />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker
                      position={mapPosition}
                      setPosition={setMapPosition}
                      onLocationSelect={handleLocationSelect}
                    />
                  </MapContainer>

                  {/* Loading Overlay when Reverse Geocoding */}
                  {isGeocoding && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2 z-10 pointer-events-none">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Auto-detecting address details...</span>
                    </div>
                  )}
                </div>

                {/* Selected Coordinates Indicator */}
                {lat && lng && (
                  <div className="flex items-center justify-between text-[11px] text-text-muted bg-bg-dark/50 px-3 py-2 rounded-xl border border-border-color/60">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>GPS Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}</span>
                    </span>
                    <span className="text-success font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Location Pinned
                    </span>
                  </div>
                )}
              </div>

              {/* 1. Address Label Selection */}
              <div className="space-y-3 pt-4 border-t border-border-color/60">
                <label className="block text-xs font-extrabold text-text-muted uppercase tracking-wider">
                  Select Address Label
                </label>
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { id: 'Home', title: 'Home', icon: Home, desc: 'Apartment / House' },
                    { id: 'Work', title: 'Work', icon: Briefcase, desc: 'Office / Workplace' },
                    { id: 'Other', title: 'Other', icon: Navigation, desc: 'Friends / Other' }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = label === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLabel(item.id as any)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-primary/15 border-primary ring-2 ring-primary/30 text-primary shadow-lg'
                            : 'bg-bg-dark/50 border-border-color text-text-secondary hover:border-primary/40 hover:text-text-primary'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-text-muted'}`} />
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{item.title}</p>
                          <p className="text-[11px] text-text-muted hidden sm:block mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Address Specification Name Input when 'Other' is selected */}
                <AnimatePresence>
                  {label === 'Other' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-2 space-y-2 overflow-hidden"
                    >
                      <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                        Custom Address Specification / Name *
                      </label>
                      <div className="relative">
                        <Tag className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                        <input
                          type="text"
                          value={customLabel}
                          onChange={(e) => setCustomLabel(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-dark/60 border border-primary/50 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted/60"
                          placeholder="e.g. Gym, Parents' House, Studio, Vacation Villa"
                          required={label === 'Other'}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 2. Contact Details Section */}
              <div className="space-y-4 pt-4 border-t border-border-color/60">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider text-primary">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                      Receiver Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-dark/60 border border-border-color text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                        placeholder="Full Name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                      Mobile Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-dark/60 border border-border-color text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                        placeholder="+91 Mobile Number"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Address Location Details Section */}
              <div className="space-y-4 pt-4 border-t border-border-color/60">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider text-primary">
                  Address Location Details
                </h3>

                {/* Flat / House No / Building */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                    Flat / House No. / Building Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-dark/60 border border-border-color text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                      placeholder="e.g. Flat #402, Sunshine Apartments"
                      required
                    />
                  </div>
                </div>

                {/* Area / Street / Locality */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                    Street Name / Area / Locality
                  </label>
                  <div className="relative">
                    <MapIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-dark/60 border border-border-color text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                      placeholder="e.g. MG Road, Jubilee Hills"
                    />
                  </div>
                </div>

                {/* City, State, Pincode Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                      City *
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-bg-dark/60 border border-border-color text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                      placeholder="City Name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                      State
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-bg-dark/60 border border-border-color text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                      placeholder="State Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-bg-dark/60 border border-border-color text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                      placeholder="6-digit Pincode"
                      required
                    />
                  </div>
                </div>

                {/* Landmark */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                    Landmark (Optional)
                  </label>
                  <div className="relative">
                    <Compass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-dark/60 border border-border-color text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                      placeholder="e.g. Opposite City Mall, Near Metro Pillar 12"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Set as Default Toggle Card */}
              <div className="p-5 rounded-2xl bg-bg-dark/40 border border-border-color flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-text-primary">Set as Default Delivery Address</p>
                  <p className="text-xs text-text-muted">This address will be automatically selected during order checkout.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-border-color peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>

              {/* 5. Submit Action Buttons */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-border-color">
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="px-6 py-3 rounded-xl border border-border-color text-xs font-bold text-text-secondary hover:bg-bg-dark transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-3 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Address...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isEditing ? 'Update Address' : 'Save New Address'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </>
  );
};

export default AddressFormPage;
