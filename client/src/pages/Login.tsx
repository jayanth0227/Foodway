import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, ShieldCheck, Sun, Moon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const { login, isLoading, isAuthenticated, role } = useAuth();
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

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    const result = await login(email, password);

    if (result.success && result.role) {
      const userRole = result.role.toUpperCase();
      
      // Strict role-based redirection driven entirely by backend response
      if (userRole === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (userRole === 'RESTAURANT') {
        navigate('/restaurant/dashboard', { replace: true });
      } else if (userRole === 'DELIVERY_PARTNER' || userRole === 'DELIVERY') {
        navigate('/delivery/dashboard', { replace: true });
      } else {
        // Default to Home page for USER
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from === '/login' ? '/' : from, { replace: true });
      }
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
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
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20">
        <Link to="/" className="flex items-center space-x-3 group">
          <img
            src="/logo.jpeg"
            alt="MK Delivery Services"
            className="w-10 h-10 rounded-full object-cover border border-primary/30 group-hover:border-primary transition-all duration-300 shadow-md"
          />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-[0.2em] font-display text-text-primary uppercase group-hover:text-primary transition-colors">
              MK
            </span>
            <span className="text-[9px] font-medium tracking-[0.25em] text-primary uppercase mt-0.5">
              Delivery
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-glass-subtle border border-glass hover:border-primary/40 hover:bg-glass text-xs font-bold text-text-secondary hover:text-primary transition-all duration-300 shadow-sm"
          >
            <ArrowLeft size={15} />
            <span>Back to Home</span>
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-glass-subtle border border-glass hover:border-primary/30 text-text-secondary hover:text-primary transition-all duration-300"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* Main Login Card Center Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="bg-glass-card backdrop-blur-2xl border border-glass rounded-3xl p-8 sm:p-10 shadow-luxury relative overflow-hidden group">
            {/* Ambient Card Glow Header */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary-dark" />

            {/* Header Content */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4 shadow-sm">
                <ShieldCheck size={28} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-text-primary">
                Welcome Back
              </h1>
              <p className="text-xs text-text-muted mt-2 tracking-wide uppercase font-semibold">
                Sign in to your MK Delivery account
              </p>
            </div>

            {/* Error Message Alert */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="bg-error/10 border border-error/20 rounded-2xl p-4 flex items-start space-x-3 text-error text-xs overflow-hidden"
                >
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-glass-subtle border border-glass hover:border-glass-hover focus:border-primary/60 rounded-xl py-3 pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-glass-subtle border border-glass hover:border-glass-hover focus:border-primary/60 rounded-xl py-3 pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg group relative overflow-hidden mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Role Info Footnote */}
            <div className="mt-8 pt-6 border-t border-glass text-center text-xs text-text-muted space-y-3">
              <p>Supports Admin, Restaurant Partner & Customer access.</p>
              <div>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline transition-all"
                >
                  <ArrowLeft size={13} />
                  <span>Return to Home Landing Page</span>
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
