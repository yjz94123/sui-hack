export interface TradeResult {
    success: boolean;
    positionId?: number;
    txHash?: string;
    tokenAmount?: number;
    price?: number;
    error?: string;
}
/**
 * 代理下单服务（Proxy Order Service）
 *
 * 读取 Polymarket 实时价格，通过 TradingHub 合约的 owner 权限
 * 为用户执行 openPosition / closePosition 操作。
 *
 * 定价公式:
 *   price (Polymarket) = 0.65 → priceBps = 6500
 *   tokenAmount = usdcAmount * 10000 / priceBps
 *   例: 65 USDC @ 65% → 100 tokens → 赢了赎回 100 USDC
 */
export declare class ProxyOrderService {
    /**
     * 执行买入：获取价格 → 计算 tokens → 调用 openPosition
     */
    executeBuy(params: {
        userAddress: string;
        marketId: string;
        outcome: 'YES' | 'NO';
        usdcAmount: number;
    }): Promise<TradeResult>;
    /**
     * 执行卖出：获取当前价格 → 计算 returnUsdc → 调用 closePosition
     */
    executeSell(params: {
        userAddress: string;
        positionId: number;
    }): Promise<TradeResult>;
    /**
     * 获取某个市场的当前价格
     */
    getMarketPrice(marketId: string, outcome: 'YES' | 'NO'): Promise<number>;
}
export declare const proxyOrderService: ProxyOrderService;
//# sourceMappingURL=proxy-order-service.d.ts.map