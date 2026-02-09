declare module '@og-predict/shared' {
  export interface ApiResponse<T> {
    data: T;
    error?: {
      message?: string;
      code?: string;
    };
  }

  export interface Tag {
    slug: string;
    label: string;
  }

  export interface MarketSummary {
    marketId: string;
    question: string;
    bestBid: string;
    outcomePrices?: string[];
    volume?: number;
  }

  export interface EventSummary {
    eventId: string;
    title: string;
    description?: string;
    imageUrl?: string;
    iconUrl?: string;
    startDate?: string;
    endDate: string;
    volume: number;
    volume24h?: number;
    liquidity: number;
    tags?: Tag[];
    markets?: MarketSummary[];
  }

  export interface EventDetail extends EventSummary {
    markets: MarketSummary[];
  }

  export interface OrderBookEntry {
    price: string;
    size: string;
    total?: string;
  }

  export interface OrderBookSide {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    spread?: string;
  }

  export interface OrderBookData {
    yes: OrderBookSide;
    no?: OrderBookSide;
  }

  export interface PriceHistoryPoint {
    timestamp: number;
    price: number;
  }

  export interface PriceHistory {
    history: PriceHistoryPoint[];
  }

  export interface AnalysisTask {
    id: string;
    marketId?: string;
    status?: 'queued' | 'running' | 'completed' | 'failed' | string;
    question?: string;
    result?: unknown;
    createdAt?: string;
    updatedAt?: string;
  }

  export interface TradeRecord {
    tradeId: string;
    marketId: string;
    tradeType: 'buy' | 'sell' | string;
    outcome: string;
    amount: number;
    price: number;
    status: 'filled' | 'cancelled' | 'pending' | string;
    timestamp?: number;
  }
}
