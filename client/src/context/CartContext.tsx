import React, { createContext, useContext, useState, useEffect } from 'react';
import type { DishItem } from '../utils/mockData';

export interface CartItem {
  dish: DishItem;
  quantity: number;
  selectedVariant?: any;
  itemKey: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (dish: DishItem, selectedVariant?: any) => void;
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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<{ name: string; quantity: number; image: string; price: number; variantLabel?: string; timestamp?: number } | null>(null);

  // Load cart from localStorage on init
  useEffect(() => {
    const savedCart = localStorage.getItem('mk_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error parsing cart from localStorage', e);
      }
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('mk_cart', JSON.stringify(cartItems));
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
      const existingItem = prevItems.find((item) => item.itemKey === itemKey);
      let newQty = 1;
      let newItems: CartItem[];
      if (existingItem) {
        newQty = existingItem.quantity + 1;
        newItems = prevItems.map((item) =>
          item.itemKey === itemKey ? { ...item, quantity: newQty } : item
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
