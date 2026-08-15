import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { DishItem } from '../utils/mockData';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { getCurrentUser } from '../utils/auth.utils';
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

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isRemoteSyncingRef = useRef(false);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('mk_cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading cart from localStorage on init', e);
    }
    return [];
  });

  const [isCartOpen, setCartOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<{ name: string; quantity: number; image: string; price: number; variantLabel?: string; timestamp?: number } | null>(null);

  // Sync with Backend & WebSockets on user auth/mount
  useEffect(() => {
    const user = getCurrentUser();
    const userId = user?.id || user?.userId;
    if (!userId) return;

    // Join Customer Socket Room
    socketService.joinCustomer(userId);

    // Initial Fetch of User Active Cart from DB / Backend
    axios.get(`${API_BASE_URL}/cart/${userId}`)
      .then(res => {
        if (res.data && res.data.success && Array.isArray(res.data.cartItems)) {
          if (res.data.cartItems.length > 0 || cartItems.length === 0) {
            isRemoteSyncingRef.current = true;
            setCartItems(res.data.cartItems);
            setTimeout(() => { isRemoteSyncingRef.current = false; }, 250);
          }
        }
      })
      .catch(err => console.warn('Cart initial sync warning:', err));

    // Listen for Real-Time Cart Updates from other devices of the same user
    const unsubscribe = socketService.onCartUpdated((data) => {
      if (data.userId === userId && Array.isArray(data.cartItems)) {
        isRemoteSyncingRef.current = true;
        setCartItems(data.cartItems);
        setTimeout(() => { isRemoteSyncingRef.current = false; }, 250);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Save cart to localStorage & sync to Backend whenever cartItems changes
  useEffect(() => {
    try {
      localStorage.setItem('mk_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Error saving cart to localStorage', e);
    }

    const user = getCurrentUser();
    const userId = user?.id || user?.userId;
    if (userId && !isRemoteSyncingRef.current) {
      axios.put(`${API_BASE_URL}/cart/${userId}`, { cartItems })
        .catch(err => console.warn('Cart push sync warning:', err));
    }
  }, [cartItems]);

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
