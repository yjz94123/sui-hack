import { logger } from '../../utils/logger';
import { config } from '../../config';

/**
 * 0G Compute Network 客户端
 * 使用 OpenAI 兼容的 Chat Completions 接口
 */
export class OgComputeClient {
  private initialized = false;

  async init(): Promise<void> {
    // 目前通过 OpenAI 兼容 HTTP 接口直连；保留 init 以便未来接入 Broker SDK。
    this.initialized = true;
    logger.info('0G Compute client initialized');
  }

  private getChatCompletionsUrl(): string {
    const base = config.og.compute.baseUrl.replace(/\/+$/, '');
    return `${base}/chat/completions`;
  }

  private assertConfigured(): void {
    if (!config.og.compute.apiKey) {
      throw new Error('Missing OG_COMPUTE_API_KEY');
    }
  }

  /** 获取 AI 聊天完成 */
  async chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.initialized) await this.init();
    this.assertConfigured();

    const url = this.getChatCompletionsUrl();
    logger.debug({ messageCount: messages.length, url }, 'Calling 0G Compute for AI completion');

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.og.compute.apiKey}`,
      },
      body: JSON.stringify({
        model: config.og.compute.model,
        messages,
        temperature: 0.2,
        max_tokens: config.og.compute.maxTokens,
        stream: false,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`0G Compute error ${resp.status}: ${text || resp.statusText}`);
    }

    const data = (await resp.json().catch(() => null)) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('0G Compute response missing choices[0].message.content');
    }
    return content;
  }

  /** 流式获取 AI 输出（回调增量内容，返回完整文本） */
  async streamChatCompletion(
    messages: Array<{ role: string; content: string }>,
    options: { signal?: AbortSignal; onDelta: (chunk: string) => void }
  ): Promise<string> {
    if (!this.initialized) await this.init();
    this.assertConfigured();

    const url = this.getChatCompletionsUrl();
    logger.debug({ messageCount: messages.length, url }, 'Calling 0G Compute for streaming completion');

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${config.og.compute.apiKey}`,
      },
      body: JSON.stringify({
        model: config.og.compute.model,
        messages,
        temperature: 0.2,
        max_tokens: config.og.compute.maxTokens,
        stream: true,
      }),
      signal: options.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`0G Compute error ${resp.status}: ${text || resp.statusText}`);
    }

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await resp.json().catch(() => null)) as any;
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('0G Compute response missing choices[0].message.content');
      }
      options.onDelta(content);
      return content;
    }

    if (!resp.body) throw new Error('0G Compute response has no body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nlIndex: number;
      while ((nlIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nlIndex).trimEnd();
        buffer = buffer.slice(nlIndex + 1);

        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        if (payload === '[DONE]') {
          return full;
        }

        try {
          const parsed = JSON.parse(payload) as any;
          const delta = parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content;
          if (typeof delta === 'string' && delta.length > 0) {
            full += delta;
            options.onDelta(delta);
          }
        } catch {
          // ignore malformed SSE chunks
        }
      }
    }

    if (buffer.trim()) {
      // best-effort parse the last partial line (if any)
      const line = buffer.trim();
      if (line.startsWith('data:')) {
        const payload = line.slice(5).trim();
        if (payload && payload !== '[DONE]') {
          try {
            const parsed = JSON.parse(payload) as any;
            const delta = parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content;
            if (typeof delta === 'string' && delta.length > 0) {
              full += delta;
              options.onDelta(delta);
            }
          } catch {
            // ignore
          }
        }
      }
    }

    return full;
  }

  /** 获取 0G Compute 可用服务列表 */
  async listServices(): Promise<unknown[]> {
    // TODO: const broker = await createBroker(wallet);
    // TODO: return broker.inference.listService();
    return [];
  }
}

export const ogComputeClient = new OgComputeClient();
