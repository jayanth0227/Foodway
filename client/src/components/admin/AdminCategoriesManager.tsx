import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Search,
  RotateCcw
} from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';

export interface HomepageCategory {
  id: string;
  name: string;
  image: string;
  description: string;
  keywords: string[];
  badge?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export const AdminCategoriesManager: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<HomepageCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals for destructive confirmations only
  const [deleteTarget, setDeleteTarget] = useState<HomepageCategory | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/homepage-categories`);
      if (res.data?.success && Array.isArray(res.data?.categories)) {
        setCategories(res.data.categories);
      }
    } catch (err: any) {
      console.warn('Failed to load admin categories:', err);
      showNotification('error', 'Could not load categories from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setStatusMsg({ type, message });
    setTimeout(() => {
      setStatusMsg(null);
    }, 4000);
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/admin/homepage-categories/${deleteTarget.id}`);
      if (res.data?.success && Array.isArray(res.data.categories)) {
        setCategories(res.data.categories);
        showNotification('success', `Category "${deleteTarget.name}" deleted successfully.`);
        setDeleteTarget(null);
      } else {
        showNotification('error', 'Failed to delete category.');
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || err.message || 'Error deleting category.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: HomepageCategory) => {
    const updatedList = categories.map(c => c.id === cat.id ? { ...c, isActive: !c.isActive } : c);
    setCategories(updatedList);
    try {
      await axios.put(`${API_BASE_URL}/admin/homepage-categories`, { categories: updatedList });
      showNotification('success', `Category "${cat.name}" is now ${!cat.isActive ? 'Active' : 'Hidden'} on homepage.`);
    } catch (err: any) {
      showNotification('error', 'Failed to update category status.');
      fetchCategories();
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    // Re-assign order numbers
    const updatedWithOrder = reordered.map((c, i) => ({ ...c, order: i + 1 }));
    setCategories(updatedWithOrder);

    try {
      await axios.put(`${API_BASE_URL}/admin/homepage-categories`, { categories: updatedWithOrder });
      showNotification('success', 'Categories reordered successfully.');
    } catch (err: any) {
      showNotification('error', 'Failed to save reordered categories.');
      fetchCategories();
    }
  };

  const handleResetToDefaults = async () => {
    setSaving(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/homepage-categories/reset`);
      if (res.data?.success && Array.isArray(res.data.categories)) {
        setCategories(res.data.categories);
        showNotification('success', 'Categories restored to default curated list.');
        setIsResetConfirmOpen(false);
      }
    } catch (err: any) {
      showNotification('error', 'Failed to reset categories.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.badge || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = categories.filter(c => c.isActive !== false).length;
  const hiddenCount = categories.length - activeCount;

  if (loading) {
    return (
      <div className="p-16 text-center text-text-muted flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <p className="text-sm font-semibold">Loading Homepage & Store Categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-5">
        <div>
          <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1.5 block">
            Dynamic Store & Category Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-text-primary tracking-tight">
            Homepage & Platform Categories
          </h1>
          <p className="text-xs text-text-muted mt-1 max-w-2xl font-medium">
            Manage the categories displayed across MK Delivery Service homepage and customer shopping flow. Add food, groceries, pooja essentials, fresh meats, dairy, or any custom delivery category.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-glass bg-glass hover:bg-glass-subtle text-text-muted hover:text-text-primary font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            title="Restore Default Categories"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/categories/new')}
            className="btn-primary py-2.5 px-4 sm:px-5 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg hover:shadow-primary/20 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add New Category</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl text-xs font-bold flex items-center space-x-3 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{statusMsg.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel border border-glass rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Total Categories</span>
            <span className="text-xl sm:text-2xl font-black font-display text-text-primary mt-1 block">
              {categories.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <LayoutGrid size={18} />
          </div>
        </div>

        <div className="glass-panel border border-glass rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Active On Home</span>
            <span className="text-xl sm:text-2xl font-black font-display text-emerald-400 mt-1 block">
              {activeCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Eye size={18} />
          </div>
        </div>

        <div className="glass-panel border border-glass rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Hidden / Inactive</span>
            <span className="text-xl sm:text-2xl font-black font-display text-amber-400 mt-1 block">
              {hiddenCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <EyeOff size={18} />
          </div>
        </div>

        <div className="glass-panel border border-glass rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Database State</span>
            <span className="text-xs font-black uppercase tracking-wider text-primary mt-1 block">
              DynamoDB Live
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Sparkles size={18} />
          </div>
        </div>
      </div>

      {/* Search Bar & Order Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-bg-dark border border-glass focus:border-primary/50 text-text-primary pl-9 pr-4 py-2 rounded-xl text-xs outline-none font-medium"
          />
        </div>
        <p className="text-[11px] text-text-muted font-medium self-end sm:self-auto">
          Tip: Click <strong className="text-text-primary">+ Add New Category</strong> to open the full creation page, or use <strong className="text-text-primary">↑ / ↓</strong> to reorder.
        </p>
      </div>

      {/* Categories Grid */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-16 glass-panel border border-glass rounded-2xl p-8 max-w-md mx-auto space-y-3">
          <LayoutGrid size={36} className="mx-auto text-text-muted opacity-40" />
          <h3 className="font-bold text-base text-text-primary">No Categories Found</h3>
          <p className="text-xs text-text-muted">No categories match your search. Click "Add New Category" above to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredCategories.map((cat, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === filteredCategories.length - 1;

            return (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-panel border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden shadow-sm ${
                  cat.isActive !== false ? 'border-glass bg-bg-card' : 'border-glass/40 bg-bg-dark/40 opacity-70'
                }`}
              >
                <div>
                  {/* Top row: thumbnail + badge + status */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-glass shrink-0 bg-black/40">
                      <img
                        src={cat.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600'}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600';
                        }}
                      />
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                          cat.isActive !== false
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                            : 'bg-slate-500/15 border border-slate-500/30 text-slate-400 hover:bg-slate-500/25'
                        }`}
                        title={cat.isActive !== false ? 'Click to hide on homepage' : 'Click to show on homepage'}
                      >
                        {cat.isActive !== false ? <Eye size={11} /> : <EyeOff size={11} />}
                        <span>{cat.isActive !== false ? 'Active' : 'Hidden'}</span>
                      </button>

                      {cat.badge && (
                        <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-primary/15 border border-primary/30 text-primary">
                          {cat.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-primary/10 border border-primary/20 text-[10px] font-black text-primary flex items-center justify-center shrink-0">
                        {cat.order || idx + 1}
                      </span>
                      <h3 className="font-display font-bold text-text-primary text-sm sm:text-base truncate">
                        {cat.name}
                      </h3>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed font-medium pl-7">
                      {cat.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Keywords tags */}
                  {Array.isArray(cat.keywords) && cat.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3 pl-7">
                      {cat.keywords.slice(0, 4).map((kw, ki) => (
                        <span key={ki} className="text-[9px] font-semibold text-text-muted/80 bg-glass px-1.5 py-0.5 rounded">
                          #{kw}
                        </span>
                      ))}
                      {cat.keywords.length > 4 && (
                        <span className="text-[9px] font-semibold text-text-muted/60">
                          +{cat.keywords.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between border-t border-glass pt-3 mt-4">
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveOrder(idx, 'up')}
                      className="p-1.5 rounded-lg border border-glass bg-glass hover:bg-glass-subtle text-text-muted hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move Earlier in Homepage"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveOrder(idx, 'down')}
                      className="p-1.5 rounded-lg border border-glass bg-glass hover:bg-glass-subtle text-text-muted hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move Later in Homepage"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>

                  {/* Edit / Delete Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/categories/edit/${cat.id}`)}
                      className="px-2.5 py-1.5 rounded-xl border border-glass hover:border-primary/40 bg-glass hover:bg-primary/10 text-text-primary hover:text-primary font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(cat)}
                      className="p-1.5 rounded-xl border border-rose-500/20 hover:border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[99993] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-bg-card border border-glass rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-text-primary"
            >
              <div className="flex items-center gap-3 border-b border-glass pb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black font-display text-text-primary">
                    Delete Category
                  </h2>
                  <span className="text-xs text-text-muted font-medium">Confirmation</span>
                </div>
              </div>

              <p className="text-sm font-medium text-text-secondary leading-relaxed">
                Are you sure you want to remove <strong className="text-text-primary">{deleteTarget.name}</strong> from homepage categories? This category card will no longer appear on the home page.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-glass bg-glass hover:bg-glass-subtle text-text-primary font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-red-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESET CONFIRMATION MODAL */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-[99993] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-bg-card border border-glass rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-text-primary"
            >
              <div className="flex items-center gap-3 border-b border-glass pb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                  <RotateCcw size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black font-display text-text-primary">
                    Reset to Default Categories
                  </h2>
                  <span className="text-xs text-text-muted font-medium">Confirmation</span>
                </div>
              </div>

              <p className="text-sm font-medium text-text-secondary leading-relaxed">
                This will reset all homepage categories back to the curated 8 default categories (Bakery, Beverages, Dairy, Food, Fruits & Veg, Groceries, Household, Pooja Essentials). Any custom categories you added will be replaced.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-glass bg-glass hover:bg-glass-subtle text-text-primary font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  <span>Reset All</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCategoriesManager;
