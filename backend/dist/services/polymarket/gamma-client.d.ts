import type { GammaEvent, GammaMarket } from './types';
/**
 * Polymarket Gamma API 客户端
 * 负责获取 events 和 markets 元数据
 */
export declare class GammaClient {
    private client;
    constructor();
    /** 获取活跃事件列表 */
    getEvents(params: {
        limit?: number;
        offset?: number;
        active?: boolean;
        closed?: boolean;
        tag?: string;
        order?: string;
        ascending?: boolean;
    }): Promise<GammaEvent[]>;
    /** 获取单个事件详情 */
    getEvent(eventId: string): Promise<GammaEvent>;
    /** 获取市场列表 */
    getMarkets(params: {
        limit?: number;
        offset?: number;
        active?: boolean;
        closed?: boolean;
        tag?: string;
    }): Promise<GammaMarket[]>;
    /** 获取单个市场详情 */
    getMarket(conditionId: string): Promise<GammaMarket>;
    /** 按标签获取事件 */
    getEventsByTag(tag: string, limit?: number): Promise<GammaEvent[]>;
}
export declare const gammaClient: GammaClient;
//# sourceMappingURL=gamma-client.d.ts.map