/**
 * 市场快照服务
 * 定期拍快照并存入 0G Storage
 */
export declare class SnapshotService {
    /** 创建市场快照并上传 */
    createSnapshot(marketId: string, snapshotData: {
        prices: unknown;
        orderBook: unknown;
        volume: number;
        timestamp: string;
    }): Promise<{
        rootHash: string;
    }>;
    /** 获取市场快照列表 */
    listSnapshots(_marketId: string): Promise<unknown[]>;
    /** 下载并解析快照 */
    getSnapshot(rootHash: string): Promise<unknown>;
}
export declare const snapshotService: SnapshotService;
//# sourceMappingURL=snapshot-service.d.ts.map