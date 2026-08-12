import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  User as UserIcon,
  Phone,
  Store,
  ShieldAlert,
  ChevronDown,
  Home as HomeIcon
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [authType, setAuthType] = useState<'login' | 'register'>(() => {
    if ((location.state as any)?.authType) return (location.state as any).authType;
    if (location.pathname === '/register') return 'register';
    return 'login';
  });

  const [selectedRole, setSelectedRole] = useState<'USER' | 'RESTAURANT' | 'ADMIN'>('USER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const { login, register, isLoading, isAuthenticated, role } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSubmitted(true);
    setTimeout(() => {
      setForgotSubmitted(false);
      setShowForgotPasswordModal(false);
      setForgotEmail('');
    }, 2500);
  };

  React.useEffect(() => {
    if ((location.state as any)?.authType) {
      setAuthType((location.state as any).authType);
    } else if (location.pathname === '/register') {
      setAuthType('register');
    } else if (location.pathname === '/login') {
      setAuthType('login');
    }
  }, [location.pathname, location.state]);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && role) {
      const userRole = role.toUpperCase();
      if (userRole === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (userRole === 'RESTAURANT') {
        navigate('/restaurant/dashboard', { replace: true });
      } else if (userRole === 'DELIVERY_PARTNER' || userRole === 'DELIVERY') {
        navigate('/delivery/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!agreedTerms) {
      setErrorMessage('Please accept the Terms of use and Privacy Policy to proceed.');
      return;
    }

    if (authType === 'login') {
      if (!email.trim() || !password) {
        setErrorMessage('Please enter both email address and password.');
        return;
      }

      const result = await login(email, password, selectedRole);

      if (result.success && result.role) {
        const userRole = result.role.toUpperCase();
        if (userRole === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else if (userRole === 'RESTAURANT') {
          navigate('/restaurant/dashboard', { replace: true });
        } else if (userRole === 'DELIVERY_PARTNER' || userRole === 'DELIVERY') {
          navigate('/delivery/dashboard', { replace: true });
        } else {
          const from = (location.state as any)?.from?.pathname || '/';
          navigate(from === '/login' ? '/' : from, { replace: true });
        }
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
      }
    } else {
      if (!name.trim() || !email.trim() || !password) {
        setErrorMessage('Please fill in all required registration fields.');
        return;
      }

      if (confirmPassword && password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please verify your password.');
        return;
      }

      const result = await register(name, email, password, phone);
      if (result.success) {
        navigate('/', { replace: true });
      } else {
        setErrorMessage(result.error || 'Registration failed. Please try again.');
      }
    }
  };



  return (
    <div className="min-h-screen bg-[#FAF8F6] dark:bg-[#090B10] text-[#1A1A1A] dark:text-white flex flex-col justify-between font-sans transition-colors duration-400 selection:bg-[#C59363]/30">
      
      {/* Top Header Navigation (Minimal & Elegant) */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between z-20">
        <Link to="/" className="flex items-center space-x-2.5 group">
          <img
            src="/logo.jpeg"
            alt="MK Delivery Logo"
            className="w-10 h-10 rounded-full object-cover border border-[#C59363]/40 shadow-sm group-hover:scale-105 transition-all"
          />
          <div className="flex flex-col leading-none">
            <span className="text-base font-extrabold tracking-wider font-display text-[#1A1A1A] dark:text-white uppercase group-hover:text-[#C59363] transition-colors">
              MK Delivery
            </span>
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#C59363] uppercase mt-0.5">
              Services
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-2.5">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#181C25] border border-stone-200 dark:border-white/10 text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-[#C59363] dark:hover:text-[#C59363] hover:border-[#C59363]/50 transition-all shadow-sm group"
          >
            <HomeIcon size={14} className="text-[#C59363] group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white dark:bg-[#181C25] border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300 hover:text-[#C59363] transition-all shadow-sm group cursor-pointer"
            aria-label="Toggle Theme"
            title="Toggle Theme"
          >
            {theme === 'light' ? (
              <Moon size={16} className="group-hover:scale-110 group-hover:rotate-[15deg] transition-all duration-300 text-[#C59363]" />
            ) : (
              <Sun size={16} className="group-hover:scale-110 group-hover:rotate-[45deg] transition-all duration-300 text-[#C59363]" />
            )}
          </button>
        </div>
      </header>

      {/* Main Centered User-Friendly Form Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-4 sm:py-8 z-10 my-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md bg-white dark:bg-[#181C25] rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl border border-stone-200/80 dark:border-white/10 relative overflow-hidden"
        >
          
          {/* Top Switcher Segmented Tabs */}
          <div className="flex bg-stone-100 dark:bg-[#11141B] p-1 rounded-2xl mb-6 border border-stone-200/60 dark:border-white/5">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setAuthType('login');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                authType === 'login'
                  ? 'bg-[#C59363] text-white shadow-md'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setAuthType('register');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                authType === 'register'
                  ? 'bg-[#C59363] text-white shadow-md'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] dark:text-white tracking-tight font-display">
              {authType === 'login' ? 'Welcome Back!' : 'Create Your Account'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 font-medium leading-relaxed">
              {authType === 'login'
                ? 'Sign in to continue to MK Delivery'
                : 'Register for gourmet food delivery & orders'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Login Role Selector */}
            {authType === 'login' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Select Role
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#C59363]">
                    {selectedRole === 'USER' && <UserIcon size={18} />}
                    {selectedRole === 'RESTAURANT' && <Store size={18} />}
                    {selectedRole === 'ADMIN' && <ShieldAlert size={18} />}
                  </div>
                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value as any);
                      setErrorMessage(null);
                    }}
                    className="w-full bg-stone-50 dark:bg-[#11141B] border border-stone-200 dark:border-white/10 hover:border-[#C59363] focus:border-[#C59363] rounded-xl py-3 pl-11 pr-10 text-sm text-stone-900 dark:text-white font-semibold focus:outline-none transition-all cursor-pointer appearance-none shadow-sm"
                  >
                    <option value="USER">User / Customer Portal</option>
                    <option value="RESTAURANT">Merchant / Restaurant Partner</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>
            )}

            {/* Full Name for Register */}
            {authType === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <UserIcon size={17} />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-stone-50 dark:bg-[#11141B] border border-stone-200 dark:border-white/10 focus:border-[#C59363] rounded-xl py-3 pl-10 pr-4 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none transition-all font-medium"
                  />
                </div>
              </div>
            )}

            {/* Mobile Number for Register */}
            {authType === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Phone size={17} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 98765 43210"
                    className="w-full bg-stone-50 dark:bg-[#11141B] border border-stone-200 dark:border-white/10 focus:border-[#C59363] rounded-xl py-3 pl-10 pr-4 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none transition-all font-medium"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                {authType === 'login' ? 'Mobile Number or Email' : 'Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Mail size={17} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={authType === 'login' ? 'e.g. 98765 43210 or email' : 'Enter your email address'}
                  className="w-full bg-stone-50 dark:bg-[#11141B] border border-stone-200 dark:border-white/10 focus:border-[#C59363] rounded-xl py-3 pl-10 pr-4 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Password
                </label>
                {authType === 'login' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-xs font-bold text-[#C59363] hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock size={17} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authType === 'login' ? 'Enter your password' : 'Create a password'}
                  className="w-full bg-stone-50 dark:bg-[#11141B] border border-stone-200 dark:border-white/10 focus:border-[#C59363] rounded-xl py-3 pl-10 pr-11 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Confirm Password for Register */}
            {authType === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock size={17} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full bg-stone-50 dark:bg-[#11141B] border border-stone-200 dark:border-white/10 focus:border-[#C59363] rounded-xl py-3 pl-10 pr-11 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            )}

            {/* Terms Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-600 dark:text-stone-400 leading-snug">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-[#C59363] focus:ring-[#C59363] accent-[#C59363] w-4 h-4"
                />
                <span>
                  By signing up I agree to the{' '}
                  <span className="text-[#C59363] font-bold hover:underline">Terms of use</span> and{' '}
                  <span className="text-[#C59363] font-bold hover:underline">Privacy Policy</span>.
                </span>
              </label>
            </div>

            {/* Primary Action CTA Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-[#C59363] hover:bg-[#b58353] active:scale-[0.99] text-white font-extrabold text-sm tracking-wider uppercase shadow-md transition-all cursor-pointer mt-3 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{authType === 'login' ? 'Sign In' : 'Sign Up'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Bottom Switcher Link */}
          <div className="mt-5 text-center text-xs text-stone-500 dark:text-stone-400">
            {authType === 'login' ? (
              <>
                Don’t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setAuthType('register');
                  }}
                  className="font-bold text-[#C59363] hover:underline"
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
                    setErrorMessage(null);
                    setAuthType('login');
                  }}
                  className="font-bold text-[#C59363] hover:underline"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </motion.div>
      </main>

      {/* Access Alert Modal Popup */}
      <AnimatePresence>
        {errorMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-[#181C25] border border-stone-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 relative"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                <AlertCircle size={30} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-[#1A1A1A] dark:text-white tracking-tight font-display">
                  Notice
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
                  {errorMessage}
                </p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-[#181C25] border border-stone-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative"
            >
              <h3 className="text-xl font-bold text-[#1A1A1A] dark:text-white mb-2 font-display">
                Reset Password
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
                Enter your registered email address and we'll send password reset instructions.
              </p>

              {forgotSubmitted ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center space-x-3 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 size={20} className="shrink-0" />
                  <span>Reset instructions have been sent if an account exists.</span>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full mt-1.5 bg-stone-50 dark:bg-[#11141B] border border-stone-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-[#C59363]"
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(false)}
                      className="flex-1 py-2.5 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl uppercase transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#C59363] hover:bg-[#b58353] text-white py-2.5 text-xs font-bold uppercase rounded-xl shadow-md transition-colors"
                    >
                      Send Link
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
