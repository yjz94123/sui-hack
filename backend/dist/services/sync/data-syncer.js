"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSyncer = exports.DataSyncer = void 0;
const polymarket_1 = require("../polymarket");
const logger_1 = require("../../utils/logger");
const prisma_1 = require("../../db/prisma");
const id_mapping_1 = require("../../utils/id-mapping");
const config_1 = require("../../config");
/**
 * 数据同步服务
 * 定期从 Polymarket 拉取事件和市场数据，写入本地 DB
 */
class DataSyncer {
    isRunning = false;
    timers = [];
    lastEventsSyncAt = null;
    start() {
        // 先跑一轮，避免冷启动没数据
        this.syncAll().catch((err) => logger_1.logger.error({ err }, 'Initial data sync failed'));
        this.timers.push(setInterval(() => {
            this.syncAll().catch((err) => logger_1.logger.error({ err }, 'Scheduled data sync failed'));
        }, config_1.config.sync.eventsIntervalMs));
        logger_1.logger.info({ intervalMs: config_1.config.sync.eventsIntervalMs }, 'DataSyncer scheduled');
    }
    stop() {
        for (const t of this.timers)
            clearInterval(t);
        this.timers = [];
    }
    /** 全量同步事件和市场 */
    async syncAll() {
        if (this.isRunning) {
            logger_1.logger.warn('Sync already in progress, skipping');
            return;
        }
        this.isRunning = true;
        try {
            logger_1.logger.info('Starting full data sync...');
            await this.syncEventsAndMarkets();
            this.lastEventsSyncAt = new Date();
            logger_1.logger.info('Full data sync completed');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Data sync failed');
            throw err;
        }
        finally {
            this.isRunning = false;
        }
    }
    /** 同步活跃事件（包含其子市场） */
    async syncEventsAndMarkets() {
        const limit = 100;
        let offset = 0;
        let hasMore = true;
        while (hasMore) {
            const events = await polymarket_1.gammaClient.getEvents({
                limit,
                offset,
                active: true,
                closed: false,
                order: 'volume',
                ascending: false,
            });
            if (!events?.length)
                break;
            await this.upsertEventsBatch(events);
            logger_1.logger.info({ count: events.length, offset }, 'Synced events batch');
            offset += limit;
            if (events.length < limit)
                hasMore = false;
        }
    }
    async upsertEventsBatch(events) {
        const syncedAt = new Date();
        const now = new Date();
        for (const event of events) {
            const tagSlugs = (event.tags || []).map((t) => t.slug);
            const tags = (event.tags || []).map((t) => ({ slug: t.slug, label: t.label }));
            // 如果 endDate 已过期，强制标记为非活跃
            const endDate = event.endDate ? new Date(event.endDate) : null;
            const isExpired = endDate !== null && endDate < now;
            const isActive = isExpired ? false : !!event.active;
            await prisma_1.prisma.event.upsert({
                where: { id: event.id },
                create: {
                    id: event.id,
                    slug: event.slug,
                    title: event.title,
                    description: event.description ?? null,
                    resolutionSource: event.resolutionSource ?? null,
                    imageUrl: event.image ?? null,
                    iconUrl: event.icon ?? null,
                    startDate: event.startDate ? new Date(event.startDate) : null,
                    endDate,
                    active: isActive,
                    closed: isExpired ? true : !!event.closed,
                    featured: !!event.featured,
                    volume: Number(event.volume ?? 0),
                    volume24h: Number(event.volume24hr ?? event.volume24h ?? 0),
                    liquidity: Number(event.liquidity ?? 0),
                    openInterest: Number(event.openInterest ?? 0),
                    tagSlugs,
                    tags,
                    rawData: event,
                    syncedAt,
                },
                update: {
                    slug: event.slug,
                    title: event.title,
                    description: event.description ?? null,
                    resolutionSource: event.resolutionSource ?? null,
                    imageUrl: event.image ?? null,
                    iconUrl: event.icon ?? null,
                    startDate: event.startDate ? new Date(event.startDate) : null,
                    endDate,
                    active: isActive,
                    closed: isExpired ? true : !!event.closed,
                    featured: !!event.featured,
                    volume: Number(event.volume ?? 0),
                    volume24h: Number(event.volume24hr ?? event.volume24h ?? 0),
                    liquidity: Number(event.liquidity ?? 0),
                    openInterest: Number(event.openInterest ?? 0),
                    tagSlugs,
                    tags,
                    rawData: event,
                    syncedAt,
                },
            });
            if (Array.isArray(event.markets)) {
                for (const market of event.markets) {
                    await this.upsertMarket(event.id, market, syncedAt);
                }
            }
        }
    }
    async upsertMarket(eventId, market, syncedAt) {
        const outcomes = this.parseStringArray(market.outcomes, ['Yes', 'No']);
        const outcomePrices = this.parseStringArray(market.outcomePrices, ['0.5', '0.5']);
        const clobTokenIds = this.parseStringArray(market.clobTokenIds, []);
        const onchainMarketId = market.conditionId ? (0, id_mapping_1.polymarketToOnchainMarketId)(market.conditionId) : null;
        const spread = market.spread ? Number(market.spread) : null;
        const mktEndDate = market.endDate ? new Date(market.endDate) : null;
        const mktExpired = mktEndDate !== null && mktEndDate < new Date();
        const mktActive = mktExpired ? false : !!market.active;
        const mktClosed = mktExpired ? true : !!market.closed;
        await prisma_1.prisma.market.upsert({
            where: { id: market.id },
            create: {
                id: market.id,
                eventId,
                conditionId: market.conditionId,
                questionId: market.questionId ?? null,
                slug: market.slug ?? null,
                question: market.question,
                description: market.description ?? null,
                outcomes,
                outcomePrices,
                clobTokenIds,
                startDate: null,
                endDate: mktEndDate,
                active: mktActive,
                closed: mktClosed,
                acceptingOrders: mktExpired ? false : !!market.acceptingOrders,
                volume: this.toNumber(market.volume),
                volume24h: this.toNumber(market.volume24hr),
                liquidity: this.toNumber(market.liquidity),
                lastTradePrice: market.lastTradePrice != null ? String(market.lastTradePrice) : null,
                bestBid: market.bestBid != null ? String(market.bestBid) : null,
                bestAsk: market.bestAsk != null ? String(market.bestAsk) : null,
                spread: Number.isFinite(spread) ? spread : null,
                onchainMarketId,
                rawData: market,
                syncedAt,
            },
            update: {
                eventId,
                conditionId: market.conditionId,
                questionId: market.questionId ?? null,
                slug: market.slug ?? null,
                question: market.question,
                description: market.description ?? null,
                outcomes,
                outcomePrices,
                clobTokenIds,
                endDate: mktEndDate,
                active: mktActive,
                closed: mktClosed,
                acceptingOrders: mktExpired ? false : !!market.acceptingOrders,
                volume: this.toNumber(market.volume),
                volume24h: this.toNumber(market.volume24hr),
                liquidity: this.toNumber(market.liquidity),
                lastTradePrice: market.lastTradePrice != null ? String(market.lastTradePrice) : null,
                bestBid: market.bestBid != null ? String(market.bestBid) : null,
                bestAsk: market.bestAsk != null ? String(market.bestAsk) : null,
                spread: Number.isFinite(spread) ? spread : null,
                onchainMarketId,
                rawData: market,
                syncedAt,
            },
        });
    }
    parseStringArray(value, fallback) {
        if (!value)
            return fallback;
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed))
                return parsed.map((v) => String(v));
            return fallback;
        }
        catch {
            return fallback;
        }
    }
    toNumber(value) {
        if (value == null)
            return 0;
        const n = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(n) ? n : 0;
    }
    getLastEventsSyncAt() {
        return this.lastEventsSyncAt;
    }
}
exports.DataSyncer = DataSyncer;
exports.dataSyncer = new DataSyncer();
//# sourceMappingURL=data-syncer.js.map