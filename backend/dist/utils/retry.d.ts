interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
}
export declare function withRetry<T>(fn: () => Promise<T>, label?: string, opts?: RetryOptions): Promise<T>;
export {};
//# sourceMappingURL=retry.d.ts.map