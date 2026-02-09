import axios, { AxiosInstance } from 'axios';
import { withRetry } from '../../utils/retry';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import type { GammaEvent, GammaMarket } from './types';

/**
 * Polymarket Gamma API 客户端
 * 负责获取 events 和 markets 元数据
 */
export class GammaClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.polymarket.gammaBaseUrl,
      timeout: 10_000,
    });
  }

  /** 获取活跃事件列表 */
  async getEvents(params: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    tag?: string;
    order?: string;
    ascending?: boolean;
  }): Promise<GammaEvent[]> {
    return withRetry(async () => {
      const { data } = await this.client.get<GammaEvent[]>('/events', { params });
      return data;
    }, 'GammaClient.getEvents');
  }

  /** 获取单个事件详情 */
  async getEvent(eventId: string): Promise<GammaEvent> {
    return withRetry(async () => {
      const { data } = await this.client.get<GammaEvent>(`/events/${eventId}`);
      return data;
    }, 'GammaClient.getEvent');
  }

  /** 获取市场列表 */
  async getMarkets(params: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    tag?: string;
  }): Promise<GammaMarket[]> {
    return withRetry(async () => {
      const { data } = await this.client.get<GammaMarket[]>('/markets', { params });
      return data;
    }, 'GammaClient.getMarkets');
  }

  /** 获取单个市场详情 */
  async getMarket(conditionId: string): Promise<GammaMarket> {
    return withRetry(async () => {
      const { data } = await this.client.get<GammaMarket>(`/markets/${conditionId}`);
      return data;
    }, 'GammaClient.getMarket');
  }

  /** 按标签获取事件 */
  async getEventsByTag(tag: string, limit = 20) {
    logger.debug({ tag, limit }, 'Fetching events by tag');
    return this.getEvents({ tag, limit, active: true });
  }
}

export const gammaClient = new GammaClient();
