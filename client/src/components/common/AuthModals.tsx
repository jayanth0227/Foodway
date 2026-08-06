import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User as UserIcon, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface AuthModalsProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'login' | 'register';
  setType: (type: 'login' | 'register') => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({ isOpen, onClose, type, setType }) => {
  const navigate = useNavigate();
  const { login, register, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (type === 'login') {
      const res = await login(email, password);
      if (res.success && res.role) {
        onClose();
        const roleUpper = res.role.toUpperCase();
        if (roleUpper === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (roleUpper === 'RESTAURANT') {
          navigate('/restaurant/dashboard');
        } else if (roleUpper === 'DELIVERY_PARTNER' || roleUpper === 'DELIVERY') {
          navigate('/delivery/dashboard');
        } else {
          navigate('/');
        }
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } else {
      const res = await register(name, email, password, phone);
      if (res.success) {
        onClose();
        navigate('/');
      } else {
        setError(res.error || 'Registration failed');
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg-dark/98 sm:bg-black/80 backdrop-blur-xl overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="bg-bg-dark border-t sm:border border-glass rounded-t-[32px] sm:rounded-3xl p-5 sm:p-8 max-w-md w-full max-h-[88dvh] sm:max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col"
          >
            {/* Mobile Sheet Drag Handle Bar */}
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2.5 rounded-full text-text-muted hover:text-text-primary bg-glass/40 hover:bg-glass transition-all active:scale-90"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Top Tab Switcher for Mobile & Desktop */}
            <div className="flex bg-glass/60 p-1 rounded-2xl border border-glass mb-6">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setType('login');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${type === 'login'
                  ? 'btn-primary shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
                  }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setType('register');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${type === 'register'
                  ? 'btn-primary shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
                  }`}
              >
                Register
              </button>
            </div>

            {/* Header Content with Centered Mobile Logo */}
            <div className="mb-6 text-center">
              {/* MK Logo Badge Centered */}
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 p-0.5 overflow-hidden mx-auto mb-3 shadow-sm sm:hidden">
                <img
                  src="/logo.jpeg"
                  alt="MK Logo"
                  className="w-full h-full rounded-xl object-cover"
                />
              </div>

              <h2 className="text-2xl font-black text-text-primary font-display">
                {type === 'login' ? 'Welcome Back!' : 'Join Foodway'}
              </h2>
              <p className="text-xs text-text-muted mt-1 font-medium max-w-xs mx-auto">
                {type === 'login'
                  ? 'Sign in to manage orders, addresses & favorites'
                  : 'Register for gourmet food delivery & orders'}
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3.5 bg-error/10 border border-error/20 rounded-2xl text-error text-xs font-semibold flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {type === 'register' && (
                <>
                  <div>
                    <label className="text-[11px] font-extrabold text-text-secondary uppercase tracking-wider ml-1">Full Name</label>
                    <div className="relative mt-1">
                      <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full bg-glass-subtle border border-glass rounded-xl py-3 pl-10 pr-4 text-[15px] sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-text-secondary uppercase tracking-wider ml-1">Phone Number</label>
                    <div className="relative mt-1">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter phone number"
                        className="w-full bg-glass-subtle border border-glass rounded-xl py-3 pl-10 pr-4 text-[15px] sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 font-medium"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-[11px] font-extrabold text-text-secondary uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative mt-1">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full bg-glass-subtle border border-glass rounded-xl py-3 pl-10 pr-4 text-[15px] sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-text-secondary uppercase tracking-wider ml-1">Password</label>
                <div className="relative mt-1">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-glass-subtle border border-glass rounded-xl py-3 pl-10 pr-11 text-[15px] sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/60 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl btn-primary text-black font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 shadow-luxury hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer mt-3"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{type === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight size={16} className="stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Login/Register Footer */}
            <div className="mt-6 text-center text-xs text-text-muted border-t border-glass pt-4">
              {type === 'login' ? (
                <p className="font-medium">
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setError(null);
                      setType('register');
                    }}
                    className="text-primary font-black hover:underline ml-0.5"
                  >
                    Register now
                  </button>
                </p>
              ) : (
                <p className="font-medium">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setError(null);
                      setType('login');
                    }}
                    className="text-primary font-black hover:underline ml-0.5"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModals;
