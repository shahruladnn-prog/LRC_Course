
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (cartId: string) => void;
  updateItemQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
        const localData = localStorage.getItem('ggp-cart');
        return localData ? JSON.parse(localData) : [];
    } catch (error) {
        console.error("Could not parse cart data from localStorage", error);
        return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('ggp-cart', JSON.stringify(items));
  }, [items]);

  const addItem = (itemToAdd: CartItem) => {
    setItems(prevItems => {
        const existingItem = prevItems.find(i => i.cartId === itemToAdd.cartId);
        if (existingItem) {
            // Item already in cart, update its quantity
            return prevItems.map(i =>
                i.cartId === itemToAdd.cartId
                    ? { ...i, quantity: i.quantity + itemToAdd.quantity }
                    : i
            );
        }
        // New item, add to cart
        return [...prevItems, itemToAdd];
    });
  };

  const removeItem = (cartId: string) => {
    setItems(prevItems => prevItems.filter(item => item.cartId !== cartId));
  };

  const updateItemQuantity = (cartId: string, quantity: number) => {
    setItems(prevItems => {
        if (quantity <= 0) {
            // If quantity is 0 or less, remove the item
            return prevItems.filter(item => item.cartId !== cartId);
        }
        return prevItems.map(item =>
            item.cartId === cartId ? { ...item, quantity } : item
        );
    });
  };

  const clearCart = () => {
    setItems([]);
  };
  
  const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateItemQuantity, clearCart, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
};