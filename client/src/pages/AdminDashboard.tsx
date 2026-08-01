import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  MapPin
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import ErrorBoundary from '../components/common/ErrorBoundary';

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

// Initial Data Arrays
const initialRestaurants: any[] = [];
const initialOrders: any[] = [];
const initialActivities: any[] = [];

const ridersList = ['Rider Alexander', 'Rider Christian', 'Rider Sebastian', 'Rider Maximilian'];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'restaurants' | 'orders' | 'delivery' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [resViewMode, setResViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedResProfile, setSelectedResProfile] = useState<any | null>(null);

  // Authentication
  const [adminEmail, setAdminEmail] = useState('');

  // Core App States
  const [restaurants, setRestaurants] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('admin_restaurants');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse admin_restaurants from localStorage:', e);
    }
    return initialRestaurants;
  });

  const [orders, setOrders] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('admin_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse admin_orders from localStorage:', e);
    }
    return initialOrders;
  });

  const [activities, setActivities] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('admin_activities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse admin_activities from localStorage:', e);
    }
    return initialActivities;
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
  const [resFormError, setResFormError] = useState<string | null>(null);

  // Settings state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  useEffect(() => {
    // Check credentials
    const adminAuthRaw = localStorage.getItem('adminAuth') || sessionStorage.getItem('adminAuth');
    if (!adminAuthRaw) {
      navigate('/admin', { replace: true });
      return;
    }

    try {
      const auth = JSON.parse(adminAuthRaw);
      if (auth.isLoggedIn && auth.role === 'admin') {
        setAdminEmail(auth.email);
        // Load original AWS API data
        fetchAWSStatus();
        fetchDBItems();
        fetchHeroVideos();
      } else {
        navigate('/admin', { replace: true });
      }
    } catch (e) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  // Original AWS Functions (Unchanged APIs)
  const fetchHeroVideos = async () => {
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
  };

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

  const fetchAWSStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/aws/status`);
      setAwsStatus(response.data);
    } catch (error) {
      console.error('Error fetching AWS status:', error);
    }
  };

  const fetchDBItems = async () => {
    setDbLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/db-items`);
      setDbItems(response.data);
    } catch (error) {
      console.error('Error fetching DynamoDB items:', error);
    } finally {
      setDbLoading(false);
    }
  };

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

  // Toast & Custom Delete Modal States
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
  const toggleRestaurantStatus = (resId: string) => {
    setRestaurants(prev => prev.map(r => {
      if (r.id === resId) {
        const newStatus = r.status === 'active' ? 'inactive' : 'active';
        addActivity('restaurant_status', `Restaurant "${r.name}" status set to ${newStatus.toUpperCase()}.`);
        showToast('info', `Establishment "${r.name}" is now ${newStatus.toUpperCase()}.`);
        return { ...r, status: newStatus };
      }
      return r;
    }));
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

    if (!name || !ownerName || !email || !phone || !address) {
      setResFormError('Please fill in all required fields.');
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

  // Handler: Update Order Status
  const handleUpdateOrderStatus = (orderId: string, status: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        addActivity('order_status', `Order ${orderId} status updated to ${status.toUpperCase()}.`);
        return { ...o, orderStatus: status };
      }
      return o;
    }));
  };

  // Handler: Assign Rider
  const handleAssignRider = (orderId: string) => {
    const rider = selectedRiders[orderId];
    if (!rider) return;

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        addActivity('order_assigned', `Order ${orderId} assigned to ${rider}.`);
        return { 
          ...o, 
          assignedRider: rider, 
          orderStatus: 'assigned', 
          assignmentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        };
      }
      return o;
    }));
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
    localStorage.removeItem('adminAuth');
    sessionStorage.removeItem('adminAuth');
    navigate('/admin', { replace: true });
  };

  // Analytics helper calculations
  const totalRestaurants = restaurants.length;
  const activeRestaurants = restaurants.filter(r => r.status === 'active').length;
  const totalOrdersToday = orders.length;
  const pendingOrders = orders.filter(o => o.orderStatus === 'pending').length;
  const ordersInDelivery = orders.filter(o => o.orderStatus === 'assigned' || o.orderStatus === 'picked up').length;
  const completedOrders = orders.filter(o => o.orderStatus === 'delivered').length;

  // Filter Restaurants (Requirement 2: Search Restaurant only)
  const filteredRestaurants = restaurants.filter(r => {
    return (r.name || '').toLowerCase().includes(resSearch.toLowerCase()) || 
           (r.ownerName || '').toLowerCase().includes(resSearch.toLowerCase());
  });

  // Filter Orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
                          o.customer.name.toLowerCase().includes(orderSearch.toLowerCase()) ||
                          o.restaurant.toLowerCase().includes(orderSearch.toLowerCase());
    const matchesStatus = orderStatusFilter === 'All' || o.orderStatus === orderStatusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen lg:h-screen bg-bg-dark text-text-primary flex flex-col lg:flex-row font-sans relative lg:overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-[10%] left-[20%] w-[550px] h-[550px] rounded-full bg-primary/5 blur-[150px] pointer-events-none animate-pulse-slow z-0" />
      <div className="absolute bottom-[10%] right-[10%] w-[550px] h-[550px] rounded-full bg-accent/5 blur-[150px] pointer-events-none z-0" />

      {/* Hamburger header for mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-bg-darkSec/80 border-b border-glass backdrop-blur-md flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-3">
          <img src="/logo.jpeg" alt="Logo" className="w-8 h-8 rounded-full object-cover border border-primary/40" />
          <span className="font-display font-black text-sm tracking-widest text-primary">MK CONSOLE</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-text-secondary hover:text-primary transition-colors border border-glass rounded-lg bg-glass-subtle"
        >
          <Menu size={18} />
        </button>
      </header>

      {/* Mobile Backdrop Overlay for Drawer */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        data-lenis-prevent
        className={`
          fixed inset-y-0 left-0 w-64 bg-bg-card border-r border-glass z-40 transition-transform duration-300 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col justify-between shrink-0 lg:overflow-y-auto shadow-2xl
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 space-y-8 flex-grow">
          {/* Logo / Brand Header */}
          <div className="flex items-center justify-between border-b border-glass pb-6">
            <div className="flex items-center gap-3">
              <img src="/logo.jpeg" alt="Logo" className="w-10 h-10 rounded-full object-cover border border-primary/40 shadow-lg" />
              <div>
                <h2 className="font-display font-black text-base tracking-widest text-primary leading-none">MK DELIVERY</h2>
                <span className="text-[9px] text-text-muted font-bold tracking-widest uppercase mt-1 block">ADMIN CONSOLE</span>
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
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'dashboard' ? 'bg-primary text-black shadow-md shadow-primary/20' : 'text-text-muted hover:text-text-primary hover:bg-glass-subtle'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setActiveTab('restaurants'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'restaurants' ? 'bg-primary text-black shadow-md shadow-primary/20' : 'text-text-muted hover:text-text-primary hover:bg-glass-subtle'
              }`}
            >
              <Store size={16} />
              <span>Restaurants</span>
            </button>

            <button
              onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'orders' ? 'bg-primary text-black shadow-md shadow-primary/20' : 'text-text-muted hover:text-text-primary hover:bg-glass-subtle'
              }`}
            >
              <ClipboardList size={16} />
              <span>Orders</span>
            </button>

            <button
              onClick={() => { setActiveTab('delivery'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'delivery' ? 'bg-primary text-black shadow-md shadow-primary/20' : 'text-text-muted hover:text-text-primary hover:bg-glass-subtle'
              }`}
            >
              <Bike size={16} />
              <span>Delivery</span>
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'settings' ? 'bg-primary text-black shadow-md shadow-primary/20' : 'text-text-muted hover:text-text-primary hover:bg-glass-subtle'
              }`}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Admin info & exit */}
        <div className="p-6 border-t border-glass space-y-4 bg-bg-dark/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-glass border border-glass text-primary">
              <User size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">Admin User</p>
              <p className="text-[10px] text-text-muted truncate">{adminEmail}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-glass bg-glass-subtle hover:bg-error/15 hover:border-error/30 hover:text-error text-xs font-bold transition-all duration-300"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        data-lenis-prevent
        className="flex-grow min-w-0 min-h-screen lg:h-screen pt-24 lg:pt-10 px-4 md:px-8 pb-24 z-10 relative lg:overflow-y-auto max-w-7xl mx-auto w-full"
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
                    <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Establishment Onboarding</span>
                    <h2 className="text-2xl md:text-3xl font-black font-display text-primary tracking-tight">
                      {editingRes ? 'Edit Establishment Profile' : 'Add New Restaurant Partner'}
                    </h2>
                    <p className="text-xs text-text-muted mt-1">Provide the required establishment credentials and information below.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsResFormOpen(false); setEditingRes(null); clearResForm(); }}
                    className="self-start sm:self-auto flex items-center gap-2 px-5 py-3 rounded-xl border border-glass bg-glass hover:bg-glass-subtle hover:text-primary font-bold text-xs uppercase tracking-wider transition-all duration-300"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Establishments</span>
                  </button>
                </div>

                {resFormError && (
                  <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-semibold mb-6 flex gap-2.5 items-center">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{resFormError}</span>
                  </div>
                )}

                <form onSubmit={saveRestaurant} className="space-y-6 text-xs font-semibold text-text-secondary w-full">
                  {/* Auto-Generated Unique Restaurant ID Banner */}
                  <div className="p-4 rounded-xl bg-glass-subtle/50 border border-glass flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-text-muted block">Restaurant ID (Auto-Generated)</span>
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
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Restaurant Name *</label>
                      <input
                        type="text"
                        required
                        value={resForm.name}
                        onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
                        placeholder="e.g. The Gilded Fork"
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
                        <input
                          type="password"
                          required
                          value={resForm.password}
                          onChange={(e) => setResForm({ ...resForm, password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all placeholder-text-muted/40 font-medium text-sm"
                        />
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
                  <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1.5 block">Michelin Partners</span>
                  <h1 className="text-3xl font-black font-display text-primary tracking-tight">Manage Establishments</h1>
                </div>
                <button
                  onClick={() => { clearResForm(); setEditingRes(null); setIsResFormOpen(true); }}
                  className="self-start sm:self-auto flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-bg-dark font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <PlusCircle size={16} />
                  <span>Add Restaurant</span>
                </button>
              </div>

              {/* Filter Controls Bar (Requirement 2: Search Restaurant only) */}
              <div className="glass-panel border border-glass rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-md">
                <div className="relative w-full sm:w-72 md:w-96 shrink-0">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search restaurants or owner..."
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
                                    res.status === 'active' ? 'bg-success' : 'bg-glass-subtle border border-glass'
                                  }`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-300 shadow-sm ${
                                    res.status === 'active' ? 'translate-x-3.5' : 'translate-x-0'
                                  }`} />
                                </button>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                  res.status === 'active' ? 'text-success' : 'text-text-muted'
                                }`}>
                                  {res.status}
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
                                res.status === 'active' ? 'bg-success' : 'bg-glass-subtle border border-glass'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-300 shadow-sm ${
                                res.status === 'active' ? 'translate-x-3.5' : 'translate-x-0'
                              }`} />
                            </button>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              res.status === 'active' ? 'text-success' : 'text-text-muted'
                            }`}>
                              {res.status}
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
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase border tracking-wider backdrop-blur-md ${
                            res.status === 'active' ? 'bg-success/80 border-success/30 text-white' : 'bg-error/80 border-error/30 text-white'
                          }`}>
                            {res.status}
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
        {/* ORDERS TAB */}
        {/* ==================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-8">
            <div>
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1.5 block">Logistics Management</span>
              <h1 className="text-3xl font-black font-display text-primary tracking-tight">Active Customer Orders</h1>
            </div>

            {/* Orders Filter Section */}
            <div className="glass-panel border border-glass rounded-xl p-4 flex flex-col xl:flex-row gap-4 items-center shadow-md">
              <div className="relative w-full xl:w-96 shrink-0">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by Order ID, Customer, or Restaurant..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-lg bg-bg-dark border border-glass focus:border-primary/40 text-text-primary placeholder-text-muted/60 outline-none transition-all focus:ring-1 focus:ring-primary/20"
                />
              </div>

              {/* Decorative divider */}
              <div className="hidden xl:block w-px h-6 bg-glass" />

              {/* Status Tabs Subnavigation */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full xl:w-auto pb-1 xl:pb-0 scrollbar-none">
                {['All', 'Pending', 'Accepted', 'Preparing', 'Ready', 'Assigned', 'Picked Up', 'Delivered', 'Cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setOrderStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border shrink-0 transition-all duration-300 ${
                      orderStatusFilter === status
                        ? 'bg-primary text-black border-primary shadow-sm shadow-primary/10'
                        : 'bg-glass-subtle border-glass text-text-muted hover:text-text-primary hover:bg-glass'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Table Container */}
            {filteredOrders.length === 0 ? (
              <div className="py-16 px-4 border border-dashed border-glass rounded-xl text-center flex flex-col items-center justify-center">
                <ClipboardList size={36} className="text-text-muted mb-3" />
                <h3 className="text-sm font-bold text-text-primary">No Orders Found</h3>
                <p className="text-xs text-text-muted mt-1 max-w-sm">No recorded orders match the filter configuration.</p>
              </div>
            ) : (
              <div className="glass-panel border border-glass rounded-xl overflow-hidden shadow-luxury">
                {/* Desktop View Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-glass text-text-muted font-bold tracking-wider uppercase text-[10px] bg-bg-darkSec/30">
                        <th className="p-4 font-semibold">Order ID</th>
                        <th className="p-4 font-semibold">Customer Details</th>
                        <th className="p-4 font-semibold">Restaurant</th>
                        <th className="p-4 font-semibold">Items</th>
                        <th className="p-4 font-semibold text-right">Total</th>
                        <th className="p-4 font-semibold text-center">Payment</th>
                        <th className="p-4 font-semibold text-center">Order Status</th>
                        <th className="p-4 font-semibold">Assigned Rider</th>
                        <th className="p-4 font-semibold text-right">Placed At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glass font-medium">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-glass-subtle transition-colors">
                          <td className="p-4 font-mono font-bold text-primary">{order.id}</td>
                          <td className="p-4">
                            <p className="text-text-primary font-bold">{order.customer?.name || 'Guest'}</p>
                            <span className="text-[10px] text-text-muted leading-relaxed block">{order.customer?.phone || 'N/A'}</span>
                            <span className="text-[10px] text-text-muted truncate block max-w-[155px]" title={order.customer?.address || 'N/A'}>{order.customer?.address || 'N/A'}</span>
                          </td>
                          <td className="p-4 text-text-secondary">{order.restaurant}</td>
                          <td className="p-4 text-text-muted text-[11px] max-w-[180px] leading-relaxed truncate" title={order.items}>
                            {order.items}
                          </td>
                          <td className="p-4 text-right font-black font-display text-primary text-sm">
                            ${(order.total || 0).toFixed(2)}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                              order.paymentStatus === 'paid' ? 'bg-success/15 border-success/30 text-success' : 'bg-warning/15 border-warning/30 text-warning'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <select
                              value={order.orderStatus}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className="px-2 py-1 bg-bg-dark border border-glass rounded text-[10px] font-bold text-text-secondary outline-none focus:border-primary/40 uppercase tracking-wider"
                            >
                              <option value="pending">Pending</option>
                              <option value="accepted">Accepted</option>
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready</option>
                              <option value="assigned">Assigned</option>
                              <option value="picked up">Picked Up</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="p-4 text-text-secondary text-[11px]">
                            {order.assignedRider ? (
                              <span className="inline-flex items-center gap-1.5 font-bold">
                                <Bike size={12} className="text-primary" />
                                {order.assignedRider}
                              </span>
                            ) : (
                              <span className="text-warning/80 text-[10px] font-semibold italic">Unassigned</span>
                            )}
                          </td>
                          <td className="p-4 text-right text-text-muted text-[10px]">
                            {new Date(order.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card List */}
                <div className="grid grid-cols-1 gap-4 lg:hidden p-4 bg-bg-darkSec/20">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="p-4 rounded-xl border border-glass bg-glass-subtle flex flex-col gap-4 relative hover:border-primary/20 transition-all text-xs font-semibold text-text-secondary">
                      <div className="flex justify-between items-center border-b border-glass/40 pb-2">
                        <span className="font-mono font-bold text-primary">{order.id}</span>
                        <span className="text-[10px] text-text-muted">{new Date(order.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-text-muted uppercase tracking-wider block mb-0.5">Customer:</span>
                          <span className="text-text-primary font-bold">{order.customer?.name || 'Guest'}</span>
                          <span className="text-text-muted block mt-0.5">{order.customer?.phone || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-text-muted uppercase tracking-wider block mb-0.5">Establishment:</span>
                          <span className="text-text-primary font-bold">{order.restaurant}</span>
                        </div>
                      </div>

                      <div className="text-[10px]">
                        <span className="text-text-muted uppercase tracking-wider block mb-0.5">Ordered Items:</span>
                        <p className="text-text-secondary leading-relaxed bg-bg-dark/40 p-2.5 rounded-lg border border-glass/20 font-medium">{order.items}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-glass/40 pt-3">
                        <div>
                          <span className="text-text-muted text-[9px] uppercase tracking-wider block">Total Amount:</span>
                          <span className="text-sm font-black font-display text-primary">${(order.total || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                            order.paymentStatus === 'paid' ? 'bg-success/15 border-success/30 text-success' : 'bg-warning/15 border-warning/30 text-warning'
                          }`}>
                            {order.paymentStatus}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-glass/40 pt-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-text-muted text-[9px] uppercase tracking-wider">Order Status:</span>
                          <select
                            value={order.orderStatus}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="px-2 py-1.5 bg-bg-dark border border-glass rounded text-[10px] font-bold text-text-secondary outline-none focus:border-primary/40 uppercase tracking-wider"
                          >
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready">Ready</option>
                            <option value="assigned">Assigned</option>
                            <option value="picked up">Picked Up</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>

                        <div className="text-[10px] text-right">
                          <span className="text-text-muted uppercase tracking-wider block">Assigned Rider:</span>
                          {order.assignedRider ? (
                            <span className="inline-flex items-center gap-1.5 text-text-secondary font-bold mt-1">
                              <Bike size={12} className="text-primary" />
                              {order.assignedRider}
                            </span>
                          ) : (
                            <span className="text-warning/80 font-bold italic mt-1 block">Unassigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* DELIVERY ASSIGNMENTS TAB */}
        {/* ==================================================== */}
        {activeTab === 'delivery' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1.5 block">Courier Operations</span>
              <h1 className="text-3xl font-black font-display text-primary tracking-tight">Rider Assignments</h1>
            </div>

            {/* Column Board Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Column 1: Waiting for Rider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-glass pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Waiting for Rider</h2>
                  </div>
                  <span className="text-[10px] font-bold bg-glass-subtle px-2 py-0.5 rounded-full text-text-muted border border-glass">
                    {orders.filter(o => !o.assignedRider && o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled').length}
                  </span>
                </div>

                <div className="space-y-4">
                  {orders.filter(o => !o.assignedRider && o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled').length === 0 ? (
                    <div className="py-8 text-center text-text-muted text-[11px] font-medium border border-dashed border-glass rounded-xl bg-glass-subtle/10">
                      No orders waiting for riders.
                    </div>
                  ) : (
                    orders.filter(o => !o.assignedRider && o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled').map((order) => (
                      <div key={order.id} className="glass-panel border border-glass rounded-xl p-4 space-y-4 shadow-sm hover:border-primary/20 transition-all">
                        <div className="flex justify-between items-center text-[10px] border-b border-glass/30 pb-2">
                          <span className="font-mono font-bold text-primary">{order.id}</span>
                          <span className="uppercase font-extrabold text-warning">{order.orderStatus}</span>
                        </div>
                        <div className="space-y-2 text-[10px] leading-relaxed">
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Establishment:</span> <span className="font-bold text-text-primary">{order.restaurant}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Customer:</span> <span className="font-bold text-text-primary">{order.customer?.name || 'Guest'}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Delivery Address:</span> <span className="text-text-secondary block font-medium mt-0.5">{order.customer?.address || 'N/A'}</span></p>
                        </div>
                        <div className="pt-3 border-t border-glass/30 flex gap-2 items-center">
                          <select
                            value={selectedRiders[order.id] || ''}
                            onChange={(e) => setSelectedRiders({ ...selectedRiders, [order.id]: e.target.value })}
                            className="flex-1 py-1.5 px-2 bg-bg-dark border border-glass rounded text-[10px] font-bold text-text-secondary outline-none focus:border-primary/40"
                          >
                            <option value="">Select Rider...</option>
                            {ridersList.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssignRider(order.id)}
                            disabled={!selectedRiders[order.id]}
                            className="py-1.5 px-3 rounded bg-primary text-black font-extrabold text-[10px] uppercase tracking-wider shadow-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
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
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-glass pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Assigned Orders</h2>
                  </div>
                  <span className="text-[10px] font-bold bg-glass-subtle px-2 py-0.5 rounded-full text-text-muted border border-glass">
                    {orders.filter(o => o.assignedRider && o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled').length}
                  </span>
                </div>

                <div className="space-y-4">
                  {orders.filter(o => o.assignedRider && o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled').length === 0 ? (
                    <div className="py-8 text-center text-text-muted text-[11px] font-medium border border-dashed border-glass rounded-xl bg-glass-subtle/10">
                      No active courier transits.
                    </div>
                  ) : (
                    orders.filter(o => o.assignedRider && o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled').map((order) => (
                      <div key={order.id} className="glass-panel border border-glass rounded-xl p-4 space-y-4 shadow-sm hover:border-primary/20 transition-all">
                        <div className="flex justify-between items-center text-[10px] border-b border-glass/30 pb-2">
                          <span className="font-mono font-bold text-primary">{order.id}</span>
                          <span className="uppercase font-extrabold text-primary">{order.orderStatus}</span>
                        </div>
                        <div className="space-y-2 text-[10px] leading-relaxed">
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Establishment:</span> <span className="font-bold text-text-primary">{order.restaurant}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Customer:</span> <span className="font-bold text-text-primary">{order.customer?.name || 'Guest'}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Delivery Address:</span> <span className="text-text-secondary block font-medium mt-0.5">{order.customer?.address || 'N/A'}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Assigned Rider:</span> <span className="text-primary font-bold inline-flex items-center gap-1"><Bike size={11} /> {order.assignedRider}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Assignment Time:</span> <span className="text-text-secondary font-bold">{order.assignmentTime || 'N/A'}</span></p>
                        </div>
                        <div className="pt-3 border-t border-glass/30 flex gap-2 items-center">
                          <select
                            value={selectedRiders[order.id] || ''}
                            onChange={(e) => setSelectedRiders({ ...selectedRiders, [order.id]: e.target.value })}
                            className="flex-1 py-1.5 px-2 bg-bg-dark border border-glass rounded text-[10px] font-bold text-text-secondary outline-none focus:border-primary/40"
                          >
                            <option value="">Reassign Rider...</option>
                            {ridersList.filter(r => r !== order.assignedRider).map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssignRider(order.id)}
                            disabled={!selectedRiders[order.id]}
                            className="py-1.5 px-3 rounded bg-glass border border-glass hover:border-primary/40 text-text-secondary hover:text-primary font-extrabold text-[10px] uppercase tracking-wider shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
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
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-glass pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Delivered Orders</h2>
                  </div>
                  <span className="text-[10px] font-bold bg-glass-subtle px-2 py-0.5 rounded-full text-text-muted border border-glass">
                    {orders.filter(o => o.orderStatus === 'delivered').length}
                  </span>
                </div>

                <div className="space-y-4">
                  {orders.filter(o => o.orderStatus === 'delivered').length === 0 ? (
                    <div className="py-8 text-center text-text-muted text-[11px] font-medium border border-dashed border-glass rounded-xl bg-glass-subtle/10">
                      No orders successfully delivered yet.
                    </div>
                  ) : (
                    orders.filter(o => o.orderStatus === 'delivered').map((order) => (
                      <div key={order.id} className="glass-panel border border-glass rounded-xl p-4 space-y-4 shadow-sm hover:border-success/10 transition-all opacity-85 hover:opacity-100">
                        <div className="flex justify-between items-center text-[10px] border-b border-glass/30 pb-2">
                          <span className="font-mono font-bold text-primary">{order.id}</span>
                          <span className="uppercase font-extrabold text-success flex items-center gap-1"><CheckCircle size={10} /> Completed</span>
                        </div>
                        <div className="space-y-2 text-[10px] leading-relaxed">
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Establishment:</span> <span className="font-bold text-text-primary">{order.restaurant}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Customer:</span> <span className="font-bold text-text-primary">{order.customer?.name || 'Guest'}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Delivery Address:</span> <span className="text-text-secondary block font-medium mt-0.5">{order.customer?.address || 'N/A'}</span></p>
                          <p><span className="text-text-muted uppercase tracking-wider font-semibold">Delivered By:</span> <span className="text-success font-bold inline-flex items-center gap-1"><UserCheck size={11} /> {order.assignedRider || 'N/A'}</span></p>
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
    </div>
  );
};

export default AdminDashboard;
