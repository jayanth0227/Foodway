import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCloseOutline } from 'react-icons/io5';

interface AuthModalsProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'login' | 'register';
  setType: (type: 'login' | 'register') => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({ isOpen, onClose, type, setType }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
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
              <IoCloseOutline size={24} />
            </button>

            {/* Logo & Header */}
            <div className="flex flex-col items-center mb-8">
              <img
                src="/logo.jpeg"
                alt="MK Delivery Services Logo"
                className="w-16 h-16 rounded-full object-cover border border-primary/40 shadow-lg mb-3"
              />
              <h3 className="text-xl font-semibold font-display text-gradient-gold">
                {type === 'login' ? 'Welcome Back' : 'Join the Dynasty'}
              </h3>
              <p className="text-sm text-text-muted mt-1">
                {type === 'login'
                  ? 'Access your culinary concierge service'
                  : 'Register for premium gourmet delivery'}
              </p>
            </div>

            {/* Tab Swapper */}
            <div className="flex border-b border-glass mb-6">
              <button
                onClick={() => setType('login')}
                className={`flex-1 pb-3 text-sm font-semibold transition-all relative ${
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
                className={`flex-1 pb-3 text-sm font-semibold transition-all relative ${
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {type === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    className="w-full bg-bg-dark border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-lg outline-none text-sm transition-all focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@luxury.com"
                  className="w-full bg-bg-dark border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-lg outline-none text-sm transition-all focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-bg-dark border border-glass focus:border-primary/50 text-text-primary px-4 py-3 rounded-lg outline-none text-sm transition-all focus:ring-1 focus:ring-primary/20"
                />
              </div>

              {type === 'login' && (
                <div className="flex justify-between items-center text-xs">
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
                className="w-full bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-black font-semibold text-sm py-3 px-6 rounded-lg transition-all duration-300 shadow-md hover:shadow-primary/20 transform hover:-translate-y-0.5 active:translate-y-0 text-center"
              >
                {type === 'login' ? 'Sign In to Estate' : 'Create Account'}
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
