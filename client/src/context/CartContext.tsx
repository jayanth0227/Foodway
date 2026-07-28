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
  totalAmount: number;
  totalItemsCount: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);

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

  const addToCart = (dish: DishItem) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.dish.id === dish.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { dish, quantity: 1 }];
    });
  };

  const reduceQuantity = (dishId: string) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.dish.id === dishId);
      if (existingItem) {
        if (existingItem.quantity === 1) {
          return prevItems.filter((item) => item.dish.id !== dishId);
        }
        return prevItems.map((item) =>
          item.dish.id === dishId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prevItems;
    });
  };

  const removeFromCart = (dishId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.dish.id !== dishId));
  };

  const clearCart = () => {
    setCartItems([]);
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
        totalAmount,
        totalItemsCount,
        isCartOpen,
        setCartOpen,
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
