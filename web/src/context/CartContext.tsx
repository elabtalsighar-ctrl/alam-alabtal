import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { CartItem } from '../lib/types';
import { trackAddToCart } from '../lib/pixel';

const STORAGE_KEY = 'alam_cart';

interface CartContextType {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: CartItem) => void;
  remove: (product_id: number) => void;
  setQty: (product_id: number, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const add = (item: CartItem) => {
    trackAddToCart({ name: item.name, product_id: item.product_id, price: item.price, quantity: item.quantity });
    setItems(prev => {
      const existing = prev.find(i => i.product_id === item.product_id);
      if (existing) {
        return prev.map(i =>
          i.product_id === item.product_id
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
            : i
        );
      }
      return [...prev, { ...item, quantity: Math.min(item.quantity, item.stock) }];
    });
  };

  const remove = (product_id: number) => {
    setItems(prev => prev.filter(i => i.product_id !== product_id));
  };

  const setQty = (product_id: number, qty: number) => {
    if (qty <= 0) {
      remove(product_id);
      return;
    }
    setItems(prev =>
      prev.map(i => (i.product_id === product_id ? { ...i, quantity: Math.min(qty, i.stock) } : i))
    );
  };

  const clear = () => setItems([]);

  return (
    <CartContext.Provider
      value={{ items, count, subtotal, isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), add, remove, setQty, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
