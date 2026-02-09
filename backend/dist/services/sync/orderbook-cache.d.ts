/**
 * 订单簿内存缓存
 * 热门市场 TTL: 30s, 冷门市场 TTL: 120s
 */
export declare class OrderBookCache {
    private cache;
    private hotMarkets;
    private readonly HOT_TTL;
    private readonly COLD_TTL;
    /** 标记热门市场（前端正在查看的） */
    markHot(tokenId: string): void;
    /** 取消热门标记 */
    markCold(tokenId: string): void;
    /** 获取订单簿（带缓存） */
    getOrderBook(tokenId: string): Promise<unknown>;
    /** 刷新所有热门市场的订单簿 */
    refreshHotMarkets(): Promise<void>;
    /** 清理过期缓存 */
    cleanup(): void;
}
export declare const orderBookCache: OrderBookCache;
//# sourceMappingURL=orderbook-cache.d.ts.map