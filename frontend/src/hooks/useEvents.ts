import { useQuery } from '@tanstack/react-query';
import { fetchEvents, fetchEventDetail } from '../api/markets';

/** 获取事件列表 */
export function useEvents(params?: {
  limit?: number;
  offset?: number;
  tag?: string;
  sortBy?: 'volume' | 'volume24h' | 'liquidity' | 'endDate' | 'createdAt';
  order?: 'asc' | 'desc';
  search?: string;
}) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => fetchEvents(params),
  });
}

/** 获取事件详情 */
export function useEventDetail(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => fetchEventDetail(eventId!),
    enabled: !!eventId,
  });
}
