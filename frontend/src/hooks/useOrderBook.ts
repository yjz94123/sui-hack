import { useQuery } from '@tanstack/react-query';
import { fetchOrderBook } from '../api/markets';

/** 获取订单簿（自动 30s 轮询） */
export function useOrderBook(eventId: string | undefined, marketId: string | undefined) {
  return useQuery({
    queryKey: ['orderbook', eventId, marketId],
    queryFn: () => fetchOrderBook(eventId!, marketId!),
    enabled: !!eventId && !!marketId,
    refetchInterval: 30_000, // 30s 轮询
  });
}
