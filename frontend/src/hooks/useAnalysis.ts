import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { triggerAnalysis, fetchAnalyses, fetchAnalysisDetail } from '../api/markets';

/** 触发 AI 分析 */
export function useTriggerAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { eventId: string; marketId: string; question?: string }) =>
      triggerAnalysis(params.eventId, params.marketId, { question: params.question }),
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['analyses', params.eventId, params.marketId] });
    },
  });
}

/** 获取市场分析列表 */
export function useAnalyses(eventId: string | undefined, marketId: string | undefined) {
  return useQuery({
    queryKey: ['analyses', eventId, marketId],
    queryFn: () => fetchAnalyses(eventId!, { marketId: marketId! }),
    enabled: !!eventId && !!marketId,
  });
}

/** 获取分析详情（轮询直到完成） */
export function useAnalysisDetail(taskId: string | undefined) {
  return useQuery({
    queryKey: ['analysis', taskId],
    queryFn: () => fetchAnalysisDetail(taskId!),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return 3_000; // 每 3s 轮询一次
    },
  });
}
