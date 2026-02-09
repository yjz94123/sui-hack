import { ethers } from 'ethers';
import { gammaClient } from '../polymarket';
import { logger } from '../../utils/logger';
import { config } from '../../config';

/**
 * Oracle 服务
 * 监控 Polymarket 市场结算状态，调用 TradingHub.resolveMarket()
 */
export class OracleService {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;

  constructor() {
    if (config.og.rpcUrl && config.oracle.privateKey) {
      this.provider = new ethers.JsonRpcProvider(config.og.rpcUrl);
      this.wallet = new ethers.Wallet(config.oracle.privateKey, this.provider);
    }
  }

  /** 检查并结算已解决的市场 */
  async checkAndResolve(): Promise<void> {
    logger.info('Checking for resolved markets...');

    // TODO: 1. 从 DB 获取所有 active、在链上未结算的市场
    // TODO: 2. 对每个市场，查询 Polymarket 是否已 closed 且有 winner
    // TODO: 3. 如果有 winner，调用 TradingHub.resolveMarket(marketId, outcome)
    // TODO: 4. 更新 DB 状态
  }

  /** 将 Polymarket conditionId 映射到链上 marketId */
  mapToOnChainMarketId(conditionId: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(conditionId));
  }

  /** 查询市场是否已在 Polymarket 结算 */
  async isMarketResolved(conditionId: string): Promise<{ resolved: boolean; outcome?: string }> {
    try {
      const market = await gammaClient.getMarket(conditionId);
      if (market?.closed) {
        const prices = JSON.parse(market.outcomePrices || '[]');
        const outcomes = JSON.parse(market.outcomes || '[]');
        const winnerIdx = prices.findIndex((p: string) => parseFloat(p) === 1);
        return {
          resolved: true,
          outcome: winnerIdx >= 0 ? outcomes[winnerIdx] : undefined,
        };
      }
      return { resolved: false };
    } catch (err) {
      logger.error({ err, conditionId }, 'Failed to check market resolution');
      return { resolved: false };
    }
  }
}

export const oracleService = new OracleService();
