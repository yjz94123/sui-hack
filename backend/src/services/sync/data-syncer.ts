import { gammaClient, type GammaEvent, type GammaMarket } from '../polymarket';
import { logger } from '../../utils/logger';
import { prisma } from '../../db/prisma';
import { polymarketToOnchainMarketId } from '../../utils/id-mapping';
import { config } from '../../config';

/**
 * 数据同步服务
 * 定期从 Polymarket 拉取事件和市场数据，写入本地 DB
 */
export class DataSyncer {
  private isRunning = false;
  private timers: NodeJS.Timeout[] = [];
  private lastEventsSyncAt: Date | null = null;

  start(): void {
    // 先跑一轮，避免冷启动没数据
    this.syncAll().catch((err) => logger.error({ err }, 'Initial data sync failed'));

    this.timers.push(
      setInterval(() => {
        this.syncAll().catch((err) => logger.error({ err }, 'Scheduled data sync failed'));
      }, config.sync.eventsIntervalMs)
    );

    logger.info(
      { intervalMs: config.sync.eventsIntervalMs },
      'DataSyncer scheduled'
    );
  }

  stop(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }

  /** 全量同步事件和市场 */
  async syncAll(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Sync already in progress, skipping');
      return;
    }

    this.isRunning = true;
    try {
      logger.info('Starting full data sync...');
      await this.syncEventsAndMarkets();
      this.lastEventsSyncAt = new Date();
      logger.info('Full data sync completed');
    } catch (err) {
      logger.error({ err }, 'Data sync failed');
      throw err;
    } finally {
      this.isRunning = false;
    }
  }

  /** 同步活跃事件（包含其子市场） */
  private async syncEventsAndMarkets(): Promise<void> {
    const limit = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const events = await gammaClient.getEvents({
        limit,
        offset,
        active: true,
        closed: false,
        order: 'volume',
        ascending: false,
      });

      if (!events?.length) break;

      await this.upsertEventsBatch(events);

      logger.info({ count: events.length, offset }, 'Synced events batch');

      offset += limit;
      if (events.length < limit) hasMore = false;
    }
  }

  private async upsertEventsBatch(events: GammaEvent[]): Promise<void> {
    const syncedAt = new Date();
    const now = new Date();

    for (const event of events) {
      const tagSlugs = (event.tags || []).map((t) => t.slug);
      const tags = (event.tags || []).map((t) => ({ slug: t.slug, label: t.label }));

      // 如果 endDate 已过期，强制标记为非活跃
      const endDate = event.endDate ? new Date(event.endDate) : null;
      const isExpired = endDate !== null && endDate < now;
      const isActive = isExpired ? false : !!event.active;

      await prisma.event.upsert({
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
          volume24h: Number((event as any).volume24hr ?? (event as any).volume24h ?? 0),
          liquidity: Number(event.liquidity ?? 0),
          openInterest: Number((event as any).openInterest ?? 0),
          tagSlugs,
          tags,
          rawData: event as unknown as object,
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
          volume24h: Number((event as any).volume24hr ?? (event as any).volume24h ?? 0),
          liquidity: Number(event.liquidity ?? 0),
          openInterest: Number((event as any).openInterest ?? 0),
          tagSlugs,
          tags,
          rawData: event as unknown as object,
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

  private async upsertMarket(eventId: string, market: GammaMarket, syncedAt: Date): Promise<void> {
    const outcomes = this.parseStringArray(market.outcomes, ['Yes', 'No']);
    const outcomePrices = this.parseStringArray(market.outcomePrices, ['0.5', '0.5']);
    const clobTokenIds = this.parseStringArray(market.clobTokenIds, []);

    const onchainMarketId = market.conditionId ? polymarketToOnchainMarketId(market.conditionId) : null;

    const spread = market.spread ? Number(market.spread) : null;

    const mktEndDate = market.endDate ? new Date(market.endDate) : null;
    const mktExpired = mktEndDate !== null && mktEndDate < new Date();
    const mktActive = mktExpired ? false : !!market.active;
    const mktClosed = mktExpired ? true : !!market.closed;

    await prisma.market.upsert({
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
        spread: Number.isFinite(spread as number) ? (spread as number) : null,
        onchainMarketId,
        rawData: market as unknown as object,
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
        spread: Number.isFinite(spread as number) ? (spread as number) : null,
        onchainMarketId,
        rawData: market as unknown as object,
        syncedAt,
      },
    });
  }

  private parseStringArray(value: string | undefined, fallback: string[]): string[] {
    if (!value) return fallback;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
      return fallback;
    } catch {
      return fallback;
    }
  }

  private toNumber(value: string | number | undefined | null): number {
    if (value == null) return 0;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  getLastEventsSyncAt(): Date | null {
    return this.lastEventsSyncAt;
  }
}

export const dataSyncer = new DataSyncer();
