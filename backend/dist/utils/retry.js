"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
const logger_1 = require("./logger");
const axios_1 = __importDefault(require("axios"));
const DEFAULTS = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
};
async function withRetry(fn, label = 'operation', opts) {
    const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = { ...DEFAULTS, ...opts };
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < maxRetries) {
                let delay = Math.min(baseDelay * backoffMultiplier ** attempt, maxDelay);
                if (axios_1.default.isAxiosError(err)) {
                    const status = err.response?.status;
                    if (status === 429) {
                        const retryAfter = err.response?.headers?.['retry-after'];
                        const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
                        if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
                            delay = Math.min(retryAfterSeconds * 1000, maxDelay);
                        }
                        else {
                            delay = Math.min(10_000, maxDelay);
                        }
                    }
                }
                logger_1.logger.warn(`[${label}] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    }
    throw lastError;
}
//# sourceMappingURL=retry.js.map