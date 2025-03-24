"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWithDeduplication = executeWithDeduplication;
exports.retryOperation = retryOperation;
exports.shouldRefresh = shouldRefresh;
exports.handleBackgroundRefresh = handleBackgroundRefresh;
exports.generateCacheKey = generateCacheKey;
exports.batchOperations = batchOperations;
exports.safeDelete = safeDelete;
exports.safeClear = safeClear;
const cache_events_1 = require("../events/cache-events");
/**
 * Deduplication map for in-flight requests
 */
const inFlightRequests = new Map();
/**
 * Execute with deduplication
 */
async function executeWithDeduplication(key, operation) {
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
async function retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
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
function shouldRefresh(timestamp, ttl, refreshThreshold) {
    const age = Date.now() - timestamp.getTime();
    const threshold = ttl * refreshThreshold;
    return age > threshold;
}
/**
 * Background refresh handler
 */
async function handleBackgroundRefresh(key, provider, compute, options) {
    try {
        // Add required properties to event payload
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_START, {
            key,
            type: 'refresh:start', // Use string literal since enum may not have this value
            timestamp: Date.now()
        });
        // Compute new value
        const value = await compute();
        await provider.set(key, value, options);
        // Add required properties to event payload
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_SUCCESS, {
            key,
            type: 'refresh:success', // Use string literal since enum may not have this value
            timestamp: Date.now()
        });
    }
    catch (error) {
        // Add required properties to event payload
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_ERROR, {
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
function generateCacheKey(prefix, args) {
    const argsHash = JSON.stringify(args);
    return `${prefix}:${argsHash}`;
}
/**
 * Batch operations helper
 */
async function batchOperations(items, operation, batchSize = 10) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(operation));
    }
}
/**
 * Safe delete operation
 */
async function safeDelete(key, provider) {
    try {
        return await provider.delete(key);
    }
    catch (error) {
        // Add required properties to event payload
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, {
            key,
            error: error instanceof Error ? error : new Error(String(error)),
            message: 'Failed to delete cache entry',
            type: cache_events_1.CacheEventType.ERROR.toString(),
            timestamp: Date.now()
        });
        return false;
    }
}
/**
 * Safe clear operation
 */
async function safeClear(provider) {
    try {
        await provider.clear();
    }
    catch (error) {
        // Add required properties to event payload
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, {
            error: error instanceof Error ? error : new Error(String(error)),
            message: 'Failed to clear cache',
            type: cache_events_1.CacheEventType.ERROR.toString(),
            timestamp: Date.now()
        });
    }
}
//# sourceMappingURL=cache-operations.js.map