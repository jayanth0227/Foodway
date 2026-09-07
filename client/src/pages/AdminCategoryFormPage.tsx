import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
  Tag,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

const CATEGORY_PRESETS = [
  {
    name: 'Fresh Food & Restaurants',
    badge: 'HOT & FRESH',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=600',
    description: 'Authentic Biryani, Tandoori Kebabs, Meals & Fast Food.',
    keywords: 'food, biryani, restaurant, meal, tandoori, chicken, dosa, curry'
  },
  {
    name: 'Groceries & Supermarket',
    badge: 'DAILY ESSENTIALS',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
    description: 'Rice, Atta, Cooking Oils, Spices, Staples & Daily Packaged Foods.',
    keywords: 'grocery, groceries, supermarket, staples, mart, provision, oil'
  },
  {
    name: 'Pooja Essentials & Flowers',
    badge: 'TEMPLE SPECIAL',
    image: 'https://images.unsplash.com/photo-1608744882201-52a7f7f3da60?auto=format&fit=crop&q=80&w=600',
    description: 'Fresh Garland Flowers, Agarbatti, Camphor, Diya Oils & Ritual Packs.',
    keywords: 'pooja, puja, flower, flowers, agarbatti, camphor, diya, temple, garland'
  },
  {
    name: 'Fruits & Fresh Vegetables',
    badge: 'FARM FRESH',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=600',
    description: 'Farm Fresh Produce, Organic Vegetables & Seasonal Fruits.',
    keywords: 'fruit, fruits, vegetable, vegetables, fresh produce, veggie'
  },
  {
    name: 'Dairy, Milk & Eggs',
    badge: 'QUICK DELIVERY',
    image: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&q=80&w=600',
    description: 'Fresh Milk, Curd, Butter, Paneer, Cheese & Eggs.',
    keywords: 'dairy, milk, curd, paneer, butter, ghee, cheese, egg, eggs'
  },
  {
    name: 'Bakery & Cakes',
    badge: 'SWEET DELIGHTS',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600',
    description: 'Fresh Breads, Custom Cakes, Pastries & Confectionery.',
    keywords: 'bakery, cake, cakes, pastry, pastries, bread, puff, cookie, sweet'
  },
  {
    name: 'Meat, Chicken & Fish',
    badge: 'FRESH CUTS',
    image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600',
    description: 'Fresh Cleaned Chicken, Tender Mutton, Sea Fish, Prawns & Crabs.',
    keywords: 'meat, chicken, mutton, fish, prawn, prawns, crab, seafood, non veg'
  },
  {
    name: 'Beverages & Coolers',
    badge: 'ICE COLD',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600',
    description: 'Soft Drinks, Packaged Juices, Milkshakes & Water.',
    keywords: 'beverage, beverages, drink, drinks, shake, juice, soda, tea, coffee'
  },
  {
    name: 'Household & Personal Care',
    badge: 'HOME CARE',
    image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&q=80&w=600',
    description: 'Soaps, Shampoos, Detergents, Hygiene & Home Cleaning.',
    keywords: 'household, personal care, soap, shampoo, detergent, cleaning, hygiene'
  },
  {
    name: 'Medicines & Pharmacy',
    badge: 'HEALTH FIRST',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600',
    description: 'Prescription Medicines, First Aid, Supplements & Healthcare Items.',
    keywords: 'medicine, medicines, pharmacy, health, tablet, syrup, bandage, wellness'
  },
  {
    name: 'Sweets & Hot Snacks',
    badge: 'LOCAL SPECIALS',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=600',
    description: 'Traditional Telugu Sweets, Hot Mixture, Murukulu & Savouries.',
    keywords: 'sweet, sweets, snack, snacks, namkeen, mithai, mixture, ladoo'
  }
];

export const AdminCategoryFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId?: string }>();
  const isEditing = Boolean(categoryId);

  const [form, setForm] = useState({
    id: categoryId || `cat_${Date.now()}`,
    name: '',
    description: '',
    image: '',
    badge: '',
    keywords: '',
    isActive: true,
    order: 1
  });

  const [loading, setLoading] = useState<boolean>(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && categoryId) {
      const fetchCategoryDetails = async () => {
        setLoading(true);
        try {
          const res = await axios.get(`${API_BASE_URL}/admin/homepage-categories`);
          if (res.data?.success && Array.isArray(res.data.categories)) {
            const match = res.data.categories.find((c: any) => c.id === categoryId);
            if (match) {
              setForm({
                id: match.id,
                name: match.name || '',
                description: match.description || '',
                image: match.image || '',
                badge: match.badge || '',
                keywords: Array.isArray(match.keywords) ? match.keywords.join(', ') : (match.keywords || ''),
                isActive: match.isActive !== false,
                order: typeof match.order === 'number' ? match.order : 1
              });
            } else {
              setError('Category not found in database.');
            }
          }
        } catch (err: any) {
          setError('Failed to load category details from server.');
        } finally {
          setLoading(false);
        }
      };
      fetchCategoryDetails();
    }
  }, [categoryId, isEditing]);

  const handleApplyPreset = (preset: typeof CATEGORY_PRESETS[0]) => {
    setForm(prev => ({
      ...prev,
      name: preset.name,
      description: preset.description,
      image: preset.image,
      badge: preset.badge,
      keywords: preset.keywords
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name.trim()) {
      setError('Please provide a Category Name.');
      return;
    }

    setSaving(true);

    try {
      const keywordsArray = form.keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      const payload = {
        id: form.id || `cat_${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim(),
        image: form.image.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
        badge: form.badge.trim() || undefined,
        keywords: keywordsArray,
        isActive: form.isActive,
        order: Number(form.order) || 1
      };

      const res = await axios.post(`${API_BASE_URL}/admin/homepage-categories`, payload);
      if (res.data?.success) {
        setSuccess(`Category "${form.name}" has been ${isEditing ? 'updated' : 'created'} successfully! Redirecting...`);
        setTimeout(() => {
          navigate('/admin/dashboard?tab=categories');
        }, 1200);
      } else {
        setError(res.data?.error || 'Failed to save category.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error occurred while saving category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-bg-dark text-slate-900 dark:text-text-primary p-4 sm:p-6 lg:p-10 transition-colors duration-300">
      <Helmet>
        <title>{isEditing ? 'Edit Category' : 'Create New Category'} | Admin Portal</title>
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard?tab=categories')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-glass bg-white dark:bg-bg-darkSec hover:bg-slate-100 dark:hover:bg-glass-subtle text-slate-700 dark:text-text-secondary font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Store Categories</span>
          </button>

          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-primary">
            Admin Console
          </span>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="p-16 text-center text-text-muted flex flex-col items-center justify-center space-y-3 glass-panel border border-glass rounded-3xl">
            <RefreshCw className="animate-spin text-primary" size={32} />
            <p className="text-sm font-semibold">Loading Category Details...</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-bg-darkSec border border-slate-200 dark:border-glass shadow-xl dark:shadow-2xl space-y-8"
          >
            {/* Form Section Header */}
            <div className="flex items-start gap-4 border-b border-slate-200 dark:border-glass/50 pb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-primary shrink-0 shadow-inner">
                <LayoutGrid size={30} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-primary tracking-widest block">
                  Catalog & Homepage Management
                </span>
                <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white tracking-tight">
                  {isEditing ? 'Edit Category' : 'Create New Category'}
                </h1>
                <p className="text-xs font-medium text-slate-600 dark:text-text-muted mt-1">
                  Add or customize categories shown on MK Delivery Service homepage and customer shopping catalog.
                </p>
              </div>
            </div>

            {/* Notifications */}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-3">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-3">
                <CheckCircle size={18} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Quick Presets & Ideas Bar */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-bg-dark/60 border border-slate-200 dark:border-glass space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-text-secondary">
                  Quick Presets & Ideas (Click to Autofill)
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {CATEGORY_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-glass bg-white dark:bg-glass hover:border-amber-500 dark:hover:border-primary text-[11px] font-bold text-slate-800 dark:text-text-primary hover:text-amber-600 dark:hover:text-primary whitespace-nowrap transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-600 dark:text-text-muted uppercase tracking-wider">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Meat, Chicken & Fish"
                    className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-glass focus:border-amber-500 dark:focus:border-primary text-slate-900 dark:text-text-primary px-4 py-3 rounded-2xl outline-none text-xs font-bold transition-all"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-text-muted">
                    Main heading shown on category card and in customer store search.
                  </p>
                </div>

                {/* Promotional Badge */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-600 dark:text-text-muted uppercase tracking-wider">
                    Promotional Badge (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.badge}
                    onChange={(e) => setForm(prev => ({ ...prev, badge: e.target.value }))}
                    placeholder="e.g. FRESH CUTS or TEMPLE SPECIAL"
                    className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-glass focus:border-amber-500 dark:focus:border-primary text-slate-900 dark:text-text-primary px-4 py-3 rounded-2xl outline-none text-xs font-bold transition-all"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-text-muted">
                    Small highlighted tag on card corner (e.g. "HOT & FRESH", "20 MINS").
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-600 dark:text-text-muted uppercase tracking-wider">
                  Category Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Fresh cleaned chicken, tender mutton, sea fish, prawns & crabs delivered clean."
                  className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-glass focus:border-amber-500 dark:focus:border-primary text-slate-900 dark:text-text-primary px-4 py-3 rounded-2xl outline-none text-xs font-medium resize-none transition-all"
                />
              </div>

              {/* Image URL & Live Preview Row */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-600 dark:text-text-muted uppercase tracking-wider">
                  Image URL *
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex-1 w-full">
                    <input
                      type="url"
                      required
                      value={form.image}
                      onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-glass focus:border-amber-500 dark:focus:border-primary text-slate-900 dark:text-text-primary px-4 py-3 rounded-2xl outline-none text-xs font-mono transition-all"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-text-muted mt-1">
                      Direct image link (Unsplash, AWS S3, or CDN URL).
                    </p>
                  </div>

                  {/* Thumbnail Preview */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 dark:border-glass bg-black/20 shrink-0 shadow-md">
                    {form.image ? (
                      <img
                        src={form.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Display Order & Visibility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center p-4 rounded-2xl bg-slate-100 dark:bg-bg-dark/40 border border-slate-200 dark:border-glass">
                <div>
                  <label className="block text-[11px] font-black text-slate-600 dark:text-text-muted uppercase tracking-wider mb-1.5">
                    Display Order (Position Number)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.order}
                    onChange={(e) => setForm(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-white dark:bg-bg-dark border border-slate-200 dark:border-glass focus:border-amber-500 dark:focus:border-primary text-slate-900 dark:text-text-primary px-4 py-2.5 rounded-xl outline-none text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-text-muted mt-1">
                    Lower number appears earlier in the homepage categories list.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="pageActiveToggle"
                    checked={form.isActive}
                    onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500/40 bg-white dark:bg-bg-dark border-slate-300 dark:border-glass cursor-pointer"
                  />
                  <div>
                    <label htmlFor="pageActiveToggle" className="text-xs font-bold text-slate-900 dark:text-text-primary cursor-pointer block">
                      Active on Homepage
                    </label>
                    <span className="text-[10px] text-slate-500 dark:text-text-muted">
                      Uncheck to temporarily hide this category from customers.
                    </span>
                  </div>
                </div>
              </div>

              {/* Keywords / Search Matching Tags */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-600 dark:text-text-muted uppercase tracking-wider">
                  Keywords / Tags (Comma-Separated)
                </label>
                <input
                  type="text"
                  value={form.keywords}
                  onChange={(e) => setForm(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="e.g. meat, chicken, mutton, fish, seafood, non-veg"
                  className="w-full bg-slate-50 dark:bg-bg-dark border border-slate-200 dark:border-glass focus:border-amber-500 dark:focus:border-primary text-slate-900 dark:text-text-primary px-4 py-3 rounded-2xl outline-none text-xs font-medium transition-all"
                />
                <p className="text-[10px] text-slate-500 dark:text-text-muted">
                  These keywords link dish items and merchant stores to this category when users filter and search.
                </p>
              </div>

              {/* Live Preview Card */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-text-muted tracking-widest block">
                  Homepage Card Live Preview
                </span>
                <div className="max-w-xs p-4 rounded-3xl border border-slate-200 dark:border-glass bg-white dark:bg-bg-cardSec shadow-md space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 dark:border-glass bg-black/40 shrink-0">
                      <img
                        src={form.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600'}
                        alt={form.name || 'Category'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {form.badge && (
                      <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-primary">
                        {form.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900 dark:text-text-primary text-sm line-clamp-1">
                      {form.name || 'Category Name Preview'}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                      {form.description || 'Description of items and stores in this category.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-glass text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Explore Stores</span>
                    <ArrowRight size={11} className="text-amber-500" />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-200 dark:border-glass">
                <button
                  type="button"
                  onClick={() => navigate('/admin/dashboard?tab=categories')}
                  className="w-full sm:flex-1 py-3 px-6 rounded-2xl border border-slate-300 dark:border-glass bg-white dark:bg-glass hover:bg-slate-100 dark:hover:bg-glass-subtle text-slate-700 dark:text-text-primary font-bold text-xs uppercase tracking-wider transition-all text-center cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="animate-spin" size={15} />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>{isEditing ? 'Update Category' : 'Save Category to Database'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminCategoryFormPage;
