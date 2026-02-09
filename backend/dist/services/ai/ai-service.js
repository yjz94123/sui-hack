"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AiService = void 0;
const crypto_1 = require("crypto");
const og_compute_1 = require("./og-compute");
const bas_prompt_1 = require("./bas-prompt");
const storage_1 = require("../storage");
const logger_1 = require("../../utils/logger");
const prisma_1 = require("../../db/prisma");
/**
 * AI 分析服务
 * 管理分析任务的创建、执行和结果存储
 */
class AiService {
    /** 创建分析任务 */
    async createAnalysis(request) {
        const taskId = (0, crypto_1.randomUUID)();
        await prisma_1.prisma.analysisTask.create({
            data: {
                taskId,
                marketId: request.marketId,
                status: 'pending',
            },
        });
        // 异步执行分析
        this.executeAnalysis(taskId, request).catch((err) => {
            logger_1.logger.error({ err, taskId }, 'Analysis execution failed');
        });
        const now = new Date().toISOString();
        return {
            taskId,
            marketId: request.marketId,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        };
    }
    /** 执行分析（异步） */
    async executeAnalysis(taskId, request) {
        try {
            await prisma_1.prisma.analysisTask.update({
                where: { taskId },
                data: { status: 'processing' },
            });
            const today = new Date().toISOString().slice(0, 10);
            const prompt = (0, bas_prompt_1.buildBasPrompt)({
                event: request.event,
                today,
                resolutionDate: request.resolutionDate,
                resolutionCriteria: request.resolutionCriteria,
            });
            const responseText = await og_compute_1.ogComputeClient.chatCompletion([
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: prompt },
            ]);
            const extracted = (0, bas_prompt_1.extractLastJsonCodeBlock)(responseText);
            const result = extracted?.value ?? { rawOutput: responseText };
            const ogStorageKey = `analysis:${request.marketId}:${taskId}`;
            await prisma_1.prisma.analysisTask.update({
                where: { taskId },
                data: {
                    status: 'completed',
                    result: result,
                    ogStorageKey,
                    completedAt: new Date(),
                },
            });
            // 持久化到 0G KV Storage
            await storage_1.ogKvClient.putAnalysis(request.marketId, taskId, {
                taskId,
                marketId: request.marketId,
                result,
                completedAt: new Date().toISOString(),
            });
            logger_1.logger.info({ taskId, marketId: request.marketId }, 'Analysis completed');
        }
        catch (err) {
            logger_1.logger.error({ err, taskId }, 'Analysis failed');
            await prisma_1.prisma.analysisTask.update({
                where: { taskId },
                data: {
                    status: 'failed',
                    errorMessage: err instanceof Error ? err.message : String(err),
                },
            }).catch(() => undefined);
        }
    }
    /** 查询分析结果 */
    async getAnalysis(taskId) {
        const task = await prisma_1.prisma.analysisTask.findUnique({ where: { taskId } });
        if (!task)
            return null;
        const status = task.status;
        const result = task.result ?? undefined;
        const resultObj = (task.result ?? {});
        return {
            taskId: task.taskId,
            marketId: task.marketId,
            status,
            result,
            confidence: typeof resultObj?.confidence === 'number' ? resultObj.confidence : undefined,
            ogStorageKey: task.ogStorageKey ?? undefined,
            errorMessage: task.errorMessage ?? undefined,
            createdAt: task.createdAt.toISOString(),
            completedAt: task.completedAt?.toISOString(),
            updatedAt: task.updatedAt.toISOString(),
        };
    }
    /** 获取市场的所有分析 */
    async getMarketAnalyses(marketId) {
        const tasks = await prisma_1.prisma.analysisTask.findMany({
            where: { marketId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return tasks.map((t) => {
            const result = t.result ?? undefined;
            const resultObj = (t.result ?? {});
            return {
                taskId: t.taskId,
                marketId: t.marketId,
                status: t.status,
                result,
                confidence: typeof resultObj?.confidence === 'number' ? resultObj.confidence : undefined,
                createdAt: t.createdAt.toISOString(),
                completedAt: t.completedAt?.toISOString(),
                updatedAt: t.updatedAt.toISOString(),
            };
        });
    }
}
exports.AiService = AiService;
exports.aiService = new AiService();
//# sourceMappingURL=ai-service.js.map