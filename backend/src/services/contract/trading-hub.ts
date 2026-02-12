import { logger } from '../../utils/logger';

/**
 * TradingHub 合约交互客户端
 *
 * NOTE: 合约已迁移到 Sui (Move) 链。旧的 EVM (ethers.js) 实现已移除。
 * 前端通过 Sui dApp Kit 直接签名调用合约（public_place_order）。
 * 后端不再需要代理签名。
 *
 * 以下方法保留接口定义以避免路由编译错误，
 * 但调用时会返回 SUI_MIGRATION 错误提示。
 */

const SUI_MIGRATION_MSG =
  'Contract has been migrated to Sui. Use the frontend Sui SDK to interact with the TradingHub directly.';

function notImplemented(method: string): never {
  logger.warn({ method }, SUI_MIGRATION_MSG);
  throw new Error(`[${method}] ${SUI_MIGRATION_MSG}`);
}

export class TradingHubClient {
  // Read methods (stub)
  async getUserBalance(_userAddress: string): Promise<bigint> {
    return notImplemented('getUserBalance');
  }

  async getPosition(_positionId: number): Promise<{
    id: bigint;
    user: string;
    marketId: string;
    outcome: number;
    tokenAmount: bigint;
    costUsdc: bigint;
    priceAtOpen: bigint;
    openedAt: bigint;
    isOpen: boolean;
  }> {
    return notImplemented('getPosition');
  }

  async getUserPositionIds(_userAddress: string): Promise<bigint[]> {
    return notImplemented('getUserPositionIds');
  }

  async getUserOpenPositions(_userAddress: string): Promise<unknown[]> {
    return notImplemented('getUserOpenPositions');
  }

  async getMarketStatus(_marketId: string): Promise<{ status: number; winner: number; resolvedAt: bigint }> {
    return notImplemented('getMarketStatus');
  }

  // Write methods (stub)
  async openPosition(
    _user: string,
    _marketId: string,
    _outcome: number,
    _usdcAmount: bigint,
    _tokenAmount: bigint,
    _price: number,
  ): Promise<{ receipt: unknown; positionId: bigint | null }> {
    return notImplemented('openPosition');
  }

  async closePosition(
    _positionId: number,
    _returnUsdc: bigint,
    _priceAtClose: number,
  ): Promise<unknown> {
    return notImplemented('closePosition');
  }

  async resolveMarket(_marketId: string, _outcome: number): Promise<string> {
    return notImplemented('resolveMarket');
  }
}

export const tradingHubClient = new TradingHubClient();
