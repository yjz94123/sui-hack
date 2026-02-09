import { apiGet, apiPost } from './client';
import type { TradeRecord } from '@og-predict/shared';

export interface BuyOrderRequest {
  userAddress: string;
  marketId: string;
  outcome: 'YES' | 'NO';
  usdcAmount: number;
}

export interface BuyOrderResponse {
  positionId?: number;
  txHash?: string;
  tokenAmount?: number;
  price?: number;
}

/** 代理买入（后端 Owner 下单） */
export function placeBuyOrder(body: BuyOrderRequest) {
  return apiPost<BuyOrderResponse>('/trades/buy', body);
}

/** 获取用户交易记录 */
export function fetchUserTrades(userAddress: string, params?: {
  limit?: number;
  offset?: number;
}) {
  return apiGet<{ trades: TradeRecord[]; pagination: unknown }>(
    `/trades/${userAddress}`,
    params
  );
}
