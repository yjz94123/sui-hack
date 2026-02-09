/**
 * AI 分析提示词模板
 */
/** 系统提示词 */
export declare const SYSTEM_PROMPT = "You are an expert prediction market analyst.\nAnalyze the given market data and provide structured insights.\nAlways respond in JSON format with the specified schema.";
/** 市场分析提示词 */
export declare function buildMarketAnalysisPrompt(params: {
    question: string;
    yesPrice: number;
    noPrice: number;
    volume: number;
    liquidity: number;
    orderBookDepth: {
        bids: number;
        asks: number;
    };
    recentPriceChange?: number;
}): string;
/** 多市场对比分析提示词 */
export declare function buildComparisonPrompt(markets: Array<{
    question: string;
    yesPrice: number;
    volume: number;
}>): string;
//# sourceMappingURL=prompts.d.ts.map