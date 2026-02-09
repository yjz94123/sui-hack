"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clobClient = exports.ClobClient = void 0;
const axios_1 = __importDefault(require("axios"));
const retry_1 = require("../../utils/retry");
const logger_1 = require("../../utils/logger");
const config_1 = require("../../config");
/**
 * Polymarket CLOB API 客户端
 * 负责获取订单簿、价格、交易数据
 * 注意速率限制: /book 接口 50次/10秒
 */
class ClobClient {
    client;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: config_1.config.polymarket.clobBaseUrl,
            timeout: 10_000,
        });
    }
    /** 获取订单簿 */
    async getOrderBook(tokenId) {
        return (0, retry_1.withRetry)(async () => {
            const { data } = await this.client.get('/book', {
                params: { token_id: tokenId },
            });
            return data;
        }, 'ClobClient.getOrderBook');
    }
    /** 获取市场价格信息 */
    async getMarketPrice(tokenId) {
        return (0, retry_1.withRetry)(async () => {
            const { data } = await this.client.get('/price', {
                params: { token_id: tokenId, side: 'BUY' },
            });
            return data;
        }, 'ClobClient.getMarketPrice');
    }
    /** 获取市场中间价 */
    async getMidpoint(tokenId) {
        return (0, retry_1.withRetry)(async () => {
            const { data } = await this.client.get('/midpoint', {
                params: { token_id: tokenId },
            });
            return data;
        }, 'ClobClient.getMidpoint');
    }
    /** 获取市场信息（CLOB侧） */
    async getMarket(conditionId) {
        return (0, retry_1.withRetry)(async () => {
            const { data } = await this.client.get(`/markets/${conditionId}`);
            return data;
        }, 'ClobClient.getMarket');
    }
    /** 获取价格历史 */
    async getPricesHistory(tokenId, interval = '1d') {
        return (0, retry_1.withRetry)(async () => {
            const { data } = await this.client.get('/prices-history', {
                params: { market: tokenId, interval },
            });
            return data;
        }, 'ClobClient.getPricesHistory');
    }
    /** 批量获取订单簿（每批不超过 20 个 token_id） */
    async getOrderBooks(tokenIds) {
        const chunks = [];
        for (let i = 0; i < tokenIds.length; i += 20) {
            chunks.push(tokenIds.slice(i, i + 20));
        }
        const out = {};
        for (const chunk of chunks) {
            logger_1.logger.debug({ count: chunk.length }, 'Fetching batch order books');
            const result = await (0, retry_1.withRetry)(async () => {
                const { data } = await this.client.post('/books', {
                    token_ids: chunk,
                });
                return data;
            }, 'ClobClient.getOrderBooks');
            const books = result?.books;
            if (Array.isArray(books)) {
                for (const book of books) {
                    out[book.asset_id] = book;
                }
            }
            for (const tokenId of chunk) {
                if (!(tokenId in out))
                    out[tokenId] = null;
            }
        }
        return out;
    }
    /** 批量获取市场价格 */
    async getMarketsPrices(tokenIds) {
        logger_1.logger.debug({ count: tokenIds.length }, 'Fetching batch market prices');
        const results = await Promise.allSettled(tokenIds.map((id) => this.getMarketPrice(id)));
        return results.map((r, i) => ({
            tokenId: tokenIds[i],
            price: r.status === 'fulfilled' ? r.value : null,
            error: r.status === 'rejected' ? r.reason?.message : undefined,
        }));
    }
}
exports.ClobClient = ClobClient;
exports.clobClient = new ClobClient();
//# sourceMappingURL=clob-client.js.map