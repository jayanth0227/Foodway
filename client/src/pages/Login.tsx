import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, ShieldCheck, Sun, Moon, AlertCircle, CheckCircle2, User as UserIcon, Phone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';

export const Login: React.FC = () => {
  const [authType, setAuthType] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const { login, register, isLoading, isAuthenticated, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

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

    if (authType === 'login') {
      if (!email.trim() || !password) {
        setErrorMessage('Please enter both email address and password.');
        return;
      }

      const result = await login(email, password);

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

      const result = await register(name, email, password, phone);
      if (result.success) {
        navigate('/', { replace: true });
      } else {
        setErrorMessage(result.error || 'Registration failed. Please try again.');
      }
    }
  };

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

  return (
    <div className="relative min-h-screen bg-bg-dark text-text-primary flex flex-col justify-between overflow-hidden selection:bg-primary/30 selection:text-primary transition-colors duration-500">
      {/* Background Decorator Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Top Header Navigation */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between z-20">
        <Link to="/" className="flex items-center space-x-2.5 group">
          <img
            src="/logo.jpeg"
            alt="Foodway"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-primary/30 group-hover:border-primary transition-all duration-300 shadow-md"
          />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-black tracking-[0.18em] font-display text-text-primary uppercase group-hover:text-primary transition-colors">
              Foodway
            </span>
            <span className="text-[9px] font-bold tracking-[0.2em] text-primary uppercase mt-0.5">
              Services
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-glass-subtle border border-glass hover:border-primary/40 hover:bg-glass text-[11px] sm:text-xs font-bold text-text-secondary hover:text-primary transition-all duration-300 shadow-sm"
          >
            <ArrowLeft size={14} />
            <span>Home</span>
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 sm:p-2.5 rounded-full bg-glass-subtle border border-glass hover:border-primary/30 text-text-secondary hover:text-primary transition-all duration-300"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* Main Login Card Center Container */}
      <main className="flex-1 flex items-center justify-center px-3.5 sm:px-4 py-4 sm:py-8 z-10 overflow-y-auto min-h-[calc(100dvh-70px)]">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md my-auto"
        >
          <div className="bg-glass-card backdrop-blur-2xl border border-glass rounded-3xl p-5 sm:p-10 shadow-luxury relative overflow-hidden group">
            {/* Ambient Card Glow Header */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary-dark" />

            {/* Mode Switcher Tabs */}
            <div className="flex bg-glass/60 p-1 rounded-2xl border border-glass mb-6">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthType('login');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${authType === 'login'
                  ? 'btn-primary shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
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
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${authType === 'register'
                  ? 'btn-primary shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
                  }`}
              >
                Register
              </button>
            </div>

            {/* Header Content */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3 shadow-sm overflow-hidden p-1">
                {/* Mobile: Foodway MK Logo Image */}
                <img
                  src="/logo.jpeg"
                  alt="MK Logo"
                  className="w-full h-full rounded-xl object-cover sm:hidden"
                />
                {/* Desktop: ShieldCheck Icon */}
                <ShieldCheck size={26} className="hidden sm:block" />
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight font-display text-text-primary">
                {authType === 'login' ? 'Welcome Back' : 'Join Foodway'}
              </h1>
              <p className="text-[11px] sm:text-xs text-text-muted mt-1.5 tracking-wide uppercase font-semibold">
                {authType === 'login' ? 'Sign in to access your account' : 'Register for gourmet food delivery & orders'}
              </p>
            </div>

            {/* Error Message Alert */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="bg-error/10 border border-error/20 rounded-2xl p-3.5 flex items-start space-x-2.5 text-error text-xs overflow-hidden"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {authType === 'register' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-text-secondary ml-1">
                      Full Name
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                        <UserIcon size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full bg-glass-subtle border border-glass hover:border-glass-hover focus:border-primary/60 rounded-xl py-2.5 sm:py-3 pl-10 pr-4 text-[15px] sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all shadow-inner font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-text-secondary ml-1">
                      Phone Number (Optional)
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                        <Phone size={16} />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter phone number"
                        className="w-full bg-glass-subtle border border-glass hover:border-glass-hover focus:border-primary/60 rounded-xl py-2.5 sm:py-3 pl-10 pr-4 text-[15px] sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all shadow-inner font-medium"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-text-secondary ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full bg-glass-subtle border border-glass hover:border-glass-hover focus:border-primary/60 rounded-xl py-2.5 sm:py-3 pl-10 pr-4 text-[15px] sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all shadow-inner font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Password
                  </label>
                  {authType === 'login' && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(true)}
                      className="text-[11px] sm:text-xs font-bold text-primary hover:text-primary-dark transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-glass-subtle border border-glass hover:border-glass-hover focus:border-primary/60 rounded-xl py-2.5 sm:py-3 pl-10 pr-11 text-[15px] sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all shadow-inner font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl btn-primary text-black font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 shadow-luxury hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{authType === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight size={16} className="stroke-[2.5] group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Role Info Footnote */}
            <div className="mt-6 pt-5 border-t border-glass text-center text-[11px] text-text-muted space-y-2">
              <p className="font-medium">Supports Admin, Merchant & Customer accounts.</p>
              <div>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline transition-all"
                >
                  <ArrowLeft size={12} />
                  <span>Return to Home Page</span>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-bg-dark border border-glass rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative"
            >
              <h3 className="text-xl font-bold text-text-primary mb-2 font-display">
                Reset Password
              </h3>
              <p className="text-xs text-text-muted mb-6">
                Enter your registered email address and we'll send password reset instructions.
              </p>

              {forgotSubmitted ? (
                <div className="bg-success/10 border border-success/20 rounded-2xl p-4 flex items-center space-x-3 text-success text-xs font-semibold">
                  <CheckCircle2 size={20} className="shrink-0" />
                  <span>Reset instructions have been sent if an account exists.</span>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full mt-1.5 bg-glass-subtle border border-glass rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(false)}
                      className="flex-1 btn-ghost py-2.5 text-xs font-bold uppercase rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn-primary py-2.5 text-xs font-bold uppercase rounded-xl"
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

      {/* Page Footer */}
      <footer className="py-4 text-center text-[10px] text-text-muted uppercase tracking-widest z-10">
        MK Delivery Services &copy; {new Date().getFullYear()} &bull; Secure Authentication System
      </footer>
    </div>
  );
};

export default Login;
