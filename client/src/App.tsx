import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Lenis from 'lenis';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { CursorGlow } from './components/common/CursorGlow';
import { CartSidebar } from './components/common/CartSidebar';
import { AuthModals } from './components/common/AuthModals';
import { Home } from './pages/Home';
import { RestaurantsPage } from './pages/RestaurantsPage';
import { RestaurantDetailsPage } from './pages/RestaurantDetailsPage';
import { CartPage } from './pages/CartPage';
import { CustomerOrdersPage } from './pages/CustomerOrdersPage';
import { CartNotificationToast } from './components/common/CartNotificationToast';
import { FloatingCartBar } from './components/common/FloatingCartBar';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminOrderDetailsPage } from './pages/AdminOrderDetailsPage';
import { AdminCreateDeliveryPartnerPage } from './pages/AdminCreateDeliveryPartnerPage';
import { RestaurantDashboard } from './pages/RestaurantDashboard';
import { DeliveryDashboard } from './pages/DeliveryDashboard';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const AppContent: React.FC = () => {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; type: 'login' | 'register' }>({
    isOpen: false,
    type: 'login',
  });

  // Lenis Smooth Scroll Initialization
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  const openAuthModal = (type: 'login' | 'register') => {
    setAuthModal({ isOpen: true, type });
  };

  const closeAuthModal = () => {
    setAuthModal((prev) => ({ ...prev, isOpen: false }));
  };

  const setAuthType = (type: 'login' | 'register') => {
    setAuthModal((prev) => ({ ...prev, type }));
  };

  const location = useLocation();
  const isPortalRoute = location.pathname.startsWith('/admin') || 
                        location.pathname.startsWith('/restaurant/') || 
                        location.pathname === '/restaurant' || 
                        location.pathname.startsWith('/delivery') ||
                        location.pathname === '/login';

  return (
    <div className="relative min-h-screen bg-bg-dark text-text-primary selection:bg-primary/30 selection:text-primary overflow-x-hidden transition-colors duration-400">
      {/* Background glow trail */}
      <CursorGlow />

      {/* Global Elements */}
      {!isPortalRoute && <Navbar onOpenAuth={openAuthModal} />}
      <CartSidebar />
      <CartNotificationToast />
      <FloatingCartBar />
      <AuthModals
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        type={authModal.type}
        setType={setAuthType}
      />

      {/* Main Page Content */}
      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<Home onOpenAuth={openAuthModal} />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/restaurants/:id" element={<RestaurantDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<CustomerOrdersPage />} />
          <Route path="/login" element={<Login />} />
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
          <Route path="/restaurant" element={<Login />} />
          <Route path="/restaurant/login" element={<Login />} />
          <Route
            path="/restaurant/dashboard"
            element={
              <ProtectedRoute allowedRoles={['RESTAURANT']}>
                <RestaurantDashboard />
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

      {!isPortalRoute && <Footer />}
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
