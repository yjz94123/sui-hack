/**
 * Oracle 服务
 * 监控 Polymarket 市场结算状态，调用 TradingHub.resolveMarket()
 */
export declare class OracleService {
    private provider;
    private wallet;
    constructor();
    /** 检查并结算已解决的市场 */
    checkAndResolve(): Promise<void>;
    /** 将 Polymarket conditionId 映射到链上 marketId */
    mapToOnChainMarketId(conditionId: string): string;
    /** 查询市场是否已在 Polymarket 结算 */
    isMarketResolved(conditionId: string): Promise<{
        resolved: boolean;
        outcome?: string;
    }>;
}
export declare const oracleService: OracleService;
//# sourceMappingURL=oracle-service.d.ts.map