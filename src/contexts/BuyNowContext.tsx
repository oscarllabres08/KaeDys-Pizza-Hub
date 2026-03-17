import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { MenuItem } from '../lib/supabase';

export type BuyNowItem = MenuItem & { quantity: number };

type BuyNowContextType = {
  buyNowItems: BuyNowItem[] | null;
  startBuyNow: (item: MenuItem, quantity: number) => void;
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

  const buyNowTotal = useMemo(() => {
    if (!buyNowItems) return 0;
    return buyNowItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [buyNowItems]);

  return (
    <BuyNowContext.Provider value={{ buyNowItems, startBuyNow, clearBuyNow, buyNowTotal }}>
      {children}
    </BuyNowContext.Provider>
  );
}

export function useBuyNow() {
  const ctx = useContext(BuyNowContext);
  if (!ctx) throw new Error('useBuyNow must be used within a BuyNowProvider');
  return ctx;
}

