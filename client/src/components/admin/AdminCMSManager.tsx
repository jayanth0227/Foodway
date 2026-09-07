import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';
import { 
  Sparkles, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Globe, 
  HelpCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Layers, 
  Utensils 
} from 'lucide-react';

export const AdminCMSManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [allDishes, setAllDishes] = useState<any[]>([]);

  // CMS State
  const [heroStats, setHeroStats] = useState({
    customers: '20K+',
    restaurants: '500+',
    deliveryTime: '30 min'
  });

  const [flavoursConfig, setFlavoursConfig] = useState({
    title: 'Flavours of Konaseema',
    subtitle: 'Experience traditional recipes, local ingredients, and unforgettable gourmet tastes directly from the kitchens that define Konaseema.',
    featuredItemIds: [] as string[]
  });

  const [whyChooseUs, setWhyChooseUs] = useState({
    title: 'Why Choose MK Delivery..!',
    subtitle: 'From hygienic kitchen preparation to temperature-sealed express transport, discover how we deliver happiness to your doorstep.',
    features: [
      { id: 'feat-1', title: 'Fresh & Quality Food', badge: 'FRESH', description: 'We partner with trusted local restaurants to ensure every meal is prepared fresh and delivered with care.' },
      { id: 'feat-2', title: 'Fast Delivery', badge: '20-30 MINS', description: 'Get your favorite food, groceries, and daily essentials delivered quickly to your doorstep without unnecessary waiting.' },
      { id: 'feat-3', title: 'Live Order Tracking', badge: 'LIVE', description: 'Track your order in real time from restaurant confirmation until it arrives at your home.' }
    ]
  });

  const [faqs, setFaqs] = useState<any[]>([
    { id: 'faq-1', question: 'How do I place an order?', answer: 'Browse restaurants, select your favorite dishes, add them to your cart, and proceed to checkout with live order tracking.' },
    { id: 'faq-2', question: 'How long does delivery take?', answer: 'Most orders across Konaseema are delivered within 20 to 30 minutes depending on your location.' }
  ]);

  const [contactDetails, setContactDetails] = useState({
    email: 'mkdeliveryservices12@gmail.com',
    phone: '+91 9573041191',
    address: 'Ravulapalem-533238',
    whatsapp: '+919573041191',
    instagram: 'https://instagram.com/mkdeliveryservices',
    copyrightText: '© 2026 MK DELIVERY SERVICES. ALL RIGHTS RESERVED.'
  });

  const fetchCMSAndDishes = async () => {
    setLoading(true);
    try {
      const [cmsRes, dishesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/cms/homepage`),
        axios.get(`${API_BASE_URL}/public/dishes`).catch(() => ({ data: null }))
      ]);

      if (cmsRes.data?.success && cmsRes.data?.cms) {
        const cms = cmsRes.data.cms;
        if (cms.heroStats) setHeroStats(cms.heroStats);
        if (cms.flavoursOfKonaseema) setFlavoursConfig(cms.flavoursOfKonaseema);
        if (cms.whyChooseUs) setWhyChooseUs(cms.whyChooseUs);
        if (Array.isArray(cms.faqs)) setFaqs(cms.faqs);
        if (cms.contactDetails) setContactDetails(cms.contactDetails);
      }

      if (dishesRes?.data?.success && Array.isArray(dishesRes.data.dishes)) {
        setAllDishes(dishesRes.data.dishes);
      }
    } catch (err: any) {
      console.warn('Failed to load CMS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCMSAndDishes();
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await axios.put(`${API_BASE_URL}/admin/cms/homepage`, {
        heroStats,
        flavoursOfKonaseema: flavoursConfig,
        whyChooseUs,
        faqs,
        contactDetails
      });

      if (res.data?.success) {
        setStatusMsg({ type: 'success', message: 'Homepage CMS successfully updated and saved to DynamoDB!' });
      } else {
        setStatusMsg({ type: 'error', message: res.data?.error || 'Failed to update CMS' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.response?.data?.error || err.message || 'Failed to update CMS' });
    } finally {
      setSaving(false);
    }
  };

  // Dish selection toggle for Flavours of Konaseema
  const toggleFeaturedDish = (dishId: string) => {
    setFlavoursConfig(prev => {
      const current = prev.featuredItemIds || [];
      const updated = current.includes(dishId)
        ? current.filter(id => id !== dishId)
        : [...current, dishId];
      return { ...prev, featuredItemIds: updated };
    });
  };

  // FAQ management
  const addFaqItem = () => {
    setFaqs(prev => [
      ...prev,
      { id: `faq-${Date.now()}`, question: 'New Question?', answer: 'Answer text goes here.' }
    ]);
  };

  const updateFaqItem = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqs(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const deleteFaqItem = (id: string) => {
    setFaqs(prev => prev.filter(item => item.id !== id));
  };

  // Feature Card management
  const updateFeatureItem = (id: string, field: string, value: string) => {
    setWhyChooseUs(prev => ({
      ...prev,
      features: prev.features.map(f => f.id === id ? { ...f, [field]: value } : f)
    }));
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="animate-spin text-primary" size={28} />
        <p className="text-sm font-semibold">Loading Website CMS Configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-4">
        <div>
          <span className="text-primary font-bold text-xs uppercase tracking-widest mb-1 block">Live Website Customization</span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-text-primary tracking-tight">Public Homepage CMS Manager</h1>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="btn-primary py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shrink-0 shadow-lg"
        >
          {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          <span>{saving ? 'Saving to DynamoDB...' : 'Save All Changes'}</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center space-x-3 ${
          statusMsg.type === 'success' ? 'bg-success/15 border border-success/30 text-success' : 'bg-error/15 border border-error/30 text-error'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{statusMsg.message}</span>
        </div>
      )}

      {/* 1. HERO STATS CARD COUNTS */}
      <div className="glass-panel border border-glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-3 border-b border-glass pb-3">
          <Globe className="text-primary" size={20} />
          <h2 className="text-base font-bold font-display text-text-primary">1. Hero Section Stats Counter Cards</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Customers Counter</label>
            <input
              type="text"
              value={heroStats.customers}
              onChange={(e) => setHeroStats(prev => ({ ...prev, customers: e.target.value }))}
              placeholder="e.g. 20K+"
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Restaurants Counter</label>
            <input
              type="text"
              value={heroStats.restaurants}
              onChange={(e) => setHeroStats(prev => ({ ...prev, restaurants: e.target.value }))}
              placeholder="e.g. 500+"
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Delivery Time Badge</label>
            <input
              type="text"
              value={heroStats.deliveryTime}
              onChange={(e) => setHeroStats(prev => ({ ...prev, deliveryTime: e.target.value }))}
              placeholder="e.g. 30 min"
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>
        </div>
      </div>

      {/* 2. FLAVOURS OF KONASEEMA DISH SELECTOR */}
      <div className="glass-panel border border-glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-3 border-b border-glass pb-3">
          <Utensils className="text-primary" size={20} />
          <div>
            <h2 className="text-base font-bold font-display text-text-primary">2. Flavours of Konaseema Featured Dishes</h2>
            <p className="text-xs text-text-muted font-medium">Select which specific dishes to display on the homepage section.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Section Title</label>
            <input
              type="text"
              value={flavoursConfig.title}
              onChange={(e) => setFlavoursConfig(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Section Subtitle</label>
            <input
              type="text"
              value={flavoursConfig.subtitle}
              onChange={(e) => setFlavoursConfig(prev => ({ ...prev, subtitle: e.target.value }))}
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
            Pick Featured Dishes ({flavoursConfig.featuredItemIds?.length || 0} selected)
          </label>
          <div className="max-h-60 overflow-y-auto border border-glass rounded-xl p-3 bg-bg-dark/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allDishes.map((dish) => {
              const isSelected = flavoursConfig.featuredItemIds?.includes(dish.id || dish._id);
              return (
                <label
                  key={dish.id || dish._id}
                  className={`flex items-center space-x-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${
                    isSelected ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-glass/10 border-glass text-text-secondary hover:bg-glass/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFeaturedDish(dish.id || dish._id)}
                    className="accent-primary w-4 h-4 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{dish.name}</p>
                    <p className="text-[10px] text-text-muted truncate">₹{dish.price} • {dish.restaurantName || 'Konaseema'}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. WHY CHOOSE MK DELIVERY */}
      <div className="glass-panel border border-glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-3 border-b border-glass pb-3">
          <Layers className="text-primary" size={20} />
          <h2 className="text-base font-bold font-display text-text-primary">3. Why Choose MK Delivery Features</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Section Title</label>
            <input
              type="text"
              value={whyChooseUs.title}
              onChange={(e) => setWhyChooseUs(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Section Description</label>
            <input
              type="text"
              value={whyChooseUs.subtitle}
              onChange={(e) => setWhyChooseUs(prev => ({ ...prev, subtitle: e.target.value }))}
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {whyChooseUs.features.map((feat, idx) => (
            <div key={feat.id || idx} className="p-4 border border-glass rounded-xl bg-bg-dark/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Feature Title</label>
                <input
                  type="text"
                  value={feat.title}
                  onChange={(e) => updateFeatureItem(feat.id, 'title', e.target.value)}
                  className="w-full bg-bg-dark border border-glass rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Badge Text</label>
                <input
                  type="text"
                  value={feat.badge}
                  onChange={(e) => updateFeatureItem(feat.id, 'badge', e.target.value)}
                  className="w-full bg-bg-dark border border-glass rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Description</label>
                <input
                  type="text"
                  value={feat.description}
                  onChange={(e) => updateFeatureItem(feat.id, 'description', e.target.value)}
                  className="w-full bg-bg-dark border border-glass rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. FREQUENTLY ASKED QUESTIONS (FAQS) */}
      <div className="glass-panel border border-glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-glass pb-3">
          <div className="flex items-center space-x-3">
            <HelpCircle className="text-primary" size={20} />
            <h2 className="text-base font-bold font-display text-text-primary">4. Frequently Asked Questions (FAQs)</h2>
          </div>

          <button
            onClick={addFaqItem}
            className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary text-primary hover:text-black font-bold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus size={14} />
            <span>Add Question</span>
          </button>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.id} className="p-4 border border-glass rounded-xl bg-bg-dark/40 space-y-3 relative group">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => updateFaqItem(faq.id, 'question', e.target.value)}
                  placeholder="Question text"
                  className="flex-1 bg-bg-dark border border-glass rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none focus:border-primary"
                />
                <button
                  onClick={() => deleteFaqItem(faq.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete FAQ"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <textarea
                value={faq.answer}
                onChange={(e) => updateFaqItem(faq.id, 'answer', e.target.value)}
                placeholder="Answer description"
                rows={2}
                className="w-full bg-bg-dark border border-glass rounded-lg px-3 py-2 text-xs text-text-muted outline-none focus:border-primary font-medium"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 5. FOOTER & CONTACT DETAILS */}
      <div className="glass-panel border border-glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-3 border-b border-glass pb-3">
          <Mail className="text-primary" size={20} />
          <h2 className="text-base font-bold font-display text-text-primary">5. Footer Contact Details & Links</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Contact Email</label>
            <input
              type="email"
              value={contactDetails.email}
              onChange={(e) => setContactDetails(prev => ({ ...prev, email: e.target.value }))}
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Contact Phone</label>
            <input
              type="text"
              value={contactDetails.phone}
              onChange={(e) => setContactDetails(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Address Location</label>
            <input
              type="text"
              value={contactDetails.address}
              onChange={(e) => setContactDetails(prev => ({ ...prev, address: e.target.value }))}
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">WhatsApp Number / Link</label>
            <input
              type="text"
              value={contactDetails.whatsapp}
              onChange={(e) => setContactDetails(prev => ({ ...prev, whatsapp: e.target.value }))}
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Instagram Profile Link</label>
            <input
              type="text"
              value={contactDetails.instagram}
              onChange={(e) => setContactDetails(prev => ({ ...prev, instagram: e.target.value }))}
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">Copyright Text</label>
            <input
              type="text"
              value={contactDetails.copyrightText}
              onChange={(e) => setContactDetails(prev => ({ ...prev, copyrightText: e.target.value }))}
              className="w-full bg-bg-dark border border-glass rounded-xl px-4 py-2.5 text-xs text-text-primary outline-none focus:border-primary font-semibold"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminCMSManager;
