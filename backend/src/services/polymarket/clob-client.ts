import axios, { AxiosInstance } from 'axios';
import { withRetry } from '../../utils/retry';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import type { ClobOrderBook, ClobPriceResponse } from './types';

/**
 * Polymarket CLOB API 客户端
 * 负责获取订单簿、价格、交易数据
 * 注意速率限制: /book 接口 50次/10秒
 */
export class ClobClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.polymarket.clobBaseUrl,
      timeout: 10_000,
    });
  }

  /** 获取订单簿 */
  async getOrderBook(tokenId: string): Promise<ClobOrderBook> {
    return withRetry(async () => {
      const { data } = await this.client.get<ClobOrderBook>('/book', {
        params: { token_id: tokenId },
      });
      return data;
    }, 'ClobClient.getOrderBook');
  }

  /** 获取市场价格信息 */
  async getMarketPrice(tokenId: string): Promise<ClobPriceResponse> {
    return withRetry(async () => {
      const { data } = await this.client.get<ClobPriceResponse>('/price', {
        params: { token_id: tokenId, side: 'BUY' },
      });
      return data;
    }, 'ClobClient.getMarketPrice');
  }

  /** 获取市场中间价 */
  async getMidpoint(tokenId: string) {
    return withRetry(async () => {
      const { data } = await this.client.get('/midpoint', {
        params: { token_id: tokenId },
      });
      return data;
    }, 'ClobClient.getMidpoint');
  }

  /** 获取市场信息（CLOB侧） */
  async getMarket(conditionId: string) {
    return withRetry(async () => {
      const { data } = await this.client.get(`/markets/${conditionId}`);
      return data;
    }, 'ClobClient.getMarket');
  }

  /** 获取价格历史 */
  async getPricesHistory(tokenId: string, interval: '1h' | '1d' | '1w' | 'max' = '1d') {
    return withRetry(async () => {
      const { data } = await this.client.get('/prices-history', {
        params: { market: tokenId, interval },
      });
      return data;
    }, 'ClobClient.getPricesHistory');
  }

  /** 批量获取订单簿（每批不超过 20 个 token_id） */
  async getOrderBooks(tokenIds: string[]): Promise<Record<string, ClobOrderBook | null>> {
    const chunks: string[][] = [];
    for (let i = 0; i < tokenIds.length; i += 20) {
      chunks.push(tokenIds.slice(i, i + 20));
    }

    const out: Record<string, ClobOrderBook | null> = {};

    for (const chunk of chunks) {
      logger.debug({ count: chunk.length }, 'Fetching batch order books');
      const result = await withRetry(async () => {
        const { data } = await this.client.post<{ books: ClobOrderBook[] }>('/books', {
          token_ids: chunk,
        });
        return data;
      }, 'ClobClient.getOrderBooks');

      const books = (result as any)?.books as ClobOrderBook[] | undefined;
      if (Array.isArray(books)) {
        for (const book of books) {
          out[book.asset_id] = book;
        }
      }

      for (const tokenId of chunk) {
        if (!(tokenId in out)) out[tokenId] = null;
      }
    }

    return out;
  }

  /** 批量获取市场价格 */
  async getMarketsPrices(tokenIds: string[]) {
    logger.debug({ count: tokenIds.length }, 'Fetching batch market prices');
    const results = await Promise.allSettled(
      tokenIds.map((id) => this.getMarketPrice(id))
    );
    return results.map((r, i) => ({
      tokenId: tokenIds[i],
      price: r.status === 'fulfilled' ? r.value : null,
      error: r.status === 'rejected' ? r.reason?.message : undefined,
    }));
  }
}

export const clobClient = new ClobClient();
