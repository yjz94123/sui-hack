import { Router } from 'express';
import { prisma } from '../db/prisma';
import { dataSyncer } from '../services/sync';
import type { HealthStatus } from '@og-predict/shared';

export const healthRouter = Router();

// GET /api/v1/health - 健康检查
healthRouter.get('/', async (_req, res) => {
  const services: HealthStatus['services'] = {
    database: { status: 'unknown' },
    polymarket: { status: 'unknown' },
    ogStorage: { status: 'unknown' },
    ogCompute: { status: 'unknown' },
  };

  let totalEvents = 0;
  let totalMarkets = 0;
  let activeMarkets = 0;
  let lastEventSync = dataSyncer.getLastEventsSyncAt()?.toISOString() ?? '';

  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    services.database = { status: 'ok', latency: Date.now() - t0 };

    totalEvents = await prisma.event.count();
    totalMarkets = await prisma.market.count();
    activeMarkets = await prisma.market.count({ where: { active: true } });
  } catch {
    services.database = { status: 'error' };
  }

  const data: HealthStatus = {
    status: services.database.status === 'ok' ? 'healthy' : 'degraded',
    version: process.env.npm_package_version || '0.1.0',
    uptime: process.uptime(),
    services,
    sync: {
      totalEvents,
      totalMarkets,
      activeMarkets,
      lastEventSync,
      lastOrderBookRefresh: '',
      lastSnapshotUpload: '',
    },
  };

  res.json({ success: true, data });
});
