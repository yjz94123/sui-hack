import { Router } from 'express';

export const snapshotsRouter = Router();

// GET /api/v1/snapshots/:marketId - 获取市场快照列表
snapshotsRouter.get('/:marketId', async (_req, res, next) => {
  try {
    // TODO: Query snapshot index from 0G KV, retrieve files from 0G File Storage
    res.json({ success: true, data: { snapshots: [] } });
  } catch (err) {
    next(err);
  }
});
