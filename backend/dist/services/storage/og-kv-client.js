"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ogKvClient = exports.OgKvClient = void 0;
const logger_1 = require("../../utils/logger");
/**
 * 0G KV Storage 客户端
 * 存储交易记录、AI分析结果等结构化数据
 *
 * Key 设计:
 *   trade:{address}:{orderId}  -> TradeRecord JSON
 *   analysis:{marketId}:{taskId} -> AnalysisResult JSON
 *   market:{conditionId}       -> MarketSnapshot JSON
 */
class OgKvClient {
    initialized = false;
    /** 初始化 KV 客户端 */
    async init() {
        // TODO: Initialize 0G KV Batcher and KvClient
        // const batcher = new Batcher(1, [zgNode], evmRpc, signer);
        // const kvClient = batcher.streamDataBuilder('your-stream-id');
        this.initialized = true;
        logger_1.logger.info('0G KV Storage client initialized');
    }
    /** 写入键值对 */
    async put(key, value) {
        if (!this.initialized)
            await this.init();
        // TODO: kvClient.set(key, Buffer.from(value))
        // TODO: await batcher.exec()
        logger_1.logger.debug({ key }, 'KV put');
    }
    /** 读取键值对 */
    async get(key) {
        if (!this.initialized)
            await this.init();
        // TODO: const kvClient = new KvClient(zgNode);
        // TODO: const val = await kvClient.getValue(streamId, key);
        logger_1.logger.debug({ key }, 'KV get');
        return null;
    }
    /** 存储交易记录 */
    async putTrade(address, orderId, data) {
        const key = `trade:${address}:${orderId}`;
        await this.put(key, JSON.stringify(data));
    }
    /** 存储AI分析结果 */
    async putAnalysis(marketId, taskId, data) {
        const key = `analysis:${marketId}:${taskId}`;
        await this.put(key, JSON.stringify(data));
    }
    /** 获取交易记录 */
    async getTrade(address, orderId) {
        const key = `trade:${address}:${orderId}`;
        const val = await this.get(key);
        return val ? JSON.parse(val) : null;
    }
    /** 获取AI分析结果 */
    async getAnalysis(marketId, taskId) {
        const key = `analysis:${marketId}:${taskId}`;
        const val = await this.get(key);
        return val ? JSON.parse(val) : null;
    }
}
exports.OgKvClient = OgKvClient;
exports.ogKvClient = new OgKvClient();
//# sourceMappingURL=og-kv-client.js.map