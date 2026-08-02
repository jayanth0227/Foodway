import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ShieldAlert, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const adminAuthRaw = localStorage.getItem('adminAuth') || sessionStorage.getItem('adminAuth');
    if (adminAuthRaw) {
      try {
        const auth = JSON.parse(adminAuthRaw);
        if (auth.isLoggedIn && auth.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        }
      } catch (e) {
        // Continue
      }
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        email,
        password,
      });

      if (response.data.success) {
        const authData = {
          isLoggedIn: true,
          email: response.data.admin.email,
          role: response.data.admin.role,
          token: response.data.admin.token,
        };

        // Save session info
        localStorage.setItem('adminAuth', JSON.stringify(authData));
        
        // Redirect to dashboard
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message || 
        'Unable to connect to the administration server. Please verify the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bg-dark text-text-primary px-4 py-20">
      {/* Background glow orbs */}
      <div className="absolute top-[20%] left-[10%] w-[450px] h-[450px] rounded-full bg-primary/10 blur-[130px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[20%] right-[10%] w-[450px] h-[450px] rounded-full bg-accent/5 blur-[130px] pointer-events-none animate-glow-slow" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md overflow-hidden rounded-2xl glass-panel border border-glass p-8 md:p-10 z-10 shadow-luxury glow-gold relative"
      >
        {/* Luxury top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-glass-subtle border border-primary/30 flex items-center justify-center mb-4 text-primary shadow-lg">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold font-display tracking-tight text-primary text-center">
            Administrative Portal
          </h2>
          <p className="text-xs text-text-muted mt-2 text-center max-w-[280px]">
            Please enter your administrator credentials to manage the gourmet concierge service.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-3 p-4 mb-6 rounded-lg bg-error/10 border border-error/30 text-error text-xs font-medium"
          >
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@foodway.com"
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-glass bg-glass-subtle focus:bg-glass focus:border-primary/80 focus:ring-1 focus:ring-primary/40 outline-none text-sm transition-all duration-300 placeholder:text-text-muted"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Security Key / Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Strong Password"
                className="w-full pl-11 pr-11 py-3 rounded-lg border border-glass bg-glass-subtle focus:bg-glass focus:border-primary/80 focus:ring-1 focus:ring-primary/40 outline-none text-sm transition-all duration-300 placeholder:text-text-muted"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-primary hover:bg-primary-dark text-bg-dark font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Secure Authentication</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Security Warning Footer */}
        <div className="mt-8 text-center border-t border-glass pt-6">
          <p className="text-[10px] text-text-muted leading-relaxed">
            Authorized access only. All security tokens and actions are strictly audited by system logs. Unauthorized access attempts will be blocked by IP security policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
