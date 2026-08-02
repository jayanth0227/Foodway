import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Search, MapPin, Star, Clock, Store, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

export const RestaurantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/public/restaurants`);
      if (response.data.success && Array.isArray(response.data.restaurants)) {
        setRestaurants(response.data.restaurants);
      } else {
        setRestaurants([]);
      }
    } catch (err) {
      console.error('Failed to fetch restaurants from DB:', err);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Restaurants
  const cuisines = ['All', ...Array.from(new Set(restaurants.map(r => r.cuisine).filter(Boolean)))];
  
  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (r.cuisine && r.cuisine.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCuisine = selectedCuisine === 'All' || r.cuisine === selectedCuisine;
    return matchesSearch && matchesCuisine;
  });

  return (
    <>
      <Helmet>
        <title>Available Partner Establishments | MK Delivery Services</title>
        <meta name="description" content="Browse all active restaurants and dining establishments available in our live database." />
      </Helmet>

      <div className="min-h-screen bg-bg-dark pt-28 pb-20 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-10 relative z-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-glass pb-8">
            <div className="space-y-3">
              <span className="text-primary font-bold text-xs uppercase tracking-widest block">Live Database Directory</span>
              <h1 className="text-3xl sm:text-5xl font-black font-display text-gradient-gold tracking-tight">
                Available Restaurants
              </h1>
              <p className="text-xs sm:text-sm text-text-muted font-medium max-w-xl">
                Explore all verified partner restaurants registered in our system. View live statuses, menus, and order directly.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-4 py-2 rounded-xl bg-glass border border-glass text-xs font-bold text-text-primary">
                {restaurants.length} Registered Establishments
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="glass-panel border border-glass rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-luxury">
            <div className="relative w-full md:w-96">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search restaurant by name, location, or cuisine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm font-semibold rounded-xl bg-bg-dark/80 border border-glass focus:border-primary/50 text-text-primary placeholder-text-muted/60 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider shrink-0 mr-1">Cuisine:</span>
              {cuisines.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCuisine(c)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCuisine === c ? 'bg-primary text-black font-extrabold shadow-md' : 'bg-glass hover:bg-glass-subtle border border-glass text-text-secondary'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Restaurant Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="glass-panel border border-glass rounded-3xl h-[380px] animate-pulse" />
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="py-20 text-center glass-panel border border-glass rounded-3xl p-12 max-w-lg mx-auto space-y-4">
              <Store size={48} className="mx-auto text-text-muted opacity-50" />
              <h3 className="text-xl font-bold font-display text-text-primary">No Restaurants Found</h3>
              <p className="text-xs text-text-muted">
                No active restaurants match your search. New partner establishments registered in the system will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRestaurants.map(r => (
                <motion.div
                  key={r.id}
                  onClick={() => navigate(`/restaurants/${r.id || r.restaurantId}`)}
                  whileHover={{ y: -6 }}
                  className="glass-panel border border-glass rounded-3xl overflow-hidden shadow-luxury cursor-pointer group flex flex-col justify-between h-[420px] transition-all duration-300 hover:border-primary/40"
                >
                  {/* Cover Image & Status Badge */}
                  <div className="relative h-56 overflow-hidden bg-bg-darkSec">
                    <img
                      src={r.image}
                      alt={r.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent opacity-80" />

                    <div className="absolute top-4 left-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg ${
                        r.isOpen ? 'bg-emerald-500/90 text-white border border-emerald-400/40' : 'bg-rose-600/90 text-white border border-rose-500/40'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${r.isOpen ? 'bg-white animate-pulse' : 'bg-white/60'}`} />
                        {r.isOpen ? 'OPEN FOR ORDERS' : 'CLOSED'}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                      <span className="px-3 py-1 rounded-lg bg-bg-dark/80 backdrop-blur-md border border-glass text-primary text-[10px] font-bold uppercase tracking-wider">
                        {r.cuisine || 'Gourmet'}
                      </span>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/90 text-black text-[10px] font-extrabold shadow-md">
                        <Star size={12} className="fill-black" />
                        <span>{r.rating || 4.8}</span>
                      </div>
                    </div>
                  </div>

                  {/* Info Content */}
                  <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-xl font-bold font-display text-text-primary group-hover:text-primary transition-colors tracking-tight line-clamp-1">
                        {r.name}
                      </h3>
                      {r.address && (
                        <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1.5 line-clamp-1">
                          <MapPin size={13} className="text-primary shrink-0" />
                          <span>{r.address}</span>
                        </p>
                      )}
                      {r.description && (
                        <p className="text-xs text-text-secondary mt-2 line-clamp-2 leading-relaxed">
                          {r.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-glass flex items-center justify-between text-xs font-bold">
                      <span className="text-text-muted flex items-center gap-1">
                        <Clock size={13} className="text-primary" />
                        <span>{r.deliveryTime || '20-30 mins'}</span>
                      </span>
                      <span className="text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1 uppercase tracking-wider text-[11px] font-black">
                        <span>Explore Menu</span>
                        <ArrowLeft size={13} className="rotate-180" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RestaurantsPage;
