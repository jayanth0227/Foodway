import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
  Store,
  ShieldAlert,
  ChevronDown,
  ShieldCheck,
  Bike,
  UtensilsCrossed,
  Headphones,
  AlertCircle
} from 'lucide-react';
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
  const [selectedRole, setSelectedRole] = useState<'USER' | 'RESTAURANT' | 'ADMIN'>('USER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedTerms) {
      setError('Please accept the Terms of use and Privacy Policy to proceed.');
      return;
    }

    if (type === 'login') {
      if (!email.trim() || !password) {
        setError('Please enter both email address and password.');
        return;
      }

      const res = await login(email, password, selectedRole);
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
        setError(res.error || 'Authentication failed. Please check your credentials.');
      }
    } else {
      if (!name.trim() || !email.trim() || !password) {
        setError('Please fill in all required registration fields.');
        return;
      }

      if (confirmPassword && password !== confirmPassword) {
        setError('Passwords do not match. Please verify your password.');
        return;
      }

      const res = await register(name, email, password, phone);
      if (res.success) {
        onClose();
        navigate('/');
      } else {
        setError(res.error || 'Registration failed. Please try again.');
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto font-sans">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="bg-[#F8F5F0] dark:bg-stone-950 border-t sm:border border-stone-200 dark:border-stone-800 rounded-t-[2.5rem] sm:rounded-tr-[3.5rem] sm:rounded-tl-3xl sm:rounded-b-3xl p-5 sm:p-8 max-w-md w-full max-h-[92dvh] overflow-y-auto shadow-2xl relative flex flex-col text-stone-800 dark:text-stone-100"
            >
              {/* Mobile Sheet Drag Handle Bar */}
              <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700 mx-auto mb-3 sm:hidden" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full text-stone-500 hover:text-stone-900 dark:hover:text-white bg-stone-200/60 dark:bg-stone-800 transition-all active:scale-90"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {/* Top Brand Logo Header */}
              <div className="flex items-center space-x-3 mb-5 pr-8">
                <img
                  src="/logo.jpeg"
                  alt="Foodway Logo"
                  className="w-10 h-10 rounded-xl object-cover border-2 border-[#A67C52]/30 shadow-sm"
                />
                <div className="flex flex-col leading-tight">
                  <span className="text-lg font-extrabold text-stone-900 dark:text-white font-display">
                    Foodway Services
                  </span>
                  <span className="text-[11px] font-semibold text-[#A67C52]">
                    Delivering Greatness
                  </span>
                </div>
              </div>

              {/* Top Switcher Tabs */}
              <div className="flex bg-stone-200/70 dark:bg-stone-800 p-1 rounded-2xl mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setType('login');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
                    type === 'login'
                      ? 'bg-[#A67C52] text-white shadow-md'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
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
                  className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
                    type === 'register'
                      ? 'bg-[#A67C52] text-white shadow-md'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  Register
                </button>
              </div>

              {/* Header Title & Subtitle */}
              <div className="mb-5">
                <h2 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight">
                  {type === 'login' ? 'Welcome Back!' : 'Create Your Account'}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">
                  {type === 'login'
                    ? 'Sign in to manage orders, addresses & favorites'
                    : 'Register for gourmet food delivery & orders'}
                </p>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Role Selection Dropdown (Only shown for Login) */}
                {type === 'login' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#A67C52] flex items-center gap-1.5">
                      <UserCheck size={14} />
                      <span>LOGIN AS (SELECT MODULE)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A67C52]">
                        {selectedRole === 'USER' && <UserIcon size={17} />}
                        {selectedRole === 'RESTAURANT' && <Store size={17} />}
                        {selectedRole === 'ADMIN' && <ShieldAlert size={17} />}
                      </div>
                      <select
                        value={selectedRole}
                        onChange={(e) => {
                          setSelectedRole(e.target.value as any);
                          setError(null);
                        }}
                        className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:border-[#A67C52] rounded-xl py-2.5 pl-10 pr-10 text-sm text-stone-900 dark:text-white font-semibold focus:outline-none transition-all cursor-pointer appearance-none"
                      >
                        <option value="USER">User / Customer Portal</option>
                        <option value="RESTAURANT">Merchant / Restaurant Partner</option>
                        <option value="ADMIN">System Administrator</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
                        <ChevronDown size={17} />
                      </div>
                    </div>
                  </div>
                )}

                {type === 'register' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                        FULL NAME
                      </label>
                      <div className="relative">
                        <UserIcon
                          size={17}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                        />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:border-[#A67C52] rounded-xl py-2.5 pl-10 pr-4 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                        MOBILE NUMBER
                      </label>
                      <div className="relative">
                        <Phone
                          size={17}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                        />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 98765 43210"
                          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:border-[#A67C52] rounded-xl py-2.5 pl-10 pr-4 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none transition-all font-medium"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                    {type === 'login' ? 'MOBILE NUMBER OR EMAIL' : 'EMAIL ADDRESS'}
                  </label>
                  <div className="relative">
                    <Mail
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={type === 'login' ? 'e.g. 98765 43210 or email' : 'Enter your email address'}
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:border-[#A67C52] rounded-xl py-2.5 pl-10 pr-4 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                    PASSWORD
                  </label>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={type === 'login' ? 'Enter your password' : 'Create a password'}
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:border-[#A67C52] rounded-xl py-2.5 pl-10 pr-11 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {type === 'register' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                      CONFIRM PASSWORD
                    </label>
                    <div className="relative">
                      <Lock
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                      />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:border-[#A67C52] rounded-xl py-2.5 pl-10 pr-11 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
                      >
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Terms Checkbox
                <div className="pt-1 flex flex-col space-y-1.5">
                  <label className="flex items-start gap-2 cursor-pointer text-[11px] text-stone-600 dark:text-stone-400 leading-snug">
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="mt-0.5 rounded border-stone-300 text-[#A67C52] focus:ring-[#A67C52] accent-[#A67C52] w-3.5 h-3.5"
                    />
                    <span>
                      By {type === 'login' ? 'signing in' : 'signing up'} I agree to the{' '}
                      <span className="text-[#A67C52] font-bold hover:underline">Terms of use</span> and{' '}
                      <span className="text-[#A67C52] font-bold hover:underline">Privacy Policy</span>.
                    </span>
                  </label>
                </div> */}

                {/* Brown Primary CTA Button with Arrow matching screenshot */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-[#A67C52] hover:bg-[#8F673E] active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer mt-2 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{type === 'login' ? 'SIGN IN' : 'SIGN UP'}</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

            

              {/* Email Switcher Action Button */}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setType(type === 'login' ? 'register' : 'login');
                }}
                className="w-full py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Mail size={15} className="text-[#A67C52]" />
                <span>{type === 'login' ? 'Sign in with Email' : 'Sign up with Email'}</span>
              </button>

              {/* Footer Navigation Switcher inside Modal */}
              <div className="mt-4 text-center text-xs text-stone-500 dark:text-stone-400">
                {type === 'login' ? (
                  <>
                    Don’t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setType('register');
                      }}
                      className="font-bold text-[#A67C52] hover:underline"
                    >
                      Register
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setType('login');
                      }}
                      className="font-bold text-[#A67C52] hover:underline"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>

              {/* Bottom 4 Feature Badges inside Modal */}
              <div className="grid grid-cols-4 gap-2 pt-4 mt-4 border-t border-stone-200/80 dark:border-stone-800 text-center">
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 rounded-full bg-[#F3ECE4] dark:bg-stone-800 flex items-center justify-center text-[#A67C52]">
                    <ShieldCheck size={15} />
                  </div>
                  <span className="text-[10px] font-bold text-stone-800 dark:text-stone-200">Secure</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 rounded-full bg-[#F3ECE4] dark:bg-stone-800 flex items-center justify-center text-[#A67C52]">
                    <Bike size={15} />
                  </div>
                  <span className="text-[10px] font-bold text-stone-800 dark:text-stone-200">Fast</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 rounded-full bg-[#F3ECE4] dark:bg-stone-800 flex items-center justify-center text-[#A67C52]">
                    <UtensilsCrossed size={15} />
                  </div>
                  <span className="text-[10px] font-bold text-stone-800 dark:text-stone-200">Quality</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 rounded-full bg-[#F3ECE4] dark:bg-stone-800 flex items-center justify-center text-[#A67C52]">
                    <Headphones size={15} />
                  </div>
                  <span className="text-[10px] font-bold text-stone-800 dark:text-stone-200">Support</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Role Mismatch / Error Alert Modal Popup */}
      <AnimatePresence>
        {error && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 15 }}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 relative"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                <AlertCircle size={30} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">
                  Notice
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
                  {error}
                </p>
              </div>
              <button
                onClick={() => setError(null)}
                className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AuthModals;
