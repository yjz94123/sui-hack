import { Router } from 'express';
import { z } from 'zod';
import type { ApiResponse, AnalysisStatus, AnalysisTask, EventDetail, EventSummary, OrderBookData, PriceHistory } from '@og-predict/shared';
import { randomUUID } from 'crypto';
import { validate } from '../middleware/validator';
import { AppError } from '../middleware/error-handler';
import { prisma } from '../db/prisma';
import { orderBookCache } from '../services/sync';
import { clobClient } from '../services/polymarket';
import type { ClobOrderBook } from '../services/polymarket/types';
import { aiService } from '../services/ai';
import { ogComputeClient } from '../services/ai/og-compute';
import { buildBasPrompt, extractLastJsonCodeBlock } from '../services/ai/bas-prompt';

export const marketsRouter = Router();

const listMarketsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['volume', 'volume24h', 'liquidity', 'endDate', 'createdAt']).default('volume'),
  order: z.enum(['asc', 'desc']).default('desc'),
  active: z.coerce.boolean().default(true),
  tag: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
});

const orderBookQuerySchema = z.object({
  depth: z.coerce.number().int().min(1).max(50).default(20),
});

const priceHistoryQuerySchema = z.object({
  interval: z.enum(['1h', '1d', '1w', 'max']).default('1d'),
  outcome: z.enum(['yes', 'no']).default('yes'),
});

const analyzeBodySchema = z.object({
  marketId: z.string().optional(),
  question: z.string().min(1).optional(),
});

const listAnalysesQuerySchema = z.object({
  marketId: z.string().optional(),
  status: z.enum(['completed', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

function toNumberString(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(digits);
}

function buildOrderBookSide(book: ClobOrderBook, depth: number) {
  const bids = (book.bids || []).slice(0, depth);
  const asks = (book.asks || []).slice(0, depth);

  const bestBid = bids[0]?.price ?? '0';
  const bestAsk = asks[0]?.price ?? '0';

  const bestBidNum = Number(bestBid);
  const bestAskNum = Number(bestAsk);
  const spreadNum = Number.isFinite(bestBidNum) && Number.isFinite(bestAskNum) ? bestAskNum - bestBidNum : 0;
  const midpointNum = Number.isFinite(bestBidNum) && Number.isFinite(bestAskNum) ? (bestBidNum + bestAskNum) / 2 : 0;

  return {
    bids,
    asks,
    bestBid,
    bestAsk,
    spread: toNumberString(spreadNum, 4),
    midpoint: toNumberString(midpointNum, 4),
  };
}

function parsePricePoints(data: unknown): Array<{ timestamp: number; price: number }> {
  // Possible shapes:
  // 1) [[ts, price], ...]
  // 2) { history: [{timestamp, price}, ...] } or { prices: [...] }
  if (Array.isArray(data)) {
    if (data.every((x) => Array.isArray(x) && x.length >= 2)) {
      return (data as Array<[number, number]>).map(([ts, p]) => ({
        timestamp: ts,
        price: Number(p),
      })).filter((p) => Number.isFinite(p.timestamp) && Number.isFinite(p.price));
    }
    if (data.every((x) => typeof x === 'object' && x)) {
      return (data as any[]).map((x) => ({
        timestamp: Number((x as any).timestamp),
        price: Number((x as any).price),
      })).filter((p) => Number.isFinite(p.timestamp) && Number.isFinite(p.price));
    }
  }

  if (typeof data === 'object' && data) {
    const maybeHistory = (data as any).history ?? (data as any).prices;
    if (Array.isArray(maybeHistory)) return parsePricePoints(maybeHistory);
  }

  return [];
}

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

// GET /api/v1/markets - 获取市场(事件)列表
marketsRouter.get('/', validate(listMarketsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { limit, offset, sortBy, order, active, tag, search } = req.query as unknown as z.infer<typeof listMarketsQuerySchema>;

    const where: any = {};
    where.active = active;
    where.closed = false;
    // 排除已过期事件：endDate 为空（无截止日）或 endDate 在未来
    where.OR = [
      { endDate: null },
      { endDate: { gte: new Date() } },
    ];
    if (tag) where.tagSlugs = { has: tag };
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const total = await prisma.event.count({ where });
    const events = await prisma.event.findMany({
      where,
      orderBy: [{ [sortBy]: order }, { syncedAt: 'desc' }],
      take: limit,
      skip: offset,
      include: {
        markets: {
          where: { active: true, closed: false },
          orderBy: [{ volume: 'desc' }],
        },
      },
    });

    const data: EventSummary[] = events.map((e: any) => ({
      eventId: e.id,
      slug: e.slug,
      title: e.title,
      description: e.description ?? '',
      imageUrl: e.imageUrl ?? null,
      iconUrl: e.iconUrl ?? null,
      startDate: e.startDate?.toISOString() ?? '',
      endDate: e.endDate?.toISOString() ?? '',
      active: e.active,
      closed: e.closed,
      featured: e.featured,
      volume: e.volume,
      volume24h: e.volume24h,
      liquidity: e.liquidity,
      openInterest: e.openInterest,
      tags: Array.isArray(e.tags) ? (e.tags as any) : [],
      markets: e.markets.map((m: any) => ({
        marketId: m.id,
        conditionId: m.conditionId ?? '',
        question: m.question,
        outcomes: m.outcomes,
        outcomePrices: m.outcomePrices,
        lastTradePrice: m.lastTradePrice ?? m.outcomePrices?.[0] ?? '0',
        bestBid: m.bestBid ?? '0',
        bestAsk: m.bestAsk ?? '0',
        spread: m.spread ?? 0,
        volume: toNumberString(m.volume, 2),
        onchainMarketId: m.onchainMarketId ?? '',
      })),
      syncedAt: e.syncedAt.toISOString(),
    }));

    const response: ApiResponse<EventSummary[]> = {
      success: true,
      data,
      meta: { total, limit, offset },
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/markets/:eventId - 获取市场详情
marketsRouter.get('/:eventId', async (req, res, next) => {
  try {
    const eventId = getParam(req.params.eventId);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { markets: { orderBy: [{ volume: 'desc' }] } },
    });

    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', `Event '${eventId}' not found`);

    const emptyOrderBook: OrderBookData = {
      yes: { bids: [], asks: [], bestBid: '0', bestAsk: '0', spread: '0', midpoint: '0' },
      no: { bids: [], asks: [], bestBid: '0', bestAsk: '0', spread: '0', midpoint: '0' },
      hash: '',
      timestamp: new Date().toISOString(),
    };

    const markets = event.markets.map((m: any) => ({
      marketId: m.id,
      conditionId: m.conditionId ?? '',
      question: m.question,
      outcomes: m.outcomes,
      outcomePrices: m.outcomePrices,
      lastTradePrice: m.lastTradePrice ?? m.outcomePrices?.[0] ?? '0',
      bestBid: m.bestBid ?? '0',
      bestAsk: m.bestAsk ?? '0',
      spread: m.spread ?? 0,
      volume: toNumberString(m.volume, 2),
      onchainMarketId: m.onchainMarketId ?? '',
      clobTokenIds: m.clobTokenIds,
      resolutionStatus: (m.resolutionStatus as 0 | 1 | 2) ?? 0,
      acceptingOrders: m.acceptingOrders,
      polymarketOrderBook: emptyOrderBook,
    }));

    const data: EventDetail = {
      eventId: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description ?? '',
      imageUrl: event.imageUrl ?? null,
      iconUrl: event.iconUrl ?? null,
      startDate: event.startDate?.toISOString() ?? '',
      endDate: event.endDate?.toISOString() ?? '',
      active: event.active,
      closed: event.closed,
      featured: event.featured,
      volume: event.volume,
      volume24h: event.volume24h,
      liquidity: event.liquidity,
      openInterest: event.openInterest,
      tags: Array.isArray(event.tags) ? (event.tags as any) : [],
      syncedAt: event.syncedAt.toISOString(),
      resolutionSource: event.resolutionSource ?? null,
      markets,
    };

    const response: ApiResponse<EventDetail> = { success: true, data };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/markets/:eventId/orderbook/:marketId - 获取订单簿
marketsRouter.get('/:eventId/orderbook/:marketId', validate(orderBookQuerySchema, 'query'), async (req, res, next) => {
  try {
    const marketId = getParam(req.params.marketId);
    const { depth } = req.query as unknown as z.infer<typeof orderBookQuerySchema>;

    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market) throw new AppError(404, 'MARKET_NOT_FOUND', `Market '${marketId}' not found`);

    const yesTokenId = market.clobTokenIds?.[0];
    const noTokenId = market.clobTokenIds?.[1];
    if (!yesTokenId || !noTokenId) throw new AppError(500, 'INTERNAL_ERROR', 'Missing CLOB token IDs');

    orderBookCache.markHot(yesTokenId);
    orderBookCache.markHot(noTokenId);

    let data: OrderBookData;
    try {
      const yesBook = await orderBookCache.getOrderBook(yesTokenId) as ClobOrderBook;
      const noBook = await orderBookCache.getOrderBook(noTokenId) as ClobOrderBook;
      data = {
        yes: buildOrderBookSide(yesBook, depth),
        no: buildOrderBookSide(noBook, depth),
        hash: yesBook.hash || noBook.hash,
        timestamp: new Date().toISOString(),
      };
    } catch {
      const empty = { bids: [], asks: [], bestBid: '0', bestAsk: '0', spread: '0', midpoint: '0' };
      data = { yes: empty, no: empty, hash: '', timestamp: new Date().toISOString() };
    }

    const response: ApiResponse<OrderBookData> = { success: true, data };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/markets/:eventId/price-history/:marketId - 获取价格历史
marketsRouter.get('/:eventId/price-history/:marketId', validate(priceHistoryQuerySchema, 'query'), async (req, res, next) => {
  try {
    const marketId = getParam(req.params.marketId);
    const { interval, outcome } = req.query as unknown as z.infer<typeof priceHistoryQuerySchema>;

    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market) throw new AppError(404, 'MARKET_NOT_FOUND', `Market '${marketId}' not found`);

    const tokenId = outcome === 'yes' ? market.clobTokenIds?.[0] : market.clobTokenIds?.[1];
    if (!tokenId) throw new AppError(500, 'INTERNAL_ERROR', 'Missing CLOB token ID');

    const raw = await clobClient.getPricesHistory(tokenId, interval);
    const history = parsePricePoints(raw).map((p) => ({
      timestamp: p.timestamp > 1_000_000_000_000 ? Math.floor(p.timestamp / 1000) : p.timestamp,
      price: p.price,
    }));

    const data: PriceHistory = {
      marketId,
      outcome,
      interval,
      history,
    };

    const response: ApiResponse<PriceHistory> = { success: true, data };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/markets/:eventId/analyze - 请求AI分析
marketsRouter.post('/:eventId/analyze', validate(analyzeBodySchema, 'body'), async (req, res, next) => {
  try {
    const eventId = getParam(req.params.eventId);
    const body = req.body as unknown as z.infer<typeof analyzeBodySchema>;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { markets: { orderBy: [{ volume: 'desc' }] } },
    });
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', `Event '${eventId}' not found`);

    const marketId = body.marketId ?? event.markets[0]?.id;
    if (!marketId) throw new AppError(404, 'MARKET_NOT_FOUND', `No market found in event '${eventId}'`);

    const market = event.markets.find((m: any) => m.id === marketId);
    if (!market) throw new AppError(404, 'MARKET_NOT_FOUND', `Market '${marketId}' not found in event '${eventId}'`);

    const task = await aiService.createAnalysis({
      marketId,
      event: body.question ?? event.title,
      resolutionDate: event.endDate?.toISOString(),
      resolutionCriteria: event.resolutionSource ?? undefined,
    });

    res.status(202).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/markets/:eventId/analyze/stream - 流式 AI 分析（输出过程 + 最终 JSON）
marketsRouter.post('/:eventId/analyze/stream', validate(analyzeBodySchema, 'body'), async (req, res) => {
  const eventId = getParam(req.params.eventId);
  const body = req.body as unknown as z.infer<typeof analyzeBodySchema>;

  const abortController = new AbortController();
  const abort = () => {
    if (!abortController.signal.aborted) abortController.abort();
  };
  req.on('aborted', abort);
  res.on('close', abort);

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const taskId = randomUUID();

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { markets: { orderBy: [{ volume: 'desc' }] } },
    });
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', `Event '${eventId}' not found`);

    const marketId = body.marketId ?? event.markets[0]?.id;
    if (!marketId) throw new AppError(404, 'MARKET_NOT_FOUND', `No market found in event '${eventId}'`);

    const market = event.markets.find((m: any) => m.id === marketId);
    if (!market) throw new AppError(404, 'MARKET_NOT_FOUND', `Market '${marketId}' not found in event '${eventId}'`);

    await prisma.analysisTask.create({
      data: {
        taskId,
        marketId,
        status: 'processing',
      },
    });

    res.write(JSON.stringify({ type: 'task', taskId }) + '\n');

    const today = new Date().toISOString().slice(0, 10);
    const prompt = buildBasPrompt({
      event: body.question ?? event.title,
      today,
      resolutionDate: event.endDate?.toISOString() ?? '',
      resolutionCriteria: event.resolutionSource ?? '',
    });

    let fullText = '';
    fullText = await ogComputeClient.streamChatCompletion(
      [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      {
        signal: abortController.signal,
        onDelta: (chunk) => {
          res.write(JSON.stringify({ type: 'delta', content: chunk }) + '\n');
        },
      }
    );

    const extracted = extractLastJsonCodeBlock(fullText);
    const resultToStore = extracted?.value ?? { rawOutput: fullText };

    await prisma.analysisTask.update({
      where: { taskId },
      data: {
        status: 'completed',
        result: resultToStore as any,
        completedAt: new Date(),
        ogStorageKey: `analysis:${marketId}:${taskId}`,
      },
    });

    res.write(JSON.stringify({ type: 'done', taskId, result: extracted?.value ?? null }) + '\n');
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.analysisTask.update({
      where: { taskId },
      data: { status: 'failed', errorMessage: message },
    }).catch(() => undefined);

    try {
      res.write(JSON.stringify({ type: 'error', taskId, message }) + '\n');
      res.end();
    } catch {
      // ignore write failures
    }
  }
});

// GET /api/v1/markets/:eventId/analyses - 市场的分析历史
marketsRouter.get('/:eventId/analyses', validate(listAnalysesQuerySchema, 'query'), async (req, res, next) => {
  try {
    const eventId = getParam(req.params.eventId);
    const query = req.query as unknown as z.infer<typeof listAnalysesQuerySchema>;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { markets: { select: { id: true } } },
    });
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', `Event '${eventId}' not found`);

    const marketIds = new Set(event.markets.map((m: any) => m.id));
    if (query.marketId && !marketIds.has(query.marketId)) {
      throw new AppError(404, 'MARKET_NOT_FOUND', `Market '${query.marketId}' not found in event '${eventId}'`);
    }

    const where: any = { marketId: query.marketId ?? { in: Array.from(marketIds) } };
    if (query.status) where.status = query.status;

    const total = await prisma.analysisTask.count({ where });
    const rows = await prisma.analysisTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.offset,
    });

    const tasks: AnalysisTask[] = rows.map((t: any) => {
      const result = t.result ?? undefined;
      const resultObj = (t.result ?? {}) as any;
      return {
        taskId: t.taskId,
        marketId: t.marketId,
        status: t.status as AnalysisStatus,
        result,
        confidence: typeof resultObj?.confidence === 'number' ? resultObj.confidence : undefined,
        ogStorageKey: t.ogStorageKey ?? undefined,
        errorMessage: t.errorMessage ?? undefined,
        createdAt: t.createdAt.toISOString(),
        completedAt: t.completedAt?.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    });

    const response: ApiResponse<AnalysisTask[]> = {
      success: true,
      data: tasks,
      meta: { total, limit: query.limit, offset: query.offset },
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/markets/:eventId/snapshots - 市场快照列表
marketsRouter.get('/:eventId/snapshots', async (_req, res, next) => {
  try {
    // TODO: Implement with SnapshotService
    res.json({ success: true, data: [], meta: { total: 0, limit: 10, offset: 0 } });
  } catch (err) {
    next(err);
  }
});
