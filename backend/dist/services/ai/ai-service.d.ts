import type { AnalysisTask } from '@og-predict/shared';
export interface AnalysisRequest {
    marketId: string;
    event: string;
    resolutionDate?: string;
    resolutionCriteria?: string;
}
/**
 * AI 分析服务
 * 管理分析任务的创建、执行和结果存储
 */
export declare class AiService {
    /** 创建分析任务 */
    createAnalysis(request: AnalysisRequest): Promise<AnalysisTask>;
    /** 执行分析（异步） */
    private executeAnalysis;
    /** 查询分析结果 */
    getAnalysis(taskId: string): Promise<AnalysisTask | null>;
    /** 获取市场的所有分析 */
    getMarketAnalyses(marketId: string): Promise<AnalysisTask[]>;
}
export declare const aiService: AiService;
//# sourceMappingURL=ai-service.d.ts.map