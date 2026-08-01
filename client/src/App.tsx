import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Lenis from 'lenis';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { CursorGlow } from './components/common/CursorGlow';
import { CartSidebar } from './components/common/CartSidebar';
import { AuthModals } from './components/common/AuthModals';
import { Home } from './pages/Home';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminRouteGuard } from './components/common/AdminRouteGuard';

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

    // Sync Lenis scroll with GSAP ScrollTrigger if GSAP is loaded
    // We will do simple custom scroll triggering to keep performance high

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
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="relative min-h-screen bg-bg-dark text-text-primary selection:bg-primary/30 selection:text-primary overflow-x-hidden transition-colors duration-400">
      {/* Background glow trail */}
      <CursorGlow />

      {/* Global Elements */}
      {!isAdminRoute && <Navbar onOpenAuth={openAuthModal} />}
      <CartSidebar />
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
          <Route path="/admin" element={<AdminLogin />} />
          <Route
            path={String("/admin/dashboard")}
            element={
              <AdminRouteGuard>
                <AdminDashboard />
              </AdminRouteGuard>
            }
          />
        </Routes>
      </main>

      {!isAdminRoute && <Footer />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <CartProvider>
          <Router>
            <AppContent />
          </Router>
        </CartProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
};

export default App;
