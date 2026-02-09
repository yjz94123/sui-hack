import { create } from 'zustand';
import type { EventSummary } from '@og-predict/shared';

interface MarketState {
  events: EventSummary[];
  selectedTag: string | null;
  searchQuery: string;
  isLoading: boolean;

  setEvents: (events: EventSummary[]) => void;
  setSelectedTag: (tag: string | null) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  events: [],
  selectedTag: null,
  searchQuery: '',
  isLoading: false,

  setEvents: (events) => set({ events }),
  setSelectedTag: (selectedTag) => set({ selectedTag }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoading: (isLoading) => set({ isLoading }),
}));
