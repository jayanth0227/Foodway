import React, { createContext, useContext, useState, useEffect } from 'react';
import type { DishItem } from '../utils/mockData';

export interface CartItem {
  dish: DishItem;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (dish: DishItem) => void;
  removeFromCart: (dishId: string) => void;
  reduceQuantity: (dishId: string) => void;
  clearCart: () => void;
  getItemQuantity: (dishId: string) => number;
  totalAmount: number;
  totalItemsCount: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  lastAddedItem: { name: string; quantity: number; image: string; price: number } | null;
  dismissToast: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<{ name: string; quantity: number; image: string; price: number } | null>(null);

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

  const getItemQuantity = (dishId: string): number => {
    const found = cartItems.find(item => item.dish.id === dishId);
    return found ? found.quantity : 0;
  };

  const addToCart = (dish: DishItem) => {
    if (dish.isAvailable === false || (dish as any).isOpen === false || (dish as any).restaurantIsOpen === false) {
      alert('This restaurant is currently closed or offline and not accepting orders.');
      return;
    }
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.dish.id === dish.id);
      let newQty = 1;
      let newItems: CartItem[];
      if (existingItem) {
        newQty = existingItem.quantity + 1;
        newItems = prevItems.map((item) =>
          item.dish.id === dish.id ? { ...item, quantity: newQty } : item
        );
      } else {
        newItems = [...prevItems, { dish, quantity: 1 }];
      }

      setLastAddedItem({
        name: dish.name,
        quantity: newQty,
        image: dish.image,
        price: dish.price
      });

      return newItems;
    });
  };

  const reduceQuantity = (dishId: string) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.dish.id === dishId);
      if (existingItem) {
        if (existingItem.quantity === 1) {
          return prevItems.filter((item) => item.dish.id !== dishId);
        }
        const updated = prevItems.map((item) =>
          item.dish.id === dishId ? { ...item, quantity: item.quantity - 1 } : item
        );
        const updatedItem = updated.find(i => i.dish.id === dishId);
        if (updatedItem) {
          setLastAddedItem({
            name: updatedItem.dish.name,
            quantity: updatedItem.quantity,
            image: updatedItem.dish.image,
            price: updatedItem.dish.price
          });
        }
        return updated;
      }
      return prevItems;
    });
  };

  const removeFromCart = (dishId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.dish.id !== dishId));
  };

  const clearCart = () => {
    setCartItems([]);
    setLastAddedItem(null);
  };

  const dismissToast = () => {
    setLastAddedItem(null);
  };

  const totalAmount = cartItems.reduce(
    (acc, item) => acc + item.dish.price * item.quantity,
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
