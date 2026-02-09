"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderBookCache = exports.OrderBookCache = void 0;
const polymarket_1 = require("../polymarket");
const logger_1 = require("../../utils/logger");
/**
 * 订单簿内存缓存
 * 热门市场 TTL: 30s, 冷门市场 TTL: 120s
 */
class OrderBookCache {
    cache = new Map();
    hotMarkets = new Set();
    HOT_TTL = 30_000; // 30s
    COLD_TTL = 120_000; // 120s
    /** 标记热门市场（前端正在查看的） */
    markHot(tokenId) {
        this.hotMarkets.add(tokenId);
    }
    /** 取消热门标记 */
    markCold(tokenId) {
        this.hotMarkets.delete(tokenId);
    }
    /** 获取订单簿（带缓存） */
    async getOrderBook(tokenId) {
        const cached = this.cache.get(tokenId);
        const ttl = this.hotMarkets.has(tokenId) ? this.HOT_TTL : this.COLD_TTL;
        if (cached && Date.now() - cached.updatedAt < ttl) {
            return cached.data;
        }
        try {
            const data = await polymarket_1.clobClient.getOrderBook(tokenId);
            this.cache.set(tokenId, { data, updatedAt: Date.now() });
            return data;
        }
        catch (err) {
            logger_1.logger.error({ err, tokenId }, 'Failed to fetch order book');
            // 返回过期缓存（如果有）
            if (cached)
                return cached.data;
            throw err;
        }
    }
    /** 刷新所有热门市场的订单簿 */
    async refreshHotMarkets() {
        const tokenIds = Array.from(this.hotMarkets);
        logger_1.logger.debug({ count: tokenIds.length }, 'Refreshing hot market order books');
        await Promise.allSettled(tokenIds.map((id) => this.getOrderBook(id)));
    }
    /** 清理过期缓存 */
    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache) {
            if (now - value.updatedAt > this.COLD_TTL * 2) {
                this.cache.delete(key);
            }
        }
    }
}
exports.OrderBookCache = OrderBookCache;
exports.orderBookCache = new OrderBookCache();
//# sourceMappingURL=orderbook-cache.js.map