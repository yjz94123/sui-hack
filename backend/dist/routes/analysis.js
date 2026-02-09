"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisRouter = void 0;
const express_1 = require("express");
const error_handler_1 = require("../middleware/error-handler");
const ai_1 = require("../services/ai");
exports.analysisRouter = (0, express_1.Router)();
// GET /api/v1/analysis/:taskId - 查询AI分析结果
exports.analysisRouter.get('/:taskId', async (req, res, next) => {
    try {
        const { taskId } = req.params;
        const task = await ai_1.aiService.getAnalysis(taskId);
        if (!task)
            throw new error_handler_1.AppError(404, 'TASK_NOT_FOUND', `Task '${taskId}' not found`);
        res.json({ success: true, data: task });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=analysis.js.map