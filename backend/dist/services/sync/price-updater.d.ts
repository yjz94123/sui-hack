/**
 * 价格更新器
 * 定期更新市场价格并记录价格历史
 */
export declare class PriceUpdater {
    /** 更新所有活跃市场的价格 */
    updatePrices(): Promise<void>;
    /** 记录单个市场的价格快照 */
    recordPriceSnapshot(_conditionId: string, _yesPrice: number, _noPrice: number): Promise<void>;
}
export declare const priceUpdater: PriceUpdater;
//# sourceMappingURL=price-updater.d.ts.map