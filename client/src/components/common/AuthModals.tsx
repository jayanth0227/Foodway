import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';

interface AuthModalsProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'login' | 'register';
  setType: (type: 'login' | 'register') => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({ isOpen, onClose, type, setType }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (type === 'login') {
        // Try admin login first
        try {
          const adminResponse = await axios.post(`${API_BASE_URL}/admin/login`, {
            email,
            password,
          });

          if (adminResponse.data.success && adminResponse.data.admin?.role === 'admin') {
            const authData = {
              isLoggedIn: true,
              email: adminResponse.data.admin.email,
              role: adminResponse.data.admin.role,
              token: adminResponse.data.admin.token,
            };
            localStorage.setItem('adminAuth', JSON.stringify(authData));
            localStorage.removeItem('userAuth');
            onClose();
            navigate('/admin/dashboard');
            return;
          }
        } catch (adminErr) {
          // Fallback to customer login
          const userResponse = await axios.post(`${API_BASE_URL}/user/login`, {
            email,
            password,
          });

          if (userResponse.data.success) {
            const authData = {
              isLoggedIn: true,
              id: userResponse.data.user.id,
              email: userResponse.data.user.email,
              name: userResponse.data.user.name,
              phone: userResponse.data.user.phone,
              role: userResponse.data.user.role,
            };
            localStorage.setItem('userAuth', JSON.stringify(authData));
            localStorage.removeItem('adminAuth');
            onClose();
            window.location.reload();
            return;
          }
        }
      } else {
        // User registration
        const response = await axios.post(`${API_BASE_URL}/user/register`, {
          name,
          email,
          password,
          phone,
        });

        if (response.data.success) {
          const authData = {
            isLoggedIn: true,
            id: response.data.user.id,
            email: response.data.user.email,
            name: response.data.user.name,
            phone: response.data.user.phone,
            role: response.data.user.role,
          };
          localStorage.setItem('userAuth', JSON.stringify(authData));
          localStorage.removeItem('adminAuth');
          onClose();
          window.location.reload();
          return;
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Authentication failed. Please verify your credentials or server connection.'
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl glass-panel border border-glass p-8 z-10 glow-gold"
          >
            {/* Ambient background glow inside modal */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-primary/10 blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-accent/10 blur-[60px] pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors p-1 rounded-full hover:bg-glass-subtleHover"
            >
              <X size={20} />
            </button>

            {/* Logo & Header */}
            <div className="flex flex-col items-center mb-8">
              <img
                src="/logo.jpeg"
                alt="MK Delivery Services Logo"
                className="w-16 h-16 rounded-full object-cover border border-primary/40 shadow-lg mb-3"
              />
              <h3 className="text-xl font-bold font-display text-gradient-gold tracking-tight">
                {type === 'login' ? 'Welcome Back' : 'Join the Dynasty'}
              </h3>
              <p className="text-xs text-text-muted mt-1.5 font-medium">
                {type === 'login'
                  ? 'Access your culinary concierge service'
                  : 'Register for premium gourmet delivery'}
              </p>
            </div>

            {/* Tab Swapper */}
            <div className="flex border-b border-glass mb-6">
              <button
                onClick={() => setType('login')}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-all relative ${
                  type === 'login' ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                Login
                {type === 'login' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                  />
                )}
              </button>
              <button
                onClick={() => setType('register')}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-all relative ${
                  type === 'register' ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                Register
                {type === 'register' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                  />
                )}
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-error/10 border border-error/20 text-error text-[11px] font-semibold leading-relaxed">
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {type === 'register' && (
                <>
                  <div>
                    <label className="block text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-bg-dark/60 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-1 focus:ring-primary/20 font-medium placeholder-text-muted/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      className="w-full bg-bg-dark/60 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-1 focus:ring-primary/20 font-medium placeholder-text-muted/50"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@luxury.com"
                  className="w-full bg-bg-dark/60 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-1 focus:ring-primary/20 font-medium placeholder-text-muted/50"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-bg-dark/60 border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-1 focus:ring-primary/20 font-medium placeholder-text-muted/50"
                />
              </div>

              {type === 'login' && (
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                  <label className="flex items-center space-x-2 text-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded bg-bg-dark border border-glass text-primary focus:ring-primary/20"
                    />
                    <span>Remember Me</span>
                  </label>
                  <a href="#forgot" className="text-primary hover:underline">
                    Forgot Password?
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary text-xs font-bold py-3.5 px-6 rounded-lg transition-all duration-300 uppercase tracking-widest text-center shadow-lg disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? 'Authenticating...' : (type === 'login' ? 'Sign In to Estate' : 'Create Account')}
              </button>
            </form>

            <div className="text-center mt-6">
              <p className="text-xs text-text-muted">
                By continuing, you agree to MK Delivery Services'
                <br />
                <a href="#terms" className="text-text-secondary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#privacy" className="text-text-secondary hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default AuthModals;
