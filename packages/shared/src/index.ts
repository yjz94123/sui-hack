// ============ Generic API Response ============

export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  error?: {
    message?: string;
    code?: string;
  };
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

// ============ Tags ============

export interface Tag {
  slug: string;
  label: string;
}

// ============ Market ============

export interface MarketSummary {
  marketId: string;
  conditionId?: string;
  question: string;
  bestBid?: string;
  bestAsk?: string;
  outcomePrices?: string[];
  outcomes?: string[];
  volume?: number | string;
  lastTradePrice?: string;
  spread?: number;
  onchainMarketId?: string;
  clobTokenIds?: string[];
  resolutionStatus?: 0 | 1 | 2;
  acceptingOrders?: boolean;
  polymarketOrderBook?: OrderBookData;
}

// ============ Events ============

export interface EventSummary {
  eventId: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  iconUrl?: string | null;
  startDate?: string;
  endDate?: string;
  volume: number;
  volume24h?: number;
  liquidity: number;
  tags?: Tag[];
  markets?: MarketSummary[];
}

export interface EventDetail extends EventSummary {
  markets: MarketSummary[];
  slug?: string;
  active?: boolean;
  closed?: boolean;
  featured?: boolean;
  openInterest?: number;
  resolutionSource?: string | null;
  syncedAt?: string;
}

// ============ Order Book ============

export interface OrderBookEntry {
  price: string;
  size: string;
  total?: string;
}

export interface OrderBookSide {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  bestBid?: string;
  bestAsk?: string;
  spread?: string;
  midpoint?: string;
}

export interface OrderBookData {
  yes: OrderBookSide;
  no?: OrderBookSide;
  hash?: string;
  timestamp?: string;
}

// ============ Price History ============

export interface PriceHistory {
  history: Array<{
    timestamp: number;
    price: number;
  }>;
  marketId?: string;
  outcome?: 'yes' | 'no';
  interval?: '1h' | '1d' | '1w' | 'max';
}

// ============ Analysis ============

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AnalysisTask {
  taskId?: string;
  id?: string;
  marketId?: string;
  status: AnalysisStatus;
  question?: string;
  result?: unknown;
  confidence?: number;
  ogStorageKey?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt?: string;
}

// ============ Trade ============

export interface TradeRecord {
  tradeId: string;
  marketId: string;
  tradeType: 'buy' | 'sell';
  outcome: string;
  amount: number;
  price: number;
  status: 'filled' | 'cancelled' | 'pending';
  timestamp?: number;
}

// ============ Health ============

export interface ServiceStatus {
  status: 'ok' | 'unknown' | 'error';
  latency?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'error';
  version: string;
  uptime: number;
  services: {
    [key: string]: ServiceStatus;
  };
  sync: {
    totalEvents: number;
    totalMarkets: number;
    activeMarkets: number;
    lastEventSync: string;
    lastOrderBookRefresh: string;
    lastSnapshotUpload: string;
  };
}
