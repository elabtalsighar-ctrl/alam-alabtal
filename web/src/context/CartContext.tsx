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
  remove: (product_id: number, selected_size?: string) => void;
  setQty: (product_id: number, qty: number, selected_size?: string) => void;
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

  const itemKey = (i: { product_id: number; selected_size?: string }) =>
    `${i.product_id}${i.selected_size ? '_' + i.selected_size : ''}`;

  const add = (item: CartItem) => {
    trackAddToCart({ name: item.name, product_id: item.product_id, price: item.price, quantity: item.quantity });
    setItems(prev => {
      const key = itemKey(item);
      const existing = prev.find(i => itemKey(i) === key);
      if (existing) {
        return prev.map(i =>
          itemKey(i) === key
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
            : i
        );
      }
      return [...prev, { ...item, quantity: Math.min(item.quantity, item.stock) }];
    });
  };

  const remove = (product_id: number, selected_size?: string) => {
    setItems(prev => prev.filter(i => !(i.product_id === product_id && i.selected_size === (selected_size || undefined))));
  };

  const setQty = (product_id: number, qty: number, selected_size?: string) => {
    if (qty <= 0) {
      remove(product_id, selected_size);
      return;
    }
    const key = `${product_id}${selected_size ? '_' + selected_size : ''}`;
    setItems(prev =>
      prev.map(i => (itemKey(i) === key ? { ...i, quantity: Math.min(qty, i.stock) } : i))
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
