/**
 * AI 分析提示词模板
 */

/** 系统提示词 */
export const SYSTEM_PROMPT = `You are an expert prediction market analyst.
Analyze the given market data and provide structured insights.
Always respond in JSON format with the specified schema.`;

/** 市场分析提示词 */
export function buildMarketAnalysisPrompt(params: {
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  orderBookDepth: { bids: number; asks: number };
  recentPriceChange?: number;
}): string {
  return `Analyze the following prediction market:

**Question**: ${params.question}
**Current Prices**: Yes=${params.yesPrice}, No=${params.noPrice}
**24h Volume**: $${params.volume.toLocaleString()}
**Liquidity**: $${params.liquidity.toLocaleString()}
**Order Book Depth**: ${params.orderBookDepth.bids} bids, ${params.orderBookDepth.asks} asks
${params.recentPriceChange !== undefined ? `**Recent Price Change**: ${params.recentPriceChange > 0 ? '+' : ''}${params.recentPriceChange}%` : ''}

Provide your analysis in the following JSON format:
{
  "summary": "Brief 2-3 sentence analysis",
  "confidence": 0.0-1.0,
  "sentiment": "bullish|bearish|neutral",
  "arguments": {
    "for": ["argument1", "argument2"],
    "against": ["argument1", "argument2"]
  },
  "riskLevel": "low|medium|high",
  "recommendation": "Brief trading recommendation"
}`;
}

/** 多市场对比分析提示词 */
export function buildComparisonPrompt(markets: Array<{
  question: string;
  yesPrice: number;
  volume: number;
}>): string {
  const marketList = markets
    .map((m, i) => `${i + 1}. "${m.question}" - Yes: ${m.yesPrice}, Volume: $${m.volume.toLocaleString()}`)
    .join('\n');

  return `Compare and rank the following prediction markets by investment opportunity:

${marketList}

Provide analysis in JSON format:
{
  "ranking": [{"marketIndex": 1, "score": 0.0-1.0, "reason": "..."}],
  "topPick": {"index": 1, "rationale": "..."},
  "overallInsight": "..."
}`;
}
