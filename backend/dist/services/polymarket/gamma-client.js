"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gammaClient = exports.GammaClient = void 0;
const axios_1 = __importDefault(require("axios"));
const retry_1 = require("../../utils/retry");
const logger_1 = require("../../utils/logger");
const config_1 = require("../../config");
/**
 * Polymarket Gamma API 客户端
 * 负责获取 events 和 markets 元数据
 */
class GammaClient {
    client;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: config_1.config.polymarket.gammaBaseUrl,
            timeout: 10_000,
        });
    }
    /** 获取活跃事件列表 */
    async getEvents(params) {
        return (0, retry_1.withRetry)(async () => {
            const { data } = await this.client.get('/events', { params });
            return data;
        }, 'GammaClient.getEvents');
    }
    /** 获取单个事件详情 */
    async getEvent(eventId) {
        return (0, retry_1.withRetry)(async () => {
            const { data } = await this.client.get(`/events/${eventId}`);
            return data;
        }, 'GammaClient.getEvent');
    }
    /** 获取市场列表 */
    async getMarkets(params) {
        return (0, retry_1.withRetry)(async () => {
            const { data } = await this.client.get('/markets', { params });
            return data;
        }, 'GammaClient.getMarkets');
    }
    /** 获取单个市场详情 */
    async getMarket(conditionId) {
        return (0, retry_1.withRetry)(async () => {
            const { data } = await this.client.get(`/markets/${conditionId}`);
            return data;
        }, 'GammaClient.getMarket');
    }
    /** 按标签获取事件 */
    async getEventsByTag(tag, limit = 20) {
        logger_1.logger.debug({ tag, limit }, 'Fetching events by tag');
        return this.getEvents({ tag, limit, active: true });
    }
}
exports.GammaClient = GammaClient;
exports.gammaClient = new GammaClient();
//# sourceMappingURL=gamma-client.js.map