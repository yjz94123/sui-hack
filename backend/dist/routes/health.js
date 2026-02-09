"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const sync_1 = require("../services/sync");
exports.healthRouter = (0, express_1.Router)();
// GET /api/v1/health - 健康检查
exports.healthRouter.get('/', async (_req, res) => {
    const services = {
        database: { status: 'unknown' },
        polymarket: { status: 'unknown' },
        ogStorage: { status: 'unknown' },
        ogCompute: { status: 'unknown' },
    };
    let totalEvents = 0;
    let totalMarkets = 0;
    let activeMarkets = 0;
    let lastEventSync = sync_1.dataSyncer.getLastEventsSyncAt()?.toISOString() ?? '';
    try {
        const t0 = Date.now();
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        services.database = { status: 'ok', latency: Date.now() - t0 };
        totalEvents = await prisma_1.prisma.event.count();
        totalMarkets = await prisma_1.prisma.market.count();
        activeMarkets = await prisma_1.prisma.market.count({ where: { active: true } });
    }
    catch {
        services.database = { status: 'error' };
    }
    const data = {
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
//# sourceMappingURL=health.js.map