import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  Database, 
  UploadCloud, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  Video,
  LayoutDashboard,
  Store,
  ClipboardList,
  Bike,
  Settings,
  User,
  Key,
  Sun,
  Moon,
  Search,
  Edit2,
  Trash2,
  X,
  Menu,
  Clock,
  Shield,
  Layers,
  ChevronRight,
  UserCheck,
  LayoutGrid,
  List,
  ArrowLeft,
  Mail,
  MapPin,
  Eye,
  EyeOff,
  Phone,
  Lock,
  ShieldCheck,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Utensils,
  Package,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { getCurrentUser, clearSession } from '../utils/auth.utils';
import { useAuth } from '../hooks/useAuth';
import { socketService } from '../services/socket.service';
import { AdminDeliveryLocations } from '../components/admin/AdminDeliveryLocations';
import { AdminCMSManager } from '../components/admin/AdminCMSManager';
import { AdminInvitationsManager } from '../components/admin/AdminInvitationsManager';

interface DBItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  rating: number;
  premium: boolean;
}

interface AWSStatus {
  credentialsConfigured: boolean;
  regions: {
    s3Region: string;
    dynamoRegion: string;
  };
  s3BucketConfigured: boolean;
  dynamoTableConfigured: boolean;
}

type AdminTab = 'dashboard' | 'restaurants' | 'orders' | 'delivery' | 'locations' | 'settings' | 'cms' | 'invitations';

interface AdminDashboardProps {
  initialTab?: AdminTab;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Helper to extract tab from URL query params or localStorage
  const getInitialTab = (): AdminTab => {
    const searchParams = new URLSearchParams(location.search);
    const queryTab = searchParams.get('tab');
    const validTabs = ['dashboard', 'restaurants', 'orders', 'delivery', 'locations', 'settings', 'cms', 'invitations'];
    if (queryTab && validTabs.includes(queryTab)) {
      return queryTab as any;
    }
    const stateTab = (location.state as any)?.activeTab;
    if (stateTab && validTabs.includes(stateTab)) {
      return stateTab;
    }
    if (initialTab && validTabs.includes(initialTab)) {
      return initialTab as any;
    }
    const savedTab = localStorage.getItem('admin_active_tab');
    if (savedTab && validTabs.includes(savedTab)) {
      return savedTab as any;
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTabState] = useState<AdminTab>(getInitialTab);

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    localStorage.setItem('admin_active_tab', tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  };

  useEffect(() => {
    if ((location.state as any)?.activeTab) {
      setActiveTab((location.state as any).activeTab);
    }
  }, [location.state]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [resViewMode, setResViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedResProfile, setSelectedResProfile] = useState<any | null>(null);

  // Expandable variants state for single item card display in admin dashboard
  const [expandedAdminItemIds, setExpandedAdminItemIds] = useState<Record<string, boolean>>({});
  const toggleAdminExpandVariants = (itemId: string) => {
    setExpandedAdminItemIds(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Authentication
  const [adminEmail, setAdminEmail] = useState('');

  // Helper to filter out dummy/mock items from legacy localStorage
  const filterOutDummy = (items: any[]) => {
    if (!Array.isArray(items)) return [];
    return items.filter((item: any) => {
      if (!item || typeof item !== 'object') return false;
      const name = (item.name || item.customer || item.customerName || item.restaurantName || '').toLowerCase();
      const id = (item.id || item.orderId || item.restaurantId || '').toLowerCase();
      const isDummy =
        name.includes('victoria') ||
        name.includes('vance') ||
        name.includes('rostova') ||
        name.includes('gilded fork') ||
        name.includes('saffron royal') ||
        name.includes('nippon kaiseki') ||
        id.includes('ord-9824') ||
        id.includes('ord-9825') ||
        id.includes('ord-9826') ||
        id.includes('ord-9827');
      return !isDummy;
    });
  };

  // Core App States initialized cleanly
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [restaurants, setRestaurants] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('admin_restaurants');
      if (saved) {
        const parsed = JSON.parse(saved);
        return filterOutDummy(parsed);
      }
    } catch (e) {
      console.error('Failed to parse admin_restaurants from localStorage:', e);
    }
    return [];
  });

  const [orders, setOrders] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('admin_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        return filterOutDummy(parsed);
      }
    } catch (e) {
      console.error('Failed to parse admin_orders from localStorage:', e);
    }
    return [];
  });

  const [activities, setActivities] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('admin_activities');
      if (saved) {
        const parsed = JSON.parse(saved);
        return filterOutDummy(parsed);
      }
    } catch (e) {
      console.error('Failed to parse admin_activities from localStorage:', e);
    }
    return [];
  });

  // S3 / DynamoDB Original AWS States
  const [dbItems, setDbItems] = useState<DBItem[]>([]);
  const [awsStatus, setAwsStatus] = useState<AWSStatus | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [heroVideos, setHeroVideos] = useState<{
    darkest: string;
    dark_mobile: string;
    lightest: string;
    light_mobile: string;
  } | null>(null);
  const [fetchingVideos, setFetchingVideos] = useState(false);
  const [syncingVideos, setSyncingVideos] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Selected Rider state mapping (for dropdowns)
  const [selectedRiders, setSelectedRiders] = useState<{ [orderId: string]: string }>({});

  // Filter States
  const [resSearch, setResSearch] = useState('');
  
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [expandedAdminOrdersMap, setExpandedAdminOrdersMap] = useState<Record<string, boolean>>({});

  const toggleAdminOrderExpand = (orderId: string) => {
    setExpandedAdminOrdersMap(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const isTodayOrder = (o: any) => {
    if (!o) return true;
    const dateVal = o.createdAt || o.orderedAt || o.createdTime || o.date;
    if (!dateVal) return true;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return true;
    const today = new Date();
    const diffMs = Math.abs(today.getTime() - d.getTime());
    return diffMs <= 48 * 3600 * 1000;
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
    if (it.unit && it.quantity && String(it.unit).trim() !== '') return `${it.quantity} ${it.unit}`;
    if (it.unit && String(it.unit).trim() !== '') return String(it.unit);
    if (it.size) return String(it.size);
    if (it.weight) return String(it.weight);
    return null;
  };

  const filteredOrders = orders.filter(o => {
    const q = orderSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (o.id || o.orderId || '').toLowerCase().includes(q) ||
      (o.customerName || o.customer?.name || '').toLowerCase().includes(q) ||
      (o.customerPhone || o.customer?.phone || '').includes(q) ||
      (o.restaurantName || o.restaurant || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    const statusLower = (o.orderStatus || o.status || '').toString().toLowerCase();
    const isFinalized = statusLower === 'completed' || statusLower === 'delivered' || statusLower === 'rejected' || statusLower === 'cancelled' || statusLower === 'reject';

    if (orderStatusFilter === 'All') {
      return !isFinalized;
    }

    if (orderStatusFilter === 'Completed') {
      return statusLower === 'completed' || statusLower === 'delivered';
    }

    if (orderStatusFilter === 'Rejected') {
      return statusLower === 'rejected' || statusLower === 'cancelled' || statusLower === 'reject';
    }

    if (orderStatusFilter === 'Order History') {
      return true;
    }

    return true;
  });

  const getTabOrderCount = (st: string) => {
    return orders.filter(o => {
      const statusLower = (o.orderStatus || o.status || '').toString().toLowerCase();
      const isFinalized = statusLower === 'completed' || statusLower === 'delivered' || statusLower === 'rejected' || statusLower === 'cancelled' || statusLower === 'reject';

      if (st === 'All') {
        return !isFinalized;
      }
      if (st === 'Completed') {
        return statusLower === 'completed' || statusLower === 'delivered';
      }
      if (st === 'Rejected') {
        return statusLower === 'rejected' || statusLower === 'cancelled' || statusLower === 'reject';
      }
      if (st === 'Order History') {
        return true;
      }
      return true;
    }).length;
  };

  // Restaurant Form States
  const [isResFormOpen, setIsResFormOpen] = useState(false);
  const [editingRes, setEditingRes] = useState<any | null>(null);
  const [isResImageUploading, setIsResImageUploading] = useState(false);
  const [resImageUploadSuccess, setResImageUploadSuccess] = useState(false);
  const [resForm, setResForm] = useState({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    category: 'Gourmet Pizza',
    openingTime: '11:00 AM',
    closingTime: '11:00 PM',
    image: ''
  });
  const [showResPassword, setShowResPassword] = useState(false);
  const [resFormError, setResFormError] = useState<string | null>(null);

  // Settings state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delivery Fee per KM Settings state
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState<number>(15);
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number>(25);
  const [isSavingDeliverySettings, setIsSavingDeliverySettings] = useState(false);
  const [deliverySettingsStatus, setDeliverySettingsStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDeliverySettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/settings`);
      if (res.data.success && res.data.settings) {
        if (typeof res.data.settings.deliveryFeePerKm === 'number') {
          setDeliveryFeePerKm(res.data.settings.deliveryFeePerKm);
        }
        if (typeof res.data.settings.baseDeliveryFee === 'number') {
          setBaseDeliveryFee(res.data.settings.baseDeliveryFee);
        }
      }
    } catch (err) {
      console.warn('Error fetching admin delivery settings:', err);
    }
  };

  const handleSaveDeliverySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDeliverySettings(true);
    setDeliverySettingsStatus(null);
    try {
      const res = await axios.put(`${API_BASE_URL}/admin/settings`, {
        deliveryFeePerKm: Number(deliveryFeePerKm),
        baseDeliveryFee: Number(baseDeliveryFee)
      });
      if (res.data.success) {
        if (res.data.settings) {
          if (typeof res.data.settings.deliveryFeePerKm === 'number') {
            setDeliveryFeePerKm(res.data.settings.deliveryFeePerKm);
          }
          if (typeof res.data.settings.baseDeliveryFee === 'number') {
            setBaseDeliveryFee(res.data.settings.baseDeliveryFee);
          }
        }
        setDeliverySettingsStatus({ type: 'success', message: 'Delivery rate settings updated and saved to DynamoDB successfully!' });
      } else {
        setDeliverySettingsStatus({ type: 'error', message: res.data.error || 'Failed to update settings.' });
      }
    } catch (err: any) {
      setDeliverySettingsStatus({ type: 'error', message: 'Error updating delivery settings.' });
    } finally {
      setIsSavingDeliverySettings(false);
    }
  };

  // Delivery Partner Database Management States
  const [dbDeliveryPartners, setDbDeliveryPartners] = useState<any[]>([]);
  const [isAddPartnerDrawerOpen, setIsAddPartnerDrawerOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    vehicleType: 'Bike',
    vehicleNumber: ''
  });
  const [partnerFormError, setPartnerFormError] = useState<string | null>(null);
  const [isSavingPartner, setIsSavingPartner] = useState(false);

  const fetchDeliveryPartners = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/delivery-partners`);
      if (res.data.success) {
        setDbDeliveryPartners(res.data.deliveryPartners || []);
      }
    } catch (err) {
      console.warn('Error fetching delivery partners from DB:', err);
    }
  };

  const handleSaveDeliveryPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerFormError(null);
    setIsSavingPartner(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/admin/delivery-partners`, partnerForm);
      if (res.data.success) {
        showToast('success', `Registered Delivery Partner "${partnerForm.name}" in database.`);
        setIsAddPartnerDrawerOpen(false);
        setPartnerForm({ name: '', email: '', phone: '', password: '', vehicleType: 'Bike', vehicleNumber: '' });
        fetchDeliveryPartners();
      } else {
        setPartnerFormError(res.data.error || 'Failed to create delivery partner account.');
      }
    } catch (err: any) {
      setPartnerFormError(err.response?.data?.error || 'An error occurred while creating partner.');
    } finally {
      setIsSavingPartner(false);
    }
  };

  const deleteDeliveryPartner = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this Delivery Partner from the database?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/delivery-partners/${id}`);
      showToast('success', 'Delivery Partner removed.');
      fetchDeliveryPartners();
    } catch (err) {
      console.error('Error deleting partner:', err);
    }
  };

  const allDeliveryRiders = Array.from(new Set(
    dbDeliveryPartners
      .map(p => p.name || p.email)
      .filter((name): name is string => Boolean(name && name.trim()))
  ));

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('admin_restaurants', JSON.stringify(restaurants));
  }, [restaurants]);

  useEffect(() => {
    localStorage.setItem('admin_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('admin_activities', JSON.stringify(activities));
  }, [activities]);

  // Helper: Play Synth Beep Alert for Admin Console
  const playAdminOrderBeepSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const playTone = (freq: number, start: number, dur: number) => {
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

        // 3 crisp synth alert beeps (784Hz -> 1046Hz -> 1567Hz)
        playTone(784, 0.0, 0.2);
        playTone(1046.5, 0.22, 0.2);
        playTone(1567.98, 0.44, 0.35);
      }
    } catch (e) {}

    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    if (isLoading) return;
    // Check credentials using unified auth utility
    const activeUser = user || getCurrentUser();
    const activeRole = (activeUser?.role || '').toUpperCase();
    if (!activeUser || activeRole !== 'ADMIN') {
      navigate('/login', { replace: true });
      return;
    }

    setAdminEmail(activeUser.email || '');
    // Join Admin Socket Room
    socketService.joinAdmin();

    // Load original AWS & Admin API data safely
    fetchAdminRestaurants();
    fetchAdminOrders();
    fetchDeliveryPartners();
    fetchDeliverySettings();

    // Real-Time Socket Subscriptions for Admin Dashboard
    const unsubscribeShopCreated = socketService.onShopCreated(() => {
      fetchAdminRestaurants();
    });

    const unsubscribeShopUpdated = socketService.onShopUpdated(() => {
      fetchAdminRestaurants();
    });

    const unsubscribeShopStatus = socketService.onShopStatusUpdated((data: any) => {
      if (data && data.shopId) {
        setRestaurants(prev => prev.map(r => {
          if (r.id === data.shopId || r.shopId === data.shopId || r.restaurantId === data.shopId) {
            return { ...r, isOpen: data.isOpen, status: data.status };
          }
          return r;
        }));
      } else {
        fetchAdminRestaurants();
      }
    });

    const unsubscribeOrderCreated = socketService.onOrderCreated((newOrder: any) => {
      fetchAdminOrders();
      playAdminOrderBeepSound();
    });

    const unsubscribeOrderAssigned = socketService.onOrderAssigned(() => {
      fetchAdminOrders();
      playAdminOrderBeepSound();
    });

    const unsubscribeStatus = socketService.onOrderStatusUpdated((updatedOrder: any) => {
      const targetId = updatedOrder.orderId || updatedOrder.id;
      const nextStatus = updatedOrder.status || updatedOrder.orderStatus;
      
      setOrders(prev => prev.map(o => {
        if (o.id === targetId || (o as any).orderId === targetId) {
          return { ...o, orderStatus: nextStatus, status: nextStatus };
        }
        return o;
      }));
      playAdminOrderBeepSound();
    });

    const unsubscribeRider = socketService.onRiderStatusUpdated((updatedOrder: any) => {
      const targetId = updatedOrder.orderId || updatedOrder.id;
      const nextStatus = updatedOrder.status || updatedOrder.orderStatus;
      
      setOrders(prev => prev.map(o => {
        if (o.id === targetId || (o as any).orderId === targetId) {
          return { ...o, orderStatus: nextStatus, status: nextStatus };
        }
        return o;
      }));
      playAdminOrderBeepSound();
    });

    // Real-Time Delivery Partner Duty Status Listener (ON_DUTY vs OFF_DUTY / OFFLINE)
    const handleDutyUpdate = (data: any) => {
      console.log('⚡ [Socket Event: PARTNER_DUTY_UPDATED]:', data);
      const targetDuty = data.dutyStatus || (data.isOnDuty ? 'ON_DUTY' : 'OFF_DUTY');

      setDbDeliveryPartners(prev => {
        const updated = prev.map(p => {
          const pEmail = (p.email || '').toLowerCase().trim();
          const dEmail = (data.email || '').toLowerCase().trim();
          const pName = (p.name || '').toLowerCase().trim();
          const dName = (data.name || data.userId || '').toLowerCase().trim();
          const pId = (p.id || p.userId || '').toLowerCase().trim();
          const dId = (data.userId || data.id || '').toLowerCase().trim();

          const matches = (dEmail && pEmail === dEmail) || 
                          (dId && (pId === dId || pId.includes(dId) || dId.includes(pId))) ||
                          (dName && (pName === dName || pName.includes(dName))) ||
                          (prev.length === 1);

          if (matches) {
            return { ...p, dutyStatus: targetDuty };
          }
          return p;
        });
        return updated;
      });
    };
    const unsubscribeDuty = socketService.onPartnerDutyUpdated(handleDutyUpdate);

    return () => {
      unsubscribeShopCreated();
      unsubscribeShopUpdated();
      unsubscribeShopStatus();
      unsubscribeOrderCreated();
      unsubscribeOrderAssigned();
      unsubscribeStatus();
      unsubscribeRider();
      unsubscribeDuty();
    };
  }, []);

  async function fetchAdminRestaurants() {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/restaurants`);
      if (response.data.success && Array.isArray(response.data.restaurants)) {
        setRestaurants(response.data.restaurants);
      }
    } catch (err) {
      console.error('Error fetching admin restaurants:', err);
    }
  }

  async function fetchAdminOrders() {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/orders`);
      if (response.data.success && Array.isArray(response.data.orders)) {
        setOrders(response.data.orders);
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    }
  }

  // Original AWS Functions (Unchanged APIs)
  async function fetchHeroVideos() {
    setFetchingVideos(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/hero/videos`);
      if (response.data.success && response.data.urls) {
        const urls = response.data.urls;
        if (urls.darkest.includes('.amazonaws.com')) {
          setHeroVideos(urls);
        } else {
          setHeroVideos(null);
        }
      }
    } catch (error) {
      console.error('Error fetching hero videos:', error);
    } finally {
      setFetchingVideos(false);
    }
  }

  const handleSyncHeroVideos = async () => {
    setSyncingVideos(true);
    setSyncMessage(null);
    setSyncError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/admin/setup-hero-videos`);
      if (response.data.success) {
        setSyncMessage('Background videos uploaded and synced successfully!');
        setHeroVideos(response.data.urls);
        addActivity('sync_videos', 'Hero background videos synced successfully to AWS S3 & DynamoDB.');
      }
    } catch (error: any) {
      console.error('Error syncing background videos:', error);
      setSyncError(
        error.response?.data?.details ||
        error.response?.data?.error ||
        'Failed to setup background videos. Make sure AWS environment variables are set in .env'
      );
    } finally {
      setSyncingVideos(false);
    }
  };

  async function fetchAWSStatus() {
    try {
      const response = await axios.get(`${API_BASE_URL}/aws/status`);
      setAwsStatus(response.data);
    } catch (error) {
      console.error('Error fetching AWS status:', error);
    }
  }

  async function fetchDBItems() {
    setDbLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/db-items`);
      setDbItems(response.data);
    } catch (error) {
      console.error('Error fetching DynamoDB items:', error);
    } finally {
      setDbLoading(false);
    }
  }

  const handleSeedDatabase = async () => {
    setSeeding(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/admin/seed-db`);
      if (response.data.success) {
        fetchDBItems();
        addActivity('seed_db', 'DynamoDB seeded successfully with default gourmet dishes.');
      }
    } catch (error) {
      console.error('Error seeding DynamoDB:', error);
    } finally {
      setSeeding(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setUploadedUrl(null);
      setUploadError(null);
    }
  };

  const handleUploadToS3 = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const response = await axios.post(`${API_BASE_URL}/admin/upload-s3`, {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileData: base64Data,
        });

        if (response.data.success) {
          setUploadedUrl(response.data.fileUrl);
          addActivity('s3_upload', `File "${selectedFile.name}" uploaded to S3 successfully.`);
          setSelectedFile(null);
        }
      } catch (error: any) {
        console.error('Error uploading file:', error);
        setUploadError(
          error.response?.data?.details || 
          error.response?.data?.error || 
          'Failed to upload file to S3. Verify bucket region and settings.'
        );
      } finally {
        setUploading(false);
      }
    };
  };

  // Helper: Add activity log entry
  const addActivity = (type: string, message: string) => {
    const newAct = {
      id: `act-${Date.now()}`,
      type,
      message,
      time: 'Just now'
    };
    setActivities(prev => [newAct, ...prev.slice(0, 19)]);
  };

  // Toast, Logout & Custom Delete Modal States
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [deleteResTarget, setDeleteResTarget] = useState<{ id: string; name: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Vendor Menu & Category Filter state for Admin Profile View (Requirements 3, 4, 5)
  const [vendorMenuItems, setVendorMenuItems] = useState<any[]>([]);
  const [isVendorMenuLoading, setIsVendorMenuLoading] = useState(false);
  const [selectedVendorCategory, setSelectedVendorCategory] = useState<string>('All');

  useEffect(() => {
    if (!selectedResProfile) {
      setVendorMenuItems([]);
      setSelectedVendorCategory('All');
      return;
    }

    const fetchVendorMenu = async () => {
      setIsVendorMenuLoading(true);
      const resId = selectedResProfile.id || selectedResProfile.email;
      try {
        const response = await axios.get(`${API_BASE_URL}/restaurant/menu/${resId}`);
        if (response.data && response.data.success && Array.isArray(response.data.items) && response.data.items.length > 0) {
          setVendorMenuItems(response.data.items);
        } else {
          // Fallback to checking localStorage foodway_menu
          const savedMenu = localStorage.getItem(`foodway_menu_${resId}`) || localStorage.getItem('foodway_menu');
          if (savedMenu) {
            setVendorMenuItems(JSON.parse(savedMenu));
          } else {
            setVendorMenuItems([]);
          }
        }
      } catch (err) {
        console.warn('Error fetching vendor menu from API:', err);
        const savedMenu = localStorage.getItem(`foodway_menu_${resId}`) || localStorage.getItem('foodway_menu');
        if (savedMenu) {
          try { setVendorMenuItems(JSON.parse(savedMenu)); } catch(e) { setVendorMenuItems([]); }
        } else {
          setVendorMenuItems([]);
        }
      } finally {
        setIsVendorMenuLoading(false);
      }
    };

    fetchVendorMenu();
  }, [selectedResProfile]);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Handler: Manage Restaurant Toggle Status
  const toggleRestaurantStatus = async (resId: string) => {
    const resItem = restaurants.find(r => r.id === resId);
    if (!resItem) return;

    const nextIsOpen = resItem.status !== 'active' && resItem.status !== 'open';
    const newStatus = nextIsOpen ? 'active' : 'closed';

    setRestaurants(prev => prev.map(r => r.id === resId ? { ...r, status: newStatus, isOpen: nextIsOpen } : r));

    try {
      await axios.put(`${API_BASE_URL}/restaurant/status/${resId}`, { isOpen: nextIsOpen });
    } catch (e) {
      console.warn('Backend update restaurant status failed:', e);
    }

    addActivity('restaurant_status', `Restaurant "${resItem.name}" status set to ${newStatus.toUpperCase()}.`);
    showToast('info', `Establishment "${resItem.name}" is now ${nextIsOpen ? 'ONLINE / ACTIVE' : 'OFFLINE / CLOSED'}.`);
  };

  // Handler: Delete Restaurant (Opens custom confirmation modal, replaces window.confirm)
  const deleteRestaurant = (resId: string) => {
    const resName = restaurants.find(r => r.id === resId)?.name || 'Restaurant';
    setDeleteResTarget({ id: resId, name: resName });
  };

  // Helper: Generate clean unique Restaurant ID
  const generateUniqueResId = (existingRestaurants: any[]) => {
    const maxNum = existingRestaurants.reduce((max, r) => {
      const match = r.id ? r.id.match(/\d+/) : null;
      const num = match ? parseInt(match[0], 10) : 0;
      return num > max ? num : max;
    }, 0);
    return `RES-${String(maxNum + 1).padStart(3, '0')}`;
  };

  // Handler: Restaurant Image File Upload to S3
  const handleRestaurantImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsResImageUploading(true);
      setResImageUploadSuccess(false);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string;
          const response = await axios.post(`${API_BASE_URL}/admin/upload-s3`, {
            fileName: file.name,
            fileType: file.type,
            fileData: base64Data,
          });

          if (response.data.success && response.data.fileUrl) {
            setResForm(prev => ({ ...prev, image: response.data.fileUrl }));
            setResImageUploadSuccess(true);
            addActivity('s3_upload', `Restaurant image "${file.name}" uploaded to S3 successfully.`);
          }
        } catch (err: any) {
          console.error('Error uploading restaurant image to S3:', err);
          const base64Data = reader.result as string;
          setResForm(prev => ({ ...prev, image: base64Data }));
          setResImageUploadSuccess(false);
        } finally {
          setIsResImageUploading(false);
        }
      };
    }
  };

  // Handler: Save Restaurant (Add or Edit) with DynamoDB persistence
  const saveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setResFormError(null);

    const { name, ownerName, email, phone, password, address, category, openingTime, closingTime, image } = resForm;

    if (!name || !ownerName || !email || !phone || !address || (!editingRes && !password?.trim())) {
      setResFormError(!editingRes && !password?.trim() ? 'Please provide a password for the new restaurant vendor.' : 'Please fill in all required fields.');
      return;
    }

    const defaultImg = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=85';
    const finalImage = image || defaultImg;

    if (editingRes) {
      // Edit mode
      const updatedRes = {
        ...editingRes,
        name,
        ownerName,
        email,
        phone,
        address,
        category,
        openingTime,
        closingTime,
        image: finalImage
      };

      setRestaurants(prev => prev.map(r => r.id === editingRes.id ? updatedRes : r));

      try {
        await axios.post(`${API_BASE_URL}/admin/restaurant`, updatedRes);
        showToast('success', `Updated shop "${name}" details in DynamoDB.`);
      } catch (err) {
        console.warn('Could not persist updated restaurant to DynamoDB API:', err);
      }

      addActivity('restaurant_edited', `Restaurant "${name}" details updated and saved.`);
    } else {
      // Add mode
      const autoId = generateUniqueResId(restaurants);
      const newRes = {
        id: autoId,
        name,
        ownerName,
        email,
        phone,
        password,
        address,
        category,
        openingTime,
        closingTime,
        status: 'active',
        image: finalImage,
        createdAt: new Date().toISOString()
      };

      setRestaurants(prev => [newRes, ...prev]);

      try {
        const resp = await axios.post(`${API_BASE_URL}/admin/restaurant`, newRes);
        if (resp.data.storedInDynamoDB) {
          addActivity('restaurant_added', `Restaurant "${name}" (${autoId}) saved to DynamoDB with S3 Image URL!`);
        } else {
          addActivity('restaurant_added', `Restaurant "${name}" (${autoId}) created successfully.`);
        }
      } catch (err) {
        console.warn('Could not persist new restaurant to DynamoDB API:', err);
        addActivity('restaurant_added', `Restaurant "${name}" (${autoId}) created successfully.`);
      }
    }

    setIsResFormOpen(false);
    setEditingRes(null);
    clearResForm();
  };

  const clearResForm = () => {
    setResImageUploadSuccess(false);
    setResForm({
      name: '',
      ownerName: '',
      email: '',
      phone: '',
      password: '',
      address: '',
      category: 'Gourmet Pizza',
      openingTime: '11:00 AM',
      closingTime: '11:00 PM',
      image: ''
    });
    setResFormError(null);
  };

  // Handler: Assign Delivery Boy / Rider to Order
  const handleAssignRider = async (orderId: string, riderName?: string) => {
    const targetRider = riderName || selectedRiders[orderId];
    if (!targetRider) return;

    setOrders(prev => prev.map(o => {
      if (o.id === orderId || (o as any).orderId === orderId) {
        return { 
          ...o, 
          assignedRider: targetRider,
          assignmentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return o;
    }));

    try {
      await axios.put(`${API_BASE_URL}/admin/orders/${orderId}/assign-rider`, { assignedRider: targetRider });
      showToast('success', `Assigned delivery partner "${targetRider}" to Order #${orderId}.`);
      addActivity('order_assigned', `Order #${orderId} assigned to delivery partner "${targetRider}".`);
    } catch (e) {
      console.error('Error assigning rider to order:', e);
    }
  };

  // Handler: Admin Password Change mock
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'All password fields are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setPasswordStatus({ type: 'success', message: 'Administrator password updated successfully.' });
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    clearSession();
    localStorage.removeItem('adminAuth');
    sessionStorage.removeItem('adminAuth');
    logout();
    navigate('/login', { replace: true });
  };

  // Analytics helper calculations
  const totalRestaurants = restaurants.filter(r => r && typeof r === 'object').length;
  const activeRestaurants = restaurants.filter(r => r && typeof r === 'object' && ((r.status || '').toLowerCase() === 'active' || (r.status || '').toLowerCase() === 'open' || r.isOpen === true)).length;
  const totalOrdersToday = orders.filter(o => o && typeof o === 'object').length;
  const pendingOrders = orders.filter(o => o && typeof o === 'object' && (o.orderStatus || o.status || '').toLowerCase() === 'pending').length;
  const ordersInDelivery = orders.filter(o => o && typeof o === 'object' && ['assigned', 'out for delivery', 'in transit', 'picked up'].includes((o.orderStatus || o.status || '').toLowerCase())).length;
  const completedOrders = orders.filter(o => o && typeof o === 'object' && ['delivered', 'completed'].includes((o.orderStatus || o.status || '').toLowerCase())).length;

  // Filter Restaurants
  const filteredRestaurants = restaurants.filter(r => {
    if (!r || typeof r !== 'object') return false;
    const q = (resSearch || '').toLowerCase();
    return (r?.name || '').toLowerCase().includes(q) || 
           (r?.ownerName || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen lg:h-screen bg-bg-dark text-text-primary flex flex-col lg:flex-row font-sans relative lg:overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-[10%] left-[20%] w-[550px] h-[550px] rounded-full bg-primary/5 blur-[150px] pointer-events-none animate-pulse-slow z-0" />
      <div className="absolute bottom-[10%] right-[10%] w-[550px] h-[550px] rounded-full bg-accent/5 blur-[150px] pointer-events-none z-0" />

      {/* Hamburger header for mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#090B10]/95 text-slate-900 dark:text-white border-b border-slate-200 dark:border-glass backdrop-blur-xl flex items-center justify-between px-4 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpeg" alt="Logo" className="w-8 h-8 rounded-xl object-cover border border-primary/40 shadow-2xs" />
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-primary block">PLATFORM ADMIN</span>
            <span className="font-display font-black text-xs tracking-tight text-slate-900 dark:text-text-primary block">MK CONSOLE</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-text-secondary hover:text-primary transition-colors border border-slate-200 dark:border-glass rounded-xl bg-slate-100 dark:bg-glass cursor-pointer"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => handleLogout()}
            className="p-2 text-rose-500 hover:text-rose-600 transition-colors border border-rose-500/30 rounded-xl bg-rose-500/10 cursor-pointer"
            title="Logout Admin Console"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Admin Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0D0F17]/95 text-slate-900 dark:text-white backdrop-blur-2xl border-t border-slate-200 dark:border-glass px-2 py-1.5 shadow-[0_-4px_25px_rgba(0,0,0,0.15)] flex items-center justify-around">
        {[
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'restaurants', label: 'Shops', icon: Store },
          { id: 'orders', label: 'Orders', icon: ClipboardList },
          { id: 'delivery', label: 'Delivery', icon: Bike },
          { id: 'locations', label: 'Locations', icon: MapPin },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 cursor-pointer relative ${isActive
                  ? 'text-primary font-black scale-105'
                  : 'text-text-muted hover:text-text-primary'
                }`}
              aria-label={item.label}
            >
              <Icon size={20} className={isActive ? 'text-primary stroke-[2.5]' : ''} />
              <span className="text-[9.5px] font-extrabold mt-0.5 tracking-tight truncate max-w-[56px]">
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="adminBottomTabUnderline"
                  className="absolute -bottom-1 w-5 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(197,147,99,0.6)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Desktop Sidebar Navigation */}
      <aside 
        data-lenis-prevent
        className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-bg-dark/95 backdrop-blur-xl border-r border-glass z-40 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen flex-col justify-between shrink-0 shadow-2xl"
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-glass flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="MK Delivery" className="w-10 h-10 rounded-xl border border-primary/20 object-cover shadow-sm" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary block">MK DELIVERY</span>
              <h2 className="text-sm font-black font-display tracking-tight text-text-primary truncate w-36">
                Admin Console
              </h2>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-text-muted hover:text-primary transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-primary text-bg-dark shadow-luxury font-black'
                : 'text-text-secondary hover:bg-glass hover:text-primary'
            }`}
          >
            <LayoutDashboard size={16} className="shrink-0" />
            <span className="truncate text-left font-bold">Dashboard</span>
          </button>

          <button
            onClick={() => { setActiveTab('restaurants'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-200 ${
              activeTab === 'restaurants'
                ? 'bg-primary text-bg-dark shadow-luxury font-black'
                : 'text-text-secondary hover:bg-glass hover:text-primary'
            }`}
          >
            <Store size={16} className="shrink-0" />
            <span className="truncate text-left font-bold">Shops & Stores</span>
          </button>

          <button
            onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-200 ${
              activeTab === 'orders'
                ? 'bg-primary text-bg-dark shadow-luxury font-black'
                : 'text-text-secondary hover:bg-glass hover:text-primary'
            }`}
          >
            <ClipboardList size={16} className="shrink-0" />
            <span className="truncate text-left font-bold">Orders</span>
          </button>

          <button
            onClick={() => { setActiveTab('delivery'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-200 ${
              activeTab === 'delivery'
                ? 'bg-primary text-bg-dark shadow-luxury font-black'
                : 'text-text-secondary hover:bg-glass hover:text-primary'
            }`}
          >
            <Bike size={16} className="shrink-0" />
            <span className="truncate text-left font-bold">Delivery</span>
          </button>

          <button
            onClick={() => { setActiveTab('locations'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-200 ${
              activeTab === 'locations'
                ? 'bg-primary text-bg-dark shadow-luxury font-black'
                : 'text-text-secondary hover:bg-glass hover:text-primary'
            }`}
          >
            <MapPin size={16} className="shrink-0" />
            <span className="truncate text-left font-bold">Delivery Locations</span>
          </button>

          <button
            onClick={() => { setActiveTab('cms'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-200 ${
              activeTab === 'cms'
                ? 'bg-primary text-bg-dark shadow-luxury font-black'
                : 'text-text-secondary hover:bg-glass hover:text-primary'
            }`}
          >
            <Layers size={16} className="shrink-0" />
            <span className="truncate text-left font-bold">Website CMS</span>
          </button>

          <button
            onClick={() => { setActiveTab('invitations'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-200 ${
              activeTab === 'invitations'
                ? 'bg-primary text-bg-dark shadow-luxury font-black'
                : 'text-text-secondary hover:bg-glass hover:text-primary'
            }`}
          >
            <Mail size={16} className="shrink-0" />
            <span className="truncate text-left font-bold">Invitations Requests</span>
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-primary text-bg-dark shadow-luxury font-black'
                : 'text-text-secondary hover:bg-glass hover:text-primary'
            }`}
          >
            <Settings size={16} className="shrink-0" />
            <span className="truncate text-left font-bold">Settings</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-glass space-y-3">
          <div className="p-3 rounded-xl bg-glass-subtle/50 border border-glass flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                A
              </div>
              <div className="truncate">
                <span className="text-[11px] font-bold block text-text-primary truncate">Admin User</span>
                <span className="text-[9px] text-text-muted block truncate font-mono">{adminEmail}</span>
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
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        data-lenis-prevent
        className="flex-grow min-w-0 min-h-screen lg:h-screen pt-20 lg:pt-10 px-4 md:px-8 pb-28 lg:pb-10 z-10 relative lg:overflow-y-auto max-w-7xl mx-auto w-full"
      >
        <ErrorBoundary>
          {/* ==================================================== */}
          {/* DASHBOARD TAB */}
          {/* ==================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 border-b-0">
              {/* Header info */}
              <div>
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
                  <span>MK Premium Concierge Live</span>
                </div>
                <h1 className="text-3xl font-black font-display text-primary tracking-tight">Overview Analytics</h1>
              </div>

              {/* Analytics Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                
                {/* Card 1: Total Restaurants */}
                <div className="glass-panel border border-glass rounded-xl p-5 flex flex-col justify-between h-[125px] hover:border-primary/40 hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-widest leading-none">Total Restaurants</span>
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                      <Store size={14} />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-3xl font-black font-display text-text-primary tracking-tight leading-none mb-1">{totalRestaurants}</h3>
                    <span className="text-[9px] text-text-muted font-bold tracking-wider uppercase">Registered</span>
                  </div>
                </div>

                {/* Card 2: Active Brands */}
                <div className="glass-panel border border-glass rounded-xl p-5 flex flex-col justify-between h-[125px] hover:border-success/40 hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-widest leading-none">Active Brands</span>
                    <div className="p-1.5 rounded-lg bg-success/10 text-success group-hover:bg-success/20 group-hover:scale-110 transition-all duration-300">
                      <Shield size={14} />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-3xl font-black font-display text-success tracking-tight leading-none mb-1">{activeRestaurants}</h3>
                    <span className="text-[9px] text-text-muted font-bold tracking-wider uppercase">Accepting Orders</span>
                  </div>
                </div>

                {/* Card 3: Total Orders Today */}
                <div className="glass-panel border border-glass rounded-xl p-5 flex flex-col justify-between h-[125px] hover:border-primary/40 hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-widest leading-none">Orders Today</span>
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                      <ClipboardList size={14} />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-3xl font-black font-display text-text-primary tracking-tight leading-none mb-1">{totalOrdersToday}</h3>
                    <span className="text-[9px] text-text-muted font-bold tracking-wider uppercase">Logged Today</span>
                  </div>
                </div>

                {/* Card 4: Pending Action */}
                <div className="glass-panel border border-glass rounded-xl p-5 flex flex-col justify-between h-[125px] hover:border-warning/40 hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-widest leading-none">Pending Action</span>
                    <div className="p-1.5 rounded-lg bg-warning/10 text-warning group-hover:bg-warning/20 group-hover:scale-110 transition-all duration-300">
                      <Clock size={14} />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-3xl font-black font-display text-warning tracking-tight leading-none mb-1">{pendingOrders}</h3>
                    <span className="text-[9px] text-text-muted font-bold tracking-wider uppercase">Waiting Action</span>
                  </div>
                </div>

                {/* Card 5: Active In-Delivery */}
                <div className="glass-panel border border-glass rounded-xl p-5 flex flex-col justify-between h-[125px] hover:border-primary/40 hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-widest leading-none">In-Delivery</span>
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                      <Bike size={14} />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-3xl font-black font-display text-primary tracking-tight leading-none mb-1">{ordersInDelivery}</h3>
                    <span className="text-[9px] text-text-muted font-bold tracking-wider uppercase">In Transit</span>
                  </div>
                </div>

                {/* Card 6: Completed Deliveries */}
                <div className="glass-panel border border-glass rounded-xl p-5 flex flex-col justify-between h-[125px] hover:border-success/40 hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-widest leading-none">Completed</span>
                    <div className="p-1.5 rounded-lg bg-success/10 text-success group-hover:bg-success/20 group-hover:scale-110 transition-all duration-300">
                      <UserCheck size={14} />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-3xl font-black font-display text-success tracking-tight leading-none mb-1">{completedOrders}</h3>
                    <span className="text-[9px] text-text-muted font-bold tracking-wider uppercase">Closed Safely</span>
                  </div>
                </div>
              </div>

              {/* Bottom Section Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Latest Orders Panel (2/3 width) */}
                <div className="xl:col-span-2 space-y-4">
                  <div className="glass-panel border border-glass rounded-xl p-6 shadow-luxury">
                    <div className="flex items-center justify-between border-b border-glass pb-4 mb-4">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="text-primary" size={18} />
                        <h2 className="text-base font-bold font-display">Latest Active Orders</h2>
                      </div>
                      <button 
                        onClick={() => setActiveTab('orders')}
                        className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary-dark transition-colors flex items-center gap-1.5"
                      >
                        <span>Manage All</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>

                    {orders.length === 0 ? (
                      <div className="py-12 border border-dashed border-glass rounded-xl text-center text-text-muted text-xs">
                        No active orders logged on system.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-glass text-text-muted font-bold tracking-wider uppercase text-[10px]">
                              <th className="pb-3 font-semibold">Order ID</th>
                              <th className="pb-3 font-semibold">Customer</th>
                              <th className="pb-3 font-semibold">Establishment</th>
                              <th className="pb-3 font-semibold">Rider</th>
                              <th className="pb-3 font-semibold">Status</th>
                              <th className="pb-3 font-semibold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-glass font-medium">
                            {orders.slice(0, 5).map((order) => (
                              <tr key={order.id} className="hover:bg-glass-subtle transition-colors">
                                <td className="py-3.5 pr-2 font-mono font-bold text-primary">{order.id}</td>
                                <td className="py-3.5 pr-2">
                                  <div className="text-text-primary text-[12px]">{order.customer?.name || 'Guest'}</div>
                                  <span className="text-[10px] text-text-muted">{order.customer?.phone || 'N/A'}</span>
                                </td>
                                <td className="py-3.5 pr-2 text-text-secondary">{order.restaurant}</td>
                                <td className="py-3.5 pr-2 text-text-muted text-[11px]">
                                  {order.assignedRider ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Bike size={11} className="text-primary" />
                                      {order.assignedRider}
                                    </span>
                                  ) : (
                                    <span className="text-warning/80">Unassigned</span>
                                  )}
                                </td>
                                <td className="py-3.5 pr-2">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border tracking-wider ${
                                    order.orderStatus === 'delivered' ? 'bg-success/15 border-success/30 text-success' :
                                    order.orderStatus === 'cancelled' ? 'bg-error/15 border-error/30 text-error' :
                                    order.orderStatus === 'pending' ? 'bg-warning/15 border-warning/30 text-warning' :
                                    'bg-primary/10 border-primary/20 text-primary'
                                  }`}>
                                    {order.orderStatus}
                                  </span>
                                </td>
                                <td className="py-3.5 text-right">
                                  <button
                                    onClick={() => setActiveTab('orders')}
                                    className="px-3 py-1 rounded bg-glass border border-glass hover:border-primary/30 hover:bg-glass-subtle transition-all text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-primary"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activity Panel (1/3 width) */}
                <div className="space-y-4">
                  <div className="glass-panel border border-glass rounded-xl p-6 shadow-luxury">
                    <div className="flex items-center gap-2 border-b border-glass pb-4 mb-4">
                      <Activity className="text-primary" size={18} />
                      <h2 className="text-base font-bold font-display">Recent Activities</h2>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {activities.map((act) => (
                        <div key={act.id} className="flex gap-3 text-xs leading-relaxed border-b border-glass/30 pb-3 last:border-b-0 last:pb-0">
                          <div className="mt-0.5 shrink-0">
                            {act.type === 'restaurant_added' && <Store size={14} className="text-primary" />}
                            {act.type === 'order_assigned' && <Bike size={14} className="text-accent" />}
                            {act.type === 'order_delivered' && <CheckCircle size={14} className="text-success" />}
                            {act.type === 'restaurant_status' && <Shield size={14} className="text-primary" />}
                            {act.type === 'order_status' && <ClipboardList size={14} className="text-primary" />}
                            {act.type === 's3_upload' && <UploadCloud size={14} className="text-success" />}
                            {act.type === 'sync_videos' && <Video size={14} className="text-primary" />}
                            {act.type === 'seed_db' && <Database size={14} className="text-primary" />}
                            {!['restaurant_added', 'order_assigned', 'order_delivered', 'restaurant_status', 'order_status', 's3_upload', 'sync_videos', 'seed_db'].includes(act.type) && (
                              <Activity size={14} className="text-text-muted" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-text-secondary leading-snug">{act.message}</p>
                            <span className="text-[10px] text-text-muted mt-1 block font-medium">{act.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* ==================================================== */}
        {/* RESTAURANTS TAB */}
        {/* ==================================================== */}
        {activeTab === 'restaurants' && (
          selectedResProfile ? (
            <div className="space-y-8 animate-fadeIn">
              {/* Back navigation header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  onClick={() => setSelectedResProfile(null)}
                  className="self-start flex items-center gap-2 px-4 py-2.5 rounded-lg border border-glass bg-glass hover:bg-glass-subtle hover:text-primary font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Establishments</span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setResForm(selectedResProfile); setEditingRes(selectedResProfile); setIsResFormOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-glass bg-glass hover:bg-glass-subtle hover:text-primary font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    <Edit2 size={14} />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>

              {/* Profile cover banner */}
              <div className="glass-panel border border-glass rounded-2xl overflow-hidden shadow-luxury relative">
                <div className="h-44 md:h-56 w-full relative overflow-hidden bg-bg-darkSec/35">
                  {/* Blurry cover background */}
                  <img 
                    src={selectedResProfile.image} 
                    alt={selectedResProfile.name} 
                    className="absolute inset-0 w-full h-full object-cover filter blur-md opacity-30 scale-105"
                  />
                  {/* Clean center graphic */}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-dark to-transparent opacity-80" />
                </div>
                
                <div className="px-6 pb-6 pt-0 flex flex-col sm:flex-row gap-5 items-start sm:items-end -mt-12 md:-mt-16 relative z-10">
                  <img
                    src={selectedResProfile.image}
                    alt={selectedResProfile.name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-glass shadow-luxury bg-bg-dark shrink-0"
                  />
                  <div className="min-w-0 flex-grow pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl md:text-3xl font-black font-display text-text-primary tracking-tight">{selectedResProfile.name}</h2>
                    </div>
                    <p className="text-[10px] text-text-muted mt-1.5 font-semibold flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} className="text-primary" />
                        {selectedResProfile.address}
                      </span>
                    </p>
                  </div>
                  <div className="pb-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border tracking-wider ${
                      selectedResProfile.status === 'active' ? 'bg-success/15 border-success/30 text-success' : 'bg-error/15 border-error/30 text-error'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedResProfile.status === 'active' ? 'bg-success animate-pulse' : 'bg-error'}`} />
                      {selectedResProfile.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile statistics cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="glass-panel border border-glass rounded-xl p-5 flex items-center gap-4 hover:border-primary/20 transition-all duration-300 shadow-sm">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">Total Orders</span>
                    <h4 className="text-xl font-black text-text-primary mt-0.5">
                      {orders.filter(o => o.restaurant.toLowerCase() === selectedResProfile.name.toLowerCase()).length}
                    </h4>
                  </div>
                </div>

                <div className="glass-panel border border-glass rounded-xl p-5 flex items-center gap-4 hover:border-success/20 transition-all duration-300 shadow-sm">
                  <div className="p-3 rounded-lg bg-success/10 text-success font-black flex items-center justify-center w-11 h-11 text-base">
                    $
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">Total Revenue</span>
                    <h4 className="text-xl font-black text-success mt-0.5 font-display">
                      ${orders.filter(o => o.restaurant.toLowerCase() === selectedResProfile.name.toLowerCase()).reduce((acc, o) => acc + (o.total || 0), 0).toFixed(2)}
                    </h4>
                  </div>
                </div>

                <div className="glass-panel border border-glass rounded-xl p-5 flex items-center gap-4 hover:border-warning/20 transition-all duration-300 shadow-sm">
                  <div className="p-3 rounded-lg bg-warning/10 text-warning">
                    <Clock size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">Active / Pending</span>
                    <h4 className="text-xl font-black text-warning mt-0.5">
                      {orders.filter(o => o.restaurant.toLowerCase() === selectedResProfile.name.toLowerCase() && (o.orderStatus === 'pending' || o.orderStatus === 'accepted' || o.orderStatus === 'preparing' || o.orderStatus === 'ready')).length}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Two Column details layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Side: Owner & Address info (1/3) */}
                <div className="space-y-6">
                  <div className="glass-panel border border-glass rounded-xl p-6 shadow-sm space-y-5">
                    <h3 className="text-sm font-bold font-display text-text-primary border-b border-glass pb-3">Establishment Information</h3>
                    
                    <div className="space-y-4 text-xs font-semibold text-text-secondary">
                      <div className="space-y-1">
                        <span className="text-[9px] text-text-muted uppercase tracking-wider block">Manager/Owner:</span>
                        <p className="text-text-primary font-bold text-sm">{selectedResProfile.ownerName}</p>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] text-text-muted uppercase tracking-wider block">Contact Information:</span>
                        <div className="flex items-center gap-2 text-text-muted">
                          <Mail size={13} className="text-primary" />
                          <span className="text-[11px] truncate">{selectedResProfile.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-text-muted mt-1">
                          <Bike size={13} className="text-primary" />
                          <span className="text-[11px]">{selectedResProfile.phone}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] text-text-muted uppercase tracking-wider block">Gourmet Address:</span>
                        <p className="text-text-secondary leading-relaxed font-medium">{selectedResProfile.address}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Dishes list & Recent Orders (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Gourmet Menu Selections with Dynamic Vendor Category Filter (Requirements 3, 4, 5, 6) */}
                  <div className="glass-panel border border-glass rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-glass pb-3">
                      <h3 className="text-sm font-bold font-display text-text-primary">Gourmet Menu Selections</h3>
                      
                      {/* Dynamic Category Dropdown (Requirements 3 & 5) */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Select Category:</span>
                        <select
                          value={selectedVendorCategory}
                          onChange={(e) => setSelectedVendorCategory(e.target.value)}
                          className="py-1.5 px-3 text-xs font-bold rounded-lg bg-bg-dark border border-glass text-text-secondary outline-none focus:border-primary/40 cursor-pointer"
                        >
                          {['All', ...Array.from(new Set(vendorMenuItems.map(item => item.category || 'General').filter(Boolean)))].map((cat: any) => (
                            <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {isVendorMenuLoading ? (
                      <div className="py-8 text-center text-xs font-bold text-text-muted">Fetching real vendor menu...</div>
                    ) : vendorMenuItems.length === 0 ? (
                      <div className="py-8 text-center text-xs font-bold text-text-muted italic border border-dashed border-glass rounded-lg">
                        No vendor menu products found for this establishment.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {vendorMenuItems
                          .filter(dish => selectedVendorCategory === 'All' || (dish.category || '').toLowerCase() === selectedVendorCategory.toLowerCase())
                          .map(dish => (
                            <div key={dish.id} className="flex gap-4 p-3.5 rounded-xl border border-glass/40 bg-glass-subtle/50 hover:border-primary/20 transition-all">
                              <img
                                src={dish.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80'}
                                alt={dish.name}
                                className="w-16 h-16 rounded-lg object-cover border border-glass shrink-0 shadow-sm"
                              />
                              <div className="min-w-0 flex-grow flex flex-col justify-between">
                                <div>
                                  <div className="flex justify-between items-start gap-1">
                                    <h4 className="text-xs font-bold text-text-primary truncate">{dish.name}</h4>
                                    {/* Availability Badge (Requirement 6) */}
                                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                                      dish.isAvailable !== false && dish.status !== 'disabled' 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                    }`}>
                                      {dish.isAvailable !== false && dish.status !== 'disabled' ? 'Available' : 'Out of Stock'}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-text-muted mt-0.5 line-clamp-2 leading-relaxed font-semibold">
                                    {dish.description || 'Vendor Menu Product'}
                                  </p>
                                  
                                  {/* Variant expand button if item has variants */}
                                  {dish.variants && dish.variants.length > 0 && (
                                    <div className="mt-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleAdminExpandVariants(dish.id)}
                                        className="w-full flex items-center justify-between px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold transition-all cursor-pointer"
                                      >
                                        <span>{dish.variants.length} Variants Available</span>
                                        <span>{expandedAdminItemIds[dish.id] ? '▲' : '▼'}</span>
                                      </button>

                                      {expandedAdminItemIds[dish.id] && (
                                        <div className="mt-1.5 p-2 rounded-lg bg-bg-dark/90 border border-glass space-y-1">
                                          {dish.variants.map((v: any, vIdx: number) => (
                                            <div key={v.id || vIdx} className="flex items-center justify-between text-[10px] text-text-secondary border-b border-glass/30 last:border-0 py-0.5">
                                              <span>{v.label || `${v.quantity} ${v.unit}`}</span>
                                              <span className="font-extrabold text-primary">₹{Number(v.price).toFixed(2)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex justify-between items-center mt-2.5">
                                  {/* Price in ₹ (Requirement 6) */}
                                  <span className="text-xs font-black font-display text-primary">
                                    ₹{(dish.price || 0).toFixed(2)}
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    {/* Category Name (Requirement 6) */}
                                    <span className="text-[8px] font-bold text-text-muted uppercase bg-glass px-1.5 py-0.5 rounded border border-glass">
                                      {dish.category || 'General'}
                                    </span>

                                    {/* Veg / Non-Veg badge (Requirement 6) */}
                                    {(dish.isVeg !== undefined || dish.type) && (
                                      <span className={`text-[8px] font-extrabold uppercase px-1 py-0.5 rounded border ${
                                        dish.isVeg || dish.type === 'veg' ? 'bg-success/10 border-success/20 text-success' : 'bg-error/10 border-error/20 text-error'
                                      }`}>
                                        {dish.isVeg || dish.type === 'veg' ? 'Veg' : 'Non-Veg'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent orders */}
                  <div className="glass-panel border border-glass rounded-xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold font-display text-text-primary border-b border-glass pb-3">Recent Orders Log</h3>
                    
                    {orders.filter(o => o.restaurant.toLowerCase() === selectedResProfile.name.toLowerCase()).length === 0 ? (
                      <p className="text-[10px] text-text-muted italic py-4 text-center">No orders logged from this establishment yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-glass text-text-muted font-bold tracking-wider uppercase text-[9px]">
                              <th className="pb-2">Order ID</th>
                              <th className="pb-2">Customer</th>
                              <th className="pb-2">Rider</th>
                              <th className="pb-2">Status</th>
                              <th className="pb-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="font-semibold text-text-secondary">
                            {orders.filter(o => o.restaurant.toLowerCase() === selectedResProfile.name.toLowerCase()).slice(0, 4).map(o => (
                              <tr key={o.id} className="border-b border-glass/30 last:border-b-0">
                                <td className="py-2.5 font-mono text-primary text-[10px]">{o.id}</td>
                                <td className="py-2.5 text-[11px]">{o.customer?.name || 'Guest'}</td>
                                <td className="py-2.5 text-[10px] text-text-muted">{o.assignedRider || 'Unassigned'}</td>
                                <td className="py-2.5">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border tracking-wider ${
                                    o.orderStatus === 'delivered' ? 'bg-success/15 border-success/30 text-success' :
                                    o.orderStatus === 'cancelled' ? 'bg-error/15 border-error/30 text-error' :
                                    o.orderStatus === 'pending' ? 'bg-warning/15 border-warning/30 text-warning' :
                                    'bg-primary/10 border-primary/20 text-primary'
                                  }`}>
                                    {o.orderStatus}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right font-black font-display text-primary text-[11px]">${(o.total || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          ) : isResFormOpen ? (
            <div className="space-y-8 animate-fadeIn w-full">
              {/* Single Full-Width Glass Panel combining header, back button, and form */}
              <div className="glass-panel border border-glass rounded-2xl p-6 md:p-10 shadow-luxury w-full">
                {/* Header section with title on left and Back button on right */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-6 mb-8">
                  <div>
                    <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Shop Onboarding</span>
                    <h2 className="text-2xl md:text-3xl font-black font-display text-primary tracking-tight">
                      {editingRes ? 'Edit Shop / Store Profile' : 'Add New Merchant Shop / Store'}
                    </h2>
                    <p className="text-xs text-text-muted mt-1">Provide the required shop credentials and store details below.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsResFormOpen(false); setEditingRes(null); clearResForm(); }}
                    className="self-start sm:self-auto flex items-center gap-2 px-5 py-3 rounded-xl border border-glass bg-glass hover:bg-glass-subtle hover:text-primary font-bold text-xs uppercase tracking-wider transition-all duration-300"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Shops & Stores</span>
                  </button>
                </div>

                {resFormError && (
                  <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-semibold mb-6 flex gap-2.5 items-center">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{resFormError}</span>
                  </div>
                )}

                <form onSubmit={saveRestaurant} className="space-y-6 text-xs font-semibold text-text-secondary w-full">
                  {/* Auto-Generated Unique Shop ID Banner */}
                  <div className="p-4 rounded-xl bg-glass-subtle/50 border border-glass flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-text-muted block">Shop ID (Auto-Generated)</span>
                      <span className="text-sm font-mono font-black text-primary tracking-wider mt-0.5 block">
                        {editingRes ? editingRes.id : generateUniqueResId(restaurants)}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase bg-primary/10 border border-primary/20 text-primary">
                      {editingRes ? 'Existing Record' : 'System Assigned'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Shop / Store Name *</label>
                      <input
                        type="text"
                        required
                        value={resForm.name}
                        onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
                        placeholder="e.g. Vijaya Durga Sweets & Bakery"
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all placeholder-text-muted/40 font-medium text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Owner Full Name *</label>
                      <input
                        type="text"
                        required
                        value={resForm.ownerName}
                        onChange={(e) => setResForm({ ...resForm, ownerName: e.target.value })}
                        placeholder="e.g. Jean-Luc"
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all placeholder-text-muted/40 font-medium text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={resForm.email}
                        onChange={(e) => setResForm({ ...resForm, email: e.target.value })}
                        placeholder="e.g. contact@fork.com"
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all placeholder-text-muted/40 font-medium text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Phone Number *</label>
                      <input
                        type="text"
                        required
                        value={resForm.phone}
                        onChange={(e) => setResForm({ ...resForm, phone: e.target.value })}
                        placeholder="e.g. +1 555-0100"
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all placeholder-text-muted/40 font-medium text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {!editingRes ? (
                      <div>
                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Access Password *</label>
                        <div className="relative">
                          <input
                            type={showResPassword ? 'text' : 'password'}
                            required
                            value={resForm.password}
                            onChange={(e) => setResForm({ ...resForm, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 pr-10 rounded-xl outline-none transition-all placeholder-text-muted/40 font-medium text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowResPassword(!showResPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors cursor-pointer"
                          >
                            {showResPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className={!editingRes ? '' : 'md:col-span-2'}>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Physical Address *</label>
                      <input
                        type="text"
                        required
                        value={resForm.address}
                        onChange={(e) => setResForm({ ...resForm, address: e.target.value })}
                        placeholder="e.g. 45 Rue de l'Étoile, Paris"
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all placeholder-text-muted/40 font-medium text-sm"
                      />
                    </div>
                  </div>

                  {/* Establishment Cover Image with S3 upload */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">Establishment Cover Image (S3 Upload / URL)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="md:col-span-2 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border border-glass bg-glass-subtle hover:bg-glass hover:text-primary transition-all text-xs font-bold shrink-0">
                            <UploadCloud size={16} />
                            <span>{isResImageUploading ? 'Uploading to S3...' : 'Upload Image File'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleRestaurantImageFileChange}
                              disabled={isResImageUploading}
                            />
                          </label>
                          {resImageUploadSuccess && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-md">
                              <CheckCircle size={12} />
                              Stored in S3
                            </span>
                          )}
                        </div>

                        <input
                          type="text"
                          value={resForm.image}
                          onChange={(e) => setResForm({ ...resForm, image: e.target.value })}
                          placeholder="Or paste S3 / Web image URL (https://...)"
                          className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all placeholder-text-muted/40 font-medium text-sm"
                        />
                      </div>

                      {/* Image Preview Card */}
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-glass/60 bg-bg-dark/40">
                        {resForm.image ? (
                          <img
                            src={resForm.image}
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
                          <span className="text-[10px] text-text-secondary truncate block font-mono mt-0.5" title={resForm.image}>
                            {resForm.image ? (resForm.image.startsWith('data:') ? 'Local Image File' : resForm.image) : 'Default fallback image will be used.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-glass flex flex-col sm:flex-row gap-4 justify-end">
                    <button
                      type="button"
                      onClick={() => { setIsResFormOpen(false); setEditingRes(null); clearResForm(); }}
                      className="px-6 py-3 rounded-xl border border-glass bg-glass-subtle hover:bg-glass text-xs font-bold transition-all uppercase tracking-wider text-text-secondary order-2 sm:order-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 bg-primary hover:bg-primary-dark text-bg-dark font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-lg transition-all order-1 sm:order-2"
                    >
                      Save Details
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1.5 block">Merchant Partners & Stores</span>
                  <h1 className="text-3xl font-black font-display text-primary tracking-tight">Manage Merchant Shops & Stores</h1>
                </div>
                <button
                  onClick={() => { clearResForm(); setEditingRes(null); setIsResFormOpen(true); }}
                  className="self-start sm:self-auto flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-bg-dark font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <PlusCircle size={16} />
                  <span>Add Shop / Store</span>
                </button>
              </div>

              {/* Filter Controls Bar */}
              <div className="glass-panel border border-glass rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-md">
                <div className="relative w-full sm:w-72 md:w-96 shrink-0">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search shops, stores, or owner..."
                    value={resSearch}
                    onChange={(e) => setResSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-lg bg-bg-dark border border-glass focus:border-primary/40 text-text-primary placeholder-text-muted/60 outline-none transition-all focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                {/* View Mode Toggle Controls */}
                <div className="flex items-center gap-1.5 bg-glass-subtle border border-glass p-1 rounded-lg shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => setResViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${resViewMode === 'grid' ? 'bg-primary text-black' : 'text-text-muted hover:text-text-primary'}`}
                    title="Grid View"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    onClick={() => setResViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${resViewMode === 'table' ? 'bg-primary text-black' : 'text-text-muted hover:text-text-primary'}`}
                    title="Table View"
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>

              {/* Restaurants Display */}
              {filteredRestaurants.length === 0 ? (
                <div className="py-16 px-4 border border-dashed border-glass rounded-xl text-center flex flex-col items-center justify-center">
                  <Store size={36} className="text-text-muted mb-3" />
                  <h3 className="text-sm font-bold text-text-primary">No Establishments Found</h3>
                  <p className="text-xs text-text-muted mt-1 max-w-sm">No partner restaurants match your current search queries or filters.</p>
                </div>
              ) : resViewMode === 'table' ? (
                <div className="glass-panel border border-glass rounded-xl overflow-hidden shadow-luxury">
                  {/* Desktop View Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-glass text-text-muted font-bold tracking-wider uppercase text-[10px] bg-bg-darkSec/30">
                          <th className="p-4 font-semibold">Image</th>
                          <th className="p-4 font-semibold">Restaurant Name</th>
                          <th className="p-4 font-semibold">Owner Info</th>
                          <th className="p-4 font-semibold">Address</th>
                          <th className="p-4 font-semibold text-center">Status</th>
                          <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-glass font-medium">
                        {filteredRestaurants.map((res) => (
                          <tr key={res.id} className="hover:bg-glass-subtle transition-colors">
                            <td className="p-4 shrink-0 cursor-pointer" onClick={() => setSelectedResProfile(res)}>
                              <img
                                src={res.image}
                                alt={res.name}
                                className="w-14 h-14 rounded-lg object-cover border border-glass shadow-sm"
                              />
                            </td>
                            <td className="p-4">
                              <h4 className="text-sm font-bold text-text-primary leading-tight hover:text-primary transition-colors cursor-pointer" onClick={() => setSelectedResProfile(res)}>{res.name}</h4>
                            </td>
                            <td className="p-4">
                              <p className="text-text-primary text-[12px] font-bold">{res.ownerName}</p>
                              <span className="text-[10px] text-text-muted leading-relaxed block">{res.phone}</span>
                              <span className="text-[10px] text-text-muted truncate block max-w-[150px]">{res.email}</span>
                            </td>
                            <td className="p-4 text-text-secondary text-[11px] max-w-[180px] leading-relaxed truncate" title={res.address}>
                              {res.address}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => toggleRestaurantStatus(res.id)}
                                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
                                    (res.status === 'active' || res.status === 'open') && res.isOpen !== false ? 'bg-success' : 'bg-rose-600/80 border border-rose-500/40'
                                  }`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-300 shadow-sm ${
                                    (res.status === 'active' || res.status === 'open') && res.isOpen !== false ? 'translate-x-3.5' : 'translate-x-0'
                                  }`} />
                                </button>
                                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                                  (res.status === 'active' || res.status === 'open') && res.isOpen !== false ? 'text-success' : 'text-rose-400'
                                }`}>
                                  {(res.status === 'active' || res.status === 'open') && res.isOpen !== false ? 'active' : 'closed'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setSelectedResProfile(res)}
                                  className="p-2 rounded bg-glass border border-glass hover:border-primary/40 hover:text-primary transition-all text-text-muted"
                                  title="View Restaurant Profile"
                                >
                                  <ArrowRight size={12} />
                                </button>
                                <button
                                  onClick={() => { setResForm(res); setEditingRes(res); setIsResFormOpen(true); }}
                                  className="p-2 rounded bg-glass border border-glass hover:border-primary/40 hover:text-primary transition-all text-text-muted"
                                  title="Edit Restaurant"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => deleteRestaurant(res.id)}
                                  className="p-2 rounded bg-glass border border-glass hover:border-error/40 hover:text-error transition-all text-text-muted"
                                  title="Delete Restaurant"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View Card List */}
                  <div className="grid grid-cols-1 gap-4 lg:hidden p-4 bg-bg-darkSec/20">
                    {filteredRestaurants.map((res) => (
                      <div key={res.id} className="p-4 rounded-xl border border-glass bg-glass-subtle flex flex-col gap-4 relative hover:border-primary/20 transition-all">
                        <div className="flex gap-4 items-start">
                          <img
                            src={res.image}
                            alt={res.name}
                            className="w-16 h-16 rounded-lg object-cover border border-glass shrink-0 shadow-sm cursor-pointer"
                            onClick={() => setSelectedResProfile(res)}
                          />
                          <div className="min-w-0 flex-grow flex-1">
                            <h4 className="text-sm font-bold text-text-primary leading-tight truncate cursor-pointer hover:text-primary transition-colors" onClick={() => setSelectedResProfile(res)}>{res.name}</h4>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-glass/40 grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-text-muted font-semibold uppercase tracking-wider block">Owner:</span>
                            <span className="text-text-secondary font-bold">{res.ownerName}</span>
                          </div>
                          <div>
                            <span className="text-text-muted font-semibold uppercase tracking-wider block">Phone:</span>
                            <span className="text-text-secondary font-bold">{res.phone}</span>
                          </div>
                        </div>

                        <div className="text-[10px] border-t border-glass/40 pt-3">
                          <span className="text-text-muted font-semibold uppercase tracking-wider block">Address:</span>
                          <span className="text-text-secondary font-medium leading-relaxed block">{res.address}</span>
                        </div>

                        <div className="pt-3 border-t border-glass/40 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleRestaurantStatus(res.id)}
                              className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
                                (res.status === 'active' || res.status === 'open') && res.isOpen !== false ? 'bg-success' : 'bg-rose-600/80 border border-rose-500/40'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-300 shadow-sm ${
                                (res.status === 'active' || res.status === 'open') && res.isOpen !== false ? 'translate-x-3.5' : 'translate-x-0'
                              }`} />
                            </button>
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                              (res.status === 'active' || res.status === 'open') && res.isOpen !== false ? 'text-success' : 'text-rose-400'
                            }`}>
                              {(res.status === 'active' || res.status === 'open') && res.isOpen !== false ? 'active' : 'closed'}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedResProfile(res)}
                              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded bg-glass border border-glass hover:border-primary/40 hover:text-primary transition-all text-text-secondary"
                            >
                              <ArrowRight size={10} />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => { setResForm(res); setEditingRes(res); setIsResFormOpen(true); }}
                              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded bg-glass border border-glass hover:border-primary/40 hover:text-primary transition-all text-text-secondary"
                            >
                              <Edit2 size={10} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => deleteRestaurant(res.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded bg-glass border border-glass hover:border-error/40 hover:text-error transition-all text-text-secondary"
                            >
                              <Trash2 size={10} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredRestaurants.map((res) => (
                    <div key={res.id} className="glass-panel border border-glass bg-bg-darkSec/10 rounded-xl overflow-hidden shadow-luxury flex flex-col justify-between group hover:border-primary/40 transition-all duration-300">
                      <div className="relative h-32 overflow-hidden bg-bg-darkSec/20 cursor-pointer" onClick={() => setSelectedResProfile(res)}>
                        <img 
                          src={res.image} 
                          alt={res.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 right-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-wider backdrop-blur-md shadow-md ${
                            (res.status === 'active' || res.status === 'open') && res.isOpen !== false
                              ? 'bg-emerald-500/90 border-emerald-400/40 text-white'
                              : 'bg-rose-600/90 border-rose-500/40 text-white'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              (res.status === 'active' || res.status === 'open') && res.isOpen !== false ? 'bg-white animate-pulse' : 'bg-white/60'
                            }`} />
                            {(res.status === 'active' || res.status === 'open') && res.isOpen !== false ? 'ACTIVE' : 'CLOSED'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4 flex-grow space-y-3">
                        <div>
                          <h4 className="text-sm font-bold text-text-primary leading-tight hover:text-primary transition-colors cursor-pointer truncate" title={res.name} onClick={() => setSelectedResProfile(res)}>
                            {res.name}
                          </h4>
                        </div>

                        <div className="pt-2.5 border-t border-glass/40 space-y-1.5 text-[10px] font-semibold text-text-secondary">
                          <div className="flex items-center gap-1.5 truncate">
                            <UserCheck size={11} className="text-primary/70 shrink-0" />
                            <span className="truncate">{res.ownerName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin size={11} className="text-primary/70 shrink-0" />
                            <span className="truncate" title={res.address}>{res.address}</span>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-2.5 border-t border-glass/30 bg-bg-darkSec/10 flex items-center justify-between">
                        <button
                          onClick={() => setSelectedResProfile(res)}
                          className="px-2.5 py-1.5 rounded-lg bg-glass border border-glass hover:border-primary/40 hover:bg-glass-subtle transition-all text-[9px] font-extrabold uppercase tracking-wider text-text-secondary hover:text-primary flex items-center gap-1"
                        >
                          <span>View Profile</span>
                          <ArrowRight size={10} />
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setResForm(res); setEditingRes(res); setIsResFormOpen(true); }}
                            className="p-1.5 rounded bg-glass border border-glass hover:border-primary/40 hover:text-primary transition-all text-text-muted"
                            title="Edit Restaurant"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={() => deleteRestaurant(res.id)}
                            className="p-1.5 rounded bg-glass border border-glass hover:border-error/40 hover:text-error transition-all text-text-muted"
                            title="Delete Restaurant"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {/* ==================================================== */}
        {/* ORDERS TAB (Matching Vendor Dashboard Layout) */}
        {/* ==================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fadeIn w-full">
            <div className="border-b border-glass pb-6">
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Logistics Management</span>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-primary tracking-tight">Active Customer Orders</h1>
              <p className="text-xs text-text-muted mt-1">Track customer orders across all stores, filter by status, and assign delivery partners.</p>
            </div>

            {/* Filter Controls & 4 Simplified Tabs */}
            <div className="glass-panel border border-glass rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row gap-3.5 sm:gap-4 items-center justify-between shadow-md">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search Order ID, Customer, or Store..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-[15px] sm:text-xs font-semibold rounded-xl bg-bg-dark border border-glass focus:border-primary/40 text-text-primary placeholder-text-muted/60 outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1.5 sm:pb-0 scrollbar-none">
                {['All', 'Completed', 'Rejected', 'Order History'].map(st => {
                  const count = getTabOrderCount(st);
                  const isActive = orderStatusFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${isActive
                        ? 'bg-primary text-black font-black shadow-sm'
                        : 'bg-glass text-text-secondary hover:text-primary border border-glass/60'
                        }`}
                    >
                      <span>{st}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-black/20 text-black' : 'bg-primary/20 text-primary'
                        }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ORDERS ACCORDION CARDS LIST */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 glass-panel border border-glass rounded-2xl p-8 max-w-md mx-auto space-y-3">
                <ClipboardList size={40} className="mx-auto text-text-muted opacity-50" />
                <h3 className="font-bold text-base text-text-primary font-display">No Orders Found</h3>
                <p className="text-xs text-text-muted">
                  No customer orders match your filter configuration.
                </p>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                {filteredOrders.map(o => {
                  const orderId = o.id || o.orderId;
                  const status = (o.orderStatus || o.status || 'Pending').toString();
                  const statusLower = status.toLowerCase();

                  const isExpanded = !!expandedAdminOrdersMap[orderId];

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

                  const customerName = o.customer?.name || o.customerName || 'Valued Customer';
                  const customerPhone = o.customer?.phone || o.customerPhone || '';
                  const customerAddress = o.customer?.address || o.customerAddress || 'No address specified';
                  const restaurantName = o.restaurant || o.restaurantName || 'Partner Store';
                  const totalAmt = Number(o.total || o.totalAmount || 0);

                  return (
                    <motion.div
                      key={orderId}
                      layout
                      className="glass-panel border border-glass rounded-2xl overflow-hidden shadow-md hover:border-primary/30 transition-all text-left"
                    >
                      {/* CARD HEADER ROW */}
                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-darkSec/20">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleAdminOrderExpand(orderId)}
                            className="p-1.5 rounded-xl bg-glass border border-glass text-text-secondary hover:text-primary transition-all cursor-pointer shrink-0"
                            title="Toggle order item details"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-black text-sm text-primary tracking-tight">
                                #{orderId}
                              </span>

                              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                statusLower === 'completed' || statusLower === 'delivered'
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                  : statusLower === 'rejected' || statusLower === 'cancelled'
                                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                                  : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                              }`}>
                                {status}
                              </span>

                              <span className="text-[11px] text-text-muted font-mono flex items-center gap-1">
                                <Clock size={11} />
                                <span>
                                  {o.createdAt || o.createdTime ? new Date(o.createdAt || o.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                                </span>
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary font-semibold">
                              <span className="flex items-center gap-1 text-text-primary font-bold">
                                <User size={13} className="text-primary" />
                                <span>{customerName}</span>
                              </span>

                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-extrabold text-[11px]">
                                <Store size={12} />
                                <span>{restaurantName}</span>
                              </span>

                              <span className="px-2 py-0.5 rounded-md bg-glass text-text-muted border border-glass/60 text-[11px] font-mono">
                                🛒 {totalItemsQty} item{totalItemsQty !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT HEADER ACTIONS: TOTAL AMOUNT, RIDER SELECTOR & TOGGLE */}
                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3.5 border-t sm:border-t-0 border-glass/40 pt-3 sm:pt-0">
                          <div className="text-left sm:text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold text-text-muted block tracking-wider">Total Order</span>
                            <span className="text-base sm:text-lg font-black text-primary font-display">
                              ₹{totalAmt.toFixed(2)}
                            </span>
                          </div>

                          {/* Rider Assignment Selector */}
                          <div className="flex items-center gap-1.5 bg-bg-dark border border-glass px-2.5 py-1.5 rounded-xl shadow-xs">
                            <Bike size={14} className="text-primary shrink-0" />
                            <select
                              value={o.assignedRider || 'Unassigned'}
                              onChange={(e) => handleAssignRider(orderId, e.target.value)}
                              className="bg-transparent text-xs font-extrabold text-text-primary outline-none cursor-pointer"
                            >
                              <option value="Unassigned">Assign Delivery Rider...</option>
                              {allDeliveryRiders.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleAdminOrderExpand(orderId)}
                            className="px-3 py-1.5 rounded-xl bg-glass border border-glass/80 hover:border-primary/40 text-text-primary hover:text-primary text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <span>{isExpanded ? 'Hide Details' : 'View Items'}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* EXPANDABLE ACCORDION BODY */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-glass p-4 sm:p-5 space-y-4 bg-bg-darkSec/10"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Customer & Address Details */}
                              <div className="space-y-2 bg-glass/40 border border-glass p-3.5 rounded-xl text-left">
                                <span className="text-[10px] font-black uppercase text-primary tracking-widest block">
                                  Customer & Delivery Details
                                </span>
                                <div className="space-y-1 text-xs text-text-secondary font-semibold">
                                  <p className="font-bold text-text-primary flex items-center gap-1.5">
                                    <User size={13} className="text-primary shrink-0" />
                                    <span>{customerName}</span>
                                  </p>
                                  {customerPhone && (
                                    <a
                                      href={`tel:${customerPhone}`}
                                      className="text-xs text-primary font-extrabold hover:underline flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 w-fit"
                                    >
                                      <Phone size={12} />
                                      <span>{customerPhone}</span>
                                    </a>
                                  )}
                                  <p className="text-xs font-semibold text-text-secondary flex items-start gap-1.5 leading-relaxed pt-1">
                                    <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                                    <span>{customerAddress}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Order & Payment Summary */}
                              <div className="space-y-2 bg-glass/40 border border-glass p-3.5 rounded-xl text-left flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-1">
                                    Order Summary & Payment Status
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-text-muted text-xs font-bold">Payment Status:</span>
                                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                                      o.paymentStatus === 'paid' || o.paymentStatus === 'SUCCESS'
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                        : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                    }`}>
                                      {o.paymentStatus || 'Pending'}
                                    </span>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-glass flex items-center justify-between">
                                  <span className="text-xs font-extrabold text-text-secondary">Grand Total Amount</span>
                                  <span className="text-lg font-black text-primary font-display">₹{totalAmt.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Detailed Itemized Food Breakdown */}
                            <div className="space-y-3 pt-2">
                              <span className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
                                <Utensils size={15} className="text-primary" />
                                <span>Itemized Food Breakdown ({itemsList.length} unique items)</span>
                              </span>

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
                                        className="p-3 rounded-xl bg-glass/60 border border-glass flex items-center justify-between gap-3 text-left"
                                      >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <img
                                            src={img}
                                            alt={foodName}
                                            className="rounded-xl object-cover border border-glass shrink-0 bg-bg-dark shadow-xs"
                                            style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px' }}
                                          />
                                          <div className="min-w-0 space-y-1 flex-1">
                                            <h4 className="text-xs sm:text-sm font-black text-text-primary truncate">
                                              {foodName}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 font-black text-[11px] font-mono">
                                                QTY: {qty}
                                              </span>
                                              {variantLabel ? (
                                                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-black text-[11px] font-mono flex items-center gap-1">
                                                  <Package size={11} className="shrink-0" />
                                                  <span>{variantLabel}</span>
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-md bg-glass text-text-muted border border-glass/60 font-bold text-[10px] font-mono">
                                                  Standard Portion
                                                </span>
                                              )}
                                              {price !== undefined && (
                                                <span className="text-text-muted font-bold text-[11px]">
                                                  • ₹{Number.isInteger(price) ? price : price.toFixed(2)} each
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {price !== undefined && (
                                          <div className="text-right shrink-0">
                                            <span className="text-xs sm:text-sm font-black text-primary font-display block">
                                              ₹{(price * qty).toFixed(2)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="p-3 rounded-xl bg-bg-dark/40 border border-glass text-xs text-text-muted italic">
                                    Item details stored in order record database.
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* DELIVERY ASSIGNMENTS TAB */}
        {/* ==================================================== */}
        {activeTab === 'delivery' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-glass pb-4">
              <div>
                <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Courier Operations</span>
                <h1 className="text-3xl font-black font-display text-text-primary tracking-tight">Delivery Fleet & Live Assignments</h1>
              </div>

              <button
                type="button"
                onClick={() => navigate('/admin/delivery-partners/new')}
                className="px-5 py-3 rounded-2xl bg-[#B87C44] dark:bg-[#D9A36C] text-white dark:text-black font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Bike size={16} />
                <span>+ Create Delivery Partner</span>
              </button>
            </div>

            {/* Registered Delivery Partners stored in DB */}
            <div className="glass-panel border border-glass p-5 sm:p-6 rounded-3xl space-y-4 shadow-luxury">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                    <UserCheck size={18} className="text-primary" />
                    <span>Registered Delivery Partners (Stored in Database)</span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5 font-medium">
                    Delivery partners can log in at the central <code className="text-primary font-mono font-bold">/login</code> page using their credentials.
                  </p>
                </div>
                <span className="self-start sm:self-auto px-3.5 py-1 rounded-full text-xs font-black uppercase bg-primary/15 border border-primary/30 text-primary shrink-0">
                  {dbDeliveryPartners.length} Partners Registered
                </span>
              </div>

              {dbDeliveryPartners.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-glass text-text-muted text-xs font-semibold bg-bg-darkSec/40 flex flex-col items-center gap-3">
                  <p>No custom delivery partners created yet. Click "+ Create Delivery Partner" to add a new delivery partner.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/delivery-partners/new')}
                    className="px-4 py-2 rounded-xl bg-primary text-black font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:brightness-105 cursor-pointer"
                  >
                    <Bike size={14} />
                    <span>+ Create Delivery Partner</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[260px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-primary/30">
                  {dbDeliveryPartners.map((partner) => {
                    const partnerName = (partner.name || '').toLowerCase();
                    const partnerEmail = (partner.email || '').toLowerCase();
                    const partnerId = (partner.id || partner.userId || '').toLowerCase();

                    // Find if rider currently has an active order in transit
                    const activeTransitOrder = orders.find((o) => {
                      const assigned = (o.assignedRider || '').toLowerCase();
                      const st = (o.orderStatus || o.status || '').toLowerCase();
                      const isAssignedToRider = assigned && (assigned === partnerName || assigned.includes(partnerName) || partnerName.includes(assigned) || assigned === partnerEmail || assigned === partnerId);
                      const isActiveState = ['assigned', 'out for delivery', 'in transit', 'picked up', 'ready'].includes(st);
                      return isAssignedToRider && isActiveState;
                    });

                    const isOffline = partner.dutyStatus === 'OFF_DUTY';
                    const isBusyOnRide = !isOffline && Boolean(activeTransitOrder);

                    return (
                      <div key={partner.id || partner.userId} className="p-4 rounded-2xl bg-bg-cardSec/90 border border-glass flex flex-col justify-between gap-3 relative hover:border-primary/50 transition-all shadow-md">
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-0.5 min-w-0 flex-grow">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-extrabold text-text-primary text-sm truncate">{partner.name}</span>
                              
                              {/* 3-State Status Pill: OFF DUTY vs BUSY ON RIDE vs ONLINE */}
                              {isOffline ? (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 shrink-0 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span>OFFLINE</span>
                                </span>
                              ) : isBusyOnRide ? (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-blue-500/15 border border-blue-500/40 text-blue-600 dark:text-sky-400 shrink-0 flex items-center gap-1 animate-pulse">
                                  <Bike size={10} className="text-blue-500 dark:text-sky-400" />
                                  <span>BUSY • ON RIDE</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>ONLINE • AVAILABLE</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-secondary truncate" title={partner.email}>{partner.email}</p>
                            <p className="text-[11px] text-text-muted font-mono">{partner.phone || 'No phone'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteDeliveryPartner(partner.id || partner.userId)}
                            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer shrink-0"
                            title="Remove Partner"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Active order chip if on ride */}
                        {activeTransitOrder && !isOffline && (
                          <div className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between text-[10px]">
                            <span className="text-text-muted font-semibold">Carrying Order:</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-sky-400">#{activeTransitOrder.id || activeTransitOrder.orderId}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-glass/30 flex items-center justify-between text-[10px] text-text-muted font-medium">
                          <span className="flex items-center gap-1 font-bold text-text-secondary truncate">
                            <Bike size={12} className="text-primary shrink-0" />
                            <span>{partner.vehicleType || 'Bike'} {partner.vehicleNumber ? `• ${partner.vehicleNumber}` : ''}</span>
                          </span>
                          <span className="font-mono text-primary font-bold shrink-0">
                            ID: {partner.userId}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column Board Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Column 1: Waiting for Rider */}
              <div className="space-y-4 glass-panel border border-glass p-4 rounded-2xl shadow-luxury">
                <div className="flex items-center justify-between border-b border-glass pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary">Waiting for Rider</h2>
                  </div>
                  <span className="text-[11px] font-black bg-amber-500/15 text-amber-600 dark:text-warning px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {orders.filter(o => !o.assignedRider && !['delivered', 'completed', 'cancelled'].includes((o.orderStatus || o.status || '').toLowerCase())).length}
                  </span>
                </div>

                <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-amber-500/30">
                  {orders.filter(o => !o.assignedRider && !['delivered', 'completed', 'cancelled'].includes((o.orderStatus || o.status || '').toLowerCase())).length === 0 ? (
                    <div className="py-12 text-center text-text-muted text-xs font-semibold border border-dashed border-glass rounded-xl bg-bg-darkSec/30">
                      No orders waiting for riders.
                    </div>
                  ) : (
                    orders.filter(o => !o.assignedRider && !['delivered', 'completed', 'cancelled'].includes((o.orderStatus || o.status || '').toLowerCase())).map((order) => (
                      <div key={order.id} className="bg-bg-cardSec/90 border border-glass rounded-xl p-4 space-y-3 shadow-md hover:border-primary/40 transition-all">
                        <div className="flex justify-between items-center text-[10px] border-b border-glass/30 pb-2">
                          <span className="font-mono font-bold text-primary">#{order.id}</span>
                          <span className="uppercase font-extrabold text-amber-600 dark:text-warning">{order.orderStatus || order.status}</span>
                        </div>
                        <div className="space-y-1.5 text-[10px] leading-relaxed">
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Establishment:</span> <span className="font-bold text-text-primary">{order.restaurant}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Customer:</span> <span className="font-bold text-text-primary">{order.customer?.name || 'Guest'}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Delivery Address:</span> <span className="text-text-secondary block font-medium mt-0.5">{order.customer?.address || 'N/A'}</span></p>
                        </div>
                        <div className="pt-2.5 border-t border-glass/30 flex gap-2 items-center">
                          <select
                            value={selectedRiders[order.id] || ''}
                            onChange={(e) => setSelectedRiders({ ...selectedRiders, [order.id]: e.target.value })}
                            className="flex-1 py-1.5 px-2 bg-bg-dark border border-glass rounded-lg text-[10px] font-bold text-text-primary outline-none focus:border-primary/40"
                          >
                            <option value="">Select Rider...</option>
                            {allDeliveryRiders.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssignRider(order.id)}
                            disabled={!selectedRiders[order.id]}
                            className="py-1.5 px-3 rounded-lg bg-primary text-black font-extrabold text-[10px] uppercase tracking-wider shadow-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Assigned Orders */}
              <div className="space-y-4 glass-panel border border-glass p-4 rounded-2xl shadow-luxury">
                <div className="flex items-center justify-between border-b border-glass pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary">Assigned Orders</h2>
                  </div>
                  <span className="text-[11px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                    {orders.filter(o => o.assignedRider && !['delivered', 'completed', 'cancelled'].includes((o.orderStatus || o.status || '').toLowerCase())).length}
                  </span>
                </div>

                <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-blue-500/30">
                  {orders.filter(o => o.assignedRider && !['delivered', 'completed', 'cancelled'].includes((o.orderStatus || o.status || '').toLowerCase())).length === 0 ? (
                    <div className="py-12 text-center text-text-muted text-xs font-semibold border border-dashed border-glass rounded-xl bg-bg-darkSec/30">
                      No active courier transits.
                    </div>
                  ) : (
                    orders.filter(o => o.assignedRider && !['delivered', 'completed', 'cancelled'].includes((o.orderStatus || o.status || '').toLowerCase())).map((order) => (
                      <div key={order.id} className="bg-bg-cardSec/90 border border-glass rounded-xl p-4 space-y-3 shadow-md hover:border-blue-500/40 dark:hover:border-primary/40 transition-all">
                        <div className="flex justify-between items-center text-[10px] border-b border-glass/30 pb-2">
                          <span className="font-mono font-bold text-primary">#{order.id}</span>
                          <span className="uppercase font-extrabold text-blue-600 dark:text-primary">{order.orderStatus || order.status}</span>
                        </div>
                        <div className="space-y-1.5 text-[10px] leading-relaxed">
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Establishment:</span> <span className="font-bold text-text-primary">{order.restaurant}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Customer:</span> <span className="font-bold text-text-primary">{order.customer?.name || 'Guest'}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Delivery Address:</span> <span className="text-text-secondary block font-medium mt-0.5">{order.customer?.address || 'N/A'}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Assigned Rider:</span> <span className="text-primary font-bold inline-flex items-center gap-1"><Bike size={11} /> {order.assignedRider}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Assignment Time:</span> <span className="text-text-secondary font-bold">{order.assignmentTime || 'N/A'}</span></p>
                        </div>
                        <div className="pt-2.5 border-t border-glass/30 flex gap-2 items-center">
                          <select
                            value={selectedRiders[order.id] || ''}
                            onChange={(e) => setSelectedRiders({ ...selectedRiders, [order.id]: e.target.value })}
                            className="flex-1 py-1.5 px-2 bg-bg-dark border border-glass rounded-lg text-[10px] font-bold text-text-primary outline-none focus:border-primary/40"
                          >
                            <option value="">Reassign Rider...</option>
                            {allDeliveryRiders.filter(r => r !== order.assignedRider).map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssignRider(order.id)}
                            disabled={!selectedRiders[order.id]}
                            className="py-1.5 px-3 rounded-lg bg-glass border border-glass hover:border-primary/40 text-text-primary hover:text-primary font-extrabold text-[10px] uppercase tracking-wider shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
                          >
                            Reassign
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Delivered Orders */}
              <div className="space-y-4 glass-panel border border-glass p-4 rounded-2xl shadow-luxury">
                <div className="flex items-center justify-between border-b border-glass pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary">Delivered Orders</h2>
                  </div>
                  <span className="text-[11px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    {orders.filter(o => ['delivered', 'completed'].includes((o.orderStatus || o.status || '').toLowerCase())).length}
                  </span>
                </div>

                <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-emerald-500/30">
                  {orders.filter(o => ['delivered', 'completed'].includes((o.orderStatus || o.status || '').toLowerCase())).length === 0 ? (
                    <div className="py-12 text-center text-text-muted text-xs font-semibold border border-dashed border-glass rounded-xl bg-bg-darkSec/30">
                      No orders successfully delivered yet.
                    </div>
                  ) : (
                    orders.filter(o => ['delivered', 'completed'].includes((o.orderStatus || o.status || '').toLowerCase())).map((order) => (
                      <div key={order.id} className="bg-bg-cardSec/90 border border-glass rounded-xl p-4 space-y-3 shadow-md hover:border-emerald-500/40 transition-all opacity-95 hover:opacity-100">
                        <div className="flex justify-between items-center text-[10px] border-b border-glass/30 pb-2">
                          <span className="font-mono font-bold text-primary">#{order.id}</span>
                          <span className="uppercase font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle size={10} /> Completed</span>
                        </div>
                        <div className="space-y-1.5 text-[10px] leading-relaxed">
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Establishment:</span> <span className="font-bold text-text-primary">{order.restaurant}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Customer:</span> <span className="font-bold text-text-primary">{order.customer?.name || 'Guest'}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Delivery Address:</span> <span className="text-text-secondary block font-medium mt-0.5">{order.customer?.address || 'N/A'}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Delivered By:</span> <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1"><UserCheck size={11} /> {order.assignedRider || 'N/A'}</span></p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* DELIVERY LOCATIONS TAB */}
        {/* ==================================================== */}
        {activeTab === 'locations' && (
          <AdminDeliveryLocations />
        )}

        {/* ==================================================== */}
        {/* WEBSITE CMS TAB */}
        {/* ==================================================== */}
        {activeTab === 'cms' && (
          <AdminCMSManager />
        )}

        {/* ==================================================== */}
        {/* INVITATIONS REQUESTS TAB */}
        {/* ==================================================== */}
        {activeTab === 'invitations' && (
          <AdminInvitationsManager />
        )}

        {/* ==================================================== */}
        {/* SETTINGS TAB */}
        {/* ==================================================== */}
        {activeTab === 'settings' && (

          <div className="space-y-8">
            <div>
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1.5 block">Console Options</span>
              <h1 className="text-3xl font-black font-display text-primary tracking-tight">Admin System Settings</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Profile & Password Config (Left Column) */}
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="glass-panel border border-glass rounded-xl p-6 shadow-luxury">
                  <div className="flex items-center gap-3 border-b border-glass pb-4 mb-5">
                    <User className="text-primary" size={18} />
                    <h2 className="text-base font-bold font-display">Administrator Profile</h2>
                  </div>
                  <div className="space-y-3.5 text-xs font-semibold text-text-secondary">
                    <div className="flex justify-between py-2 border-b border-glass/20">
                      <span className="text-text-muted">Account Authority:</span>
                      <span className="text-primary uppercase tracking-wider">Super Administrator</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-glass/20">
                      <span className="text-text-muted">Registered Email:</span>
                      <span className="text-text-primary">{adminEmail}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-glass/20">
                      <span className="text-text-muted">System Level:</span>
                      <span className="text-text-primary">Production Live</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Charge per Kilometer Settings Card */}
                <div className="glass-panel border border-glass rounded-xl p-6 shadow-luxury">
                  <div className="flex items-center gap-3 border-b border-glass pb-4 mb-5">
                    <Bike className="text-primary" size={18} />
                    <div>
                      <h2 className="text-base font-bold font-display">Delivery Fee Configuration (per KM)</h2>
                      <p className="text-[10px] text-text-muted">Set distance-based pricing applied dynamically in customer cart.</p>
                    </div>
                  </div>

                  {deliverySettingsStatus && (
                    <div className={`p-3 rounded-xl text-[10px] font-bold mb-4 flex gap-2 ${
                      deliverySettingsStatus.type === 'success' ? 'bg-success/10 border border-success/20 text-success' : 'bg-error/10 border border-error/20 text-error'
                    }`}>
                      {deliverySettingsStatus.type === 'success' ? <CheckCircle size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
                      <span>{deliverySettingsStatus.message}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveDeliverySettings} className="space-y-4 text-xs font-semibold text-text-secondary">
                    <div>
                      <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                        Delivery Charge per Kilometer (₹ / km) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-primary text-sm">₹</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="1"
                          value={deliveryFeePerKm}
                          onChange={(e) => setDeliveryFeePerKm(Number(e.target.value))}
                          placeholder="e.g. 15"
                          className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary pl-8 pr-4 py-2.5 rounded-xl outline-none font-bold text-sm"
                        />
                      </div>
                      <p className="text-[10px] text-text-muted mt-1">Example: ₹15 per km calculated dynamically from Store GPS to Delivery Address GPS.</p>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                        Minimum Base Delivery Fee (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-primary text-sm">₹</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="1"
                          value={baseDeliveryFee}
                          onChange={(e) => setBaseDeliveryFee(Number(e.target.value))}
                          placeholder="e.g. 25"
                          className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary pl-8 pr-4 py-2.5 rounded-xl outline-none font-bold text-sm"
                        />
                      </div>
                      <p className="text-[10px] text-text-muted mt-1">Minimum delivery fee applied when distance is under base radius.</p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingDeliverySettings}
                      className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-black font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isSavingDeliverySettings ? 'Saving Settings...' : 'Save Delivery Rate Settings'}
                    </button>
                  </form>
                </div>

                {/* Theme Configuration */}
                <div className="glass-panel border border-glass rounded-xl p-6 shadow-luxury">
                  <div className="flex items-center gap-3 border-b border-glass pb-4 mb-5">
                    {theme === 'light' ? <Sun className="text-primary" size={18} /> : <Moon className="text-primary" size={18} />}
                    <h2 className="text-base font-bold font-display">Interface Theme Settings</h2>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-text-primary">Toggle Dashboard Style</p>
                      <p className="text-[10px] text-text-muted mt-1 font-medium">Switch dynamically between elegant Light Mode and Dark Mode.</p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="p-2.5 rounded-xl border border-glass bg-glass-subtle hover:bg-glass hover:text-primary transition-all duration-300 shadow-sm text-text-secondary"
                      aria-label="Toggle Theme"
                    >
                      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Config (Right Column) */}
              <div className="space-y-6">
                <div className="glass-panel border border-glass rounded-xl p-6 shadow-luxury">
                  <div className="flex items-center gap-3 border-b border-glass pb-4 mb-5">
                    <Key className="text-primary" size={18} />
                    <h2 className="text-base font-bold font-display">Change Admin Password</h2>
                  </div>

                  {passwordStatus && (
                    <div className={`p-3.5 rounded-xl text-[10px] font-bold mb-4 flex gap-2 ${
                      passwordStatus.type === 'success' ? 'bg-success/10 border border-success/20 text-success' : 'bg-error/10 border border-error/20 text-error'
                    }`}>
                      {passwordStatus.type === 'success' ? <CheckCircle size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
                      <span>{passwordStatus.message}</span>
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-4 text-xs font-semibold text-text-secondary">
                    <div>
                      <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Current Password</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-3.5 py-2.5 rounded-xl outline-none transition-all placeholder-text-muted/45 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-3.5 py-2.5 rounded-xl outline-none transition-all placeholder-text-muted/45 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-3.5 py-2.5 rounded-xl outline-none transition-all placeholder-text-muted/45 font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-primary hover:bg-primary-dark text-bg-dark font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-lg transition-all pt-2.5"
                    >
                      Update Password
                    </button>
                  </form>
                </div>
              </div>

            </div>

            {/* Developer Accordion Section (Original S3 & DynamoDB features preserved) */}
            <div className="glass-panel border border-glass rounded-xl overflow-hidden shadow-luxury">
              <button
                onClick={() => setDevToolsOpen(!devToolsOpen)}
                className="w-full flex items-center justify-between p-6 bg-bg-darkSec/30 text-left outline-none transition-colors hover:bg-bg-darkSec/50"
              >
                <div className="flex items-center gap-3">
                  <Layers className="text-primary animate-pulse" size={18} />
                  <div>
                    <h2 className="text-base font-bold font-display text-text-primary">Developer System Tools</h2>
                    <p className="text-[10px] text-text-muted mt-0.5 font-medium">Manage AWS cloud infrastructure endpoints (DynamoDB seeder, S3 uploads, Video sync).</p>
                  </div>
                </div>
                <ChevronRight size={18} className={`text-text-muted transition-transform duration-300 ${devToolsOpen ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {devToolsOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-glass bg-bg-dark/10"
                  >
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                      
                      {/* AWS DynamoDB Manager */}
                      <div className="glass-panel border border-glass rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-glass pb-3">
                          <div className="flex items-center gap-2">
                            <Database className="text-primary" size={16} />
                            <h3 className="text-sm font-bold font-display">DynamoDB Setup</h3>
                          </div>
                          <button
                            onClick={fetchDBItems}
                            disabled={dbLoading}
                            className="p-1.5 rounded bg-glass border border-glass hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50"
                          >
                            <RefreshCw size={12} className={dbLoading ? 'animate-spin' : ''} />
                          </button>
                        </div>

                        {dbLoading && dbItems.length === 0 ? (
                          <div className="py-8 flex flex-col items-center justify-center text-text-muted space-y-2 text-[10px]">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span>Scanning DynamoDB...</span>
                          </div>
                        ) : dbItems.length === 0 ? (
                          <div className="py-6 text-center space-y-3">
                            <p className="text-[10px] text-text-muted leading-relaxed">
                              Table `mk-delivery-services` (Region: {awsStatus?.regions?.dynamoRegion || 'eu-north-1'}) was found but is empty.
                            </p>
                            <button
                              onClick={handleSeedDatabase}
                              disabled={seeding}
                              className="w-full flex items-center justify-center gap-2 py-2 rounded bg-primary hover:bg-primary-dark text-bg-dark font-extrabold text-[10px] uppercase tracking-wider hover:shadow-lg disabled:opacity-75 transition-all"
                            >
                              {seeding ? (
                                <div className="w-3.5 h-3.5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <PlusCircle size={13} />
                                  <span>Seed Dishes</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-bold text-text-muted py-1 border-b border-glass/25">
                              <span>Dish Name</span>
                              <span>Category</span>
                              <span>Price</span>
                            </div>
                            <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-0.5">
                              {dbItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center text-[10px] py-1">
                                  <span className="font-semibold text-text-secondary truncate max-w-[100px]">{item.name}</span>
                                  <span className="text-text-muted capitalize text-[9px]">{item.category}</span>
                                  <span className="font-black text-primary">${item.price}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* S3 Media center */}
                      <div className="glass-panel border border-glass rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-glass pb-3">
                          <UploadCloud className="text-primary" size={16} />
                          <h3 className="text-sm font-bold font-display">S3 Cloud Upload</h3>
                        </div>

                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border border-dashed border-glass hover:border-primary/40 rounded-lg p-4 text-center cursor-pointer bg-glass-subtle/50 hover:bg-glass-subtle transition-all duration-300 flex flex-col items-center justify-center min-h-[90px]"
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*,application/pdf"
                            className="hidden"
                          />
                          <UploadCloud size={20} className="text-text-muted mb-1.5" />
                          {selectedFile ? (
                            <span className="text-[10px] font-bold text-text-primary truncate max-w-[180px]">
                              {selectedFile.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-text-muted font-bold">Choose local files</span>
                          )}
                        </div>

                        {selectedFile && (
                          <div className="flex gap-2">
                            <button
                              onClick={handleUploadToS3}
                              disabled={uploading}
                              className="flex-1 py-1.5 bg-primary hover:bg-primary-dark text-bg-dark font-extrabold text-[10px] uppercase tracking-wider rounded hover:shadow-lg disabled:opacity-75 transition-all flex items-center justify-center gap-1.5"
                            >
                              {uploading ? (
                                <div className="w-3 h-3 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <span>Upload</span>
                                  <ArrowRight size={11} />
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setSelectedFile(null)}
                              disabled={uploading}
                              className="px-2 py-1.5 rounded border border-glass bg-glass text-[10px] font-extrabold uppercase tracking-wider text-text-secondary hover:bg-glass-subtle transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {uploadError && (
                          <div className="p-2.5 rounded bg-error/10 border border-error/20 text-error text-[9px] font-semibold flex gap-1.5 leading-relaxed">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <span>{uploadError}</span>
                          </div>
                        )}

                        {uploadedUrl && (
                          <div className="space-y-1.5 pt-2 border-t border-glass/35">
                            <div className="flex items-center gap-1 text-success font-bold text-[9px] uppercase tracking-wider">
                              <CheckCircle size={11} />
                              <span>Stored Successfully</span>
                            </div>
                            <input
                              type="text"
                              readOnly
                              value={uploadedUrl}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              className="w-full px-2 py-1.5 rounded border border-glass bg-bg-dark text-[9px] font-mono outline-none cursor-pointer"
                            />
                          </div>
                        )}
                      </div>

                      {/* Hero videos manager */}
                      <div className="glass-panel border border-glass rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-glass pb-3">
                          <Video className="text-primary" size={16} />
                          <h3 className="text-sm font-bold font-display">Hero Video Sync</h3>
                        </div>

                        <p className="text-[10px] text-text-muted leading-relaxed">
                          Synchronize client landing page background video assets to S3 and DynamoDB.
                        </p>

                        <button
                          onClick={handleSyncHeroVideos}
                          disabled={syncingVideos}
                          className="w-full py-2 bg-primary hover:bg-primary-dark text-bg-dark font-extrabold text-[10px] uppercase tracking-wider rounded hover:shadow-lg disabled:opacity-75 transition-all flex items-center justify-center gap-1.5"
                        >
                          {syncingVideos ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" />
                              <span>Syncing...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw size={12} />
                              <span>Sync to S3 & DynamoDB</span>
                            </>
                          )}
                        </button>

                        <div className="pt-2.5 border-t border-glass/35 space-y-2 text-[10px] font-semibold text-text-muted">
                          <div className="flex justify-between items-center">
                            <span>Database State:</span>
                            {fetchingVideos ? (
                              <span>...</span>
                            ) : heroVideos ? (
                              <span className="text-success font-bold">Active in DB</span>
                            ) : (
                              <span className="text-warning font-bold">Local Fallback</span>
                            )}
                          </div>

                          {syncMessage && (
                            <div className="p-2 rounded bg-success/10 border border-success/20 text-success text-[9px] font-bold flex gap-1.5">
                              <CheckCircle size={12} className="shrink-0" />
                              <span>{syncMessage}</span>
                            </div>
                          )}

                          {syncError && (
                            <div className="p-2 rounded bg-error/10 border border-error/20 text-error text-[9px] font-bold flex gap-1.5">
                              <AlertTriangle size={12} className="shrink-0" />
                              <span>{syncError}</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        )}
        </ErrorBoundary>

        {/* Custom Delete Confirmation Modal (Sidebar remains fixed & clear; overlay starts at lg:left-64) */}
        {deleteResTarget && (
          <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
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
                    Delete Establishment
                  </h2>
                  <span className="text-xs text-text-muted font-medium block">Confirmation</span>
                </div>
              </div>

              <p className="text-sm font-medium text-text-secondary leading-relaxed">
                Are you sure you want to delete <strong className="text-text-primary">{deleteResTarget.name}</strong>? This action cannot be undone.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteResTarget(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-glass bg-glass hover:bg-glass-subtle text-text-primary font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRestaurants(prev => prev.filter(r => r.id !== deleteResTarget.id));
                    addActivity('restaurant_deleted', `Restaurant "${deleteResTarget.name}" was deleted.`);
                    showToast('success', `Establishment "${deleteResTarget.name}" deleted successfully.`);
                    setDeleteResTarget(null);
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

        {/* Floating Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3 font-bold text-xs ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                  : toastMessage.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/40 text-rose-300'
                  : 'bg-bg-card/90 border-primary/40 text-primary'
              }`}
            >
              <CheckCircle size={18} className="shrink-0" />
              <span>{toastMessage.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </main>





      {/* Logout Confirmation Modal - Root Level Full Screen Overlay covering entire window & sidebar */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="bg-white text-slate-900 rounded-[2rem] p-7 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            {/* Header with red soft-square icon and title */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shrink-0">
                <LogOut size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black font-display text-slate-900 tracking-tight leading-tight">
                  Confirm Logout
                </h2>
                <span className="text-xs text-slate-400 font-semibold block mt-0.5">Confirmation</span>
              </div>
            </div>

            <div className="border-b border-slate-100 w-full" />

            {/* Body message */}
            <p className="text-sm font-semibold text-slate-600 leading-relaxed">
              Are you sure you want to logout?
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-3.5 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs uppercase tracking-wider transition-all text-center shadow-sm"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
              >
                <LogOut size={15} />
                <span>LOGOUT</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Admin Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-bg-darkSec/95 border-t border-slate-200 dark:border-glass backdrop-blur-xl px-2 py-2 flex items-center justify-around shadow-2xl">
        {/* Dashboard Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('dashboard'); setIsMoreMenuOpen(false); }}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'text-amber-600 dark:text-primary font-black' : 'text-slate-500 dark:text-text-muted hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutGrid size={20} />
          <span className="mt-1">Dashboard</span>
        </button>

        {/* Restaurants Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('restaurants'); setIsMoreMenuOpen(false); }}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'restaurants' ? 'text-amber-600 dark:text-primary font-black' : 'text-slate-500 dark:text-text-muted hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Store size={20} />
          <span className="mt-1">Restaurants</span>
        </button>

        {/* Orders Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('orders'); setIsMoreMenuOpen(false); }}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'orders' ? 'text-amber-600 dark:text-primary font-black' : 'text-slate-500 dark:text-text-muted hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShoppingBag size={20} />
          <span className="mt-1">Orders</span>
        </button>

        {/* More Tab */}
        <button
          type="button"
          onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'delivery' || activeTab === 'settings' || isMoreMenuOpen
              ? 'text-amber-600 dark:text-primary font-black'
              : 'text-slate-500 dark:text-text-muted hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Settings size={20} />
          <span className="mt-1">More</span>
        </button>
      </nav>

      {/* Admin Slide-up "More" Drawer */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[99990] cursor-pointer"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="lg:hidden fixed bottom-16 left-0 right-0 z-[99991] bg-white dark:bg-bg-darkSec border-t border-slate-200 dark:border-glass rounded-t-3xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-glass pb-3">
                <span className="text-xs font-black uppercase text-amber-600 dark:text-primary tracking-widest">
                  Admin Console Menu
                </span>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-500 dark:text-text-muted"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setActiveTab('delivery'); setIsMoreMenuOpen(false); }}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                    activeTab === 'delivery'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-primary font-black'
                      : 'bg-slate-50 dark:bg-bg-dark/60 border-slate-200 dark:border-glass text-slate-800 dark:text-white'
                  }`}
                >
                  <Bike size={20} className="text-amber-600 dark:text-primary" />
                  <span>Delivery Assignments</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('locations'); setIsMoreMenuOpen(false); }}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                    activeTab === 'locations'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-primary font-black'
                      : 'bg-slate-50 dark:bg-bg-dark/60 border-slate-200 dark:border-glass text-slate-800 dark:text-white'
                  }`}
                >
                  <MapPin size={20} className="text-amber-600 dark:text-primary" />
                  <span>Delivery Locations</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('cms'); setIsMoreMenuOpen(false); }}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                    activeTab === 'cms'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-primary font-black'
                      : 'bg-slate-50 dark:bg-bg-dark/60 border-slate-200 dark:border-glass text-slate-800 dark:text-white'
                  }`}
                >
                  <Layers size={20} className="text-amber-600 dark:text-primary" />
                  <span>Website CMS</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('invitations'); setIsMoreMenuOpen(false); }}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                    activeTab === 'invitations'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-primary font-black'
                      : 'bg-slate-50 dark:bg-bg-dark/60 border-slate-200 dark:border-glass text-slate-800 dark:text-white'
                  }`}
                >
                  <Mail size={20} className="text-amber-600 dark:text-primary" />
                  <span>Invitations Requests</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('settings'); setIsMoreMenuOpen(false); }}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-primary font-black'
                      : 'bg-slate-50 dark:bg-bg-dark/60 border-slate-200 dark:border-glass text-slate-800 dark:text-white'
                  }`}
                >
                  <Settings size={20} className="text-amber-600 dark:text-primary" />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-glass bg-slate-50 dark:bg-bg-dark/60 text-slate-800 dark:text-white text-left flex flex-col gap-2 cursor-pointer"
                >
                  {theme === 'light' ? <Moon size={20} className="text-slate-700" /> : <Sun size={20} className="text-amber-400" />}
                  <span>{theme === 'light' ? 'Dark Theme' : 'Light Theme'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setIsLogoutModalOpen(true); setIsMoreMenuOpen(false); }}
                  className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-left flex flex-col gap-2 cursor-pointer"
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
