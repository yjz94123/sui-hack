import { logger } from './logger';
import axios from 'axios';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULTS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  label = 'operation',
  opts?: RetryOptions,
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = { ...DEFAULTS, ...opts };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        let delay = Math.min(baseDelay * backoffMultiplier ** attempt, maxDelay);

        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 429) {
            const retryAfter = err.response?.headers?.['retry-after'];
            const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
            if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
              delay = Math.min(retryAfterSeconds * 1000, maxDelay);
            } else {
              delay = Math.min(10_000, maxDelay);
            }
          }
        }

        logger.warn(`[${label}] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}
