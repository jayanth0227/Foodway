import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Lenis from 'lenis';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import Footer from "./components/common/Footer";
import { CartSidebar } from './components/common/CartSidebar';
import { Home } from './pages/Home';
import { ShopsPage } from './pages/ShopsPage';
import { ShopDetailsPage } from './pages/ShopDetailsPage';
import { CartPage } from './pages/CartPage';
import { CustomerOrdersPage } from './pages/CustomerOrdersPage';
import { FloatingCartBar } from './components/common/FloatingCartBar';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminOrderDetailsPage } from './pages/AdminOrderDetailsPage';
import { AdminCreateDeliveryPartnerPage } from './pages/AdminCreateDeliveryPartnerPage';
import { ShopDashboard } from './pages/ShopDashboard';
import { DeliveryDashboard } from './pages/DeliveryDashboard';
import { CategoriesPage } from './pages/CategoriesPage';
import { DishesPage } from './pages/DishesPage';
import { WishlistPage } from './pages/WishlistPage';
import { ProfilePage } from './pages/ProfilePage';
import { AddressFormPage } from './pages/AddressFormPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OfflineDetector } from './components/common/OfflineDetector';


import { requestNotificationPermission } from "./utils/requestNotificationPermission";
import { setupForegroundMessageListener } from "./utils/onForegroundMessage";

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lenisRef = React.useRef<Lenis | null>(null);

  // Lenis Smooth Scroll Initialization & Browser Scroll Restoration Config
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const openAuthModal = (type: 'login' | 'register') => {
    navigate(type === 'register' ? '/register' : '/login', { state: { authType: type } });
  };

  useEffect(() => {
    requestNotificationPermission();
    setupForegroundMessageListener();
  }, []);

  // Scroll window to top (Start to End) on every page/route transition
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [location.pathname, location.search]);

  const isPortalRoute = location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/shop/dashboard') ||
    location.pathname.startsWith('/restaurant/dashboard') ||
    location.pathname.startsWith('/delivery') ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  return (
    <div className="relative min-h-screen bg-bg-dark text-text-primary selection:bg-primary/30 selection:text-primary overflow-x-hidden transition-colors duration-400">
      {/* Global Elements */}
      {!isPortalRoute && <Navbar onOpenAuth={openAuthModal} />}
      <CartSidebar />
      <FloatingCartBar />
      <OfflineDetector />

      {/* Main Page Content */}
      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<Home onOpenAuth={openAuthModal} />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/dishes" element={<DishesPage />} />
          <Route path="/items" element={<DishesPage />} />
          <Route path="/restaurants" element={<ShopsPage />} />
          <Route path="/shops" element={<ShopsPage />} />
          <Route path="/restaurants/:id" element={<ShopDetailsPage />} />
          <Route path="/shops/:id" element={<ShopDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/orders" element={<CustomerOrdersPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/address/new"
            element={
              <ProtectedRoute>
                <AddressFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/address/edit/:addressId"
            element={
              <ProtectedRoute>
                <AddressFormPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          <Route path="/admin" element={<Login />} />
          <Route path="/admin/login" element={<Login />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/delivery-locations"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard initialTab="locations" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/locations"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard initialTab="locations" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/orders/:orderId"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminOrderDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/delivery-partners/new"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminCreateDeliveryPartnerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/delivery-partners/create"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminCreateDeliveryPartnerPage />
              </ProtectedRoute>
            }
          />
          <Route path="/shop" element={<Login />} />
          <Route path="/shop/login" element={<Login />} />
          <Route path="/restaurant" element={<Login />} />
          <Route path="/restaurant/login" element={<Login />} />
          <Route
            path="/shop/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SHOP', 'RESTAURANT', 'ADMIN']}>
                <ShopDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SHOP', 'RESTAURANT', 'ADMIN']}>
                <ShopDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/delivery" element={<Login />} />
          <Route path="/delivery/login" element={<Login />} />
          <Route
            path="/delivery/dashboard"
            element={
              <ProtectedRoute allowedRoles={['DELIVERY_PARTNER', 'ADMIN']}>
                <DeliveryDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Render Footer ONLY on Home Page ('/') for web and mobile */}
      {location.pathname === '/' && <Footer />}
    </div>

  );
};

export const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <CartProvider>
              <Router>
                <AppContent />
              </Router>
            </CartProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
};

export default App;
