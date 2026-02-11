import { logger } from '../../utils/logger';
import { config } from '../../config';

/**
 * OpenAI 兼容 AI 客户端
 * 可通过环境变量接入不同服务商（如 Moonshot Kimi）
 */
export class OgComputeClient {
  private initialized = false;

  async init(): Promise<void> {
    // 目前通过 OpenAI 兼容 HTTP 接口直连；保留 init 以便未来接入 Broker SDK。
    this.initialized = true;
    logger.info('AI client initialized');
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

  private buildChatCompletionBody(messages: Array<{ role: string; content: string }>, stream: boolean): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      model: config.og.compute.model,
      messages,
      temperature: config.og.compute.temperature,
      max_tokens: config.og.compute.maxTokens,
      stream,
    };

    const thinkingType = config.og.compute.thinkingType.trim();
    if (thinkingType) {
      payload.thinking = { type: thinkingType };
    }

    const reasoningEffort = config.og.compute.reasoningEffort.trim();
    if (reasoningEffort) {
      payload.reasoning_effort = reasoningEffort;
    }

    return payload;
  }

  /** 获取 AI 聊天完成 */
  async chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.initialized) await this.init();
    this.assertConfigured();

    const url = this.getChatCompletionsUrl();
    logger.debug({ messageCount: messages.length, url }, 'Calling AI completion endpoint');

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.og.compute.apiKey}`,
      },
      body: JSON.stringify(this.buildChatCompletionBody(messages, false)),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`AI provider error ${resp.status}: ${text || resp.statusText}`);
    }

    const data = (await resp.json().catch(() => null)) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('AI response missing choices[0].message.content');
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
    logger.debug({ messageCount: messages.length, url }, 'Calling streaming AI completion endpoint');

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${config.og.compute.apiKey}`,
      },
      body: JSON.stringify(this.buildChatCompletionBody(messages, true)),
      signal: options.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`AI provider error ${resp.status}: ${text || resp.statusText}`);
    }

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await resp.json().catch(() => null)) as any;
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('AI response missing choices[0].message.content');
      }
      options.onDelta(content);
      return content;
    }

    if (!resp.body) throw new Error('AI streaming response has no body');

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

  /** 获取可用服务列表 */
  async listServices(): Promise<unknown[]> {
    // TODO: const broker = await createBroker(wallet);
    // TODO: return broker.inference.listService();
    return [];
  }
}

export const ogComputeClient = new OgComputeClient();
