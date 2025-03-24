import { emitCacheEvent, CacheEventType } from '../events/cache-events';
import { CacheError, CacheErrorCode, createCacheError } from '../utils/error-utils';
/**
 * Deduplication map for in-flight requests
 */
const inFlightRequests = new Map();
/**
 * Execute with deduplication
 */
export async function executeWithDeduplication(key, operation) {
    const existing = inFlightRequests.get(key);
    if (existing) {
        return existing;
    }
    const promise = operation().finally(() => {
        inFlightRequests.delete(key);
    });
    inFlightRequests.set(key, promise);
    return promise;
}
/**
 * Retry operation with backoff
 */
export async function retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
/**
 * Check if value should be refreshed
 */
export function shouldRefresh(timestamp, ttl, refreshThreshold) {
    const age = Date.now() - timestamp.getTime();
    const threshold = ttl * refreshThreshold;
    return age > threshold;
}
/**
 * Background refresh handler
 */
export async function handleBackgroundRefresh(key, provider, compute, options) {
    try {
        emitCacheEvent(CacheEventType.REFRESH_START, { key });
        const value = await compute();
        await provider.set(key, value, options);
        emitCacheEvent(CacheEventType.REFRESH_SUCCESS, { key });
    }
    catch (error) {
        emitCacheEvent(CacheEventType.REFRESH_ERROR, {
            key,
            error: error instanceof Error ? error : new Error(String(error))
        });
        throw error;
    }
}
/**
 * Generate cache key from function arguments
 */
export function generateCacheKey(prefix, args) {
    const argsHash = JSON.stringify(args);
    return `${prefix}:${argsHash}`;
}
/**
 * Batch operations helper
 */
export async function batchOperations(items, operation, options = {}) {
    const { batchSize = 10, stopOnError = false, maxConcurrent = 3 } = options;
    const errors = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        try {
            await Promise.all(batch.map(item => operation(item))
                .slice(0, maxConcurrent));
        }
        catch (error) {
            if (stopOnError) {
                throw createCacheError(CacheErrorCode.BATCH_ERROR, 'Batch operation failed', { operation: 'batch' });
            }
            errors.push(error);
        }
    }
    if (errors.length > 0) {
        throw createCacheError(CacheErrorCode.BATCH_ERROR, `${errors.length} operations failed`, { operation: 'batch', errorCount: errors.length });
    }
}
/**
 * Safe delete operation
 */
export async function safeDelete(key, provider) {
    try {
        return await provider.delete(key);
    }
    catch (error) {
        emitCacheEvent(CacheEventType.ERROR, {
            key,
            error: error instanceof Error ? error : new Error(String(error)),
            message: 'Failed to delete cache entry'
        });
        return false;
    }
}
/**
 * Safe clear operation
 */
export async function safeClear(provider) {
    try {
        await provider.clear();
    }
    catch (error) {
        emitCacheEvent(CacheEventType.ERROR, {
            error: error instanceof Error ? error : new Error(String(error)),
            message: 'Failed to clear cache'
        });
    }
}
/**
 * Handle cache operation errors
 */
function handleError(operation, error, context) {
    if (error instanceof CacheError) {
        throw error;
    }
    throw createCacheError(CacheErrorCode.OPERATION_ERROR, `Cache operation '${operation}' failed: ${error.message}`, context);
}
/**
 * Ensure a cache provider is available
 */
function ensureProvider(provider) {
    if (!provider) {
        throw createCacheError(CacheErrorCode.NO_PROVIDER, 'No cache provider available');
    }
    return provider;
}
//# sourceMappingURL=cache-operations.js.map