/**
 * 0G File Storage 客户端
 * 存储市场快照等较大文件
 *
 * 流程: 创建 ZgFile -> 写入数据 -> 上传到 0G Storage -> 保存 rootHash
 */
export declare class OgFileClient {
    private initialized;
    /** 初始化文件存储客户端 */
    init(): Promise<void>;
    /** 上传文件到 0G Storage */
    uploadFile(filePath: string): Promise<string>;
    /** 从 0G Storage 下载文件 */
    downloadFile(rootHash: string, outputPath: string): Promise<void>;
    /** 上传市场快照 JSON */
    uploadSnapshot(marketId: string, snapshotData: unknown): Promise<string>;
}
export declare const ogFileClient: OgFileClient;
//# sourceMappingURL=og-file-client.d.ts.map