import { logger } from '../../utils/logger';

/**
 * 价格更新器
 * 定期更新市场价格并记录价格历史
 */
export class PriceUpdater {
  /** 更新所有活跃市场的价格 */
  async updatePrices(): Promise<void> {
    logger.debug('Updating market prices...');
    // TODO: 1. 从 DB 获取所有活跃市场的 token IDs
    // TODO: 2. 批量调用 CLOB API 获取最新价格
    // TODO: 3. 更新 DB 中的 current price
    // TODO: 4. 写入 price_history 表
  }

  /** 记录单个市场的价格快照 */
  async recordPriceSnapshot(_conditionId: string, _yesPrice: number, _noPrice: number): Promise<void> {
    // TODO: Insert into price_history table via Prisma
  }
}

export const priceUpdater = new PriceUpdater();
