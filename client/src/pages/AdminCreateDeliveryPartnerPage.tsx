import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Bike, ArrowLeft, ShieldCheck, AlertCircle, CheckCircle2, User, Mail, Phone, Lock, Car } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

export const AdminCreateDeliveryPartnerPage: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    vehicleType: 'Bike',
    vehicleNumber: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Please fill in all required fields (Name, Email, and Password).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/admin/delivery-partners`, form);
      if (res.data.success) {
        setSuccess(`Delivery Partner "${form.name}" has been registered successfully in the database! Redirecting...`);
        setTimeout(() => {
          navigate('/admin/dashboard', { state: { activeTab: 'delivery' } });
        }, 1500);
      } else {
        setError(res.data.error || 'Failed to create delivery partner account.');
      }
    } catch (err: any) {
      console.error('Error creating delivery partner:', err);
      setError(err.response?.data?.error || err.message || 'Server error occurred while creating account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-bg-dark text-slate-900 dark:text-text-primary p-4 sm:p-6 lg:p-10 transition-colors duration-300">
      <Helmet>
        <title>Create Delivery Partner | Admin Portal</title>
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/admin/dashboard', { state: { activeTab: 'delivery' } })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-glass bg-white dark:bg-bg-darkSec hover:bg-slate-100 dark:hover:bg-glass-subtle text-slate-700 dark:text-text-secondary font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Delivery Management</span>
          </button>

          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-primary">
            Admin Console
          </span>
        </div>

        {/* Form Container Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-bg-darkSec border border-slate-200 dark:border-glass shadow-xl dark:shadow-2xl space-y-8"
        >
          {/* Section Header */}
          <div className="flex items-start gap-4 border-b border-slate-200 dark:border-glass/50 pb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-primary shrink-0 shadow-inner">
              <Bike size={30} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-600 dark:text-primary tracking-widest block">
                Courier Role Provisioning
              </span>
              <h1 className="text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
                Create Delivery Partner Account
              </h1>
              <p className="text-xs font-medium text-slate-600 dark:text-text-muted mt-1">
                Register a new delivery rider in the database. Partners can log in at <code className="text-amber-600 dark:text-primary font-mono font-bold">/delivery/login</code>.
              </p>
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-3">
              <AlertCircle size={20} className="text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-text-muted flex items-center gap-1.5">
                <User size={15} className="text-amber-600 dark:text-primary" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-bg-dark border border-slate-300 dark:border-glass rounded-xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-muted/40 outline-none focus:border-amber-500 dark:focus:border-primary transition-all shadow-sm"
              />
            </div>

            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-text-muted flex items-center gap-1.5">
                  <Mail size={15} className="text-amber-600 dark:text-primary" />
                  <span>Email Address *</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="rider@mkdelivery.com"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-bg-dark border border-slate-300 dark:border-glass rounded-xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-muted/40 outline-none focus:border-amber-500 dark:focus:border-primary transition-all shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-text-muted flex items-center gap-1.5">
                  <Phone size={15} className="text-amber-600 dark:text-primary" />
                  <span>Phone Number *</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-bg-dark border border-slate-300 dark:border-glass rounded-xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-muted/40 outline-none focus:border-amber-500 dark:focus:border-primary transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-text-muted flex items-center gap-1.5">
                <Lock size={15} className="text-amber-600 dark:text-primary" />
                <span>Password *</span>
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-bg-dark border border-slate-300 dark:border-glass rounded-xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-muted/40 outline-none focus:border-amber-500 dark:focus:border-primary transition-all shadow-sm"
              />
            </div>

            {/* Vehicle Type & Reg Number Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-text-muted flex items-center gap-1.5">
                  <Bike size={15} className="text-amber-600 dark:text-primary" />
                  <span>Vehicle Type</span>
                </label>
                <select
                  value={form.vehicleType}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-bg-dark border border-slate-300 dark:border-glass rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 dark:focus:border-primary transition-all shadow-sm cursor-pointer"
                >
                  <option value="Bike">Motorcycle / Bike</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Bicycle">E-Bicycle</option>
                  <option value="Car">Delivery Car</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-text-muted flex items-center gap-1.5">
                  <Car size={15} className="text-amber-600 dark:text-primary" />
                  <span>Vehicle Reg Number</span>
                </label>
                <input
                  type="text"
                  value={form.vehicleNumber}
                  onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                  placeholder="TS-09-AB-1234"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-bg-dark border border-slate-300 dark:border-glass rounded-xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-muted/40 outline-none focus:border-amber-500 dark:focus:border-primary transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-slate-200 dark:border-glass/50 flex flex-col sm:flex-row items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard', { state: { activeTab: 'delivery' } })}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 dark:border-glass bg-slate-100 dark:bg-glass hover:bg-slate-200 dark:hover:bg-glass-subtle text-slate-700 dark:text-text-muted font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-amber-500 dark:bg-primary text-black font-extrabold text-xs uppercase tracking-wider shadow-lg hover:shadow-amber-500/20 dark:hover:shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Save Delivery Partner to Database</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminCreateDeliveryPartnerPage;
