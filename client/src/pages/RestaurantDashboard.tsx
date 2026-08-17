import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Utensils,
  ClipboardList,
  User,
  Settings,
  LogOut,
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  UploadCloud,
  Folder,
  Star,
  Sun,
  Moon,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu as MenuIcon,
  X,
  ToggleLeft,
  ToggleRight,
  Check,
  ArrowLeft,
  Globe,
  ChefHat,
  XCircle,
  Mail,
  Lock,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  Bell,
  RefreshCw,
  Plus,
  Sparkles,
  Store,
  ShoppingBag,
  Layers,
  Crosshair,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../utils/api';

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

// Custom Map View Re-centering Component for Vendor
const VendorMapChangeView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// Custom Map Click & Drag Events Component for Vendor
const VendorLocationMarker: React.FC<{
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

  const eventHandlers = React.useMemo(
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
import { getCurrentUser, clearSession } from '../utils/auth.utils';
import { useAuth } from '../hooks/useAuth';
import socketService from '../services/socket.service';

// Types
interface FoodItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  prepTime: string;
  isVeg: boolean;
  image: string;
  isAvailable: boolean;
  isCategoryFavourite?: boolean;
  variants?: any[];
  status: 'active' | 'disabled';
}

interface OrderItem {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: string;
  total: number;
  paymentStatus: 'paid' | 'pending';
  orderStatus: 'Pending' | 'Accepted' | 'Preparing' | 'Ready' | 'Completed' | 'Rejected';
  time: string;
  restaurantId: string;
}

export const RestaurantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { logout: authLogout } = useAuth();

  // Auth & Restaurant Profile state
  const [restaurant, setRestaurant] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'orders' | 'profile' | 'settings'>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [incomingOrderPopup, setIncomingOrderPopup] = useState<OrderItem | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Stats
  const [activities, setActivities] = useState<Array<{ id: string; type: string; title: string; time: string }>>([]);

  // Menu Management State
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('All');
  const [menuVegFilter, setMenuVegFilter] = useState<'All' | 'Veg' | 'Non-Veg'>('All');
  const [menuAvailabilityFilter, setMenuAvailabilityFilter] = useState<'All' | 'Available' | 'Unavailable'>('All');

  // Add/Edit Food Modal State
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [deleteFoodTarget, setDeleteFoodTarget] = useState<{ id: string; name: string } | null>(null);
  const [foodFormError, setFoodFormError] = useState<string | null>(null);
  const [isFoodImageUploading, setIsFoodImageUploading] = useState(false);
  const [foodImageUploadSuccess, setFoodImageUploadSuccess] = useState(false);

  const [foodForm, setFoodForm] = useState<{
    name: string;
    description: string;
    category: string;
    price: string;
    prepTime: string;
    isVeg: boolean;
    image: string;
    isAvailable: boolean;
    isCategoryFavourite: boolean;
    variants: Array<{
      id: string;
      quantity: string;
      unit: string;
      price: string;
      compareAtPrice: string;
      isAvailable: boolean;
      label: string;
    }>;
  }>({
    name: '',
    description: '',
    category: '',
    price: '',
    prepTime: '15-20 mins',
    isVeg: true,
    image: '',
    isAvailable: true,
    isCategoryFavourite: false,
    variants: [
      { id: 'v1', quantity: '250', unit: 'gms', price: '', compareAtPrice: '', isAvailable: true, label: '250 gms' },
      { id: 'v2', quantity: '500', unit: 'gms', price: '', compareAtPrice: '', isAvailable: true, label: '500 gms' },
      { id: 'v3', quantity: '1', unit: 'kg', price: '', compareAtPrice: '', isAvailable: true, label: '1 kg' }
    ]
  });

  // Expandable variants state for single item card display
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});
  const toggleExpandVariants = (itemId: string) => {
    setExpandedItemIds(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Categories State (Dynamic from Database)
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [editingCategoryTarget, setEditingCategoryTarget] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState<string>('');

  const SUGGESTED_CATEGORIES = [
    'Sweets & Desserts',
    'Vegetables & Farm Fresh',
    'Fresh Fruits',
    'Dairy & Milk Products',
    'Daily Groceries',
    'Cold Drinks & Juices',
    'Bakery & Cakes',
    'Snacks & Namkeen',
    'Biryani & Rice Specialties',
    'Starters & Tiffins',
    'Main Course Food',
    'Fast Food & Combo Deals'
  ];

  const normCat = (s: string) =>
    (s || '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim()
      .toLowerCase();

  const openAddCategoryModal = () => {
    setSelectedSuggestions([]);
    setNewCategoryName('');
    setCategoryError(null);
    setIsAddCategoryOpen(true);
  };

  const toggleSuggestion = (cat: string) => {
    const targetNorm = normCat(cat);
    setSelectedSuggestions(prev => {
      const exists = prev.some(c => c === cat || normCat(c) === targetNorm);
      if (exists) {
        return prev.filter(c => c !== cat && normCat(c) !== targetNorm);
      } else {
        return [...prev, cat];
      }
    });
  };

  // Orders State
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('Pending');
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [expandedOrdersMap, setExpandedOrdersMap] = useState<Record<string, boolean>>({});

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrdersMap(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const getItemVariantLabel = (it: any): string | null => {
    if (!it) return null;

    if (it.variantLabel && typeof it.variantLabel === 'string' && it.variantLabel.trim() !== '') {
      return it.variantLabel.trim();
    }

    const v = it.selectedVariant || it.variant;
    if (v) {
      if (typeof v === 'string' && v.trim() !== '') return v.trim();
      if (typeof v === 'object') {
        const name = v.name || v.label || v.variantName || v.portionName || v.title;
        const qty = v.quantity || v.qty || v.weight || v.packSize;
        const unit = v.unit || v.type || '';
        const qtyUnit = (qty || unit) ? `${qty || ''} ${unit}`.trim() : '';

        if (name && qtyUnit && name !== qtyUnit) return `${name} (${qtyUnit})`;
        if (name) return name;
        if (qtyUnit) return qtyUnit;
      }
    }

    if (it.portion) return String(it.portion);
    if (it.portionSize) return String(it.portionSize);
    if (it.unit && it.quantity) return `${it.quantity} ${it.unit}`;
    if (it.unit) return String(it.unit);
    if (it.size) return String(it.size);
    if (it.weight) return String(it.weight);
    return null;
  };

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    openingTime: '11:00 AM',
    closingTime: '11:00 PM',
    image: '',
    description: '',
    cuisine: 'Multi-Cuisine'
  });

  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [isProfileImageUploading, setIsProfileImageUploading] = useState(false);

  // Settings State
  const [soundAlerts, setSoundAlerts] = useState(true);

  // Restaurant Open/Close Status State
  const [isRestaurantOpen, setIsRestaurantOpen] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Vendor Map & Location State
  const [vendorLat, setVendorLat] = useState<number | null>(null);
  const [vendorLng, setVendorLng] = useState<number | null>(null);
  const [vendorMapPos, setVendorMapPos] = useState<[number, number]>([17.3850, 78.4867]);
  const [isVendorGeocoding, setIsVendorGeocoding] = useState(false);

  // Reverse Geocoding using OpenStreetMap Nominatim API for Vendor (English)
  const reverseGeocodeVendor = async (latitude: number, longitude: number) => {
    setIsVendorGeocoding(true);
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
        const road = addr.road || addr.residential || addr.pedestrian || addr.street || '';
        const houseNo = addr.house_number || addr.building || '';
        const suburb = addr.suburb || addr.neighbourhood || addr.residential || '';
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const state = addr.state || '';
        const pincode = addr.postcode || '';

        const fullAddrParts = [houseNo, road, suburb, city, state, pincode].filter(Boolean);
        if (fullAddrParts.length > 0) {
          setProfileForm(prev => ({ ...prev, address: fullAddrParts.join(', ') }));
        }
      }
    } catch (err) {
      console.warn('Vendor reverse geocoding failed:', err);
    } finally {
      setIsVendorGeocoding(false);
    }
  };

  const handleVendorLocationSelect = (selectedLat: number, selectedLng: number) => {
    setProfileError(null);
    setVendorLat(selectedLat);
    setVendorLng(selectedLng);
    setVendorMapPos([selectedLat, selectedLng]);
    reverseGeocodeVendor(selectedLat, selectedLng);
  };

  const handleVendorLocateMe = () => {
    setIsVendorGeocoding(true);
    setProfileError(null);

    const useIPFallback = async () => {
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        if (ipData && ipData.latitude && ipData.longitude) {
          const lat = Number(ipData.latitude);
          const lng = Number(ipData.longitude);
          setVendorLat(lat);
          setVendorLng(lng);
          setVendorMapPos([lat, lng]);
          reverseGeocodeVendor(lat, lng);
          return;
        }
      } catch (err) { }

      try {
        const ipRes2 = await fetch('https://ipinfo.io/json');
        const ipData2 = await ipRes2.json();
        if (ipData2 && ipData2.loc) {
          const [latStr, lngStr] = ipData2.loc.split(',');
          const lat = Number(latStr);
          const lng = Number(lngStr);
          if (!isNaN(lat) && !isNaN(lng)) {
            setVendorLat(lat);
            setVendorLng(lng);
            setVendorMapPos([lat, lng]);
            reverseGeocodeVendor(lat, lng);
            return;
          }
        }
      } catch (err2) { }

      setIsVendorGeocoding(false);
      setProfileError('Could not auto-detect GPS location. Click anywhere on the Leaflet map below to pick your location.');
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          setVendorLat(latitude);
          setVendorLng(longitude);
          setVendorMapPos([latitude, longitude]);
          reverseGeocodeVendor(latitude, longitude);
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

  // 1. Initial Load & Auth check
  useEffect(() => {
    const user = getCurrentUser();
    const uRole = (user?.role || '').toUpperCase();
    const isVendor = ['RESTAURANT', 'SHOP', 'VENDOR', 'ADMIN'].includes(uRole);
    if (!user || !isVendor) {
      navigate('/login', { replace: true });
      return;
    }

    const rawAuth = localStorage.getItem('restaurantAuth') || sessionStorage.getItem('restaurantAuth');
    let restProfile = null;
    if (rawAuth) {
      try {
        const parsed = JSON.parse(rawAuth);
        restProfile = parsed.restaurant;
      } catch (e) { }
    }

    if (!restProfile) {
      restProfile = {
        id: user.restaurantId || user.id,
        name: user.name,
        email: user.email,
        ownerName: user.name
      };
    }

    setRestaurant(restProfile);
    setProfileForm(prev => ({
      ...prev,
      name: restProfile.name || '',
      ownerName: restProfile.ownerName || '',
      email: restProfile.email || '',
      phone: restProfile.phone || '',
      address: restProfile.address || '',
      openingTime: restProfile.openingTime || '',
      closingTime: restProfile.closingTime || '',
      image: restProfile.image || '',
      description: restProfile.description || '',
      cuisine: restProfile.cuisine || ''
    }));

    if (restProfile.latitude && restProfile.longitude) {
      setVendorLat(restProfile.latitude);
      setVendorLng(restProfile.longitude);
      setVendorMapPos([restProfile.latitude, restProfile.longitude]);
    }
    if (typeof restProfile.isOpen === 'boolean') {
      setIsRestaurantOpen(restProfile.isOpen);
    }
    loadRestaurantData(restProfile.id || user.id);
  }, []);

  // Load Menu, Categories, Orders and Restaurant Status
  const loadRestaurantData = async (resId: string) => {
    let targetId = resId;

    // Load Latest Shop Profile & Coordinates from DynamoDB
    try {
      const shopResp = await axios.get(`${API_BASE_URL}/shops/${resId}`);
      if (shopResp.data && shopResp.data.success && (shopResp.data.shop || shopResp.data.restaurant)) {
        const fetchedShop = shopResp.data.shop || shopResp.data.restaurant;
        targetId = fetchedShop.id || fetchedShop.shopId || fetchedShop.restaurantId || resId;
        setRestaurant(fetchedShop);
        setProfileForm(prev => ({
          ...prev,
          name: fetchedShop.shopName || fetchedShop.restaurantName || fetchedShop.name || prev.name,
          ownerName: fetchedShop.ownerName || prev.ownerName,
          phone: fetchedShop.phone || prev.phone,
          address: fetchedShop.address || prev.address,
          openingTime: fetchedShop.openingTime || prev.openingTime,
          closingTime: fetchedShop.closingTime || prev.closingTime,
          image: fetchedShop.logo || fetchedShop.bannerImage || fetchedShop.image || prev.image,
          description: fetchedShop.description || prev.description,
          cuisine: fetchedShop.cuisine || prev.cuisine
        }));
        if (fetchedShop.latitude && fetchedShop.longitude) {
          setVendorLat(fetchedShop.latitude);
          setVendorLng(fetchedShop.longitude);
          setVendorMapPos([fetchedShop.latitude, fetchedShop.longitude]);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch shop profile from DB:', e);
    }

    // Load Restaurant Status
    try {
      const statusResp = await axios.get(`${API_BASE_URL}/restaurant/status/${targetId}`);
      if (statusResp.data && typeof statusResp.data.isOpen === 'boolean') {
        setIsRestaurantOpen(statusResp.data.isOpen);
      }
    } catch (e) {
      console.warn('Failed to fetch restaurant status:', e);
    }

    // Load Categories from Database
    try {
      const catResp = await axios.get(`${API_BASE_URL}/restaurant/categories/${targetId}`);
      if (catResp.data && catResp.data.success && Array.isArray(catResp.data.categories)) {
        setCategories(catResp.data.categories);
      } else if (resId !== targetId) {
        const fallbackCat = await axios.get(`${API_BASE_URL}/restaurant/categories/${resId}`);
        if (fallbackCat.data && fallbackCat.data.success && Array.isArray(fallbackCat.data.categories)) {
          setCategories(fallbackCat.data.categories);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch categories:', e);
    }

    // Load Menu from DynamoDB
    try {
      const resp = await axios.get(`${API_BASE_URL}/restaurant/menu/${targetId}`);
      if (resp.data.success && Array.isArray(resp.data.items) && resp.data.items.length > 0) {
        setMenuItems(resp.data.items);
      } else {
        // Retry with resId if targetId returned empty
        const fallbackResp = await axios.get(`${API_BASE_URL}/restaurant/menu/${resId}`);
        if (fallbackResp.data.success && Array.isArray(fallbackResp.data.items) && fallbackResp.data.items.length > 0) {
          setMenuItems(fallbackResp.data.items);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch menu items from database:', e);
    }

    // Load Orders from DynamoDB database
    try {
      const resp = await axios.get(`${API_BASE_URL}/restaurant/orders/${targetId}`);
      if (resp.data.success && Array.isArray(resp.data.orders)) {
        setOrders(resp.data.orders);
      } else {
        setOrders([]);
      }
    } catch (e) {
      console.warn('Failed to fetch orders from database:', e);
      setOrders([]);
    }
  };

  // Helper: Play Loud Synthesizer Buzz Alarm & HTML5 Chime Sound
  const playOrderBuzzSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const playTones = (freq: number, start: number, dur: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
          gain.gain.setValueAtTime(0.45, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + dur);
        };
        // 3 loud buzz alarm chirps (Ding-Dong-Ding alert tone)
        playTones(784, 0, 0.3);       // G5
        playTones(1046.5, 0.3, 0.4);  // C6
        playTones(1567.98, 0.7, 0.55); // G6
      }
    } catch (e) { }

    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => { });
    } catch (e) { }
  };

  // Helper: Trigger Native Browser Push Notification
  const triggerBrowserNotification = (orderId: string, customerName: string, total: number) => {
    if ('Notification' in window) {
      const showNotif = () => {
        new Notification(`🔔 NEW ORDER RECEIVED! #${orderId}`, {
          body: `Customer ${customerName} placed an order worth ₹${total.toFixed(2)}. Tap to view order!`,
          icon: '/logo.jpeg',
          tag: `order-${orderId}`,
          requireInteraction: true
        });
      };

      if (Notification.permission === 'granted') {
        showNotif();
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            showNotif();
          }
        });
      }
    }
  };

  // Socket.io Real-Time Room Join & Order Event Subscriptions
  useEffect(() => {
    const resId = restaurant?.id || '';
    if (resId) {
      socketService.joinRestaurant(resId);
    }

    // Phase 1: Real-Time Order Creation Listener (0ms UI Update + Loud Buzz Alarm + Modal + Push Notif)
    const unsubscribeCreated = socketService.onOrderCreated((newOrder: any) => {
      console.log('⚡ [Real-Time Socket Event: ORDER_CREATED] Received:', newOrder);

      const targetResId = (restaurant?.id || '').toLowerCase();
      const orderResId = (newOrder.restaurantId || '').toLowerCase();

      // Guard: strictly ignore orders belonging to other vendors!
      if (targetResId && orderResId && orderResId !== targetResId) {
        return;
      }

      const formattedOrder: OrderItem = {
        id: newOrder.orderId || newOrder.id,
        customerName: newOrder.customerName || 'Valued Customer',
        customerPhone: newOrder.customerPhone || 'N/A',
        customerAddress: newOrder.deliveryAddress || newOrder.customerAddress || 'Address Not Specified',
        items: newOrder.items || newOrder.rawItems || [],
        total: Number(newOrder.totalAmount || newOrder.total || 0),
        paymentStatus: newOrder.paymentStatus === 'SUCCESS' ? 'paid' : 'pending',
        orderStatus: newOrder.status || newOrder.orderStatus || 'Pending',
        time: 'Just Now',
        restaurantId: newOrder.restaurantId
      };

      // Prepend order to top of list instantly without page refresh!
      setOrders(prev => [formattedOrder, ...prev.filter(o => o.id !== formattedOrder.id)]);
      setIncomingOrderPopup(formattedOrder);

      // Play loud synthesizer buzz alarm sound
      playOrderBuzzSound();

      // Send Native Browser Push Notification
      triggerBrowserNotification(formattedOrder.id, formattedOrder.customerName, formattedOrder.total);

      logActivity('order', `New order #${formattedOrder.id} received from ${formattedOrder.customerName}!`);
    });

    // Phase 4: Rider status updates listener & Order Delivered updates
    const handleStatusChange = (updatedOrder: any) => {
      const orderId = updatedOrder.orderId || updatedOrder.id;
      const newStatus = updatedOrder.status || updatedOrder.orderStatus;

      setOrders(prev => prev.map(o => {
        if (o.id === orderId || (o as any).orderId === orderId) {
          return { ...o, orderStatus: newStatus };
        }
        return o;
      }));

      // Log delivery activity
      if (String(newStatus).toLowerCase() === 'delivered' || String(newStatus).toLowerCase() === 'completed') {
        logActivity('order', `Order #${orderId} delivered successfully! 🎉`);
      }
    };

    const unsubscribeRider = socketService.onRiderStatusUpdated(handleStatusChange);
    const unsubscribeStatus = socketService.onOrderStatusUpdated(handleStatusChange);

    return () => {
      unsubscribeCreated();
      unsubscribeRider();
      unsubscribeStatus();
    };
  }, [restaurant?.id]);

  // Toggle Restaurant Open / Close Status
  const handleToggleRestaurantStatus = async () => {
    const nextStatus = !isRestaurantOpen;
    setIsRestaurantOpen(nextStatus); // Instant UI Update
    setIsUpdatingStatus(true);

    const resId = restaurant?.shopId || restaurant?.restaurantId || restaurant?.id || (restaurant as any)?.ownerUserId || restaurant?.name || 'default';
    const updatedRes = { ...restaurant, isOpen: nextStatus, status: nextStatus ? 'ACTIVE' : 'INACTIVE' };
    setRestaurant(updatedRes);

    // Persist in local storage
    const rawAuth = localStorage.getItem('restaurantAuth') || sessionStorage.getItem('restaurantAuth');
    if (rawAuth) {
      try {
        const parsed = JSON.parse(rawAuth);
        parsed.restaurant = updatedRes;
        if (localStorage.getItem('restaurantAuth')) {
          localStorage.setItem('restaurantAuth', JSON.stringify(parsed));
        } else {
          sessionStorage.setItem('restaurantAuth', JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn('Failed to save updated restaurant status to storage:', e);
      }
    }

    try {
      await axios.put(`${API_BASE_URL}/restaurant/status/${resId}`, { isOpen: nextStatus });
      if (restaurant?.shopId && restaurant?.shopId !== resId) {
        await axios.put(`${API_BASE_URL}/restaurant/status/${restaurant.shopId}`, { isOpen: nextStatus }).catch(() => {});
      }
      localStorage.setItem('foodway_status_changed_at', Date.now().toString());
      window.dispatchEvent(new Event('foodway_restaurant_status_updated'));
    } catch (err) {
      console.error('Failed to update restaurant status on backend:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoriesToSave = [...categories];
    const existingNorms = new Set(categories.map(c => normCat(c)));

    for (const sug of selectedSuggestions) {
      if (!existingNorms.has(normCat(sug))) {
        categoriesToSave.push(sug);
        existingNorms.add(normCat(sug));
      }
    }

    if (newCategoryName.trim() && !existingNorms.has(normCat(newCategoryName.trim()))) {
      categoriesToSave.push(newCategoryName.trim());
    }

    if (categoriesToSave.length === categories.length) {
      setIsAddCategoryOpen(false);
      return;
    }

    setIsSavingCategory(true);
    setCategoryError(null);

    const currUser = getCurrentUser();
    const resId = restaurant?.shopId || restaurant?.id || (restaurant as any)?.email || currUser?.id || currUser?.email || 'RES-001';

    try {
      const resp = await axios.put(`${API_BASE_URL}/restaurant/categories/${resId}/set`, {
        categories: categoriesToSave
      });

      if (resp.data.success && Array.isArray(resp.data.categories)) {
        setCategories(resp.data.categories);
      } else {
        setCategories(categoriesToSave);
      }

      logActivity('menu', `Updated menu categories.`);
      setNewCategoryName('');
      setSelectedSuggestions([]);
      setIsAddCategoryOpen(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to update categories.';
      setCategoryError(errorMsg);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleRenameCategorySubmit = async (oldName: string) => {
    if (!editingCategoryValue.trim() || editingCategoryValue.trim() === oldName) {
      setEditingCategoryTarget(null);
      return;
    }

    const currUser = getCurrentUser();
    const newName = editingCategoryValue.trim();
    const resId = restaurant?.shopId || restaurant?.id || (restaurant as any)?.email || currUser?.id || currUser?.email || 'RES-001';

    try {
      const resp = await axios.put(`${API_BASE_URL}/restaurant/categories/${resId}`, {
        oldName,
        newName
      });

      if (resp.data.success && resp.data.categories) {
        setCategories(resp.data.categories);
        setMenuItems(prev => prev.map(m => (m.category === oldName || normCat(m.category) === normCat(oldName)) ? { ...m, category: newName } : m));
        logActivity('menu', `Renamed category "${oldName}" to "${newName}".`);
      }
    } catch (err: any) {
      console.error('Failed to rename category:', err);
    } finally {
      setEditingCategoryTarget(null);
      setEditingCategoryValue('');
    }
  };

  const handleDeleteCategorySubmit = async (catName: string) => {
    const currUser = getCurrentUser();
    const resId = restaurant?.shopId || restaurant?.id || (restaurant as any)?.email || currUser?.id || currUser?.email || 'RES-001';
    const targetNorm = normCat(catName);

    // Instant UI update
    setCategories(prev => prev.filter(c => c !== catName && normCat(c) !== targetNorm));
    setSelectedSuggestions(prev => prev.filter(s => s !== catName && normCat(s) !== targetNorm));
    setMenuItems(prev => prev.map(m => (m.category === catName || normCat(m.category) === targetNorm) ? { ...m, category: 'Uncategorized' } : m));

    try {
      const resp = await axios.delete(`${API_BASE_URL}/restaurant/categories/${resId}/${encodeURIComponent(catName)}`);
      if (resp.data.success && Array.isArray(resp.data.categories)) {
        setCategories(resp.data.categories);
      }
      logActivity('menu', `Deleted category "${catName}".`);
    } catch (err: any) {
      console.error('Failed to delete category on backend:', err);
    }
  };

  // Initial Menu Fallback
  const getInitialMenuItems = (_resId: string): FoodItem[] => [];

  // Helper: Activity logger
  const logActivity = (type: string, title: string) => {
    setActivities(prev => [{ id: `act-${Date.now()}`, type, title, time: 'Just now' }, ...prev.slice(0, 7)]);
  };

  // Logout
  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    clearSession();
    if (authLogout) {
      authLogout();
    }
    setIsLogoutModalOpen(false);
    navigate('/login', { replace: true });
  };

  // --------------------------------------------------------------------------
  // MENU MANAGEMENT HANDLERS
  // --------------------------------------------------------------------------
  const openAddFoodModal = () => {
    setEditingFood(null);
    setFoodForm({
      name: '',
      description: '',
      category: categories[0] || '',
      price: '',
      prepTime: '15-20 mins',
      isVeg: true,
      image: '',
      isAvailable: true,
      isCategoryFavourite: false,
      variants: [
        { id: 'v1', quantity: '250', unit: 'gms', price: '', compareAtPrice: '', isAvailable: true, label: '250 gms' },
        { id: 'v2', quantity: '500', unit: 'gms', price: '', compareAtPrice: '', isAvailable: true, label: '500 gms' },
        { id: 'v3', quantity: '1', unit: 'kg', price: '', compareAtPrice: '', isAvailable: true, label: '1 kg' }
      ]
    });
    setFoodFormError(null);
    setFoodImageUploadSuccess(false);
    setIsFoodModalOpen(true);
  };

  const openEditFoodModal = (item: FoodItem) => {
    setEditingFood(item);
    const existingVariants = Array.isArray((item as any).variants) && (item as any).variants.length > 0
      ? (item as any).variants.map((v: any, idx: number) => {
        const rawM = v && v.M ? v.M : (v || {});
        const vId = rawM.id?.S || rawM.id || rawM.variantId?.S || rawM.variantId || `v${idx + 1}`;
        const qty = rawM.quantity?.N || rawM.quantity?.S || rawM.quantity || '1';
        const u = rawM.unit?.S || rawM.unit || 'pcs';
        const p = rawM.price?.N || rawM.price?.S || rawM.price || item.price || '';
        const cmpPrice = rawM.compareAtPrice?.N || rawM.compareAtPrice?.S || rawM.compareAtPrice || '';
        const avail = rawM.isAvailable?.BOOL !== undefined ? rawM.isAvailable.BOOL : (rawM.isAvailable !== false);
        const lbl = rawM.label?.S || rawM.label || `${qty} ${u}`;

        return {
          id: String(vId),
          quantity: String(qty),
          unit: String(u),
          price: String(p),
          compareAtPrice: String(cmpPrice),
          isAvailable: Boolean(avail),
          label: String(lbl)
        };
      })
      : [{ id: 'v1', quantity: '1', unit: 'pcs', price: String(item.price || ''), compareAtPrice: '', isAvailable: true, label: 'Standard' }];

    setFoodForm({
      name: item.name || '',
      description: item.description || '',
      category: item.category || '',
      price: String(item.price || ''),
      prepTime: item.prepTime || '15 mins',
      isVeg: item.isVeg !== false,
      image: item.image || '',
      isAvailable: item.isAvailable !== false,
      isCategoryFavourite: item.isCategoryFavourite || false,
      variants: existingVariants
    });
    setFoodFormError(null);
    setFoodImageUploadSuccess(false);
    setIsFoodModalOpen(true);
  };

  // Image Upload handler for Food Modal using S3 Endpoint with Base64 Fallback
  const handleFoodImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsFoodImageUploading(true);
      setFoodImageUploadSuccess(false);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string;
          const resp = await axios.post(`${API_BASE_URL}/admin/upload-s3`, {
            fileName: file.name,
            fileType: file.type,
            fileData: base64Data
          });

          if (resp.data && resp.data.fileUrl) {
            setFoodForm(prev => ({ ...prev, image: resp.data.fileUrl }));
            setFoodImageUploadSuccess(true);
          } else {
            setFoodForm(prev => ({ ...prev, image: base64Data }));
            setFoodImageUploadSuccess(true);
          }
        } catch (err) {
          console.warn('S3 image upload error, using local base64 preview:', err);
          setFoodForm(prev => ({ ...prev, image: reader.result as string }));
          setFoodImageUploadSuccess(true);
        } finally {
          setIsFoodImageUploading(false);
        }
      };
    }
  };

  const saveFoodItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFoodFormError(null);

    const { name, description, category, price, prepTime, isVeg, image, isAvailable, isCategoryFavourite, variants } = foodForm;

    const cleanName = (name || '').trim();
    const cleanDesc = (description || '').trim();
    const cleanPrepTime = (prepTime || '').trim() || '15 mins';
    const defaultImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';
    const finalImage = (image || '').trim() || defaultImg;
    const cleanCategory = category || categories[0] || 'General';

    if (!cleanName) {
      setFoodFormError('Item Name is required.');
      return;
    }

    const formattedVariants = (variants || []).map((v, idx) => ({
      id: v.id || `v${idx + 1}`,
      variantId: v.id || `v${idx + 1}`,
      quantity: Number(v.quantity) || 1,
      unit: v.unit || 'pcs',
      price: Number(v.price) || Number(price) || 0,
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
      isAvailable: v.isAvailable !== false,
      label: v.label || `${v.quantity} ${v.unit}`
    }));

    const effectivePrice = formattedVariants.length > 0 && formattedVariants[0].price ? formattedVariants[0].price : (Number(price) || 0);

    if (effectivePrice <= 0) {
      setFoodFormError('Please enter a valid price for at least one variation option.');
      return;
    }

    const currUser = getCurrentUser();
    const resId = restaurant?.shopId || restaurant?.id || (restaurant as any)?.email || currUser?.id || currUser?.email || 'RES-001';

    if (cleanCategory && !categories.includes(cleanCategory)) {
      setCategories(prev => [...prev, cleanCategory]);
    }

    if (editingFood) {
      // Edit mode
      const updatedItem: FoodItem & { variants?: any[] } = {
        ...editingFood,
        name: cleanName,
        description: cleanDesc,
        category: cleanCategory,
        price: effectivePrice,
        prepTime: cleanPrepTime,
        isVeg,
        image: finalImage,
        isAvailable,
        isCategoryFavourite,
        status: isAvailable ? 'active' : 'disabled',
        variants: formattedVariants
      };

      setMenuItems(prev => prev.map(m => m.id === editingFood.id ? updatedItem : m));

      try {
        const resp = await axios.post(`${API_BASE_URL}/restaurant/menu`, updatedItem);
        if (resp.data && resp.data.success && resp.data.item) {
          const saved = resp.data.item;
          setMenuItems(prev => prev.map(m => (m.id === editingFood.id || m.name.toLowerCase() === updatedItem.name.toLowerCase()) ? {
            ...updatedItem,
            id: saved.id || saved.menuItemId || updatedItem.id,
            image: saved.image || saved.foodImage || updatedItem.image,
            variants: saved.variants || formattedVariants
          } : m));
        }
      } catch (err) {
        console.warn('Backend update failed:', err);
      }

      logActivity('menu', `Marketplace item "${updatedItem.name}" was updated.`);
    } else {
      // Add mode
      const tempId = `item_${Date.now()}`;
      const newItem: FoodItem & { variants?: any[] } = {
        id: tempId,
        restaurantId: resId,
        name: cleanName,
        description: cleanDesc,
        category: cleanCategory,
        price: effectivePrice,
        prepTime: cleanPrepTime,
        isVeg,
        image: finalImage,
        isAvailable,
        isCategoryFavourite,
        status: isAvailable ? 'active' : 'disabled',
        variants: formattedVariants
      };

      setMenuItems(prev => [newItem, ...prev]);

      try {
        const resp = await axios.post(`${API_BASE_URL}/restaurant/menu`, newItem);
        if (resp.data && resp.data.success && resp.data.item) {
          const saved = resp.data.item;
          setMenuItems(prev => prev.map(m => m.id === tempId ? {
            ...newItem,
            id: saved.id || saved.menuItemId || tempId,
            image: saved.image || saved.foodImage || newItem.image,
            variants: saved.variants || formattedVariants
          } : m));
        }
      } catch (err) {
        console.warn('Backend save failed:', err);
      }

      logActivity('menu', `New marketplace item "${newItem.name}" added with ${formattedVariants.length} variation options.`);
    }

    setIsFoodModalOpen(false);
  };

  const deleteFoodItem = (itemId: string) => {
    const item = menuItems.find(m => m.id === itemId);
    setDeleteFoodTarget({ id: itemId, name: item?.name || 'this item' });
  };

  const toggleFoodAvailability = async (itemId: string) => {
    setMenuItems(prev => prev.map(m => {
      if (m.id === itemId) {
        const nextAvail = !m.isAvailable;
        const updated = { ...m, isAvailable: nextAvail, status: (nextAvail ? 'active' : 'disabled') as 'active' | 'disabled' };
        axios.post(`${API_BASE_URL}/restaurant/menu`, updated).catch(() => { });
        logActivity('menu', `Item "${m.name}" availability toggled to ${nextAvail ? 'Available' : 'Disabled'}.`);
        return updated;
      }
      return m;
    }));
  };

  // Filtered Menu Items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase()) || item.description.toLowerCase().includes(menuSearch.toLowerCase());
    const matchesCat = menuCategoryFilter === 'All' || item.category === menuCategoryFilter;
    const matchesVeg = menuVegFilter === 'All' || (menuVegFilter === 'Veg' ? item.isVeg : !item.isVeg);
    const matchesAvail = menuAvailabilityFilter === 'All' || (menuAvailabilityFilter === 'Available' ? item.isAvailable : !item.isAvailable);
    return matchesSearch && matchesCat && matchesVeg && matchesAvail;
  });

  // --------------------------------------------------------------------------
  // ORDER HANDLERS
  // --------------------------------------------------------------------------
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId || (o as any).orderId === orderId) {
        const updated = { ...o, orderStatus: newStatus as any, status: newStatus };
        axios.put(`${API_BASE_URL}/restaurant/orders/${orderId}/status`, { status: newStatus, restaurantId: restaurant?.id }).catch(() => { });
        logActivity('order', `Order ${orderId} status changed to ${newStatus}.`);
        return updated;
      }
      return o;
    }));
  };

  const renderRestaurantOrderAction = (o: OrderItem) => {
    const status = (o.orderStatus || (o as any).status || '').toString().toLowerCase();

    if (status === 'pending') {
      return (
        <div className="flex items-center gap-2 justify-end whitespace-nowrap shrink-0">
          <button
            type="button"
            onClick={() => updateOrderStatus(o.id, 'Accepted')}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Accept Order"
          >
            <Check size={14} />
            <span>Accept Order</span>
          </button>
          <button
            type="button"
            onClick={() => updateOrderStatus(o.id, 'Rejected')}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Reject Order"
          >
            <X size={14} />
            <span>Reject</span>
          </button>
        </div>
      );
    }

    if (status === 'accepted') {
      return (
        <div className="flex items-center gap-2 justify-end whitespace-nowrap shrink-0">
          <button
            type="button"
            onClick={() => updateOrderStatus(o.id, 'Preparing')}
            className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Start Preparing Food in Kitchen"
          >
            <ChefHat size={14} />
            <span>Start Preparing</span>
          </button>
          <button
            type="button"
            onClick={() => updateOrderStatus(o.id, 'Rejected')}
            className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            title="Reject Order"
          >
            <X size={13} />
          </button>
        </div>
      );
    }

    if (status === 'preparing') {
      return (
        <div className="flex items-center justify-end whitespace-nowrap shrink-0">
          <button
            type="button"
            onClick={() => updateOrderStatus(o.id, 'Ready')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Mark Food Ready for Pickup / Delivery"
          >
            <CheckCircle size={14} />
            <span>Food Ready for Pickup</span>
          </button>
        </div>
      );
    }

    if (status === 'ready') {
      return (
        <div className="flex items-center justify-end whitespace-nowrap shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase whitespace-nowrap shrink-0">
            <Clock size={13} className="shrink-0" />
            <span>Food Ready (Awaiting Courier)</span>
          </span>
        </div>
      );
    }

    if (status === 'rejected') {
      return (
        <div className="flex items-center justify-end whitespace-nowrap shrink-0">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 uppercase whitespace-nowrap shrink-0">
            <XCircle size={13} className="shrink-0" />
            <span>Rejected</span>
          </span>
        </div>
      );
    }

    if (status === 'completed' || status === 'delivered') {
      return (
        <div className="flex items-center justify-end whitespace-nowrap shrink-0">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase whitespace-nowrap shrink-0">
            <CheckCircle size={13} className="shrink-0" />
            <span>Completed</span>
          </span>
        </div>
      );
    }

    return (
      <select
        value={o.orderStatus}
        onChange={(e) => updateOrderStatus(o.id, e.target.value as any)}
        className="px-3 py-1.5 rounded-lg bg-bg-dark border border-glass text-xs font-bold text-text-primary outline-none focus:border-primary/50 cursor-pointer"
      >
        <option value="Pending">Pending</option>
        <option value="Accepted">Accepted</option>
        <option value="Preparing">Preparing</option>
        <option value="Ready">Ready</option>
        <option value="Completed">Completed</option>
        <option value="Rejected">Rejected</option>
      </select>
    );
  };

  // Filtered Orders (Case-insensitive status matching with synonyms)
  const filteredOrders = orders.filter(o => {
    const q = orderSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.customerPhone || '').includes(q);

    if (!matchesSearch) return false;

    if (orderStatusFilter === 'All') return true;

    const filterLower = orderStatusFilter.toLowerCase();
    const statusLower = (o.orderStatus || (o as any).status || '').toString().toLowerCase();

    if (filterLower === 'pending') return statusLower === 'pending';
    if (filterLower === 'accepted') return statusLower === 'accepted';
    if (filterLower === 'preparing') return statusLower === 'preparing' || statusLower === 'accepted';
    if (filterLower === 'ready') return statusLower === 'ready';
    if (filterLower === 'completed') return statusLower === 'completed' || statusLower === 'delivered';
    if (filterLower === 'rejected') return statusLower === 'rejected' || statusLower === 'cancelled';

    return statusLower === filterLower;
  });

  // Today Stats Calculations (Case-insensitive status check)
  const todayOrdersCount = orders.length;
  const pendingCount = orders.filter(o => (o.orderStatus || (o as any).status || '').toLowerCase() === 'pending').length;
  const preparingCount = orders.filter(o => ['preparing', 'accepted'].includes((o.orderStatus || (o as any).status || '').toLowerCase())).length;
  const readyCount = orders.filter(o => (o.orderStatus || (o as any).status || '').toLowerCase() === 'ready').length;
  const completedCount = orders.filter(o => ['completed', 'delivered'].includes((o.orderStatus || (o as any).status || '').toLowerCase())).length;
  const todayRevenue = orders.reduce((sum, o) => sum + ((o.orderStatus || (o as any).status || '').toLowerCase() !== 'rejected' && (o.orderStatus || (o as any).status || '').toLowerCase() !== 'cancelled' ? o.total : 0), 0);

  // --------------------------------------------------------------------------
  // PROFILE HANDLER
  // --------------------------------------------------------------------------
  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsProfileImageUploading(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const resp = await axios.post(`${API_BASE_URL}/admin/upload-s3`, {
            fileName: file.name,
            fileType: file.type,
            fileData: reader.result as string
          });
          if (resp.data.success && resp.data.fileUrl) {
            setProfileForm(prev => ({ ...prev, image: resp.data.fileUrl }));
          }
        } catch (err) {
          setProfileForm(prev => ({ ...prev, image: reader.result as string }));
        } finally {
          setIsProfileImageUploading(false);
        }
      };
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccessMsg(null);

    // 1. Restaurant Name validation
    if (!profileForm.name.trim()) {
      setProfileError('Restaurant name is required.');
      return;
    }

    // 2. Owner Name validation
    if (!profileForm.ownerName.trim()) {
      setProfileError('Proprietor / Owner full name is required.');
      return;
    }

    // 4. Phone validation
    const cleanPhone = profileForm.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setProfileError('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    // 5. Address validation
    if (!profileForm.address.trim()) {
      setProfileError('Physical restaurant address is required.');
      return;
    }

    // 6. Password validation (optional, only if changing)
    if (profileForm.password) {
      if (profileForm.password.length < 6) {
        setProfileError('New password must be at least 6 characters long.');
        return;
      }
      if (profileForm.password !== profileForm.confirmPassword) {
        setProfileError('New password and confirm password do not match.');
        return;
      }
    }

    setIsProfileSaving(true);

    const finalLat = vendorLat ?? restaurant?.latitude;
    const finalLng = vendorLng ?? restaurant?.longitude;

    const updatedRes = {
      ...restaurant,
      name: profileForm.name.trim(),
      ownerName: profileForm.ownerName.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim(),
      address: profileForm.address.trim(),
      openingTime: profileForm.openingTime.trim(),
      closingTime: profileForm.closingTime.trim(),
      image: profileForm.image,
      description: profileForm.description.trim(),
      cuisine: profileForm.cuisine.trim(),
      latitude: finalLat ?? undefined,
      longitude: finalLng ?? undefined,
      ...(profileForm.password ? { password: profileForm.password } : {})
    };

    setRestaurant(updatedRes);

    // Save in restaurantAuth storage
    const rawAuth = localStorage.getItem('restaurantAuth') || sessionStorage.getItem('restaurantAuth');
    if (rawAuth) {
      try {
        const parsed = JSON.parse(rawAuth);
        parsed.restaurant = updatedRes;
        if (parsed.user) {
          parsed.user.email = updatedRes.email;
          parsed.user.name = updatedRes.name;
        }
        if (localStorage.getItem('restaurantAuth')) {
          localStorage.setItem('restaurantAuth', JSON.stringify(parsed));
        } else {
          sessionStorage.setItem('restaurantAuth', JSON.stringify(parsed));
        }
      } catch (err) { }
    }

    // Save in currentUser storage
    const rawUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (rawUser) {
      try {
        const parsedUser = JSON.parse(rawUser);
        parsedUser.email = updatedRes.email;
        parsedUser.name = updatedRes.name;
        if (localStorage.getItem('currentUser')) {
          localStorage.setItem('currentUser', JSON.stringify(parsedUser));
        } else {
          sessionStorage.setItem('currentUser', JSON.stringify(parsedUser));
        }
      } catch (err) { }
    }

    try {
      const targetShopId = updatedRes.id || updatedRes.restaurantId || updatedRes.shopId;
      if (targetShopId) {
        await axios.put(`${API_BASE_URL}/restaurant/profile/${targetShopId}`, updatedRes);
        await axios.put(`${API_BASE_URL}/shops/${targetShopId}`, updatedRes);
      }
    } catch (err) {
      console.warn('Profile sync warning:', err);
    }

    setIsProfileSaving(false);
    setProfileForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
    setProfileSuccessMsg('Profile details & login credentials updated successfully!');
    logActivity('profile', 'Restaurant profile & credentials updated.');
    setTimeout(() => setProfileSuccessMsg(null), 4500);
  };

  // Nav Items
  const navItems = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { id: 'menu', label: t('nav_menu'), icon: Utensils },
    { id: 'orders', label: t('nav_orders'), icon: ClipboardList, badge: pendingCount > 0 ? pendingCount : null },
    { id: 'profile', label: t('nav_profile'), icon: User },
    { id: 'settings', label: t('nav_settings'), icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${theme === 'dark' ? 'bg-bg-dark text-text-primary' : 'bg-gray-50 text-gray-900'
      }`}>
      {/* ==================================================== */}
      {/* DESKTOP SIDEBAR */}
      {/* ==================================================== */}
      <aside
        data-lenis-prevent="true"
        className="hidden lg:flex flex-col w-64 border-r border-glass bg-bg-dark/95 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen shrink-0 z-30"
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-glass flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Store size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary block">MK DELIVERY</span>
              <h2 className="text-sm font-black font-display tracking-tight text-text-primary truncate w-36">
                {restaurant?.name || 'Shop Console'}
              </h2>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs transition-all duration-200 ${isActive
                  ? 'bg-primary text-bg-dark shadow-luxury font-black'
                  : 'text-text-secondary hover:bg-glass hover:text-primary'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-bg-dark text-primary' : 'bg-primary/20 text-primary'
                    }`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-glass space-y-3">
          <div className="p-3 rounded-xl bg-glass-subtle/50 border border-glass flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                {restaurant?.ownerName?.charAt(0) || 'R'}
              </div>
              <div className="truncate">
                <span className="text-[11px] font-bold block text-text-primary truncate">{restaurant?.ownerName || 'Owner'}</span>
                <span className="text-[9px] text-text-muted block truncate font-mono">{restaurant?.email || 'partner@foodway.com'}</span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-glass hover:bg-glass-subtle text-text-muted hover:text-primary transition-all shrink-0"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-glass hover:border-error/40 bg-glass hover:bg-error/10 text-error text-xs font-bold transition-all uppercase tracking-wider"
          >
            <LogOut size={14} />
            <span>{t('nav_logout')}</span>
          </button>
        </div>
      </aside>

      {/* ==================================================== */}
      {/* MOBILE FIXED TOP NAVBAR */}
      {/* ==================================================== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-bg-dark/95 backdrop-blur-xl border-b border-glass px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-xl bg-glass border border-glass text-text-primary hover:text-primary transition-all cursor-pointer"
          >
            {isMobileSidebarOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-primary block">SHOP & VENDOR PORTAL</span>
            <span className="text-xs font-black text-text-primary truncate block max-w-[160px] sm:max-w-xs">{restaurant?.name || 'Shop Console'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Notification Bell Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative p-2 rounded-xl bg-white dark:bg-glass border border-slate-200/80 dark:border-glass text-text-primary hover:text-primary transition-all cursor-pointer shadow-2xs"
            title="Recent Updates & Notifications"
          >
            <Bell size={16} className="text-primary" />
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1.5 bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-[11px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg shadow-rose-500/40 pointer-events-none z-10">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </motion.button>

          {/* Mobile Language Selector Dropdown (Replaces Theme Icon) */}
          <div className="px-2.5 py-1.5 rounded-xl border border-glass bg-glass flex items-center gap-1.5 shadow-sm">
            <Globe size={14} className="text-primary shrink-0" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-xs font-black text-text-primary focus:outline-none cursor-pointer uppercase"
            >
              <option value="en" className="bg-bg-dark text-text-primary">EN</option>
              <option value="te" className="bg-bg-dark text-text-primary">TE</option>
              <option value="hi" className="bg-bg-dark text-text-primary">HI</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-45 bg-black/75 backdrop-blur-xs"
            />

            {/* Slide-out Drawer Panel (Sleek White & Website Theme Accent) */}
            <motion.div
              initial={{ opacity: 0, x: -300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-white dark:bg-bg-darkSec backdrop-blur-2xl border-r border-slate-200/90 dark:border-glass p-6 flex flex-col justify-between shadow-2xl text-slate-800 dark:text-white"
            >
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-glass pb-4 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0 shadow-xs">
                      <ChefHat size={20} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary block">RESTAURANT PORTAL</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white truncate block max-w-[150px] font-display">{restaurant?.name || 'Console'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-glass text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Nav Links */}
                <div className="space-y-2">
                  {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id as any); setIsMobileSidebarOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-extrabold text-xs transition-all cursor-pointer ${isActive
                          ? 'bg-primary text-black font-black shadow-lg shadow-primary/25'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/90 dark:bg-glass hover:bg-slate-200/80'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} className={isActive ? 'text-black' : 'text-primary'} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-black text-primary' : 'bg-primary/20 text-primary'
                            }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Logout Button with Confirmation Alert */}
              <button
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  handleLogout();
                }}
                className="w-full py-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:bg-rose-500/20 cursor-pointer shadow-xs"
              >
                <LogOut size={16} />
                <span>{t('nav_logout')}</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MAIN CONTENT WORKSPACE CONTAINER */}
      {/* ==================================================== */}
      <main
        data-lenis-prevent="true"
        className="flex-1 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 pb-28 lg:pb-8 lg:h-screen lg:overflow-y-auto w-full min-w-0"
      >
        {/* ==================================================== */}
        {/* DASHBOARD TAB */}
        {/* ==================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn w-full">
            {/* Welcome & Quick Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-5">
              <div>
                <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block flex items-center gap-1.5">
                  <ChefHat size={14} className="text-primary" />
                  <span>{t('establishment_overview')}</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-black font-display text-primary tracking-tight">
                  {t('welcome_back')}, {restaurant?.ownerName || 'Partner'}
                </h1>
                <p className="text-xs text-text-muted mt-1">{t('overview_desc')}</p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto mt-1 sm:mt-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('menu');
                    openAddFoodModal();
                  }}
                  className="px-5 py-3 rounded-2xl bg-[#B87C44] dark:bg-[#D9A36C] hover:brightness-110 active:scale-95 text-white dark:text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-[#B87C44]/20 cursor-pointer"
                >
                  <PlusCircle size={18} strokeWidth={2.5} />
                  <span>Add Dish</span>
                </button>
              </div>
            </div>

            {/* Restaurant Status Banner Card */}
            <div className={`glass-panel border rounded-2xl p-4 sm:p-5 shadow-luxury transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isRestaurantOpen
              ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20'
              : 'border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20'
              }`}>
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all ${isRestaurantOpen
                  ? 'bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-rose-500/20 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  }`}>
                  <span className="relative flex h-3.5 w-3.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRestaurantOpen ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}></span>
                    <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isRestaurantOpen ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}></span>
                  </span>
                </div>
                <div>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">{t('restaurant_status')}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-base sm:text-lg font-black tracking-tight ${isRestaurantOpen ? 'text-emerald-500 font-display' : 'text-rose-500 font-display'
                      }`}>
                      {isRestaurantOpen ? t('restaurant_open') : t('restaurant_closed')}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${isRestaurantOpen
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                      }`}>
                      {isRestaurantOpen ? t('badge_open') : t('badge_closed')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-glass/40">
                <span className="text-xs font-bold text-text-secondary">
                  {isRestaurantOpen ? t('accepting_orders') : t('offline')}
                </span>
                <button
                  type="button"
                  onClick={handleToggleRestaurantStatus}
                  disabled={isUpdatingStatus}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${isRestaurantOpen ? 'bg-emerald-500' : 'bg-rose-500'
                    } ${isUpdatingStatus ? 'opacity-50 cursor-wait' : ''}`}
                  role="switch"
                  aria-checked={isRestaurantOpen}
                >
                  <span className="sr-only">Toggle Restaurant Status</span>
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out flex items-center justify-center ${isRestaurantOpen ? 'translate-x-6' : 'translate-x-0'
                      }`}
                  >
                    {isRestaurantOpen ? (
                      <Check size={14} className="text-emerald-600 font-bold" />
                    ) : (
                      <X size={14} className="text-rose-600 font-bold" />
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* Stat Cards Grid (6 Pro Metric Cards in Requested Order) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
              {/* 1. Today Orders */}
              <div className="glass-panel border border-glass rounded-2xl p-4 shadow-md hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-[10px] font-bold uppercase tracking-wider block">{t('todays_orders')}</span>
                  <ClipboardList size={15} />
                </div>
                <div className="text-xl sm:text-2xl font-black font-display text-text-primary mt-2">{todayOrdersCount}</div>
                <span className="text-[9.5px] text-text-muted mt-1 block font-medium">{t('total_received')}</span>
              </div>

              {/* 2. Pending Orders */}
              <div className="glass-panel border border-amber-500/40 bg-amber-500/10 rounded-2xl p-4 shadow-md">
                <div className="flex items-center justify-between text-amber-500">
                  <span className="text-[10px] font-black uppercase tracking-wider block">{t('pending')}</span>
                  <Clock size={15} className="animate-pulse" />
                </div>
                <div className="text-xl sm:text-2xl font-black font-display text-amber-400 mt-2">{pendingCount}</div>
                <span className="text-[9.5px] text-amber-400/80 mt-1 block font-semibold">{t('awaiting_response')}</span>
              </div>

              {/* 3. Preparing Orders */}
              <div className="glass-panel border border-blue-500/40 bg-blue-500/10 rounded-2xl p-4 shadow-md">
                <div className="flex items-center justify-between text-blue-400">
                  <span className="text-[10px] font-black uppercase tracking-wider block">{t('preparing')}</span>
                  <ChefHat size={15} />
                </div>
                <div className="text-xl sm:text-2xl font-black font-display text-blue-400 mt-2">{preparingCount}</div>
                <span className="text-[9.5px] text-blue-400/80 mt-1 block font-semibold">{t('in_kitchen')}</span>
              </div>

              {/* 4. Ready Orders */}
              <div className="glass-panel border border-emerald-500/40 bg-emerald-500/10 rounded-2xl p-4 shadow-md">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-[10px] font-black uppercase tracking-wider block">{t('ready')}</span>
                  <CheckCircle size={15} />
                </div>
                <div className="text-xl sm:text-2xl font-black font-display text-emerald-400 mt-2">{readyCount}</div>
                <span className="text-[9.5px] text-emerald-400/80 mt-1 block font-semibold">{t('for_pickup')}</span>
              </div>

              {/* 5. Completed Orders */}
              <div className="glass-panel border border-glass bg-glass-subtle/30 rounded-2xl p-4 shadow-md">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-[10px] font-bold uppercase tracking-wider block">{t('completed')}</span>
                  <CheckCircle size={15} />
                </div>
                <div className="text-xl sm:text-2xl font-black font-display text-text-primary mt-2">{completedCount}</div>
                <span className="text-[9.5px] text-text-muted mt-1 block font-medium">{t('delivered')}</span>
              </div>

              {/* 6. Today's Revenue */}
              <div className="glass-panel border border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-4 shadow-luxury hover:border-primary/60 transition-all">
                <div className="flex items-center justify-between text-primary">
                  <span className="text-[10px] font-black uppercase tracking-wider block">{t('todays_revenue')}</span>
                  <Utensils size={15} />
                </div>
                <div className="text-xl sm:text-2xl font-black font-display text-primary mt-2">₹{todayRevenue.toFixed(2)}</div>
                <span className="text-[9.5px] text-primary/80 mt-1 block font-semibold">{t('gross_earnings')}</span>
              </div>
            </div>

            {/* Layout Split: Latest Customer Orders + Recent Activity */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
              {/* Left 2 Cols: Latest Orders */}
              <div className="xl:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-black font-display text-primary tracking-tight flex items-center gap-2">
                    <ClipboardList size={18} />
                    <span>Latest Customer Orders</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All ({orders.length})</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Mobile Orders Card List (Screens < 640px) */}
                <div className="space-y-3.5 sm:hidden">
                  {orders.slice(0, 4).map(o => {
                    const status = (o.orderStatus || (o as any).status || 'Pending').toString();
                    const isPending = status.toLowerCase() === 'pending';
                    const isPreparing = status.toLowerCase() === 'preparing' || status.toLowerCase() === 'accepted';
                    const isReady = status.toLowerCase() === 'ready';

                    return (
                      <motion.div
                        key={o.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`glass-panel border rounded-2xl p-3.5 space-y-3 shadow-md relative overflow-hidden ${isPending
                          ? 'border-amber-500/40 bg-amber-500/[0.03]'
                          : isPreparing
                            ? 'border-blue-500/40 bg-blue-500/[0.03]'
                            : isReady
                              ? 'border-emerald-500/40 bg-emerald-500/[0.03]'
                              : 'border-glass bg-bg-cardSec/40'
                          }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-glass/60 pb-2.5">
                          <span className="font-mono text-xs font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                            #{o.id}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${isPending ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                            isPreparing ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                              isReady ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                                'bg-glass text-text-muted border-glass'
                            }`}>
                            {status}
                          </span>
                        </div>

                        {/* Customer & Items */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-extrabold text-xs text-text-primary flex items-center gap-1">
                              <User size={12} className="text-primary" />
                              <span>{o.customerName}</span>
                            </div>
                            <div className="text-[10px] text-text-muted mt-0.5">
                              {Array.isArray(o.items) && o.items.length > 0 ? (
                                o.items.map(it => `${it.foodName || it.name} (x${it.quantity || 1})`).join(', ')
                              ) : typeof o.items === 'string' ? (
                                o.items
                              ) : 'Items ordered'}
                            </div>
                          </div>
                          <span className="font-black text-sm text-primary font-display shrink-0">
                            ₹{Number(o.total || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* Action Bar */}
                        <div className="pt-2 border-t border-glass/60 flex items-center justify-end">
                          {renderRestaurantOrderAction(o)}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Desktop Orders Table (Screens >= 640px) */}
                <div className="hidden sm:block glass-panel border border-glass rounded-2xl overflow-hidden shadow-luxury">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-bg-dark/80 border-b border-glass text-[10px] uppercase tracking-wider text-text-muted font-bold">
                        <tr>
                          <th className="p-4">{t('order_id')}</th>
                          <th className="p-4">{t('customer')}</th>
                          <th className="p-4">{t('items')}</th>
                          <th className="p-4">{t('total')}</th>
                          <th className="p-4">{t('status')}</th>
                          <th className="p-4 text-right">{t('action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-glass font-medium text-text-secondary">
                        {orders.slice(0, 5).map(o => (
                          <tr key={o.id} className="hover:bg-glass/40 transition-colors">
                            <td className="p-4 font-mono font-bold text-primary">{o.id}</td>
                            <td className="p-4">
                              <div className="font-bold text-text-primary">{o.customerName}</div>
                              <div className="text-[10px] text-text-muted">{o.time}</div>
                            </td>
                            <td className="p-4 max-w-xs">
                              {Array.isArray(o.items) && o.items.length > 0 ? (
                                <div className="space-y-0.5">
                                  {o.items.map((it: any, idx: number) => (
                                    <div key={idx} className="text-xs font-semibold text-text-primary">
                                      {it.foodName || it.name || 'Food Item'} <span className="text-primary font-bold">x{it.quantity || 1}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : typeof o.items === 'string' ? (
                                o.items
                              ) : (
                                <span className="text-text-muted italic text-[11px]">No items listed</span>
                              )}
                            </td>
                            <td className="p-4 font-bold text-text-primary">₹{Number(o.total || 0).toFixed(2)}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase ${o.orderStatus === 'Pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                o.orderStatus === 'Preparing' || o.orderStatus === 'Accepted' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                  o.orderStatus === 'Ready' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                    o.orderStatus === 'Completed' ? 'bg-glass text-text-muted border border-glass' :
                                      'bg-error/10 text-error border border-error/20'
                                }`}>
                                {o.orderStatus}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {renderRestaurantOrderAction(o)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Col: Live Recent Activities Stream */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-black font-display text-primary tracking-tight flex items-center gap-2">
                  <Clock size={18} />
                  <span>Recent Operational Activity</span>
                </h3>
                <div className="glass-panel border border-glass rounded-2xl p-4 sm:p-5 shadow-luxury space-y-3">
                  {activities.map(act => (
                    <div key={act.id} className="flex gap-3 items-start p-3 rounded-xl bg-glass-subtle/50 border border-glass/40 hover:border-primary/30 transition-all">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Clock size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold text-text-primary leading-tight">{act.title}</div>
                        <div className="text-[10px] text-text-muted font-mono mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>{act.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MENU MANAGEMENT TAB */}
        {/* ==================================================== */}
        {activeTab === 'menu' && (
          isFoodModalOpen ? (
            <div className="space-y-8 animate-fadeIn w-full">
              {/* Single Full-Width Glass Panel combining header, back button, and form */}
              <div className="glass-panel border border-glass rounded-2xl p-6 md:p-10 shadow-luxury w-full">
                {/* Header section with title on left and Back button on right */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-6 mb-8">
                  <div>
                    <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Shop Item Onboarding</span>
                    <h2 className="text-2xl md:text-3xl font-black font-display text-primary tracking-tight">
                      {editingFood ? 'Edit Marketplace Item' : 'Add New Marketplace Item'}
                    </h2>
                    <p className="text-xs text-text-muted mt-1">Provide item details, variation pricing (weights/quantities), categories, and product image.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFoodModalOpen(false)}
                    className="self-start sm:self-auto flex items-center gap-2 px-5 py-3 rounded-xl border border-glass bg-glass hover:bg-glass-subtle hover:text-primary font-bold text-xs uppercase tracking-wider transition-all duration-300"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Item Catalog</span>
                  </button>
                </div>

                {foodFormError && (
                  <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-semibold mb-6 flex gap-2.5 items-center">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{foodFormError}</span>
                  </div>
                )}

                <form onSubmit={saveFoodItem} className="space-y-6 text-xs font-semibold text-text-secondary w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Item / Product Name *</label>
                      <input
                        type="text"
                        required
                        value={foodForm.name}
                        onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                        placeholder="e.g. Kaju Katli / Fresh Tomatoes / Organic Honey"
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all placeholder-text-muted/40 font-medium text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Category *</label>
                      <select
                        value={foodForm.category}
                        onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value })}
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all font-bold text-sm"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Item Variations / Quantity & Weight Pricing Builder */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary/20 pb-3">
                      <div>
                        <h4 className="font-extrabold text-sm text-primary flex items-center gap-2">
                          <Layers size={16} />
                          <span>Item Variations & Quantity Pricing (Weight / Pack Sizes)</span>
                        </h4>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Set different prices for weights (e.g. 100g, 250g, 500g, 1kg) or portion sizes.
                        </p>
                      </div>

                      {/* Quick Presets for Shop Types */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => setFoodForm(prev => ({
                            ...prev,
                            variants: [
                              { id: `v_${Date.now()}_1`, quantity: '100', unit: 'gms', price: '40', compareAtPrice: '50', isAvailable: true, label: '100 gms' },
                              { id: `v_${Date.now()}_2`, quantity: '250', unit: 'gms', price: '95', compareAtPrice: '110', isAvailable: true, label: '250 gms' },
                              { id: `v_${Date.now()}_3`, quantity: '500', unit: 'gms', price: '180', compareAtPrice: '200', isAvailable: true, label: '500 gms' },
                              { id: `v_${Date.now()}_4`, quantity: '1', unit: 'kg', price: '340', compareAtPrice: '380', isAvailable: true, label: '1 kg' }
                            ]
                          }))}
                          className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500/30 transition-all cursor-pointer"
                        >
                          🍬 Sweets Preset
                        </button>
                        <button
                          type="button"
                          onClick={() => setFoodForm(prev => ({
                            ...prev,
                            variants: [
                              { id: `v_${Date.now()}_1`, quantity: '250', unit: 'gms', price: '15', compareAtPrice: '20', isAvailable: true, label: '250 gms' },
                              { id: `v_${Date.now()}_2`, quantity: '500', unit: 'gms', price: '28', compareAtPrice: '35', isAvailable: true, label: '500 gms' },
                              { id: `v_${Date.now()}_3`, quantity: '1', unit: 'kg', price: '50', compareAtPrice: '65', isAvailable: true, label: '1 kg' }
                            ]
                          }))}
                          className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/30 transition-all cursor-pointer"
                        >
                          🥦 Veg/Fruit Preset
                        </button>
                        <button
                          type="button"
                          onClick={() => setFoodForm(prev => ({
                            ...prev,
                            variants: [
                              { id: `v_${Date.now()}_1`, quantity: '200', unit: 'ml', price: '18', compareAtPrice: '', isAvailable: true, label: '200 ml' },
                              { id: `v_${Date.now()}_2`, quantity: '500', unit: 'ml', price: '32', compareAtPrice: '', isAvailable: true, label: '500 ml' },
                              { id: `v_${Date.now()}_3`, quantity: '1', unit: 'Litre', price: '60', compareAtPrice: '', isAvailable: true, label: '1 Litre' }
                            ]
                          }))}
                          className="px-2 py-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-500/30 transition-all cursor-pointer"
                        >
                          🥛 Dairy/Drinks
                        </button>
                        <button
                          type="button"
                          onClick={() => setFoodForm(prev => ({
                            ...prev,
                            variants: [
                              { id: `v_${Date.now()}_1`, quantity: '1', unit: 'plate', price: '120', compareAtPrice: '', isAvailable: true, label: 'Half Portion' },
                              { id: `v_${Date.now()}_2`, quantity: '1', unit: 'plate', price: '220', compareAtPrice: '', isAvailable: true, label: 'Full Portion' }
                            ]
                          }))}
                          className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold uppercase tracking-wider hover:bg-purple-500/30 transition-all cursor-pointer"
                        >
                          🍱 Food Portion
                        </button>
                      </div>
                    </div>

                    {/* Variant Table / Rows */}
                    <div className="space-y-2.5">
                      {foodForm.variants.map((variant, idx) => (
                        <div key={variant.id || idx} className="grid grid-cols-12 gap-2 items-center bg-bg-dark/80 p-2.5 rounded-xl border border-glass">
                          <div className="col-span-3">
                            <label className="text-[9px] text-text-muted font-bold block uppercase">Quantity</label>
                            <input
                              type="number"
                              required
                              value={variant.quantity}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFoodForm(prev => ({
                                  ...prev,
                                  variants: prev.variants.map((v, i) => i === idx ? { ...v, quantity: val, label: `${val} ${v.unit}` } : v)
                                }));
                              }}
                              placeholder="e.g. 250"
                              className="w-full bg-bg-cardSec border border-glass px-2.5 py-1.5 rounded-lg text-xs text-text-primary font-bold outline-none"
                            />
                          </div>

                          <div className="col-span-3">
                            <label className="text-[9px] text-text-muted font-bold block uppercase">Unit</label>
                            <select
                              value={variant.unit}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFoodForm(prev => ({
                                  ...prev,
                                  variants: prev.variants.map((v, i) => i === idx ? { ...v, unit: val, label: `${v.quantity} ${val}` } : v)
                                }));
                              }}
                              className="w-full bg-bg-cardSec border border-glass px-2 py-1.5 rounded-lg text-xs text-text-primary font-bold outline-none cursor-pointer"
                            >
                              <option value="gms">gms</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="Litre">Litre</option>
                              <option value="pcs">pcs</option>
                              <option value="pack">pack</option>
                              <option value="plate">plate</option>
                              <option value="box">box</option>
                            </select>
                          </div>

                          <div className="col-span-3">
                            <label className="text-[9px] text-text-muted font-bold block uppercase">Price (₹)</label>
                            <input
                              type="number"
                              required
                              step="0.01"
                              value={variant.price}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFoodForm(prev => {
                                  const updated = prev.variants.map((v, i) => i === idx ? { ...v, price: val } : v);
                                  return {
                                    ...prev,
                                    price: idx === 0 ? val : prev.price,
                                    variants: updated
                                  };
                                });
                              }}
                              placeholder="Price ₹"
                              className="w-full bg-bg-cardSec border border-glass px-2.5 py-1.5 rounded-lg text-xs text-primary font-black outline-none"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="text-[9px] text-text-muted font-bold block uppercase">MRP (₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={variant.compareAtPrice || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFoodForm(prev => ({
                                  ...prev,
                                  variants: prev.variants.map((v, i) => i === idx ? { ...v, compareAtPrice: val } : v)
                                }));
                              }}
                              placeholder="Optional"
                              className="w-full bg-bg-cardSec border border-glass px-2.5 py-1.5 rounded-lg text-xs text-text-muted outline-none"
                            />
                          </div>

                          <div className="col-span-1 flex justify-end pt-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (foodForm.variants.length > 1) {
                                  setFoodForm(prev => ({
                                    ...prev,
                                    variants: prev.variants.filter((_, i) => i !== idx)
                                  }));
                                }
                              }}
                              className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete variation"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFoodForm(prev => ({
                          ...prev,
                          variants: [
                            ...prev.variants,
                            { id: `v_${Date.now()}`, quantity: '1', unit: 'kg', price: '', compareAtPrice: '', isAvailable: true, label: '1 kg' }
                          ]
                        }));
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/10 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Another Weight / Variant Option</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Dietary Type *</label>
                      <select
                        value={foodForm.isVeg ? 'veg' : 'non-veg'}
                        onChange={(e) => setFoodForm({ ...foodForm, isVeg: e.target.value === 'veg' })}
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all font-bold text-sm"
                      >
                        <option value="veg">Vegetarian (Veg)</option>
                        <option value="non-veg">Non-Vegetarian (Non-Veg)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-xl border border-glass bg-bg-dark/50 w-full">
                        <input
                          type="checkbox"
                          checked={foodForm.isAvailable}
                          onChange={(e) => setFoodForm({ ...foodForm, isAvailable: e.target.checked })}
                          className="w-4 h-4 rounded border-glass text-primary focus:ring-primary/30 accent-primary"
                        />
                        <span className="font-bold text-sm text-text-primary">Available for Orders</span>
                      </label>
                    </div>
                  </div>

                  {/* One Category One Favourite Checkbox Option */}
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={foodForm.isCategoryFavourite}
                        onChange={(e) => setFoodForm({ ...foodForm, isCategoryFavourite: e.target.checked })}
                        className="w-4 h-4 rounded border-amber-500 text-amber-500 focus:ring-amber-500/30 accent-amber-500"
                      />
                      <div className="flex flex-col">
                        <span className="font-extrabold text-xs text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <span>One Category One Favourite</span>
                        </span>
                        <span className="text-[10px] text-text-muted mt-0.5">
                          Feature this dish under "One Category One Favourite" on the customer landing page.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Description</label>
                    <textarea
                      rows={3}
                      value={foodForm.description}
                      onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
                      placeholder="Brief description of ingredients, flavor notes, or preparation style..."
                      className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none font-medium text-sm resize-none"
                    />
                  </div>

                  {/* Food Image Section */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">Food Cover Image (S3 Upload / URL)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="md:col-span-2 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border border-glass bg-glass-subtle hover:bg-glass hover:text-primary transition-all text-xs font-bold shrink-0">
                            <UploadCloud size={16} />
                            <span>{isFoodImageUploading ? 'Uploading to S3...' : 'Upload Image File'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFoodImageUpload}
                              disabled={isFoodImageUploading}
                            />
                          </label>
                          {foodImageUploadSuccess && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                              <Check size={12} />
                              Stored in S3
                            </span>
                          )}
                        </div>

                        <input
                          type="text"
                          value={foodForm.image}
                          onChange={(e) => setFoodForm({ ...foodForm, image: e.target.value })}
                          placeholder="Or paste S3 / Web image URL (https://...)"
                          className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all placeholder-text-muted/40 font-medium text-sm"
                        />
                      </div>

                      {/* Preview Card */}
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-glass/60 bg-bg-dark/40">
                        {foodForm.image ? (
                          <img
                            src={foodForm.image}
                            alt="Preview"
                            className="w-16 h-16 rounded-lg object-cover border border-glass shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg border border-dashed border-glass flex items-center justify-center text-text-muted text-[10px] shrink-0">
                            No Image
                          </div>
                        )}
                        <div className="min-w-0 flex-grow">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted block">Image Preview</span>
                          <span className="text-[10px] text-text-secondary truncate block font-mono mt-0.5" title={foodForm.image}>
                            {foodForm.image ? (foodForm.image.startsWith('data:') ? 'Local Image File' : foodForm.image) : 'Default fallback image will be used.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-glass flex flex-col sm:flex-row gap-4 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsFoodModalOpen(false)}
                      className="px-6 py-3 rounded-xl border border-glass bg-glass-subtle hover:bg-glass text-xs font-bold transition-all uppercase tracking-wider text-text-secondary order-2 sm:order-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 bg-primary hover:bg-primary-dark text-bg-dark font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-lg transition-all order-1 sm:order-2"
                    >
                      Save Food Item
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn w-full">
              {/* Header & Add Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-6">
                <div>
                  <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Marketplace Store Catalog</span>
                  <h1 className="text-2xl sm:text-3xl font-black font-display text-primary tracking-tight">Item & Inventory Management</h1>
                  <p className="text-xs text-text-muted mt-1">Manage shop items, prices, weights/variants, availability, and categories for your store.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={openAddCategoryModal}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border border-glass bg-glass hover:bg-glass-subtle text-text-primary hover:text-primary font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    <PlusCircle size={16} />
                    <span>Add Category</span>
                  </button>
                  <button
                    onClick={openAddFoodModal}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-bg-dark font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all"
                  >
                    <PlusCircle size={16} />
                    <span>Add Shop Item</span>
                  </button>
                </div>
              </div>

              {/* Active Categories List & Quick Delete Action */}
              {categories.length > 0 && (
                <div className="glass-panel border border-glass rounded-2xl p-4 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1.5">
                      <Folder size={12} />
                      <span>Active Establishment Categories ({categories.length})</span>
                    </span>
                    <span className="text-[10px] text-text-muted font-medium">
                      Click trash icon to delete category & items from DynamoDB
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {categories.map((catName) => (
                      <div
                        key={catName}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-dark/80 border border-glass text-xs font-bold text-text-primary hover:border-primary/40 transition-all shadow-sm group"
                      >
                        <span>{catName}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategorySubmit(catName)}
                          className="p-1 rounded-md text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={`Delete '${catName}' category`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Bar */}
              <div className="glass-panel border border-glass rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
                <div className="relative w-full md:w-80">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search food item name..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-lg bg-bg-dark border border-glass focus:border-primary/40 text-text-primary placeholder-text-muted/60 outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <select
                    value={menuCategoryFilter}
                    onChange={(e) => setMenuCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-bg-dark border border-glass text-text-secondary outline-none"
                  >
                    <option value="All">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <select
                    value={menuVegFilter}
                    onChange={(e) => setMenuVegFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-bg-dark border border-glass text-text-secondary outline-none"
                  >
                    <option value="All">All Dietary Types</option>
                    <option value="Veg">Vegetarian Only</option>
                    <option value="Non-Veg">Non-Veg Only</option>
                  </select>

                  <select
                    value={menuAvailabilityFilter}
                    onChange={(e) => setMenuAvailabilityFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-bg-dark border border-glass text-text-secondary outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Available">Available</option>
                    <option value="Unavailable">Disabled</option>
                  </select>
                </div>
              </div>

              {/* Food Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredMenuItems.map(item => (
                  <div
                    key={item.id}
                    className={`glass-panel border rounded-2xl overflow-hidden shadow-luxury flex flex-col justify-between transition-all duration-300 ${!item.isAvailable ? 'opacity-65 border-glass bg-bg-dark/40' : 'border-glass hover:border-primary/40'
                      }`}
                  >
                    <div>
                      {/* Cover Image & Category Badges */}
                      <div className="relative h-36 w-full overflow-hidden bg-bg-dark">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${item.isVeg ? 'bg-emerald-500/90 text-white' : 'bg-rose-600/90 text-white'
                            }`}>
                            {item.isVeg ? 'Veg' : 'Non-Veg'}
                          </span>
                        </div>

                        <div className="absolute top-2 right-2">
                          <button
                            onClick={() => toggleFoodAvailability(item.id)}
                            className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider backdrop-blur-md transition-all ${item.isAvailable ? 'bg-emerald-500/80 text-white' : 'bg-red-500/80 text-white'
                              }`}
                          >
                            {item.isAvailable ? 'Available' : 'Disabled'}
                          </button>
                        </div>

                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-bg-dark/80 text-primary backdrop-blur-md">
                          {item.category}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-text-primary tracking-tight line-clamp-1">{item.name}</h3>
                          <div className="text-right shrink-0">
                            {item.variants && item.variants.length > 1 ? (
                              <div>
                                <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">From</span>
                                <span className="font-black text-sm text-primary">₹{Math.min(...item.variants.map((v: any) => Number(v.price) || Number(item.price))).toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="font-black text-sm text-primary">₹{item.price.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{item.description}</p>

                        {/* Variants Toggle Badge if item has multiple variants */}
                        {item.variants && item.variants.length > 0 && (
                          <div className="pt-1.5 border-t border-glass/40">
                            <button
                              type="button"
                              onClick={() => toggleExpandVariants(item.id)}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-[11px] font-extrabold transition-all cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5">
                                <Layers size={13} />
                                <span>{item.variants.length} Variation Options</span>
                              </span>
                              <ChevronRight size={14} className={`transform transition-transform duration-200 ${expandedItemIds[item.id] ? 'rotate-90' : ''}`} />
                            </button>

                            {/* Inline Expandable Variants Drawer */}
                            {expandedItemIds[item.id] && (
                              <div className="mt-2 p-2.5 rounded-xl bg-bg-dark/80 border border-glass space-y-1.5 animate-fadeIn">
                                <div className="text-[9.5px] font-black uppercase tracking-widest text-text-muted border-b border-glass/50 pb-1">
                                  Pack / Weight Options
                                </div>
                                {item.variants.map((v: any, vIdx: number) => (
                                  <div key={v.id || vIdx} className="flex items-center justify-between text-xs py-1 border-b border-glass/30 last:border-0">
                                    <span className="font-bold text-text-primary">
                                      {v.label || `${v.quantity} ${v.unit}`}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {v.compareAtPrice && Number(v.compareAtPrice) > Number(v.price) && (
                                        <span className="line-through text-text-muted text-[10px]">₹{Number(v.compareAtPrice).toFixed(2)}</span>
                                      )}
                                      <span className="font-extrabold text-primary">₹{Number(v.price).toFixed(2)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-between text-[10px] text-text-muted font-bold border-t border-glass/40">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-primary" />
                            <span>{item.prepTime}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions (In Stock Toggle, Edit, Delete Buttons) */}
                    <div className="p-3 bg-slate-50/80 dark:bg-bg-darkSec/60 border-t border-slate-200 dark:border-glass/40 flex items-center justify-between gap-1.5">
                      {/* In Stock Toggle Pill */}
                      <button
                        type="button"
                        onClick={() => toggleFoodAvailability(item.id)}
                        className={`h-8 px-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0 ${item.isAvailable
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/25'
                          }`}
                        title={item.isAvailable ? 'Click to mark Out of Stock' : 'Click to mark Available'}
                      >
                        {/* iOS-Style Toggle */}
                        <div
                          className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0 ${item.isAvailable ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-700'
                            }`}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${item.isAvailable ? 'translate-x-2.5' : 'translate-x-0'
                              }`}
                          />
                        </div>
                        <span className="whitespace-nowrap leading-none">{item.isAvailable ? 'In Stock' : 'Out of Stock'}</span>
                      </button>

                      {/* Action Buttons Group */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditFoodModal(item)}
                          className="h-8 px-2.5 rounded-xl border border-amber-500/30 dark:border-[#B87C44]/40 bg-amber-500/10 dark:bg-[#B87C44]/15 hover:bg-amber-500/20 dark:hover:bg-[#B87C44]/25 text-[#B87C44] dark:text-[#D9A36C] font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 shrink-0 whitespace-nowrap"
                          title="Edit Item Details & Variations"
                        >
                          <Edit2 size={12} className="shrink-0" />
                          <span className="leading-none">Edit</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => deleteFoodItem(item.id)}
                          className="h-8 w-8 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95 shrink-0"
                          title="Delete Item"
                        >
                          <Trash2 size={13} className="shrink-0" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredMenuItems.length === 0 && (
                <div className="text-center py-12 glass-panel border border-glass rounded-2xl p-8">
                  <Utensils size={36} className="mx-auto text-text-muted mb-3" />
                  <h3 className="font-bold text-base text-text-primary">No food items found</h3>
                  <p className="text-xs text-text-muted mt-1">Try adjusting your filters or click "Add Food Item" to create one.</p>
                </div>
              )}
            </div>
          )
        )}

        {/* ==================================================== */}
        {/* ORDERS TAB */}
        {/* ==================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fadeIn w-full">
            <div className="border-b border-glass pb-6">
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Live Operations</span>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-primary tracking-tight">Orders Management</h1>
              <p className="text-xs text-text-muted mt-1">Track and update active customer orders assigned to {restaurant?.name}.</p>
            </div>

            {/* Filter Controls */}
            <div className="glass-panel border border-glass rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row gap-3.5 sm:gap-4 items-center justify-between shadow-md">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search Order ID, Customer, or Phone..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-[15px] sm:text-xs font-semibold rounded-xl bg-bg-dark border border-glass focus:border-primary/40 text-text-primary placeholder-text-muted/60 outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1.5 sm:pb-0 scrollbar-none">
                {['All', 'Pending', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Rejected'].map(st => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${orderStatusFilter === st ? 'bg-primary text-black font-black shadow-sm' : 'bg-glass text-text-secondary hover:text-primary border border-glass/60'
                      }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* ORDERS LIST: DUAL MOBILE CARDS + DESKTOP TABLE */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 glass-panel border border-glass rounded-2xl p-8 max-w-md mx-auto space-y-3">
                <ClipboardList size={40} className="mx-auto text-text-muted opacity-50" />
                <h3 className="font-bold text-base text-text-primary font-display">No Orders Found</h3>
                <p className="text-xs text-text-muted">
                  No orders match your filter. Active incoming customer orders will appear here automatically in real time.
                </p>
              </div>
            ) : (
              <>
                {/* ACCORDION VENDOR ORDER CARDS LIST */}
                <div className="space-y-4 w-full">
                  {filteredOrders.map(o => {
                    const status = (o.orderStatus || (o as any).status || 'Pending').toString();
                    const statusLower = status.toLowerCase();
                    const isPending = statusLower === 'pending';
                    const isPreparing = statusLower === 'preparing' || statusLower === 'accepted';
                    const isReady = statusLower === 'ready';
                    const isCompleted = statusLower === 'completed' || statusLower === 'delivered';
                    const isRejected = statusLower === 'rejected';

                    const isExpanded = !!expandedOrdersMap[o.id];

                    let itemsList: any[] = [];
                    if (Array.isArray(o.items)) {
                      itemsList = o.items;
                    } else if (typeof o.items === 'string' && o.items.trim().startsWith('[')) {
                      try {
                        itemsList = JSON.parse(o.items);
                      } catch (e) {}
                    }

                    const totalItemsQty = itemsList.length > 0
                      ? itemsList.reduce((acc: number, it: any) => acc + Number(it.quantity || it.qty || 1), 0)
                      : 1;

                    return (
                      <motion.div
                        key={o.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`glass-panel border rounded-2xl overflow-hidden shadow-luxury transition-all ${isPending
                          ? 'border-amber-500/40 bg-amber-500/[0.02]'
                          : isPreparing
                            ? 'border-blue-500/40 bg-blue-500/[0.02]'
                            : isReady
                              ? 'border-emerald-500/40 bg-emerald-500/[0.02]'
                              : 'border-glass bg-bg-cardSec/40'
                          }`}
                      >
                        {/* 1. Accordion Summary Header (Always Visible) */}
                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-dark/40 border-b border-glass/60 hover:bg-glass/30 transition-colors">
                          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                            {/* Accordion Expand/Collapse Icon Button */}
                            <button
                              type="button"
                              onClick={() => toggleOrderExpand(o.id)}
                              className="p-2 sm:p-2.5 rounded-xl bg-glass border border-glass text-primary hover:bg-primary/20 transition-all cursor-pointer shrink-0 mt-0.5 sm:mt-0"
                              title={isExpanded ? 'Collapse Details' : 'Expand Details'}
                            >
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>

                            {/* Order Info & Customer Summary */}
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs sm:text-sm font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg tracking-wider">
                                  #{o.id}
                                </span>
                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border shadow-sm ${isPending
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    : isPreparing
                                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                      : isReady
                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                        : isCompleted
                                          ? 'bg-glass text-text-muted border-glass'
                                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                    }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${isPending
                                      ? 'bg-amber-400 animate-pulse'
                                      : isPreparing
                                        ? 'bg-blue-400 animate-pulse'
                                        : isReady
                                          ? 'bg-emerald-400 animate-pulse'
                                          : isCompleted
                                            ? 'bg-text-muted'
                                            : 'bg-rose-400'
                                      }`}
                                  />
                                  <span>{status}</span>
                                </span>

                                {o.time && (
                                  <span className="text-[10px] text-text-muted font-bold flex items-center gap-1">
                                    <Clock size={11} />
                                    {o.time}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2.5 text-xs text-text-secondary">
                                <span className="font-bold text-text-primary flex items-center gap-1">
                                  <User size={13} className="text-primary" />
                                  {o.customerName || 'Customer'}
                                </span>
                                <span className="text-text-muted">•</span>
                                <span className="font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 text-[11px] flex items-center gap-1">
                                  <ShoppingBag size={12} />
                                  {totalItemsQty} {totalItemsQty === 1 ? 'item' : 'items'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right Header Actions: Total Price, Accept/Reject Buttons, Toggle Button */}
                          <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-glass/40">
                            <div className="text-left sm:text-right shrink-0">
                              <span className="text-[10px] text-text-muted font-black uppercase tracking-wider block leading-none">
                                Total Order
                              </span>
                              <span className="text-base sm:text-lg font-black text-primary font-display">
                                ₹{Number(o.total || 0).toFixed(2)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {renderRestaurantOrderAction(o)}

                              <button
                                type="button"
                                onClick={() => toggleOrderExpand(o.id)}
                                className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${isExpanded
                                  ? 'bg-primary text-black border-primary'
                                  : 'bg-glass text-text-primary hover:border-primary/50 border-glass'
                                  }`}
                              >
                                <span>{isExpanded ? 'Hide Details' : 'View Items'}</span>
                                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 2. Expandable Accordion Item & Customer Details Panel */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="bg-bg-dark/90 p-4 sm:p-6 border-t border-glass space-y-5"
                            >
                              {/* Customer & Delivery Summary Box */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-glass-subtle/50 p-4 rounded-2xl border border-glass/80">
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-black uppercase text-primary tracking-widest block">
                                    Customer & Contact Details
                                  </span>
                                  <div className="text-xs font-bold text-text-primary flex items-center gap-2">
                                    <User size={14} className="text-primary shrink-0" />
                                    <span className="text-sm">{o.customerName || 'Customer'}</span>
                                  </div>
                                  {o.customerPhone && (
                                    <a
                                      href={`tel:${o.customerPhone}`}
                                      className="text-xs text-primary font-extrabold hover:underline flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 w-fit"
                                    >
                                      <Phone size={12} />
                                      <span>{o.customerPhone}</span>
                                    </a>
                                  )}
                                </div>

                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-black uppercase text-primary tracking-widest block">
                                    Delivery Address
                                  </span>
                                  <p className="text-xs font-semibold text-text-secondary flex items-start gap-1.5 leading-relaxed">
                                    <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                                    <span>{o.customerAddress || 'No address specified'}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Detailed Item & Variant Breakdown */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                  <span className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
                                    <Utensils size={15} className="text-primary" />
                                    <span>Itemized Order Breakdown ({itemsList.length} unique items)</span>
                                  </span>
                                </div>

                                <div className="space-y-2.5">
                                  {itemsList.length > 0 ? (
                                    itemsList.map((it: any, idx: number) => {
                                      const foodName = it.foodName || it.name || it.dishName || 'Food Item';
                                      const qty = it.quantity || it.qty || 1;
                                      const price = it.price ? Number(it.price) : undefined;
                                      const variantLabel = getItemVariantLabel(it);
                                      const img = it.image || it.dishImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=200';

                                      return (
                                        <div
                                          key={idx}
                                          className="p-3.5 rounded-2xl bg-bg-cardSec/90 border border-glass flex items-center justify-between gap-4 shadow-sm hover:border-primary/40 transition-all"
                                        >
                                          <div className="flex items-center gap-3.5 min-w-0">
                                            <img
                                              src={img}
                                              alt={foodName}
                                              className="w-12 h-12 rounded-xl object-cover border border-glass shrink-0 bg-bg-dark shadow-xs"
                                            />
                                            <div className="space-y-1 min-w-0">
                                              <h4 className="font-black text-xs sm:text-sm text-text-primary truncate">
                                                {foodName}
                                              </h4>
                                              {variantLabel ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-black tracking-wide">
                                                  <span>Variant / Portion:</span>
                                                  <strong className="text-white">{variantLabel}</strong>
                                                </span>
                                              ) : (
                                                <span className="text-[10px] text-text-muted font-medium italic">Standard Portion</span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="text-right shrink-0 space-y-1">
                                            <span className="px-3 py-1 rounded-xl bg-primary/20 text-primary border border-primary/30 text-xs font-black inline-block">
                                              x{qty}
                                            </span>
                                            {price !== undefined && (
                                              <span className="text-xs font-bold text-text-secondary block">
                                                ₹{price} × {qty} = <strong className="text-primary font-black">₹{(price * qty).toFixed(2)}</strong>
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : typeof o.items === 'string' ? (
                                    <div className="p-3.5 rounded-2xl bg-bg-cardSec/90 border border-glass text-xs font-bold text-text-primary">
                                      {o.items}
                                    </div>
                                  ) : (
                                    <div className="p-3.5 rounded-2xl bg-bg-cardSec/90 border border-glass text-xs font-medium text-text-muted italic">
                                      No items listed for this order.
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Special Instructions (If Any) */}
                              {o.instructions && (
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-300 font-semibold space-y-1">
                                  <span className="font-black text-[10px] uppercase tracking-wider block text-amber-400">
                                    Customer Instructions / Notes:
                                  </span>
                                  <p>"{o.instructions}"</p>
                                </div>
                              )}

                              {/* Bottom Action Bar in Expanded Accordion */}
                              <div className="pt-3 border-t border-glass/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-bg-dark/40 p-3 rounded-2xl">
                                <span className="text-xs text-text-muted font-semibold text-center sm:text-left">
                                  Review item quantities & portion variants above before accepting/rejecting this order.
                                </span>
                                <div className="shrink-0">
                                  {renderRestaurantOrderAction(o)}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* PROFILE TAB */}
        {/* ==================================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-5 animate-fadeIn w-full max-h-[calc(100vh-120px)] overflow-y-auto pr-1 sm:pr-2 pb-12">
            <div className="border-b border-glass pb-5">
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Shop & Store Details</span>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-primary tracking-tight">Shop & Store Profile</h1>
              <p className="text-xs text-text-muted mt-1">Manage your shop details, contact information, credentials, timings, and store image.</p>
            </div>

            <div className="glass-panel border border-glass rounded-2xl p-4 sm:p-8 shadow-luxury w-full">
              {/* Error Banner */}
              {profileError && (
                <div className="p-4 rounded-xl bg-error/15 border border-error/30 text-rose-400 text-xs font-semibold mb-6 flex gap-2.5 items-center shadow-sm">
                  <AlertTriangle size={18} className="shrink-0 text-rose-400" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Success Banner */}
              {profileSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 flex gap-2.5 items-center shadow-sm">
                  <CheckCircle size={18} className="shrink-0 text-emerald-400" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={saveProfile} className="space-y-6 text-xs font-semibold text-text-secondary w-full">
                {/* 1. Basic Identity Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                      Shop / Store Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vijaya Durga Sweets & Bakery"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary pl-10 pr-4 py-3 rounded-xl outline-none font-medium text-[15px] sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                      Proprietor / Owner Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Likhith Kumar"
                        value={profileForm.ownerName}
                        onChange={(e) => setProfileForm({ ...profileForm, ownerName: e.target.value })}
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary pl-10 pr-4 py-3 rounded-xl outline-none font-medium text-[15px] sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Login & Credentials Update Section */}
                <div className="p-4 sm:p-5 rounded-2xl bg-glass-subtle/50 border border-glass/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-glass/60 pb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                      <Lock size={13} />
                      <span>Account Credentials & Email Updates</span>
                    </span>
                    <span className="text-[9.5px] text-text-muted">You can update your email & password anytime</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Email Address Field (Admin Managed Read-Only) */}
                    <div>
                      <label className="block text-[9.5px] font-bold text-text-muted uppercase tracking-widest mb-1.5 flex items-center justify-between">
                        <span>Email Address</span>
                        <span className="text-[8.5px] text-primary/80 font-bold uppercase">Admin Assigned</span>
                      </label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted opacity-70" />
                        <input
                          type="email"
                          disabled
                          readOnly
                          value={profileForm.email}
                          className="w-full bg-bg-dark/40 border border-glass/40 text-text-muted pl-9 pr-3.5 py-2.5 rounded-xl outline-none font-medium text-[15px] sm:text-xs cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* New Password Field */}
                    <div>
                      <label className="block text-[9.5px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                        New Password (Optional)
                      </label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type={showProfilePassword ? 'text' : 'password'}
                          placeholder="Leave blank to keep current"
                          value={profileForm.password}
                          onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                          className="w-full bg-bg-dark/80 border border-glass focus:border-primary/50 text-text-primary pl-9 pr-9 py-2.5 rounded-xl outline-none font-medium text-[15px] sm:text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowProfilePassword(!showProfilePassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                        >
                          {showProfilePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                      <label className="block text-[9.5px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type={showProfilePassword ? 'text' : 'password'}
                          placeholder="Re-enter password"
                          value={profileForm.confirmPassword}
                          onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                          className="w-full bg-bg-dark/80 border border-glass focus:border-primary/50 text-text-primary pl-9 pr-3.5 py-2.5 rounded-xl outline-none font-medium text-[15px] sm:text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Contact & Cuisine Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary pl-10 pr-4 py-3 rounded-xl outline-none font-medium text-[15px] sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                      Shop Specialty / Categories
                    </label>
                    <div className="relative">
                      <Sparkles size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        value={profileForm.cuisine}
                        onChange={(e) => setProfileForm({ ...profileForm, cuisine: e.target.value })}
                        placeholder="e.g. Sweets, Vegetables, Groceries, Daily Fresh Products"
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary pl-10 pr-4 py-3 rounded-xl outline-none font-medium text-[15px] sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Timings Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Opening Time</label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        placeholder="e.g. 10:30 AM"
                        value={profileForm.openingTime}
                        onChange={(e) => setProfileForm({ ...profileForm, openingTime: e.target.value })}
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary pl-10 pr-4 py-3 rounded-xl outline-none font-medium text-[15px] sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Closing Time</label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        placeholder="e.g. 11:00 PM"
                        value={profileForm.closingTime}
                        onChange={(e) => setProfileForm({ ...profileForm, closingTime: e.target.value })}
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary pl-10 pr-4 py-3 rounded-xl outline-none font-medium text-[15px] sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Address & Leaflet Interactive Location Map Section */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                      Physical Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. D.No 4-12, Main Road, Ravulapalem, Konaseema"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary pl-10 pr-4 py-3 rounded-xl outline-none font-medium text-[15px] sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Leaflet Interactive Map Picker */}
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Globe size={14} className="text-primary" />
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Pin Exact Shop Location on Leaflet Map
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleVendorLocateMe}
                        className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Crosshair size={13} />
                        <span>Use My Current GPS</span>
                      </button>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden border border-glass h-64 sm:h-72 shadow-inner z-0">
                      <MapContainer
                        center={vendorMapPos}
                        zoom={15}
                        scrollWheelZoom={true}
                        className="w-full h-full"
                      >
                        <VendorMapChangeView center={vendorMapPos} />
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <VendorLocationMarker
                          position={vendorMapPos}
                          setPosition={setVendorMapPos}
                          onLocationSelect={handleVendorLocationSelect}
                        />
                      </MapContainer>

                      {isVendorGeocoding && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2 z-10 pointer-events-none">
                          <Loader2 size={16} className="animate-spin text-primary" />
                          <span>Detecting shop location details...</span>
                        </div>
                      )}
                    </div>

                    {vendorLat && vendorLng && (
                      <div className="flex items-center justify-between text-[11px] text-text-muted bg-bg-dark/50 px-3 py-2 rounded-xl border border-glass/60">
                        <span className="flex items-center gap-1">
                          <MapPin size={13} className="text-primary" />
                          <span>GPS Coordinates: {vendorLat.toFixed(6)}, {vendorLng.toFixed(6)}</span>
                        </span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <Check size={12} /> Location Pinned
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. Restaurant Cover Image Upload */}
                <div className="space-y-2.5">
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">Restaurant Cover Banner Image</label>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-3 rounded-xl border border-glass bg-glass-subtle hover:bg-glass hover:text-primary transition-all text-xs font-bold shrink-0">
                      <UploadCloud size={16} />
                      <span>{isProfileImageUploading ? 'Uploading to Cloud...' : 'Upload New Cover Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfileImageUpload}
                        disabled={isProfileImageUploading}
                      />
                    </label>
                    {profileForm.image && (
                      <div className="flex items-center gap-3">
                        <img src={profileForm.image} alt="Cover Preview" className="w-16 h-16 rounded-xl object-cover border border-glass shadow-md shrink-0" />
                        <span className="text-[11px] text-emerald-400 font-bold">Image Loaded Successfully</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 7. Description */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Establishment Description</label>
                  <textarea
                    rows={3}
                    placeholder="Write a brief overview of your restaurant, food hygiene standards, special family thalis..."
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary p-4 rounded-xl outline-none font-medium text-[15px] sm:text-sm resize-none"
                  />
                </div>

                {/* Submit Action Bar */}
                <div className="pt-4 border-t border-glass flex justify-end">
                  <button
                    type="submit"
                    disabled={isProfileSaving}
                    className="px-8 py-3.5 bg-primary hover:bg-primary-dark text-black font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-lg active:scale-95 transition-all cursor-pointer shadow-md"
                  >
                    {isProfileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SETTINGS TAB */}
        {/* ==================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn w-full">
            <div className="border-b border-glass pb-6">
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Console Preferences</span>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-primary tracking-tight">Dashboard Settings</h1>
              <p className="text-xs text-text-muted mt-1">Configure workspace theme and notification alerts.</p>
            </div>

            <div className="glass-panel border border-glass rounded-2xl p-6 sm:p-8 shadow-luxury space-y-6 max-w-2xl">
              {/* Theme Settings */}
              <div className="flex items-center justify-between border-b border-glass pb-6">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Appearance Theme</h3>
                  <p className="text-xs text-text-muted mt-0.5">Switch between dark mode and light mode.</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-2.5 rounded-xl border border-glass bg-glass hover:bg-glass-subtle text-xs font-bold text-primary flex items-center gap-2"
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  <span className="capitalize">{theme} Mode Active</span>
                </button>
              </div>

              {/* Order Notifications */}
              <div className="flex items-center justify-between border-b border-glass pb-6">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">New Order Sound Alerts</h3>
                  <p className="text-xs text-text-muted mt-0.5">Play audio notifications when a new order arrives.</p>
                </div>
                <button
                  onClick={() => setSoundAlerts(!soundAlerts)}
                  className={`p-2 rounded-xl transition-all ${soundAlerts ? 'text-primary' : 'text-text-muted'}`}
                >
                  {soundAlerts ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>

              {/* Quick Logout */}
              <div className="pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full py-3 rounded-xl border border-error/30 bg-error/10 hover:bg-error/20 text-error font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut size={16} />
                  <span>Logout From Console</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==================================================== */}
      {/* ADD CATEGORY MODAL */}
      {/* ==================================================== */}
      <AnimatePresence>
        {isAddCategoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-dark/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel border border-glass rounded-2xl p-6 sm:p-8 shadow-luxury max-w-md w-full my-8 text-text-primary"
            >
              <div className="flex items-center justify-between border-b border-glass pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold font-display text-primary tracking-tight">Add Categories</h3>
                  <p className="text-xs text-text-muted mt-0.5">Select from suggestions or create custom categories.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsAddCategoryOpen(false); setSelectedSuggestions([]); setNewCategoryName(''); }}
                  className="p-2 rounded-lg bg-glass text-text-muted hover:text-primary transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {categoryError && (
                <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-semibold mb-5 flex gap-2 items-center">
                  <AlertTriangle size={16} />
                  <span>{categoryError}</span>
                </div>
              )}

              <form onSubmit={handleAddCategory} className="space-y-5 text-xs font-semibold text-text-secondary">
                {/* Category Suggestions Section (Select / Deselect) */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                    Quick Suggestions (Click to Select / Deselect)
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-bg-dark/50 border border-glass">
                    {SUGGESTED_CATEGORIES.map((cat) => {
                      const isSelected = selectedSuggestions.some(s => s === cat || normCat(s) === normCat(cat));
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleSuggestion(cat)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border cursor-pointer ${isSelected
                            ? 'bg-primary text-black border-primary shadow-md shadow-primary/20 scale-[1.02]'
                            : 'bg-glass hover:bg-glass-subtle border-glass text-text-secondary hover:text-text-primary'
                            }`}
                        >
                          <span>{cat}</span>
                          {isSelected && <CheckCircle size={14} className="text-black shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Category Input */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                    Or Enter Custom Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Chef Specials, Tandoori, Soups..."
                    className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none font-medium text-sm"
                  />
                </div>

                {/* Display Current Active Categories with Edit & Delete Controls */}
                {categories.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        Active Categories ({categories.length})
                      </label>
                      <span className="text-[10px] text-text-muted">Click edit icon to rename or trash icon to delete</span>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3.5 rounded-xl bg-bg-dark/50 border border-glass max-h-40 overflow-y-auto">
                      {categories.map((cat) => (
                        <div
                          key={cat}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold transition-all group"
                        >
                          {editingCategoryTarget === cat ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                autoFocus
                                value={editingCategoryValue}
                                onChange={(e) => setEditingCategoryValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleRenameCategorySubmit(cat);
                                  } else if (e.key === 'Escape') {
                                    setEditingCategoryTarget(null);
                                  }
                                }}
                                className="px-2 py-0.5 rounded bg-bg-dark border border-primary text-text-primary text-xs outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameCategorySubmit(cat)}
                                className="px-2 py-0.5 rounded bg-primary text-black font-extrabold text-[10px] uppercase"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <>
                              <span>{cat}</span>
                              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity pl-1.5 border-l border-primary/20">
                                <button
                                  type="button"
                                  title="Rename Category"
                                  onClick={() => {
                                    setEditingCategoryTarget(cat);
                                    setEditingCategoryValue(cat);
                                  }}
                                  className="p-1 hover:text-white transition-colors"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  title="Delete Category"
                                  onClick={() => handleDeleteCategorySubmit(cat)}
                                  className="p-1 hover:text-rose-400 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-glass flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsAddCategoryOpen(false); setSelectedSuggestions([]); setNewCategoryName(''); }}
                    className="flex-1 py-3 rounded-xl border border-glass bg-glass-subtle text-text-secondary font-bold text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCategory}
                    className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-bg-dark font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    {isSavingCategory ? 'Saving...' : 'Save Selected'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Logout Confirmation Modal (FEATURE 2) */}
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-card border border-glass rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-text-primary"
            >
              <div className="flex items-center gap-3 border-b border-glass pb-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                  <LogOut size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black font-display text-text-primary tracking-tight">
                    {t('logout_modal_title')}
                  </h2>
                  <span className="text-xs text-text-muted font-medium block">Confirmation</span>
                </div>
              </div>

              <p className="text-sm font-medium text-text-secondary leading-relaxed">
                {t('logout_modal_message')}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-glass bg-glass hover:bg-glass-subtle text-text-primary font-bold text-xs uppercase tracking-wider transition-all"
                >
                  {t('logout_cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-red-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <LogOut size={14} />
                  <span>{t('logout_confirm')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Delete Food Item Confirmation Modal (Replaces browser window.confirm) */}
        {deleteFoodTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-card border border-glass rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-text-primary"
            >
              <div className="flex items-center gap-3 border-b border-glass pb-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black font-display text-text-primary tracking-tight">
                    Delete Menu Item
                  </h2>
                  <span className="text-xs text-text-muted font-medium block">Confirmation</span>
                </div>
              </div>

              <p className="text-sm font-medium text-text-secondary leading-relaxed">
                Are you sure you want to delete <strong className="text-text-primary">{deleteFoodTarget.name}</strong> from your menu?
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteFoodTarget(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-glass bg-glass hover:bg-glass-subtle text-text-primary font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const itemId = deleteFoodTarget.id;
                    const itemName = deleteFoodTarget.name;
                    setMenuItems(prev => prev.filter(m => m.id !== itemId));
                    try {
                      await axios.delete(`${API_BASE_URL}/restaurant/menu/${itemId}`);
                    } catch (err) {
                      console.warn('Backend delete failed:', err);
                    }
                    logActivity('menu', `Food item "${itemName}" was deleted.`);
                    setDeleteFoodTarget(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-red-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Notifications & Recent Order Updates Drawer / Modal Panel */}
        <AnimatePresence>
          {isNotificationOpen && (
            <>
              {/* Dim Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNotificationOpen(false)}
                className="fixed inset-0 z-45 bg-black/70 backdrop-blur-xs cursor-pointer"
              />

              {/* Notification Drawer Panel */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="fixed top-14 right-3 sm:top-16 sm:right-8 z-50 w-[92vw] sm:w-96 max-h-[80vh] bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-glass rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between overflow-hidden"
              >
                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-glass pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                        <Bell size={16} />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-text-primary font-display">Recent Updates & Orders</h3>
                        <span className="text-[10px] text-text-muted font-bold block">Live Notification Center</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsNotificationOpen(false)}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-glass text-text-muted hover:text-text-primary cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Notifications List */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs scrollbar-thin">
                    {/* Pending Action Required Banner */}
                    {pendingCount > 0 && (
                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 animate-pulse">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                          <div>
                            <span className="font-black text-amber-500 text-xs block">{pendingCount} Action Required</span>
                            <span className="text-[10px] text-amber-400/90 font-medium">Pending orders awaiting response</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('orders');
                            setOrderStatusFilter('Pending');
                            setIsNotificationOpen(false);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-amber-500 text-black font-black text-[10px] tracking-tight shrink-0 cursor-pointer shadow-xs"
                        >
                          Review
                        </button>
                      </div>
                    )}

                    {/* Orders Updates List */}
                    {orders.slice(0, 5).map(o => {
                      const isPending = o.orderStatus === 'Pending';
                      return (
                        <div
                          key={o.id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-glass-subtle/40 border border-slate-200/60 dark:border-glass/40 flex items-start justify-between gap-3 hover:border-primary/40 transition-all"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-primary font-mono">{o.id}</span>
                              <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${isPending ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                                }`}>
                                {o.orderStatus}
                              </span>
                            </div>
                            <div className="font-extrabold text-text-primary text-[11px] truncate">{o.customerName}</div>
                            <div className="text-[10px] text-text-muted truncate">
                              {Array.isArray(o.items) && o.items.length > 0
                                ? o.items.map((it: any) => `${it.foodName || it.name} (x${it.quantity || 1})`).join(', ')
                                : 'Order Items'}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="font-black text-xs text-text-primary">₹{Number(o.total || 0).toFixed(2)}</span>
                            {isPending ? (
                              <button
                                onClick={() => {
                                  updateOrderStatus(o.id, 'Preparing');
                                  setIsNotificationOpen(false);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-primary text-black font-black text-[9.5px] cursor-pointer shadow-xs"
                              >
                                Accept
                              </button>
                            ) : (
                              <span className="text-[9px] text-text-muted font-mono">{o.time}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Activity Feed Updates */}
                    <div className="pt-2 border-t border-slate-200 dark:border-glass/40 space-y-2">
                      <span className="text-[9.5px] font-black uppercase tracking-widest text-text-muted block px-1">Recent Activity Log</span>
                      {activities.slice(0, 4).map(act => (
                        <div key={act.id} className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-glass/30 text-[11px] font-bold flex items-center justify-between gap-2">
                          <span className="text-text-primary truncate">{act.title}</span>
                          <span className="text-[9px] text-primary font-mono shrink-0">{act.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-slate-200 dark:border-glass">
                    <button
                      onClick={() => {
                        setActiveTab('orders');
                        setIsNotificationOpen(false);
                      }}
                      className="w-full py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border border-primary/30"
                    >
                      <ClipboardList size={15} />
                      <span>View All Orders ({orders.length})</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </AnimatePresence>
      {/* Restaurant Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-bg-darkSec/95 border-t border-slate-200 dark:border-glass backdrop-blur-xl px-2 py-2 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'dashboard' ? 'text-amber-600 dark:text-primary font-black' : 'text-slate-500 dark:text-text-muted'
            }`}
        >
          <LayoutDashboard size={20} />
          <span className="mt-1">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'menu' ? 'text-amber-600 dark:text-primary font-black' : 'text-slate-500 dark:text-text-muted'
            }`}
        >
          <Utensils size={20} />
          <span className="mt-1">Menu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer relative ${activeTab === 'orders' ? 'text-amber-600 dark:text-primary font-black' : 'text-slate-500 dark:text-text-muted'
            }`}
        >
          <ClipboardList size={20} />
          <span className="mt-1">Orders</span>
          {pendingCount > 0 && (
            <span className="absolute top-1 right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'profile' || activeTab === 'settings' ? 'text-amber-600 dark:text-primary font-black' : 'text-slate-500 dark:text-text-muted'
            }`}
        >
          <User size={20} />
          <span className="mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default RestaurantDashboard;
