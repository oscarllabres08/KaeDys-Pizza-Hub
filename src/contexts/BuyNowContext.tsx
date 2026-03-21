import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { MenuItem } from '../lib/supabase';

export type BuyNowItem = MenuItem & { quantity: number };

type BuyNowContextType = {
  buyNowItems: BuyNowItem[] | null;
  startBuyNow: (item: MenuItem, quantity: number) => void;
  updateBuyNowQuantity: (menuItemId: string, quantity: number) => void;
  clearBuyNow: () => void;
  buyNowTotal: number;
};

const BuyNowContext = createContext<BuyNowContextType | undefined>(undefined);

export function BuyNowProvider({ children }: { children: ReactNode }) {
  const [buyNowItems, setBuyNowItems] = useState<BuyNowItem[] | null>(null);

  const startBuyNow = (item: MenuItem, quantity: number) => {
    const qty = Number.isFinite(quantity) && quantity > 0 ? Math.min(99, quantity) : 1;
    setBuyNowItems([{ ...item, quantity: qty }]);
  };

  const clearBuyNow = () => setBuyNowItems(null);

  const updateBuyNowQuantity = (menuItemId: string, quantity: number) => {
    setBuyNowItems((prev) => {
      if (!prev?.length) return prev;
      const q = Number.isFinite(quantity) ? Math.min(99, Math.max(0, Math.floor(quantity))) : 1;
      if (q <= 0) return null;
      return prev.map((it) => (it.id === menuItemId ? { ...it, quantity: q } : it));
    });
  };

  const buyNowTotal = useMemo(() => {
    if (!buyNowItems) return 0;
    return buyNowItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [buyNowItems]);

  return (
    <BuyNowContext.Provider
      value={{ buyNowItems, startBuyNow, updateBuyNowQuantity, clearBuyNow, buyNowTotal }}
    >
      {children}
    </BuyNowContext.Provider>
  );
}

export function useBuyNow() {
  const ctx = useContext(BuyNowContext);
  if (!ctx) throw new Error('useBuyNow must be used within a BuyNowProvider');
  return ctx;
}

