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
  Sun,
  Moon,
  ChevronRight,
  Menu as MenuIcon,
  X,
  ToggleLeft,
  ToggleRight,
  Check,
  ArrowLeft,
  Globe
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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

  // Auth & Restaurant Profile state
  const [restaurant, setRestaurant] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'orders' | 'profile' | 'settings'>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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

  const [foodForm, setFoodForm] = useState({
    name: '',
    description: '',
    category: 'Starters',
    price: '',
    prepTime: '15-20 mins',
    isVeg: true,
    image: '',
    isAvailable: true
  });

  // Categories State
  const [categories, setCategories] = useState<string[]>(['Starters', 'Main Course', 'Breads', 'Desserts', 'Beverages']);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Orders State
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    openingTime: '11:00 AM',
    closingTime: '11:00 PM',
    image: '',
    description: '',
    cuisine: 'Multi-Cuisine'
  });

  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [isProfileImageUploading, setIsProfileImageUploading] = useState(false);

  // Settings State
  const [soundAlerts, setSoundAlerts] = useState(true);

  // Restaurant Open/Close Status State
  const [isRestaurantOpen, setIsRestaurantOpen] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // 1. Initial Load & Auth check
  useEffect(() => {
    const rawAuth = localStorage.getItem('restaurantAuth') || sessionStorage.getItem('restaurantAuth');
    if (!rawAuth) {
      navigate('/restaurant/login');
      return;
    }
    try {
      const parsed = JSON.parse(rawAuth);
      if (parsed && parsed.restaurant) {
        setRestaurant(parsed.restaurant);
        setProfileForm({
          name: parsed.restaurant.name || '',
          ownerName: parsed.restaurant.ownerName || '',
          email: parsed.restaurant.email || '',
          phone: parsed.restaurant.phone || '',
          address: parsed.restaurant.address || '',
          openingTime: parsed.restaurant.openingTime || '11:00 AM',
          closingTime: parsed.restaurant.closingTime || '11:00 PM',
          image: parsed.restaurant.image || '',
          description: parsed.restaurant.description || 'Gourmet establishment serving handcrafted culinary delights.',
          cuisine: parsed.restaurant.cuisine || 'Multi-Cuisine'
        });
        if (typeof parsed.restaurant.isOpen === 'boolean') {
          setIsRestaurantOpen(parsed.restaurant.isOpen);
        }
        loadRestaurantData(parsed.restaurant.id || parsed.restaurant.name);
      } else {
        navigate('/restaurant/login');
      }
    } catch (e) {
      navigate('/restaurant/login');
    }
  }, [navigate]);

  // Load Menu, Categories, Orders and Restaurant Status
  const loadRestaurantData = async (resId: string) => {
    // Load Restaurant Status
    try {
      const statusResp = await axios.get(`${API_BASE_URL}/restaurant/status/${resId}`);
      if (statusResp.data && typeof statusResp.data.isOpen === 'boolean') {
        setIsRestaurantOpen(statusResp.data.isOpen);
      }
    } catch (e) {
      console.warn('Failed to fetch restaurant status:', e);
    }

    // Load Categories
    try {
      const catResp = await axios.get(`${API_BASE_URL}/restaurant/categories/${resId}`);
      if (catResp.data.success && catResp.data.categories && catResp.data.categories.length > 0) {
        setCategories(catResp.data.categories);
      }
    } catch (e) {
      console.warn('Failed to fetch categories:', e);
    }

    // Load Menu
    try {
      const resp = await axios.get(`${API_BASE_URL}/restaurant/menu/${resId}`);
      if (resp.data.success && resp.data.items && resp.data.items.length > 0) {
        setMenuItems(resp.data.items);
      } else {
        setMenuItems(getInitialMenuItems(resId));
      }
    } catch (e) {
      setMenuItems(getInitialMenuItems(resId));
    }

    // Load Orders
    try {
      const resp = await axios.get(`${API_BASE_URL}/restaurant/orders/${resId}`);
      if (resp.data.success && resp.data.orders && resp.data.orders.length > 0) {
        setOrders(resp.data.orders);
      } else {
        setOrders(getInitialOrders(resId));
      }
    } catch (e) {
      setOrders(getInitialOrders(resId));
    }
  };

  // Toggle Restaurant Open / Close Status
  const handleToggleRestaurantStatus = async () => {
    const nextStatus = !isRestaurantOpen;
    setIsRestaurantOpen(nextStatus); // Instant UI Update
    setIsUpdatingStatus(true);

    const resId = restaurant?.id || restaurant?.name || 'default';
    const updatedRes = { ...restaurant, isOpen: nextStatus, status: nextStatus ? 'open' : 'closed' };
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
    } catch (err) {
      console.error('Failed to update restaurant status on backend:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const trimmed = newCategoryName.trim();
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryError('Category already exists!');
      return;
    }

    setIsSavingCategory(true);
    setCategoryError(null);

    const resId = restaurant?.id || restaurant?.name || 'RES-001';

    try {
      const resp = await axios.post(`${API_BASE_URL}/restaurant/categories/${resId}`, {
        name: trimmed
      });

      if (resp.data.success && resp.data.categories) {
        setCategories(resp.data.categories);
        logActivity('menu', `Added new category "${trimmed}".`);
        setNewCategoryName('');
        setIsAddCategoryOpen(false);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to add category.';
      setCategoryError(errorMsg);
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Initial Menu Fallback
  const getInitialMenuItems = (_resId: string): FoodItem[] => [];

  // Initial Orders Fallback
  const getInitialOrders = (_resId: string): OrderItem[] => [];

  // Helper: Activity logger
  const logActivity = (type: string, title: string) => {
    setActivities(prev => [{ id: `act-${Date.now()}`, type, title, time: 'Just now' }, ...prev.slice(0, 7)]);
  };

  // Logout
  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('restaurantAuth');
    sessionStorage.removeItem('restaurantAuth');
    setIsLogoutModalOpen(false);
    navigate('/restaurant/login');
  };

  // --------------------------------------------------------------------------
  // MENU MANAGEMENT HANDLERS
  // --------------------------------------------------------------------------
  const openAddFoodModal = () => {
    setEditingFood(null);
    setFoodForm({
      name: '',
      description: '',
      category: 'Main Course',
      price: '',
      prepTime: '15-20 mins',
      isVeg: true,
      image: '',
      isAvailable: true
    });
    setFoodFormError(null);
    setFoodImageUploadSuccess(false);
    setIsFoodModalOpen(true);
  };

  const openEditFoodModal = (item: FoodItem) => {
    setEditingFood(item);
    setFoodForm({
      name: item.name,
      description: item.description,
      category: item.category,
      price: String(item.price),
      prepTime: item.prepTime,
      isVeg: item.isVeg,
      image: item.image,
      isAvailable: item.isAvailable
    });
    setFoodFormError(null);
    setFoodImageUploadSuccess(false);
    setIsFoodModalOpen(true);
  };

  // Image Upload handler for Food Modal using S3 Endpoint
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

          if (resp.data.success && resp.data.fileUrl) {
            setFoodForm(prev => ({ ...prev, image: resp.data.fileUrl }));
            setFoodImageUploadSuccess(true);
          }
        } catch (err) {
          console.warn('S3 upload failed, using local preview:', err);
          setFoodForm(prev => ({ ...prev, image: reader.result as string }));
          setFoodImageUploadSuccess(false);
        } finally {
          setIsFoodImageUploading(false);
        }
      };
    }
  };

  const saveFoodItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFoodFormError(null);

    const { name, description, category, price, prepTime, isVeg, image, isAvailable } = foodForm;

    if (!name.trim()) {
      setFoodFormError('Food name is required.');
      return;
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setFoodFormError('Please enter a valid positive price.');
      return;
    }

    const defaultImg = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=85';
    const finalImage = image.trim() || defaultImg;

    const resId = restaurant?.id || 'RES-001';

    if (editingFood) {
      // Edit mode
      const updatedItem: FoodItem = {
        ...editingFood,
        name: name.trim(),
        description: description.trim(),
        category,
        price: Number(price),
        prepTime: prepTime.trim() || '15 mins',
        isVeg,
        image: finalImage,
        isAvailable,
        status: isAvailable ? 'active' : 'disabled'
      };

      setMenuItems(prev => prev.map(m => m.id === editingFood.id ? updatedItem : m));

      try {
        await axios.post(`${API_BASE_URL}/restaurant/menu`, updatedItem);
      } catch (err) {
        console.warn('Backend update failed:', err);
      }

      logActivity('menu', `Food item "${updatedItem.name}" was updated.`);
    } else {
      // Add mode
      const newItem: FoodItem = {
        id: `food_${Date.now()}`,
        restaurantId: resId,
        name: name.trim(),
        description: description.trim(),
        category,
        price: Number(price),
        prepTime: prepTime.trim() || '15 mins',
        isVeg,
        image: finalImage,
        isAvailable,
        status: isAvailable ? 'active' : 'disabled'
      };

      setMenuItems(prev => [newItem, ...prev]);

      try {
        await axios.post(`${API_BASE_URL}/restaurant/menu`, newItem);
      } catch (err) {
        console.warn('Backend save failed:', err);
      }

      logActivity('menu', `New food item "${newItem.name}" added to menu.`);
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
  const updateOrderStatus = async (orderId: string, newStatus: OrderItem['orderStatus']) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = { ...o, orderStatus: newStatus };
        axios.put(`${API_BASE_URL}/restaurant/orders/${orderId}/status`, { status: newStatus, restaurantId: restaurant?.id }).catch(() => { });
        logActivity('order', `Order ${orderId} status changed to ${newStatus}.`);
        return updated;
      }
      return o;
    }));
  };

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(orderSearch.toLowerCase()) || o.customerName.toLowerCase().includes(orderSearch.toLowerCase());
    const matchesStatus = orderStatusFilter === 'All' || o.orderStatus === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Today Stats Calculations
  const todayOrdersCount = orders.length;
  const pendingCount = orders.filter(o => o.orderStatus === 'Pending').length;
  const preparingCount = orders.filter(o => o.orderStatus === 'Preparing' || o.orderStatus === 'Accepted').length;
  const readyCount = orders.filter(o => o.orderStatus === 'Ready').length;
  const completedCount = orders.filter(o => o.orderStatus === 'Completed').length;
  const todayRevenue = orders.reduce((sum, o) => sum + (o.orderStatus !== 'Rejected' ? o.total : 0), 0);

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
    setIsProfileSaving(true);
    setProfileSuccessMsg(null);

    const updatedRes = {
      ...restaurant,
      name: profileForm.name,
      ownerName: profileForm.ownerName,
      phone: profileForm.phone,
      address: profileForm.address,
      openingTime: profileForm.openingTime,
      closingTime: profileForm.closingTime,
      image: profileForm.image,
      description: profileForm.description,
      cuisine: profileForm.cuisine
    };

    setRestaurant(updatedRes);

    // Save in storage
    const rawAuth = localStorage.getItem('restaurantAuth') || sessionStorage.getItem('restaurantAuth');
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      parsed.restaurant = updatedRes;
      if (localStorage.getItem('restaurantAuth')) {
        localStorage.setItem('restaurantAuth', JSON.stringify(parsed));
      } else {
        sessionStorage.setItem('restaurantAuth', JSON.stringify(parsed));
      }
    }

    try {
      await axios.put(`${API_BASE_URL}/restaurant/profile/${updatedRes.id}`, updatedRes);
    } catch (err) {
      console.warn('Profile sync warning:', err);
    }

    setIsProfileSaving(false);
    setProfileSuccessMsg('Profile updated successfully!');
    logActivity('profile', 'Restaurant profile details updated.');
    setTimeout(() => setProfileSuccessMsg(null), 4000);
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
              <Utensils size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary block">MK DELIVERY</span>
              <h2 className="text-sm font-black font-display tracking-tight text-text-primary truncate w-36">
                {restaurant?.name || 'Restaurant Console'}
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
      {/* MOBILE NAVBAR & DRAWER */}
      {/* ==================================================== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-bg-dark/90 backdrop-blur-md border-b border-glass px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-lg bg-glass text-text-primary"
          >
            {isMobileSidebarOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary block">RESTAURANT PORTAL</span>
            <span className="text-xs font-black text-text-primary">{restaurant?.name || 'Dashboard'}</span>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-glass text-text-muted hover:text-primary"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: -250 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -250 }}
            className="lg:hidden fixed inset-0 z-30 bg-bg-dark/95 backdrop-blur-2xl p-6 flex flex-col justify-between pt-20"
          >
            <div className="space-y-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as any); setIsMobileSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-bold text-xs ${isActive ? 'bg-primary text-bg-dark font-black' : 'text-text-secondary bg-glass'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary">{item.badge}</span>}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl border border-error/30 bg-error/10 text-error font-bold text-xs flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MAIN CONTENT WORKSPACE CONTAINER */}
      {/* ==================================================== */}
      <main
        data-lenis-prevent="true"
        className="flex-1 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 lg:h-screen lg:overflow-y-auto w-full min-w-0"
      >
        {/* ==================================================== */}
        {/* DASHBOARD TAB */}
        {/* ==================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn w-full">
            {/* Welcome Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-6">
              <div>
                <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">{t('establishment_overview')}</span>
                <h1 className="text-2xl sm:text-3xl font-black font-display text-primary tracking-tight">
                  {t('welcome_back')}, {restaurant?.ownerName || 'Partner'}
                </h1>
                <p className="text-xs text-text-muted mt-1">{t('overview_desc')}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Language Selector Dropdown */}
                <div className="px-3.5 py-2 rounded-xl border border-glass bg-glass hover:bg-glass-subtle flex items-center gap-2 transition-all shadow-sm">
                  <Globe size={14} className="text-primary shrink-0" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="bg-transparent text-xs font-extrabold text-text-primary focus:outline-none cursor-pointer"
                  >
                    <option value="en" className="bg-bg-dark text-text-primary">English</option>
                    <option value="te" className="bg-bg-dark text-text-primary">తెలుగు</option>
                    <option value="hi" className="bg-bg-dark text-text-primary">हिन्दी</option>
                  </select>
                </div>

                <button
                  onClick={() => setActiveTab('menu')}
                  className="px-4 py-2.5 rounded-xl border border-glass bg-glass hover:bg-glass-subtle text-xs font-bold uppercase tracking-wider text-text-primary transition-all flex items-center gap-2"
                >
                  <PlusCircle size={14} className="text-primary" />
                  <span>{t('manage_menu')}</span>
                </button>
              </div>
            </div>

            {/* Restaurant Status Card (Placed below Manage Menu button) */}
            <div className={`glass-panel border rounded-2xl p-5 shadow-luxury transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isRestaurantOpen
                ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20'
                : 'border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20'
              }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isRestaurantOpen
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">{t('restaurant_status')}</h3>
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className={`text-lg font-black tracking-tight ${isRestaurantOpen ? 'text-emerald-500 font-display' : 'text-rose-500 font-display'
                      }`}>
                      {isRestaurantOpen ? t('restaurant_open') : t('restaurant_closed')}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${isRestaurantOpen
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                      }`}>
                      {isRestaurantOpen ? t('badge_open') : t('badge_closed')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-3">
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

            {/* Stat Cards Grid (6 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="glass-panel border border-glass rounded-2xl p-4 shadow-md hover:border-primary/40 transition-all">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">{t('todays_orders')}</span>
                <div className="text-2xl font-black font-display text-text-primary mt-2">{todayOrdersCount}</div>
                <span className="text-[10px] text-text-muted mt-1 block">{t('total_received')}</span>
              </div>

              <div className="glass-panel border border-amber-500/30 bg-amber-500/5 rounded-2xl p-4 shadow-md">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">{t('pending')}</span>
                <div className="text-2xl font-black font-display text-amber-500 mt-2">{pendingCount}</div>
                <span className="text-[10px] text-amber-500/70 mt-1 block">{t('awaiting_response')}</span>
              </div>

              <div className="glass-panel border border-blue-500/30 bg-blue-500/5 rounded-2xl p-4 shadow-md">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">{t('preparing')}</span>
                <div className="text-2xl font-black font-display text-blue-400 mt-2">{preparingCount}</div>
                <span className="text-[10px] text-blue-400/70 mt-1 block">{t('in_kitchen')}</span>
              </div>

              <div className="glass-panel border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-4 shadow-md">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">{t('ready')}</span>
                <div className="text-2xl font-black font-display text-emerald-400 mt-2">{readyCount}</div>
                <span className="text-[10px] text-emerald-400/70 mt-1 block">{t('for_pickup')}</span>
              </div>

              <div className="glass-panel border border-glass rounded-2xl p-4 shadow-md">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">{t('completed')}</span>
                <div className="text-2xl font-black font-display text-text-primary mt-2">{completedCount}</div>
                <span className="text-[10px] text-text-muted mt-1 block">{t('delivered')}</span>
              </div>

              <div className="glass-panel border border-primary/40 bg-primary/5 rounded-2xl p-4 shadow-md">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">{t('todays_revenue')}</span>
                <div className="text-2xl font-black font-display text-primary mt-2">₹{todayRevenue.toFixed(2)}</div>
                <span className="text-[10px] text-primary/70 mt-1 block">{t('gross_earnings')}</span>
              </div>
            </div>

            {/* Layout Split: Latest Orders Table + Recent Activity Panel */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Left 2 Cols: Latest Orders Table */}
              <div className="xl:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-display text-primary tracking-tight">Latest Customer Orders</h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>View All Orders ({orders.length})</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="glass-panel border border-glass rounded-2xl overflow-hidden shadow-luxury">
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
                            <td className="p-4 max-w-xs truncate">{o.items}</td>
                            <td className="p-4 font-bold text-text-primary">₹{o.total.toFixed(2)}</td>
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
                              {o.orderStatus === 'Pending' && (
                                <button
                                  onClick={() => updateOrderStatus(o.id, 'Accepted')}
                                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-bg-dark text-[10px] font-black uppercase tracking-wider transition-all"
                                >
                                  Accept
                                </button>
                              )}
                              {o.orderStatus === 'Accepted' && (
                                <button
                                  onClick={() => updateOrderStatus(o.id, 'Preparing')}
                                  className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider transition-all"
                                >
                                  Prepare
                                </button>
                              )}
                              {o.orderStatus === 'Preparing' && (
                                <button
                                  onClick={() => updateOrderStatus(o.id, 'Ready')}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider transition-all"
                                >
                                  Mark Ready
                                </button>
                              )}
                              {(o.orderStatus === 'Ready' || o.orderStatus === 'Completed' || o.orderStatus === 'Rejected') && (
                                <span className="text-[10px] text-text-muted italic">No action</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Col: Recent Activities */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold font-display text-primary tracking-tight">Recent Activity</h3>
                <div className="glass-panel border border-glass rounded-2xl p-5 shadow-luxury space-y-4">
                  {activities.map(act => (
                    <div key={act.id} className="flex gap-3 items-start p-3 rounded-xl bg-glass-subtle/50 border border-glass/40">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Clock size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-text-primary">{act.title}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">{act.time}</div>
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
                    <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Culinary Item Onboarding</span>
                    <h2 className="text-2xl md:text-3xl font-black font-display text-primary tracking-tight">
                      {editingFood ? 'Edit Food Item' : 'Add New Food Item'}
                    </h2>
                    <p className="text-xs text-text-muted mt-1">Provide item details, pricing, dietary specifications, and cover image.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFoodModalOpen(false)}
                    className="self-start sm:self-auto flex items-center gap-2 px-5 py-3 rounded-xl border border-glass bg-glass hover:bg-glass-subtle hover:text-primary font-bold text-xs uppercase tracking-wider transition-all duration-300"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Menu Catalog</span>
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
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Food Name *</label>
                      <input
                        type="text"
                        required
                        value={foodForm.name}
                        onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                        placeholder="e.g. Hyderabadi Chicken Biryani"
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Price ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={foodForm.price}
                        onChange={(e) => setFoodForm({ ...foodForm, price: e.target.value })}
                        placeholder="e.g. 15.50"
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all placeholder-text-muted/40 font-medium text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Preparation Time</label>
                      <input
                        type="text"
                        value={foodForm.prepTime}
                        onChange={(e) => setFoodForm({ ...foodForm, prepTime: e.target.value })}
                        placeholder="e.g. 15-20 mins"
                        className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none transition-all placeholder-text-muted/40 font-medium text-sm"
                      />
                    </div>
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
                        <span className="font-bold text-sm text-text-primary">Available for Customer Orders</span>
                      </label>
                    </div>
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
                  <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Culinary Catalog</span>
                  <h1 className="text-2xl sm:text-3xl font-black font-display text-primary tracking-tight">Menu Management</h1>
                  <p className="text-xs text-text-muted mt-1">Manage food items, prices, availability, and categories for your establishment.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => { setIsAddCategoryOpen(true); setCategoryError(null); }}
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
                    <span>Add Food Item</span>
                  </button>
                </div>
              </div>

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
                          <span className="font-black text-sm text-primary shrink-0">₹{item.price.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{item.description}</p>

                        <div className="pt-2 flex items-center justify-between text-[10px] text-text-muted font-bold border-t border-glass/40">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-primary" />
                            <span>{item.prepTime}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions (FEATURE 3: Toggle switch beside Edit button) */}
                    <div className="p-3 bg-glass-subtle/30 border-t border-glass flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFoodAvailability(item.id)}
                        className={`px-3 py-1.5 rounded-lg border font-bold text-[11px] transition-all flex items-center gap-1.5 ${item.isAvailable
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                          }`}
                        title={item.isAvailable ? t('available') : t('out_of_stock')}
                      >
                        <span className={`w-2 h-2 rounded-full ${item.isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                        <span>{item.isAvailable ? t('available') : t('out_of_stock')}</span>
                      </button>

                      <button
                        onClick={() => openEditFoodModal(item)}
                        className="flex-1 py-1.5 rounded-lg border border-glass bg-glass hover:bg-glass-subtle text-text-secondary hover:text-primary font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit2 size={12} />
                        <span>{t('edit')}</span>
                      </button>
                      <button
                        onClick={() => deleteFoodItem(item.id)}
                        className="p-1.5 rounded-lg border border-glass hover:border-error/40 hover:text-error text-text-muted transition-all"
                        title={t('delete')}
                      >
                        <Trash2 size={14} />
                      </button>
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
            <div className="glass-panel border border-glass rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-md">
              <div className="relative w-full sm:w-80">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by Order ID or Customer..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-lg bg-bg-dark border border-glass focus:border-primary/40 text-text-primary placeholder-text-muted/60 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {['All', 'Pending', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Rejected'].map(st => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${orderStatusFilter === st ? 'bg-primary text-bg-dark font-black' : 'bg-glass text-text-secondary hover:text-primary'
                      }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Table */}
            <div className="glass-panel border border-glass rounded-2xl overflow-hidden shadow-luxury">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg-dark/80 border-b border-glass text-[10px] uppercase tracking-wider text-text-muted font-bold">
                    <tr>
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Customer Details</th>
                      <th className="p-4">Items Ordered</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Order Status</th>
                      <th className="p-4 text-right">Update Status Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass font-medium text-text-secondary">
                    {filteredOrders.map(o => (
                      <tr key={o.id} className="hover:bg-glass/40 transition-colors">
                        <td className="p-4 font-mono font-bold text-primary">{o.id}</td>
                        <td className="p-4">
                          <div className="font-bold text-text-primary">{o.customerName}</div>
                          <div className="text-[10px] text-text-muted">{o.customerPhone} • {o.customerAddress}</div>
                        </td>
                        <td className="p-4 max-w-xs">{o.items}</td>
                        <td className="p-4 font-bold text-text-primary">${o.total.toFixed(2)}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase ${o.orderStatus === 'Pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              o.orderStatus === 'Accepted' || o.orderStatus === 'Preparing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                o.orderStatus === 'Ready' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  o.orderStatus === 'Completed' ? 'bg-glass text-text-muted border border-glass' :
                                    'bg-error/10 text-error border border-error/20'
                            }`}>
                            {o.orderStatus}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <select
                            value={o.orderStatus}
                            onChange={(e) => updateOrderStatus(o.id, e.target.value as any)}
                            className="px-3 py-1.5 rounded-lg bg-bg-dark border border-glass text-xs font-bold text-text-primary outline-none focus:border-primary/50"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Preparing">Preparing</option>
                            <option value="Ready">Ready (For Delivery)</option>
                            <option value="Completed">Completed</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* PROFILE TAB */}
        {/* ==================================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fadeIn w-full">
            <div className="border-b border-glass pb-6">
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Establishment Details</span>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-primary tracking-tight">Restaurant Profile</h1>
              <p className="text-xs text-text-muted mt-1">Update your restaurant information, timings, address, and cover image.</p>
            </div>

            <div className="glass-panel border border-glass rounded-2xl p-6 sm:p-8 shadow-luxury w-full">
              {profileSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6 flex gap-2 items-center">
                  <CheckCircle size={16} />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={saveProfile} className="space-y-6 text-xs font-semibold text-text-secondary w-full">
                {/* 2 Cols */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Restaurant Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none font-medium text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Owner Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.ownerName}
                      onChange={(e) => setProfileForm({ ...profileForm, ownerName: e.target.value })}
                      className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none font-medium text-sm"
                    />
                  </div>
                </div>

                {/* Read-Only Credentials Section */}
                <div className="p-4 rounded-xl bg-glass-subtle/40 border border-glass space-y-3">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary block">Admin Managed Credentials (Read-Only)</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Email Address</label>
                      <input
                        type="text"
                        disabled
                        value={profileForm.email}
                        className="w-full bg-bg-dark/40 border border-glass/40 text-text-muted px-3.5 py-2.5 rounded-lg outline-none font-mono text-xs cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Password</label>
                      <input
                        type="password"
                        disabled
                        value="••••••••"
                        className="w-full bg-bg-dark/40 border border-glass/40 text-text-muted px-3.5 py-2.5 rounded-lg outline-none font-mono text-xs cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact & Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none font-medium text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Cuisine Specialty</label>
                    <input
                      type="text"
                      value={profileForm.cuisine}
                      onChange={(e) => setProfileForm({ ...profileForm, cuisine: e.target.value })}
                      placeholder="e.g. Gourmet Pizza, South Indian, Hyderabadi"
                      className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none font-medium text-sm"
                    />
                  </div>
                </div>

                {/* Timings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Opening Time</label>
                    <input
                      type="text"
                      value={profileForm.openingTime}
                      onChange={(e) => setProfileForm({ ...profileForm, openingTime: e.target.value })}
                      className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none font-medium text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Closing Time</label>
                    <input
                      type="text"
                      value={profileForm.closingTime}
                      onChange={(e) => setProfileForm({ ...profileForm, closingTime: e.target.value })}
                      className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none font-medium text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Physical Address</label>
                  <input
                    type="text"
                    required
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none font-medium text-sm"
                  />
                </div>

                {/* Restaurant Image Upload */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">Restaurant Image (S3 Upload)</label>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-3 rounded-xl border border-glass bg-glass-subtle hover:bg-glass hover:text-primary transition-all text-xs font-bold">
                      <UploadCloud size={16} />
                      <span>{isProfileImageUploading ? 'Uploading to S3...' : 'Upload New Cover Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfileImageUpload}
                        disabled={isProfileImageUploading}
                      />
                    </label>
                    {profileForm.image && (
                      <img src={profileForm.image} alt="Cover" className="w-16 h-16 rounded-xl object-cover border border-glass shadow-sm" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none font-medium text-sm resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isProfileSaving}
                    className="px-8 py-3 bg-primary hover:bg-primary-dark text-bg-dark font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-lg transition-all"
                  >
                    {isProfileSaving ? 'Saving Profile...' : 'Save Profile Changes'}
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
                  <h3 className="text-xl font-bold font-display text-primary tracking-tight">Add New Category</h3>
                  <p className="text-xs text-text-muted mt-0.5">Create a custom culinary category for your menu.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
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
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Chef Specials, Tandoori, Soups..."
                    className="w-full bg-bg-dark/70 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none font-medium text-sm"
                  />
                </div>

                {/* Display Current Categories */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Existing Categories ({categories.length})</label>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-bg-dark/50 border border-glass max-h-32 overflow-y-auto">
                    {categories.map((cat) => (
                      <span key={cat} className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-extrabold">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-glass flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-glass bg-glass-subtle text-text-secondary font-bold text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCategory}
                    className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-bg-dark font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all"
                  >
                    {isSavingCategory ? 'Saving...' : 'Save Category'}
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
      </AnimatePresence>
    </div>
  );
};

export default RestaurantDashboard;
