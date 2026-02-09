import { apiGet, apiPost } from './client';
import { baseURL } from './client';
import type {
  EventSummary,
  EventDetail,
  OrderBookData,
  PriceHistory,
  AnalysisTask,
} from '@og-predict/shared';

/** 获取事件列表 */
export function fetchEvents(params?: {
  limit?: number;
  offset?: number;
  tag?: string;
  sortBy?: 'volume' | 'volume24h' | 'liquidity' | 'endDate' | 'createdAt';
  order?: 'asc' | 'desc';
  search?: string;
}) {
  return apiGet<EventSummary[]>('/markets', params);
}

/** 获取事件详情（含子市场） */
export function fetchEventDetail(eventId: string) {
  return apiGet<EventDetail>(`/markets/${eventId}`);
}

/** 获取订单簿 */
export function fetchOrderBook(
  eventId: string,
  marketId: string,
  params?: { depth?: number }
) {
  return apiGet<OrderBookData>(`/markets/${eventId}/orderbook/${marketId}`, params);
}

/** 获取价格历史 */
export function fetchPriceHistory(
  eventId: string,
  marketId: string,
  params?: { interval?: '1h' | '1d' | '1w' | 'max'; outcome?: 'yes' | 'no' }
) {
  return apiGet<PriceHistory>(`/markets/${eventId}/price-history/${marketId}`, params);
}

/** 触发 AI 分析 */
export function triggerAnalysis(
  eventId: string,
  marketId: string,
  body?: { question?: string }
) {
  return apiPost<AnalysisTask>(`/markets/${eventId}/analyze`, {
    marketId,
    ...(body ?? {}),
  });
}

/** 获取市场分析列表 */
export function fetchAnalyses(
  eventId: string,
  params?: { marketId?: string; status?: 'completed' | 'failed'; limit?: number; offset?: number }
) {
  return apiGet<AnalysisTask[]>(`/markets/${eventId}/analyses`, params);
}

/** 获取分析详情 */
export function fetchAnalysisDetail(taskId: string) {
  return apiGet<AnalysisTask>(`/analysis/${taskId}`);
}

export type AnalysisStreamMessage =
  | { type: 'task'; taskId: string }
  | { type: 'delta'; content: string }
  | { type: 'done'; taskId: string; result: unknown | null }
  | { type: 'error'; taskId: string; message: string };

/** 流式触发 AI 分析（NDJSON） */
export async function streamAnalysis(
  eventId: string,
  marketId: string,
  body: { question?: string } | undefined,
  options: {
    signal?: AbortSignal;
    onMessage: (msg: AnalysisStreamMessage) => void;
  }
): Promise<void> {
  const resp = await fetch(`${baseURL}/markets/${eventId}/analyze/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marketId, ...(body ?? {}) }),
    signal: options.signal,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(text || resp.statusText);
  }

  if (!resp.body) throw new Error('No response body');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;

      try {
        const msg = JSON.parse(line) as AnalysisStreamMessage;
        options.onMessage(msg);
        if (msg.type === 'done' || msg.type === 'error') return;
      } catch {
        // ignore invalid NDJSON line
      }
    }
  }

  if (buffer.trim()) {
    try {
      const msg = JSON.parse(buffer.trim()) as AnalysisStreamMessage;
      options.onMessage(msg);
    } catch {
      // ignore
    }
  }
}
