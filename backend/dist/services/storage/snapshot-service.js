"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.snapshotService = exports.SnapshotService = void 0;
const og_file_client_1 = require("./og-file-client");
const og_kv_client_1 = require("./og-kv-client");
const logger_1 = require("../../utils/logger");
/**
 * 市场快照服务
 * 定期拍快照并存入 0G Storage
 */
class SnapshotService {
    /** 创建市场快照并上传 */
    async createSnapshot(marketId, snapshotData) {
        logger_1.logger.info({ marketId }, 'Creating market snapshot');
        // 1. 上传快照文件到 0G File Storage
        const rootHash = await og_file_client_1.ogFileClient.uploadSnapshot(marketId, snapshotData);
        // 2. 将快照索引写入 0G KV Storage
        const indexKey = `snapshot:${marketId}:${Date.now()}`;
        await og_kv_client_1.ogKvClient.put(indexKey, JSON.stringify({
            rootHash,
            marketId,
            timestamp: snapshotData.timestamp,
            createdAt: new Date().toISOString(),
        }));
        return { rootHash };
    }
    /** 获取市场快照列表 */
    async listSnapshots(_marketId) {
        // TODO: Query 0G KV for all snapshot:{marketId}:* keys
        return [];
    }
    /** 下载并解析快照 */
    async getSnapshot(rootHash) {
        const outputPath = `/tmp/snapshot-dl-${rootHash}.json`;
        await og_file_client_1.ogFileClient.downloadFile(rootHash, outputPath);
        // TODO: Read and parse the downloaded file
        return null;
    }
}
exports.SnapshotService = SnapshotService;
exports.snapshotService = new SnapshotService();
//# sourceMappingURL=snapshot-service.js.map