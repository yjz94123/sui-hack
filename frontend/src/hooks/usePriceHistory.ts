import { useQuery } from '@tanstack/react-query';
import { fetchPriceHistory } from '../api/markets';

/** 获取价格历史 */
export function usePriceHistory(
  eventId: string | undefined,
  marketId: string | undefined,
  interval: '1h' | '1d' | '1w' | 'max' = '1h',
  outcome: 'yes' | 'no' = 'yes'
) {
  return useQuery({
    queryKey: ['priceHistory', eventId, marketId, interval, outcome],
    queryFn: () => fetchPriceHistory(eventId!, marketId!, { interval, outcome }),
    enabled: !!eventId && !!marketId,
  });
}
