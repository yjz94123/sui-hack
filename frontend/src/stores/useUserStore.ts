import { create } from 'zustand';

interface Order {
  id: string;
  marketId: string;
  outcome: 'YES' | 'NO';
  price: number;
  amount: number;
  status: 'OPEN' | 'FILLED' | 'CANCELLED';
}

interface PortfolioItem {
  marketId: string;
  outcome: 'YES' | 'NO';
  amount: number;
}

interface UserState {
  balances: {
    dUSDC: number;
    tradingHub: number;
  };
  portfolio: PortfolioItem[];
  orders: Order[];
  setBalances: (balances: { dUSDC: number; tradingHub: number }) => void;
  setPortfolio: (portfolio: PortfolioItem[]) => void;
  setOrders: (orders: Order[]) => void;
}

export const useUserStore = create<UserState>((set) => ({
  balances: {
    dUSDC: 0,
    tradingHub: 0,
  },
  portfolio: [],
  orders: [],
  setBalances: (balances) => set({ balances }),
  setPortfolio: (portfolio) => set({ portfolio }),
  setOrders: (orders) => set({ orders }),
}));
