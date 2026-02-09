import { randomUUID } from 'crypto';
import { ogComputeClient } from './og-compute';
import { buildBasPrompt, extractLastJsonCodeBlock } from './bas-prompt';
import { ogKvClient } from '../storage';
import { logger } from '../../utils/logger';
import { prisma } from '../../db/prisma';
import { Prisma } from '@prisma/client';
import type { AnalysisTask, AnalysisStatus } from '@og-predict/shared';

export interface AnalysisRequest {
  marketId: string;
  event: string;
  resolutionDate?: string;
  resolutionCriteria?: string;
}

/**
 * AI 分析服务
 * 管理分析任务的创建、执行和结果存储
 */
export class AiService {
  /** 创建分析任务 */
  async createAnalysis(request: AnalysisRequest): Promise<AnalysisTask> {
    const taskId = randomUUID();

    await prisma.analysisTask.create({
      data: {
        taskId,
        marketId: request.marketId,
        status: 'pending',
      },
    });

    // 异步执行分析
    this.executeAnalysis(taskId, request).catch((err) => {
      logger.error({ err, taskId }, 'Analysis execution failed');
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
  private async executeAnalysis(taskId: string, request: AnalysisRequest): Promise<void> {
    try {
      await prisma.analysisTask.update({
        where: { taskId },
        data: { status: 'processing' },
      });

      const today = new Date().toISOString().slice(0, 10);
      const prompt = buildBasPrompt({
        event: request.event,
        today,
        resolutionDate: request.resolutionDate,
        resolutionCriteria: request.resolutionCriteria,
      });

      const responseText = await ogComputeClient.chatCompletion([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ]);

      const extracted = extractLastJsonCodeBlock(responseText);
      const result: unknown = extracted?.value ?? { rawOutput: responseText };

      const ogStorageKey = `analysis:${request.marketId}:${taskId}`;

      await prisma.analysisTask.update({
        where: { taskId },
        data: {
          status: 'completed',
          result: result as any,
          ogStorageKey,
          completedAt: new Date(),
        },
      });

      // 持久化到 0G KV Storage
      await ogKvClient.putAnalysis(request.marketId, taskId, {
        taskId,
        marketId: request.marketId,
        result,
        completedAt: new Date().toISOString(),
      });

      logger.info({ taskId, marketId: request.marketId }, 'Analysis completed');
    } catch (err) {
      logger.error({ err, taskId }, 'Analysis failed');
      await prisma.analysisTask.update({
        where: { taskId },
        data: {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      }).catch(() => undefined);
    }
  }

  /** 查询分析结果 */
  async getAnalysis(taskId: string): Promise<AnalysisTask | null> {
    const task = await prisma.analysisTask.findUnique({ where: { taskId } });
    if (!task) return null;

    const status = task.status as AnalysisStatus;
    const result = task.result ?? undefined;
    const resultObj = (task.result ?? {}) as any;

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
  async getMarketAnalyses(marketId: string): Promise<AnalysisTask[]> {
    const tasks = await prisma.analysisTask.findMany({
      where: { marketId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return tasks.map((t: any) => {
      const result = t.result ?? undefined;
      const resultObj = (t.result ?? {}) as any;
      return {
        taskId: t.taskId,
        marketId: t.marketId,
        status: t.status as AnalysisStatus,
        result,
        confidence: typeof resultObj?.confidence === 'number' ? resultObj.confidence : undefined,
        createdAt: t.createdAt.toISOString(),
        completedAt: t.completedAt?.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    });
  }
}

export const aiService = new AiService();
