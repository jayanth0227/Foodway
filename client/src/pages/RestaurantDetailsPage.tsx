import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, MapPin, Star, Search, ShoppingBag, Utensils, Plus, Minus, Layers, X, AlertTriangle, Lock } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { API_BASE_URL } from '../utils/api';

export const RestaurantDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, reduceQuantity, getItemQuantity } = useCart();

  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDietary, setSelectedDietary] = useState<'All' | 'Veg' | 'Non-Veg'>('All');
  const [isCategoryFabOpen, setIsCategoryFabOpen] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchRestaurantDetails(id);
    }
  }, [id]);

  const fetchRestaurantDetails = async (resId: string) => {
    setLoading(true);
    try {
      // 1. Fetch restaurant info
      const resResponse = await axios.get(`${API_BASE_URL}/public/restaurants`);
      if (resResponse.data.success && Array.isArray(resResponse.data.restaurants)) {
        const found = resResponse.data.restaurants.find((r: any) => r.id === resId || r.restaurantId === resId);
        if (found) {
          setRestaurant(found);
        } else {
          setRestaurant({
            id: resId,
            name: 'Partner Restaurant',
            cuisine: 'Multi-Cuisine',
            rating: 4.8,
            deliveryTime: '20-30 mins',
            image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=85',
            isOpen: true
          });
        }
      }

      // 2. Fetch menu items for this specific restaurant from DynamoDB
      const menuResponse = await axios.get(`${API_BASE_URL}/restaurant/menu/${resId}`);
      if (menuResponse.data.success && Array.isArray(menuResponse.data.items)) {
        setMenuItems(menuResponse.data.items);
      } else {
        setMenuItems([]);
      }
    } catch (err) {
      console.error('Error fetching restaurant details & menu from DB:', err);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(menuItems.map(m => m.category).filter(Boolean)))];

  const filteredMenuItems = menuItems.filter(item => {
    const itemName = item.foodName || item.name || '';
    const itemDesc = item.description || '';
    const matchesSearch = itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      itemDesc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const isVegItem = item.isVeg !== false;
    const matchesDietary = selectedDietary === 'All' || (selectedDietary === 'Veg' ? isVegItem : !isVegItem);
    return matchesSearch && matchesCat && matchesDietary;
  });

  return (
    <>
      <Helmet>
        <title>{restaurant ? `${restaurant.name} | Menu & Orders` : 'Restaurant Details'} | MK Delivery Services</title>
      </Helmet>

      <div className="min-h-screen bg-bg-dark pt-28 pb-28 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-20 left-0 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-8 relative z-10">

          {/* Back Button */}
          <button
            onClick={() => navigate('/restaurants')}
            className="px-4 py-2 rounded-xl bg-glass border border-glass hover:border-primary/40 text-text-secondary hover:text-primary font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to All Restaurants</span>
          </button>

          {/* Restaurant Banner Header */}
          {loading ? (
            <div className="glass-panel border border-glass rounded-3xl h-64 animate-pulse" />
          ) : restaurant && (
            <div className="relative rounded-3xl overflow-hidden border border-glass shadow-luxury bg-bg-darkSec">
              <div className="h-64 sm:h-80 relative overflow-hidden">
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/60 to-transparent" />

                <div className="absolute top-6 left-6 flex gap-2">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-lg ${restaurant.isOpen ? 'bg-emerald-500/90 text-white' : 'bg-rose-600/90 text-white'
                    }`}>
                    {restaurant.isOpen ? '● OPEN FOR ORDERS' : '● CLOSED'}
                  </span>
                </div>

                <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-2">
                    <span className="px-3 py-1 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs font-bold uppercase tracking-wider">
                      {restaurant.cuisine || 'Multi-Cuisine'}
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black font-display text-white tracking-tight">
                      {restaurant.name}
                    </h1>
                    {restaurant.address && (
                      <p className="text-xs sm:text-sm text-text-muted flex items-center gap-2">
                        <MapPin size={14} className="text-primary shrink-0" />
                        <span>{restaurant.address}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black font-extrabold text-sm shadow-lg">
                      <Star size={16} className="fill-black" />
                      <span>{restaurant.rating || 4.8} Rating</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Currently Not Accepting Orders Banner */}
          {restaurant && (restaurant.isOpen === false || restaurant.status === 'closed') && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-300 flex items-start gap-3.5 shadow-lg">
              <AlertTriangle size={24} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-extrabold text-sm sm:text-base text-rose-400 block">
                  🔴 Currently Not Accepting Orders
                </span>
                <span className="text-xs text-rose-200/90 leading-relaxed block">
                  This restaurant is currently offline or closed. You can view the available menu below, but selecting items and adding them to the cart is temporarily disabled.
                </span>
              </div>
            </div>
          )}

          {/* Menu Search & Category Controls */}
          <div className="glass-panel border border-glass rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-luxury">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search food items in this restaurant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-bg-dark/80 border border-glass focus:border-primary/50 text-text-primary placeholder-text-muted/60 outline-none"
              />
            </div>

            {/* Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${selectedCategory === cat ? 'bg-primary text-black font-black shadow-md' : 'bg-glass hover:bg-glass-subtle border border-glass text-text-secondary'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dietary Type Filter */}
            <div className="flex items-center gap-1 bg-bg-dark/60 border border-glass p-1 rounded-xl shrink-0">
              {(['All', 'Veg', 'Non-Veg'] as const).map(dt => (
                <button
                  key={dt}
                  onClick={() => setSelectedDietary(dt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedDietary === dt ? 'bg-primary text-black font-extrabold' : 'text-text-muted hover:text-text-primary'
                    }`}
                >
                  {dt}
                </button>
              ))}
            </div>
          </div>

          {/* Food Items List */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="glass-panel border border-glass rounded-2xl h-48 animate-pulse" />
              ))}
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div className="py-20 text-center glass-panel border border-glass rounded-3xl p-12 max-w-lg mx-auto space-y-4">
              <Utensils size={48} className="mx-auto text-text-muted opacity-50" />
              <h3 className="text-xl font-bold font-display text-text-primary">No Food Items Available</h3>
              <p className="text-xs text-text-muted">
                This establishment has not listed items matching your filter criteria yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-4 w-full">
              {filteredMenuItems.map(item => {
                const dishId = item.menuItemId || item.id;
                const isRestaurantClosed = restaurant && (restaurant.isOpen === false || restaurant.status === 'closed');
                const isOutOfStock = isRestaurantClosed || item.isAvailable === false || item.status === 'UNAVAILABLE' || item.status === 'disabled';
                const qtyInCart = getItemQuantity(dishId);

                const dishObj = {
                  id: dishId,
                  name: item.foodName || item.name,
                  description: item.description || '',
                  price: Number(item.price),
                  category: item.category || 'Main Course',
                  image: item.foodImage || item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
                  type: (item.isVeg !== false ? 'veg' : 'non-veg') as 'veg' | 'non-veg',
                  isVeg: item.isVeg !== false,
                  isAvailable: !isOutOfStock,
                  restaurantIsOpen: !isRestaurantClosed,
                  rating: 4.8,
                  restaurantId: restaurant?.id || id || item.restaurantId,
                  restaurantName: restaurant?.name || 'Partner Restaurant'
                };

                return (
                  <motion.div
                    key={dishId}
                    whileHover={{ x: 4 }}
                    className={`glass-panel border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 shadow-luxury transition-all w-full ${isOutOfStock ? 'opacity-70 border-rose-500/20 bg-bg-dark/40' : 'border-glass hover:border-primary/40'
                      }`}
                  >
                    {/* Left Side: Food Image Container */}
                    <div className="relative w-full sm:w-36 h-36 sm:h-28 rounded-xl overflow-hidden border border-glass bg-bg-dark shrink-0">
                      <img
                        src={dishObj.image}
                        alt={dishObj.name}
                        className={`w-full h-full object-cover transition-transform duration-500 ${isOutOfStock ? 'grayscale' : 'hover:scale-105'}`}
                      />
                      <div className="absolute top-2 left-2 flex gap-1">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${dishObj.isVeg ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
                          }`}>
                          {dishObj.isVeg ? 'Veg' : 'Non-Veg'}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase backdrop-blur-md ${!isOutOfStock ? 'bg-emerald-500/90 text-white' : 'bg-rose-600/90 text-white'
                          }`}>
                          {isRestaurantClosed ? 'Closed' : !isOutOfStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Center: Food Details */}
                    <div className="flex-1 min-w-0 space-y-1.5 text-left w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                          {dishObj.category}
                        </span>
                        <span className="text-[11px] text-text-muted font-medium">
                          Prep: {item.preparationTime || item.prepTime || '15-20 mins'}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base sm:text-lg text-text-primary truncate">
                        {dishObj.name}
                      </h3>
                      {dishObj.description && (
                        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                          {dishObj.description}
                        </p>
                      )}
                    </div>

                    {/* Right Side: Price & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-glass">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Price</span>
                        <span className="text-lg sm:text-xl font-black text-text-primary font-display">
                          ₹{dishObj.price.toFixed(2)}
                        </span>
                      </div>

                      {/* Action Button */}
                      {isRestaurantClosed ? (
                        <button
                          disabled
                          className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-rose-500/20 text-rose-400 cursor-not-allowed border border-rose-500/30 flex items-center gap-1.5 cursor-not-allowed"
                          title="Restaurant is currently offline"
                        >
                          <Lock size={13} />
                          <span>Not Accepting Orders</span>
                        </button>
                      ) : isOutOfStock ? (
                        <button
                          disabled
                          className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-500/20 text-rose-400 cursor-not-allowed border border-rose-500/30"
                        >
                          Unavailable
                        </button>
                      ) : qtyInCart > 0 ? (
                        <div className="flex items-center bg-primary text-black rounded-xl p-1 shadow-md border border-amber-300">
                          <button
                            type="button"
                            onClick={() => reduceQuantity(dishId)}
                            className="w-7 h-7 rounded-lg bg-black/15 hover:bg-black/30 text-black font-black flex items-center justify-center transition-colors cursor-pointer"
                            title="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-8 text-center font-black text-xs">
                            {qtyInCart}
                          </span>
                          <button
                            type="button"
                            onClick={() => addToCart(dishObj)}
                            className="w-7 h-7 rounded-lg bg-black/15 hover:bg-black/30 text-black font-black flex items-center justify-center transition-colors cursor-pointer"
                            title="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(dishObj)}
                          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-black font-extrabold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingBag size={13} />
                          <span>Add to Cart</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Floating Action Button (FAB) for Categories - Fixed Right Bottom Position */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsCategoryFabOpen(!isCategoryFabOpen)}
          className="px-5 py-3.5 rounded-full bg-primary text-black font-black text-xs uppercase tracking-wider shadow-[0_8px_25px_rgba(197,147,99,0.5)] hover:scale-105 transition-transform flex items-center gap-2 cursor-pointer border-2 border-amber-300"
        >
          <Layers size={18} />
          <span>Menu Categories</span>
          <span className="bg-black/20 px-2 py-0.5 rounded-full text-[10px]">
            {categories.length - 1}
          </span>
        </button>

        {/* Floating Category Select Popup */}
        <AnimatePresence>
          {isCategoryFabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute bottom-16 right-0 w-64 bg-bg-darkSec border border-primary/40 rounded-2xl p-4 shadow-luxury backdrop-blur-xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-glass pb-2">
                <span className="text-xs font-black uppercase text-primary tracking-wider">Select Category</span>
                <button
                  onClick={() => setIsCategoryFabOpen(false)}
                  className="p-1 text-text-muted hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const count = cat === 'All' ? menuItems.length : menuItems.filter(m => m.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setIsCategoryFabOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors cursor-pointer ${isSelected ? 'bg-primary text-black font-extrabold' : 'hover:bg-glass text-text-secondary hover:text-white'
                        }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md ${isSelected ? 'bg-black/20 text-black' : 'bg-glass text-text-muted'}`}>
                        {count} items
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default RestaurantDetailsPage;
