import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Star,
  Heart,
  Plus,
  Minus,
  Ban,
  UtensilsCrossed,
  Store,
  Info,
  Trash2,
  Sparkles,
  Utensils
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { getWishlist, toggleWishlistItem } from '../utils/wishlistUtils';

const FALLBACK_KONASEEMA_DISHES = [
  {
    id: 'kona-1',
    name: 'Ghee Motichoor Laddu',
    restaurantName: 'Vijaya Durga Sweets',
    price: 160,
    rating: 4.9,
    type: 'veg',
    category: 'Sweets',
    description: 'Authentic melt-in-mouth golden Motichoor Laddus made with pure ghee and crushed pistachios.',
    image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-2',
    name: 'Special Paneer Kathi Roll',
    restaurantName: 'Jayanth Foods',
    price: 180,
    rating: 4.8,
    type: 'veg',
    category: 'Fast Food',
    description: 'Soft malai paneer cubes tossed in tandoori spices wrapped in a hot crispy laccha paratha.',
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-3',
    name: 'Konaseema Royyala Veepudu',
    restaurantName: 'Passalapudi Ruchulu',
    price: 380,
    rating: 4.9,
    type: 'non-veg',
    category: 'Konaseema Specials',
    description: 'Juicy Godavari prawns tossed with fresh coconut, curry leaves, and traditional village spices.',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-4',
    name: 'Fresh Farm Organic Vegetables',
    restaurantName: 'Konaseema Fresh Farms',
    price: 120,
    rating: 4.9,
    type: 'veg',
    category: 'Vegetables & Farm Fresh',
    description: 'Direct farm-fresh organic carrots, crisp green capsicums, tomatoes, and village greens.',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-5',
    name: 'Gongura Mutton Fry',
    restaurantName: 'Godavari Village Kitchen',
    price: 420,
    rating: 4.8,
    type: 'non-veg',
    category: 'Konaseema Specials',
    description: 'Tender slow-cooked mutton infused with tangy Gongura leaves and authentic Andhra garam masala.',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-6',
    name: 'Kakinada Gottam Kaja',
    restaurantName: 'Vijaya Durga Sweets',
    price: 140,
    rating: 4.9,
    type: 'veg',
    category: 'Sweets',
    description: 'Traditional juicy Gottam Kaja dripping with aromatic cardamom sugar syrup.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-7',
    name: 'Godavari Chepala Pulusu',
    restaurantName: 'Amalapuram Ruchulu',
    price: 350,
    rating: 4.9,
    type: 'non-veg',
    category: 'Konaseema Specials',
    description: 'Authentic Godavari river fish simmered in tangy tamarind gravy with raw mangoes and garlic.',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-8',
    name: 'Avakaya Chicken Biryani',
    restaurantName: 'Godavari Village Kitchen',
    price: 320,
    rating: 4.8,
    type: 'non-veg',
    category: 'Konaseema Specials',
    description: 'Fragrant basmati rice dum cooked with juicy chicken marinated in spicy handmade Andhra mango pickle.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-9',
    name: 'Traditional Pootharekulu',
    restaurantName: 'Vijaya Durga Sweets',
    price: 220,
    rating: 5.0,
    type: 'veg',
    category: 'Sweets',
    description: 'Famous paper-thin rice starch wrappers filled with pure ghee, powdered jaggery, and dry fruits.',
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-10',
    name: 'Panasa Pattu Biryani',
    restaurantName: 'Passalapudi Ruchulu',
    price: 280,
    rating: 4.7,
    type: 'veg',
    category: 'Konaseema Specials',
    description: 'Unique Konaseema delicacy made with tender raw jackfruit shreds cooked in rich aromatic biryani spices.',
    image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-11',
    name: 'Crispy Butter Dosa Platter',
    restaurantName: 'Jayanth Foods',
    price: 110,
    rating: 4.8,
    type: 'veg',
    category: 'Fast Food',
    description: 'Golden crispy butter dosa served with coconut chutney, ginger chutney, and hot sambar.',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  },
  {
    id: 'kona-12',
    name: 'Natukodi Kodi Kura',
    restaurantName: 'Amalapuram Ruchulu',
    price: 390,
    rating: 4.9,
    type: 'non-veg',
    category: 'Konaseema Specials',
    description: 'Country chicken cooked in traditional clay pot with freshly ground black pepper and roasted coconut.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=85',
    isAvailable: true
  }
];

export const DishesPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, reduceQuantity, removeFromCart, getItemQuantity } = useCart();
  const { t } = useLanguage();

  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    const list = getWishlist();
    const favMap: Record<string, boolean> = {};
    list.forEach(i => { favMap[i.id] = true; });
    return favMap;
  });

  useEffect(() => {
    const fetchDishes = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/public/dishes`);
        if (response.data.success && Array.isArray(response.data.dishes) && response.data.dishes.length > 0) {
          setDishes(response.data.dishes);
        } else {
          setDishes(FALLBACK_KONASEEMA_DISHES);
        }
      } catch (err) {
        console.warn('Error fetching dishes, using fallbacks:', err);
        setDishes(FALLBACK_KONASEEMA_DISHES);
      } finally {
        setLoading(false);
      }
    };

    fetchDishes();

    const syncWishlist = () => {
      const list = getWishlist();
      const favMap: Record<string, boolean> = {};
      list.forEach(i => { favMap[i.id] = true; });
      setFavorites(favMap);
    };

    window.addEventListener('foodway_wishlist_updated', syncWishlist);
    return () => window.removeEventListener('foodway_wishlist_updated', syncWishlist);
  }, []);

  const toggleFavorite = (dish: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleWishlistItem({
      id: dish.id,
      name: dish.name,
      image: dish.image,
      price: dish.price,
      rating: dish.rating || 4.8,
      restaurantId: dish.restaurantId || 'kona-res',
      restaurantName: dish.restaurantName || 'Konaseema Kitchens',
      category: dish.category,
      type: 'dish',
    });
  };

  const handleAddToCart = (dish: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (dish.isAvailable === false || dish.status === 'disabled') return;
    addToCart({
      id: dish.id,
      name: dish.name,
      price: Number(dish.price),
      rating: dish.rating || 4.8,
      image: dish.image,
      type: dish.type || (dish.isVeg ? 'veg' : 'non-veg'),
      category: dish.category || 'Konaseema',
      description: dish.description || '',
      restaurantId: dish.restaurantId || 'kona-res',
      restaurantName: dish.restaurantName || 'Konaseema Kitchens'
    });
  };

  // Filter & Sort Dishes by Rating Descending
  const filteredDishes = dishes
    .filter((dish) => {
      const matchesSearch =
        searchQuery === '' ||
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dish.description && dish.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (dish.restaurantName && dish.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesCat = true;
      if (selectedCategory === 'Veg') {
        matchesCat = dish.type === 'veg' || dish.isVeg === true;
      } else if (selectedCategory === 'Non-Veg') {
        matchesCat = dish.type === 'non-veg' || dish.isVeg === false;
      } else if (selectedCategory === 'Konaseema Specials') {
        matchesCat = (dish.category || '').toLowerCase().includes('konaseema') || (dish.name || '').toLowerCase().includes('konaseema');
      } else if (selectedCategory === 'Sweets') {
        matchesCat = (dish.category || '').toLowerCase().includes('sweets') || (dish.name || '').toLowerCase().includes('kaja') || (dish.name || '').toLowerCase().includes('laddu');
      } else if (selectedCategory === 'Fast Food') {
        matchesCat = (dish.category || '').toLowerCase().includes('fast') || (dish.name || '').toLowerCase().includes('roll') || (dish.name || '').toLowerCase().includes('dosa');
      }

      return matchesSearch && matchesCat;
    })
    .sort((a, b) => Number(b.rating || 4.8) - Number(a.rating || 4.8));

  const categoriesList = ['All', 'Veg', 'Non-Veg', 'Konaseema Specials', 'Sweets', 'Fast Food'];

  return (
    <>
      <Helmet>
        <title>Taste the Heart of Konaseema | Foodway Gourmet Dishes</title>
        <meta
          name="description"
          content="Browse all authentic Konaseema food items, Godavari specials, handcrafted sweets, and fresh gourmet dishes. Add directly to cart!"
        />
      </Helmet>

      <div className="min-h-screen bg-bg-dark pt-20 sm:pt-28 pb-24 px-4 sm:px-6 lg:px-12 relative">
        {/* Ambient Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 space-y-6">
          {/* Header Navigation Bar */}
          <div className="shrink-0 space-y-4 pt-2 sm:pt-0 pb-4 border-b border-glass bg-bg-dark z-20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Back Button & Title */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <button
                  onClick={() => navigate('/')}
                  className="p-2.5 sm:p-3 rounded-2xl bg-glass border border-glass hover:border-primary/50 text-text-primary transition-all active:scale-95 shadow-sm group shrink-0 cursor-pointer flex items-center justify-center"
                  aria-label="Back to Home"
                  title="Back to Home Screen"
                >
                  <ArrowLeft size={19} className="text-primary group-hover:-translate-x-0.5 transition-transform" />
                </button>

                <div className="space-y-0.5 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display text-gradient-gold leading-tight truncate">
                    Taste the Heart of Konaseema
                  </h1>
                  <p className="text-xs sm:text-sm text-text-secondary font-medium truncate">
                    Explore traditional recipes and gourmet dishes directly from Godavari kitchens.
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72 lg:w-80 shrink-0">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search dishes, sweets, or shops..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-2xl bg-glass border border-glass focus:border-primary/50 text-text-primary text-[15px] sm:text-xs font-bold focus:outline-none transition-all placeholder:text-text-muted shadow-sm"
                />
              </div>
            </div>

            {/* Category Filter Pills Bar */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-primary text-black shadow-luxury scale-105'
                      : 'bg-glass border border-glass text-text-secondary hover:text-text-primary hover:border-primary/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Dishes Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-72 rounded-2xl bg-glass/20 animate-pulse border border-glass" />
              ))}
            </div>
          ) : filteredDishes.length === 0 ? (
            <div className="py-16 text-center glass-panel border border-glass rounded-3xl p-8 max-w-md mx-auto space-y-3">
              <Utensils size={36} className="mx-auto text-text-muted opacity-50" />
              <h3 className="text-lg font-bold text-text-primary">No Dishes Found</h3>
              <p className="text-xs text-text-muted">
                No items matched your search criteria. Try changing filters or clear search term.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-5 py-2.5 rounded-xl bg-primary text-black font-extrabold text-xs shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredDishes.map((dish) => {
                const isFav = !!favorites[dish.id];
                const isOutOfStock = dish.isAvailable === false || dish.status === 'disabled';
                const quantity = getItemQuantity(dish.id);

                return (
                  <motion.div
                    key={dish.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group glass-panel border border-glass rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-luxury bg-bg-cardSec/90 hover:border-primary/50 transition-all duration-300 ${
                      isOutOfStock ? 'opacity-75 border-rose-500/20' : ''
                    }`}
                  >
                    <div>
                      {/* Image Thumbnail */}
                      <div className="relative h-32 sm:h-36 rounded-xl sm:rounded-2xl overflow-hidden border border-glass mb-3 bg-black/40">
                        <img
                          src={dish.image}
                          alt={dish.name}
                          className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                            isOutOfStock ? 'grayscale' : 'group-hover:scale-105'
                          }`}
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 flex-wrap">
                          <span
                            className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-md ${
                              dish.type === 'veg' || dish.isVeg
                                ? 'bg-emerald-500/80 text-white border border-emerald-400/40'
                                : 'bg-rose-600/80 text-white border border-rose-400/40'
                            }`}
                          >
                            {dish.type === 'veg' || dish.isVeg ? 'Veg' : 'Non-Veg'}
                          </span>

                          {isOutOfStock && (
                            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-600/90 text-white shadow-md backdrop-blur-md">
                              Out of Stock
                            </span>
                          )}
                        </div>

                        {/* Wishlist Heart */}
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(dish, e)}
                          className="absolute top-2 right-2 z-20 p-1.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 text-white hover:text-rose-400 active:scale-95 transition-all shadow-md cursor-pointer"
                          title="Favorite"
                        >
                          <Heart
                            size={13}
                            className={isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}
                          />
                        </button>
                      </div>

                      {/* Restaurant Name */}
                      <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-primary/90 truncate mb-1 flex items-center gap-1.5">
                        <Store size={11} className="text-primary shrink-0" />
                        <span className="truncate">{dish.restaurantName || 'Konaseema Kitchens'}</span>
                      </div>

                      {/* Title & Rating */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <UtensilsCrossed size={12} className="text-amber-400/90 shrink-0" />
                          <h3 className="font-display font-black text-xs sm:text-sm text-text-primary group-hover:text-primary transition-colors truncate">
                            {dish.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0 bg-emerald-600 border border-emerald-500/40 px-1.5 py-0.5 rounded-md text-white text-[10px] sm:text-[11px] font-black shadow-sm">
                          <Star size={10} className="fill-white text-white" />
                          <span>{dish.rating || 4.8}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="flex items-start gap-1 mt-1">
                        <Info size={11} className="text-text-muted shrink-0 mt-0.5 opacity-60" />
                        <p className="text-[11px] text-text-muted leading-snug line-clamp-2 font-medium">
                          {dish.description}
                        </p>
                      </div>
                    </div>

                    {/* Price & Add to Cart Footer */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-glass/60 mt-3">
                      <span className="text-sm sm:text-base font-black text-text-primary text-gradient-gold">
                        ₹{Number(dish.price).toFixed(0)}
                      </span>

                      {/* Direct Add to Cart Actions */}
                      {isOutOfStock ? (
                        <button
                          disabled
                          className="font-bold text-[10px] py-1.5 px-2.5 rounded-lg flex items-center gap-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed"
                        >
                          <Ban size={11} />
                          <span>Unavailable</span>
                        </button>
                      ) : quantity > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center bg-primary/10 border border-primary/40 text-primary rounded-xl p-0.5 shadow-sm backdrop-blur-md">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                reduceQuantity(dish.id);
                              }}
                              className="w-6 h-6 rounded-lg bg-primary/20 hover:bg-primary hover:text-black text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-95"
                              title="Decrease quantity"
                            >
                              <Minus size={11} />
                            </button>

                            <span className="w-6 text-center font-black text-xs text-primary">
                              {quantity}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(dish, e);
                              }}
                              className="w-6 h-6 rounded-lg bg-primary/20 hover:bg-primary hover:text-black text-primary font-black flex items-center justify-center transition-all cursor-pointer active:scale-95"
                              title="Increase quantity"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromCart(dish.id);
                            }}
                            className="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
                            title="Remove item"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(dish, e)}
                          className="px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-black font-extrabold text-[11px] uppercase tracking-wider shadow-sm transition-all duration-300 backdrop-blur-md active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>Add</span>
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
    </>
  );
};

export default DishesPage;
