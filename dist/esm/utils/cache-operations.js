import { emitCacheEvent, CacheEventType } from '../events/cache-events';
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
            // Convert unknown error to Error type
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            // Update error fields
            lastError = normalizedError;
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
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.REFRESH_START, {
            key,
            type: 'refresh:start', // Use string literal since enum may not have this value
            timestamp: Date.now()
        });
        // Compute new value
        const value = await compute();
        await provider.set(key, value, options);
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.REFRESH_SUCCESS, {
            key,
            type: 'refresh:success', // Use string literal since enum may not have this value
            timestamp: Date.now()
        });
    }
    catch (error) {
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.REFRESH_ERROR, {
            key,
            error: error instanceof Error ? error : new Error(String(error)),
            type: 'refresh:error', // Use string literal since enum may not have this value
            timestamp: Date.now()
        });
        // Log error but don't throw since this is background
        console.error(`Background refresh failed for key ${key}:`, error);
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
export async function batchOperations(items, operation, batchSize = 10) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(operation));
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
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.ERROR, {
            key,
            error: error instanceof Error ? error : new Error(String(error)),
            message: 'Failed to delete cache entry',
            type: CacheEventType.ERROR.toString(),
            timestamp: Date.now()
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
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.ERROR, {
            error: error instanceof Error ? error : new Error(String(error)),
            message: 'Failed to clear cache',
            type: CacheEventType.ERROR.toString(),
            timestamp: Date.now()
        });
    }
}
//# sourceMappingURL=cache-operations.js.map