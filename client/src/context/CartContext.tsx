import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const activeUser = user || getCurrentUser();
      const activeId = activeUser?.id || (activeUser as any)?.userId || activeUser?.email;
      let loaded: CartItem[] = [];
      const guestCartStr = localStorage.getItem('mk_cart_guest');
      if (guestCartStr) {
        const parsedGuest = JSON.parse(guestCartStr);
        if (Array.isArray(parsedGuest)) loaded = parsedGuest;
      }
      if (activeId) {
        const userCartStr = localStorage.getItem(`mk_cart_${activeId}`);
        if (userCartStr) {
          const parsedUser = JSON.parse(userCartStr);
          if (Array.isArray(parsedUser) && parsedUser.length > 0) {
            loaded = mergeCartItems(loaded, parsedUser);
          }
        }
      }
      return loaded;
    } catch (e) {
      console.error('Error loading cart from localStorage on init', e);
    }
    return [];
  });

  const [isCartOpen, setCartOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<{ name: string; quantity: number; image: string; price: number; variantLabel?: string; timestamp?: number } | null>(null);

  // React to User Auth State Changes & Sync Active Cart Across Local Storage & DB
  useEffect(() => {
    const activeUserId = userId || (getCurrentUser() as any)?.id || (getCurrentUser() as any)?.email;

    if (activeUserId) {
      // Join Customer Socket Room
      socketService.joinCustomer(activeUserId);

      // Load local guest cart and user cart
      let localGuestItems: CartItem[] = [];
      let localUserItems: CartItem[] = [];
      try {
        const gStr = localStorage.getItem('mk_cart_guest');
        if (gStr) localGuestItems = JSON.parse(gStr) || [];
        const uStr = localStorage.getItem(`mk_cart_${activeUserId}`);
        if (uStr) localUserItems = JSON.parse(uStr) || [];
      } catch (e) { }

      const mergedLocal = mergeCartItems(localUserItems, localGuestItems);
      if (mergedLocal.length > 0) {
        setCartItems(mergedLocal);
      }

      // Fetch User Active Cart from DB / Backend
      axios.get(`${API_BASE_URL}/cart/${activeUserId}`)
        .then(res => {
          if (res.data && res.data.success && Array.isArray(res.data.cartItems)) {
            const dbItems: CartItem[] = res.data.cartItems;
            const finalMerged = mergeCartItems(mergedLocal.length > 0 ? mergedLocal : cartItems, dbItems);

            isRemoteSyncingRef.current = true;
            setCartItems(finalMerged);

            try {
              localStorage.setItem(`mk_cart_${activeUserId}`, JSON.stringify(finalMerged));
              localStorage.setItem('mk_cart_guest', JSON.stringify(finalMerged));
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
            localStorage.setItem('mk_cart_guest', JSON.stringify(data.cartItems));
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
      // User is logged out / guest -> Restore guest cart from localStorage so items are NEVER lost on logout!
      try {
        const guestSaved = localStorage.getItem('mk_cart_guest');
        if (guestSaved) {
          const parsed = JSON.parse(guestSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCartItems(parsed);
          }
        }
      } catch (e) { }
    }
  }, [userId, isAuthenticated]);

  // Save cart to user-scoped localStorage & sync to Backend whenever cartItems changes
  useEffect(() => {
    const activeUserId = userId || (getCurrentUser() as any)?.id || (getCurrentUser() as any)?.email;

    try {
      localStorage.setItem('mk_cart_guest', JSON.stringify(cartItems));
      if (activeUserId) {
        localStorage.setItem(`mk_cart_${activeUserId}`, JSON.stringify(cartItems));
      }
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
      }}
    >
      {children}
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
