import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User as UserIcon, Phone, ArrowRight } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-bg-dark border border-glass rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-glass transition-colors"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text-primary font-display">
                {type === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-xs text-text-muted mt-1">
                {type === 'login'
                  ? 'Access your MK Delivery account'
                  : 'Join MK Delivery for gourmet food experience'}
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl text-error text-xs">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {type === 'register' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase">Full Name</label>
                    <div className="relative mt-1">
                      <UserIcon size={16} className="absolute left-3 top-3 text-text-muted" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-glass-subtle border border-glass rounded-xl py-2.5 pl-9 pr-4 text-sm text-text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase">Phone Number</label>
                    <div className="relative mt-1">
                      <Phone size={16} className="absolute left-3 top-3 text-text-muted" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full bg-glass-subtle border border-glass rounded-xl py-2.5 pl-9 pr-4 text-sm text-text-primary focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-text-secondary uppercase">Email Address</label>
                <div className="relative mt-1">
                  <Mail size={16} className="absolute left-3 top-3 text-text-muted" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-glass-subtle border border-glass rounded-xl py-2.5 pl-9 pr-4 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text-secondary uppercase">Password</label>
                <div className="relative mt-1">
                  <Lock size={16} className="absolute left-3 top-3 text-text-muted" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-glass-subtle border border-glass rounded-xl py-2.5 pl-9 pr-4 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{type === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Login/Register */}
            <div className="mt-6 text-center text-xs text-text-muted border-t border-glass pt-4">
              {type === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setError(null);
                      setType('register');
                    }}
                    className="text-primary font-bold hover:underline"
                  >
                    Register now
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setError(null);
                      setType('login');
                    }}
                    className="text-primary font-bold hover:underline"
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
