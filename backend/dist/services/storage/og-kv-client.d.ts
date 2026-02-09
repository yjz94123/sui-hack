/**
 * 0G KV Storage 客户端
 * 存储交易记录、AI分析结果等结构化数据
 *
 * Key 设计:
 *   trade:{address}:{orderId}  -> TradeRecord JSON
 *   analysis:{marketId}:{taskId} -> AnalysisResult JSON
 *   market:{conditionId}       -> MarketSnapshot JSON
 */
export declare class OgKvClient {
    private initialized;
    /** 初始化 KV 客户端 */
    init(): Promise<void>;
    /** 写入键值对 */
    put(key: string, value: string): Promise<void>;
    /** 读取键值对 */
    get(key: string): Promise<string | null>;
    /** 存储交易记录 */
    putTrade(address: string, orderId: string, data: unknown): Promise<void>;
    /** 存储AI分析结果 */
    putAnalysis(marketId: string, taskId: string, data: unknown): Promise<void>;
    /** 获取交易记录 */
    getTrade(address: string, orderId: string): Promise<unknown | null>;
    /** 获取AI分析结果 */
    getAnalysis(marketId: string, taskId: string): Promise<unknown | null>;
}
export declare const ogKvClient: OgKvClient;
//# sourceMappingURL=og-kv-client.d.ts.map