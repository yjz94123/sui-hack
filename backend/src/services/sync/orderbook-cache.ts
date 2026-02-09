import { clobClient } from '../polymarket';
import { logger } from '../../utils/logger';

interface CachedOrderBook {
  data: unknown;
  updatedAt: number;
}

/**
 * 订单簿内存缓存
 * 热门市场 TTL: 30s, 冷门市场 TTL: 120s
 */
export class OrderBookCache {
  private cache = new Map<string, CachedOrderBook>();
  private hotMarkets = new Set<string>();

  private readonly HOT_TTL = 30_000; // 30s
  private readonly COLD_TTL = 120_000; // 120s

  /** 标记热门市场（前端正在查看的） */
  markHot(tokenId: string): void {
    this.hotMarkets.add(tokenId);
  }

  /** 取消热门标记 */
  markCold(tokenId: string): void {
    this.hotMarkets.delete(tokenId);
  }

  /** 获取订单簿（带缓存） */
  async getOrderBook(tokenId: string): Promise<unknown> {
    const cached = this.cache.get(tokenId);
    const ttl = this.hotMarkets.has(tokenId) ? this.HOT_TTL : this.COLD_TTL;

    if (cached && Date.now() - cached.updatedAt < ttl) {
      return cached.data;
    }

    try {
      const data = await clobClient.getOrderBook(tokenId);
      this.cache.set(tokenId, { data, updatedAt: Date.now() });
      return data;
    } catch (err) {
      logger.error({ err, tokenId }, 'Failed to fetch order book');
      // 返回过期缓存（如果有）
      if (cached) return cached.data;
      throw err;
    }
  }

  /** 刷新所有热门市场的订单簿 */
  async refreshHotMarkets(): Promise<void> {
    const tokenIds = Array.from(this.hotMarkets);
    logger.debug({ count: tokenIds.length }, 'Refreshing hot market order books');

    await Promise.allSettled(
      tokenIds.map((id) => this.getOrderBook(id))
    );
  }

  /** 清理过期缓存 */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now - value.updatedAt > this.COLD_TTL * 2) {
        this.cache.delete(key);
      }
    }
  }
}

export const orderBookCache = new OrderBookCache();
