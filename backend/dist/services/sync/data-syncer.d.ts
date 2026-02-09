/**
 * 数据同步服务
 * 定期从 Polymarket 拉取事件和市场数据，写入本地 DB
 */
export declare class DataSyncer {
    private isRunning;
    private timers;
    private lastEventsSyncAt;
    start(): void;
    stop(): void;
    /** 全量同步事件和市场 */
    syncAll(): Promise<void>;
    /** 同步活跃事件（包含其子市场） */
    private syncEventsAndMarkets;
    private upsertEventsBatch;
    private upsertMarket;
    private parseStringArray;
    private toNumber;
    getLastEventsSyncAt(): Date | null;
}
export declare const dataSyncer: DataSyncer;
//# sourceMappingURL=data-syncer.d.ts.map