import { Router } from 'express';
import { AppError } from '../middleware/error-handler';
import { aiService } from '../services/ai';

export const analysisRouter = Router();

// GET /api/v1/analysis/:taskId - 查询AI分析结果
analysisRouter.get('/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await aiService.getAnalysis(taskId);
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', `Task '${taskId}' not found`);
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});
