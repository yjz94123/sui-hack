import type { ClobOrderBook, ClobPriceResponse } from './types';
/**
 * Polymarket CLOB API 客户端
 * 负责获取订单簿、价格、交易数据
 * 注意速率限制: /book 接口 50次/10秒
 */
export declare class ClobClient {
    private client;
    constructor();
    /** 获取订单簿 */
    getOrderBook(tokenId: string): Promise<ClobOrderBook>;
    /** 获取市场价格信息 */
    getMarketPrice(tokenId: string): Promise<ClobPriceResponse>;
    /** 获取市场中间价 */
    getMidpoint(tokenId: string): Promise<any>;
    /** 获取市场信息（CLOB侧） */
    getMarket(conditionId: string): Promise<any>;
    /** 获取价格历史 */
    getPricesHistory(tokenId: string, interval?: '1h' | '1d' | '1w' | 'max'): Promise<any>;
    /** 批量获取订单簿（每批不超过 20 个 token_id） */
    getOrderBooks(tokenIds: string[]): Promise<Record<string, ClobOrderBook | null>>;
    /** 批量获取市场价格 */
    getMarketsPrices(tokenIds: string[]): Promise<{
        tokenId: string;
        price: ClobPriceResponse | null;
        error: any;
    }[]>;
}
export declare const clobClient: ClobClient;
//# sourceMappingURL=clob-client.d.ts.map