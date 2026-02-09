import { ogFileClient } from './og-file-client';
import { ogKvClient } from './og-kv-client';
import { logger } from '../../utils/logger';

/**
 * 市场快照服务
 * 定期拍快照并存入 0G Storage
 */
export class SnapshotService {
  /** 创建市场快照并上传 */
  async createSnapshot(marketId: string, snapshotData: {
    prices: unknown;
    orderBook: unknown;
    volume: number;
    timestamp: string;
  }): Promise<{ rootHash: string }> {
    logger.info({ marketId }, 'Creating market snapshot');

    // 1. 上传快照文件到 0G File Storage
    const rootHash = await ogFileClient.uploadSnapshot(marketId, snapshotData);

    // 2. 将快照索引写入 0G KV Storage
    const indexKey = `snapshot:${marketId}:${Date.now()}`;
    await ogKvClient.put(indexKey, JSON.stringify({
      rootHash,
      marketId,
      timestamp: snapshotData.timestamp,
      createdAt: new Date().toISOString(),
    }));

    return { rootHash };
  }

  /** 获取市场快照列表 */
  async listSnapshots(_marketId: string): Promise<unknown[]> {
    // TODO: Query 0G KV for all snapshot:{marketId}:* keys
    return [];
  }

  /** 下载并解析快照 */
  async getSnapshot(rootHash: string): Promise<unknown> {
    const outputPath = `/tmp/snapshot-dl-${rootHash}.json`;
    await ogFileClient.downloadFile(rootHash, outputPath);
    // TODO: Read and parse the downloaded file
    return null;
  }
}

export const snapshotService = new SnapshotService();
