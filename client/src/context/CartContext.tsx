import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, X, ShoppingBag, ArrowRight, ShieldCheck, Zap, Tag } from 'lucide-react';
import type { DishItem } from '../utils/mockData';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { getCurrentUser } from '../utils/auth.utils';
import { useAuth } from '../hooks/useAuth';
import socketService from '../services/socket.service';

export interface CartItem {
  dish: DishItem;
  quantity: number;
  selectedVariant?: any;
  itemKey: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (dish: DishItem, selectedVariant?: any) => void;
  incrementQuantity: (itemKeyOrDishId: string) => void;
  removeFromCart: (itemKey: string) => void;
  reduceQuantity: (itemKey: string) => void;
  clearCart: () => void;
  getItemQuantity: (dishId: string, variantId?: string) => number;
  totalAmount: number;
  totalItemsCount: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  lastAddedItem: { name: string; quantity: number; image: string; price: number; variantLabel?: string; timestamp?: number } | null;
  dismissToast: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
}

const mergeCartItems = (cartA: CartItem[], cartB: CartItem[]): CartItem[] => {
  const map = new Map<string, CartItem>();

  [...cartA, ...cartB].forEach(item => {
    if (!item || !item.dish) return;
    const key = item.itemKey || (item.selectedVariant?.id ? `${item.dish.id}-${item.selectedVariant.id}` : item.dish.id);
    if (map.has(key)) {
      const existing = map.get(key)!;
      map.set(key, {
        ...existing,
        quantity: Math.max(existing.quantity, item.quantity),
        dish: { ...existing.dish, ...item.dish }
      });
    } else {
      map.set(key, { ...item, itemKey: key });
    }
  });

  return Array.from(map.values());
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isRemoteSyncingRef = useRef(false);
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id || (user as any)?.userId || user?.email;
  let navigate: any;
  try {
    navigate = useNavigate();
  } catch (e) {
    // Fallback if rendered outside router context
  }

  const [showAuthModal, setShowAuthModal] = useState(false);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      if (!isAuthenticated && !user && !getCurrentUser()) return [];
      const activeUser = user || getCurrentUser();
      const activeId = activeUser?.id || (activeUser as any)?.userId || activeUser?.email;
      if (activeId) {
        const userCartStr = localStorage.getItem(`mk_cart_${activeId}`);
        if (userCartStr) {
          const parsedUser = JSON.parse(userCartStr);
          if (Array.isArray(parsedUser)) return parsedUser;
        }
      }
    } catch (e) {
      console.error('Error loading cart from localStorage on init', e);
    }
    return [];
  });

  const [isCartOpen, setCartOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<{ name: string; quantity: number; image: string; price: number; variantLabel?: string; timestamp?: number } | null>(null);

  // React to User Auth State Changes & Sync Active Cart Across Local Storage & DB
  useEffect(() => {
    const activeUser = user || getCurrentUser();
    const activeUserId = isAuthenticated && activeUser ? (userId || activeUser?.id || (activeUser as any)?.userId || activeUser?.email) : null;

    if (activeUserId) {
      // Join Customer Socket Room
      socketService.joinCustomer(activeUserId);

      // Load user cart from localStorage
      let localUserItems: CartItem[] = [];
      try {
        const uStr = localStorage.getItem(`mk_cart_${activeUserId}`);
        if (uStr) localUserItems = JSON.parse(uStr) || [];
      } catch (e) { }

      if (localUserItems.length > 0) {
        setCartItems(localUserItems);
      }

      // Fetch User Active Cart from DB / Backend
      axios.get(`${API_BASE_URL}/cart/${activeUserId}`)
        .then(res => {
          if (res.data && res.data.success && Array.isArray(res.data.cartItems)) {
            const dbItems: CartItem[] = res.data.cartItems;
            const finalMerged = mergeCartItems(localUserItems.length > 0 ? localUserItems : cartItems, dbItems);

            isRemoteSyncingRef.current = true;
            setCartItems(finalMerged);

            try {
              localStorage.setItem(`mk_cart_${activeUserId}`, JSON.stringify(finalMerged));
            } catch (e) { }

            // Sync merged cart back up to server if new local items were merged
            if (finalMerged.length > dbItems.length || dbItems.length === 0) {
              axios.put(`${API_BASE_URL}/cart/${activeUserId}`, { cartItems: finalMerged }).catch(() => {});
            }

            setTimeout(() => { isRemoteSyncingRef.current = false; }, 250);
          }
        })
        .catch(err => console.warn('Cart initial sync warning:', err));

      // Listen for Real-Time Cart Updates from other devices of the same user
      const unsubscribe = socketService.onCartUpdated((data) => {
        if (data.userId === activeUserId && Array.isArray(data.cartItems)) {
          isRemoteSyncingRef.current = true;
          setCartItems(data.cartItems);
          try {
            localStorage.setItem(`mk_cart_${activeUserId}`, JSON.stringify(data.cartItems));
          } catch (e) { }
          setTimeout(() => { isRemoteSyncingRef.current = false; }, 250);
        }
      });

      // Listen for Real-Time Menu Item Price & Details Updates from Vendors
      const unsubscribeMenu = socketService.onMenuUpdated((data: any) => {
        console.log('⚡ [Live Socket Event: MENU_UPDATED] Received in CartContext:', data);
        const updatedItem = data?.item || data?.dish || data;
        if (!updatedItem) return;

        const targetItemId = String(updatedItem.id || updatedItem.itemId || updatedItem.menuItemId || data?.deletedId || '').toLowerCase();

        setCartItems(prevCart => {
          let hasChanges = false;
          const nextCart = prevCart.map(cartItem => {
            const itemDishId = String(cartItem.dish.id || cartItem.dish.itemId || (cartItem.dish as any).menuItemId || '').toLowerCase();

            if (targetItemId && (itemDishId === targetItemId || itemDishId.includes(targetItemId) || targetItemId.includes(itemDishId))) {
              hasChanges = true;

              if (data?.deletedId) {
                return null;
              }

              const newPrice = typeof updatedItem.price === 'number' ? updatedItem.price : cartItem.dish.price;
              const newName = updatedItem.name || updatedItem.foodName || cartItem.dish.name;
              const newImage = updatedItem.image || updatedItem.foodImage || cartItem.dish.image;
              const newVeg = updatedItem.isVeg !== undefined ? updatedItem.isVeg : cartItem.dish.isVeg;
              const newAvailable = updatedItem.isAvailable !== undefined ? updatedItem.isAvailable : cartItem.dish.isAvailable;

              let updatedVariant = cartItem.selectedVariant;
              if (updatedVariant && Array.isArray(updatedItem.variants)) {
                const matchedVariant = updatedItem.variants.find((v: any) => String(v.id || v.name).toLowerCase() === String(updatedVariant.id || updatedVariant.name).toLowerCase());
                if (matchedVariant && typeof matchedVariant.price === 'number') {
                  updatedVariant = { ...updatedVariant, price: matchedVariant.price, name: matchedVariant.name || updatedVariant.name };
                }
              }

              return {
                ...cartItem,
                selectedVariant: updatedVariant,
                dish: {
                  ...cartItem.dish,
                  price: newPrice,
                  name: newName,
                  image: newImage,
                  isVeg: newVeg,
                  isAvailable: newAvailable,
                  variants: updatedItem.variants || cartItem.dish.variants || []
                }
              };
            }
            return cartItem;
          }).filter(Boolean) as CartItem[];

          return hasChanges ? nextCart : prevCart;
        });
      });

      return () => {
        unsubscribe();
        unsubscribeMenu();
      };
    } else {
      // User is logged out / unauthenticated -> Clear in-memory cart and remove guest cart keys
      setCartItems([]);
      try {
        localStorage.removeItem('mk_cart_guest');
      } catch (e) { }
    }
  }, [userId, isAuthenticated]);

  // Save cart to user-scoped localStorage & sync to Backend whenever cartItems changes
  useEffect(() => {
    const activeUser = user || getCurrentUser();
    const activeUserId = isAuthenticated && activeUser ? (userId || activeUser?.id || (activeUser as any)?.userId || activeUser?.email) : null;

    if (!activeUserId) {
      if (cartItems.length > 0) {
        setCartItems([]);
      }
      return;
    }

    try {
      localStorage.setItem(`mk_cart_${activeUserId}`, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Error saving cart to localStorage', e);
    }

    if (activeUserId && !isRemoteSyncingRef.current) {
      axios.put(`${API_BASE_URL}/cart/${activeUserId}`, { cartItems })
        .catch(err => console.warn('Cart push sync warning:', err));
    }
  }, [cartItems, userId, isAuthenticated]);

  const getItemKey = (dishId: string, variantId?: string) => {
    return variantId ? `${dishId}-${variantId}` : dishId;
  };

  const getItemQuantity = (dishId: string, variantId?: string): number => {
    const key = getItemKey(dishId, variantId);
    const found = cartItems.find(item => item.itemKey === key || item.dish.id === dishId);
    return found ? found.quantity : 0;
  };

  const addToCart = (dish: DishItem, selectedVariant?: any) => {
    const activeUser = user || getCurrentUser();
    if (!activeUser || (!activeUser.id && !(activeUser as any).userId && !activeUser.email)) {
      setShowAuthModal(true);
      return;
    }

    if (dish.isAvailable === false || (dish as any).isOpen === false || (dish as any).restaurantIsOpen === false) {
      alert('This shop is currently closed or offline and not accepting orders.');
      return;
    }

    const variantToUse = selectedVariant || (dish.variants && dish.variants.length > 0 ? dish.variants[0] : dish.selectedVariant);
    const itemKey = variantToUse ? `${dish.id}-${variantToUse.id || variantToUse.variantId}` : dish.id;
    const effectivePrice = variantToUse ? Number(variantToUse.price) : Number(dish.price);

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.itemKey === itemKey || item.dish.id === dish.id);
      let newQty = 1;
      let newItems: CartItem[];
      if (existingItem) {
        const targetKey = existingItem.itemKey;
        newQty = existingItem.quantity + 1;
        newItems = prevItems.map((item) =>
          item.itemKey === targetKey ? { ...item, quantity: newQty } : item
        );
      } else {
        newItems = [...prevItems, { dish, quantity: 1, selectedVariant: variantToUse, itemKey }];
      }

      const variantLabel = variantToUse ? `${variantToUse.quantity} ${variantToUse.unit}` : undefined;

      setLastAddedItem({
        name: dish.name,
        quantity: newQty,
        image: dish.image,
        price: effectivePrice,
        variantLabel,
        timestamp: Date.now()
      });

      return newItems;
    });
  };

  const incrementQuantity = (itemKeyOrDishId: string) => {
    const activeUser = user || getCurrentUser();
    if (!activeUser || (!activeUser.id && !(activeUser as any).userId && !activeUser.email)) {
      setShowAuthModal(true);
      return;
    }

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.itemKey === itemKeyOrDishId || item.dish.id === itemKeyOrDishId);
      if (existingItem) {
        const targetKey = existingItem.itemKey;
        const newQty = existingItem.quantity + 1;
        const updated = prevItems.map((item) =>
          item.itemKey === targetKey ? { ...item, quantity: newQty } : item
        );
        const v = existingItem.selectedVariant;
        setLastAddedItem({
          name: existingItem.dish.name,
          quantity: newQty,
          image: existingItem.dish.image,
          price: v ? Number(v.price) : existingItem.dish.price,
          variantLabel: v ? `${v.quantity} ${v.unit}` : undefined,
          timestamp: Date.now()
        });
        return updated;
      }
      return prevItems;
    });
  };

  const reduceQuantity = (itemKeyOrDishId: string) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.itemKey === itemKeyOrDishId || item.dish.id === itemKeyOrDishId);
      if (existingItem) {
        const targetKey = existingItem.itemKey;
        if (existingItem.quantity === 1) {
          return prevItems.filter((item) => item.itemKey !== targetKey);
        }
        const updated = prevItems.map((item) =>
          item.itemKey === targetKey ? { ...item, quantity: item.quantity - 1 } : item
        );
        const updatedItem = updated.find(i => i.itemKey === targetKey);
        if (updatedItem) {
          const v = updatedItem.selectedVariant;
          setLastAddedItem({
            name: updatedItem.dish.name,
            quantity: updatedItem.quantity,
            image: updatedItem.dish.image,
            price: v ? Number(v.price) : updatedItem.dish.price,
            variantLabel: v ? `${v.quantity} ${v.unit}` : undefined
          });
        }
        return updated;
      }
      return prevItems;
    });
  };

  const removeFromCart = (itemKeyOrDishId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.itemKey !== itemKeyOrDishId && item.dish.id !== itemKeyOrDishId));
  };

  const clearCart = () => {
    setCartItems([]);
    setLastAddedItem(null);
    try {
      localStorage.removeItem('mk_cart_guest');
      const activeUserId = userId || (getCurrentUser() as any)?.id || (getCurrentUser() as any)?.email;
      if (activeUserId) {
        localStorage.removeItem(`mk_cart_${activeUserId}`);
        axios.put(`${API_BASE_URL}/cart/${activeUserId}`, { cartItems: [] }).catch(() => {});
      }
    } catch (e) { }
  };

  const dismissToast = () => {
    setLastAddedItem(null);
  };

  const totalAmount = cartItems.reduce(
    (acc, item) => {
      const p = item.selectedVariant ? Number(item.selectedVariant.price) : Number(item.dish.price);
      return acc + p * item.quantity;
    },
    0
  );

  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        incrementQuantity,
        removeFromCart,
        reduceQuantity,
        clearCart,
        getItemQuantity,
        totalAmount,
        totalItemsCount,
        isCartOpen,
        setCartOpen,
        lastAddedItem,
        dismissToast,
        showAuthModal,
        setShowAuthModal,
      }}
    >
      {children}

      {/* Redesigned Premium Login Required Popup Modal (Light & Dark Adaptive) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 dark:bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="bg-white/95 dark:bg-[#151921]/95 border border-amber-200/80 dark:border-white/10 p-7 sm:p-9 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.7)] max-w-md w-full text-center relative overflow-hidden transform transition-all animate-scale-up">
            {/* Multi-layered Glowing Background Orbs */}
            <div className="absolute -top-20 -right-20 w-44 h-44 bg-amber-400/25 dark:bg-[#C59363]/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-orange-400/15 dark:bg-[#9D6A43]/20 rounded-full blur-3xl pointer-events-none" />

            {/* Glowing Icon Header */}
            <div className="relative mx-auto mb-5 w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#C59363] via-[#D0A67F] to-[#9D6A43] opacity-30 blur-md animate-pulse" />
              <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-[#1E232E] dark:via-[#151921] dark:to-[#1E232E] border border-amber-300/80 dark:border-primary/40 flex items-center justify-center text-[#9D6A43] dark:text-[#D0A67F] shadow-lg">
                <ShoppingBag size={34} className="text-[#9D6A43] dark:text-[#D0A67F]" />
                <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gradient-to-r from-[#B87C44] to-[#9D6A43] dark:bg-[#C59363] text-white dark:text-black shadow-md border-2 border-white dark:border-[#151921]">
                  <Lock size={13} strokeWidth={3} />
                </div>
              </div>
            </div>

            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/90 dark:bg-primary/15 border border-amber-300/90 dark:border-primary/30 text-amber-900 dark:text-primary-dark text-[11px] font-black uppercase tracking-wider mb-3 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-primary animate-ping" />
              Authentication Required
            </div>

            {/* Title & Body Description */}
            <h3 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white tracking-tight mb-2.5">
              Log In to Order Food
            </h3>
            <p className="text-sm text-slate-600 dark:text-gray-300 font-medium leading-relaxed mb-6 px-1">
              Please log in or create an account to add your favorite gourmet dishes to your cart and place instant orders.
            </p>

            {/* Value Perk Badges */}
            <div className="grid grid-cols-3 gap-2 mb-7">
              <div className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-amber-50/70 dark:bg-white/[0.04] border border-amber-200/80 dark:border-white/10 text-center shadow-xs">
                <Zap size={16} className="text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] font-bold text-slate-800 dark:text-gray-200">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-amber-50/70 dark:bg-white/[0.04] border border-amber-200/80 dark:border-white/10 text-center shadow-xs">
                <Tag size={16} className="text-[#B87C44] dark:text-primary" />
                <span className="text-[11px] font-bold text-slate-800 dark:text-gray-200">Best Offers</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-amber-50/70 dark:bg-white/[0.04] border border-amber-200/80 dark:border-white/10 text-center shadow-xs">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-bold text-slate-800 dark:text-gray-200">Secure Pay</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  if (navigate) {
                    try {
                      navigate('/login', { state: { from: window.location.pathname } });
                      return;
                    } catch (e) {}
                  }
                  window.location.href = '/login';
                }}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#B87C44] via-[#C59363] to-[#9D6A43] hover:from-[#A76D38] hover:to-[#865731] text-white font-extrabold text-sm sm:text-base shadow-xl shadow-[#C59363]/30 hover:shadow-[#C59363]/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2.5 group cursor-pointer"
              >
                <LogIn size={20} className="group-hover:scale-110 transition-transform" />
                <span>Log In / Register Now</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-300/80 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:text-gray-300 dark:hover:text-white font-bold text-sm transition-all duration-200 cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>

            {/* Top Right Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent hover:border-slate-300/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 dark:hover:border-white/10 transition-all duration-200 cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
