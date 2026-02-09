"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.snapshotsRouter = void 0;
const express_1 = require("express");
exports.snapshotsRouter = (0, express_1.Router)();
// GET /api/v1/snapshots/:marketId - 获取市场快照列表
exports.snapshotsRouter.get('/:marketId', async (_req, res, next) => {
    try {
        // TODO: Query snapshot index from 0G KV, retrieve files from 0G File Storage
        res.json({ success: true, data: { snapshots: [] } });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=snapshots.js.map