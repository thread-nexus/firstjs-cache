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
const error_utils_1 = require("../utils/error-utils");
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
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_START, { key });
        const value = await compute();
        await provider.set(key, value, options);
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_SUCCESS, { key });
    }
    catch (error) {
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_ERROR, {
            key,
            error: error instanceof Error ? error : new Error(String(error))
        });
        throw error;
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
async function batchOperations(items, operation, options = {}) {
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
                throw (0, error_utils_1.createCacheError)(error_utils_1.CacheErrorCode.BATCH_ERROR, 'Batch operation failed', { operation: 'batch' });
            }
            errors.push(error);
        }
    }
    if (errors.length > 0) {
        throw (0, error_utils_1.createCacheError)(error_utils_1.CacheErrorCode.BATCH_ERROR, `${errors.length} operations failed`, { operation: 'batch', errorCount: errors.length });
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
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, {
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
async function safeClear(provider) {
    try {
        await provider.clear();
    }
    catch (error) {
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, {
            error: error instanceof Error ? error : new Error(String(error)),
            message: 'Failed to clear cache'
        });
    }
}
/**
 * Handle cache operation errors
 */
function handleError(operation, error, context) {
    if (error instanceof error_utils_1.CacheError) {
        throw error;
    }
    throw (0, error_utils_1.createCacheError)(error_utils_1.CacheErrorCode.OPERATION_ERROR, `Cache operation '${operation}' failed: ${error.message}`, context);
}
/**
 * Ensure a cache provider is available
 */
function ensureProvider(provider) {
    if (!provider) {
        throw (0, error_utils_1.createCacheError)(error_utils_1.CacheErrorCode.NO_PROVIDER, 'No cache provider available');
    }
    return provider;
}
//# sourceMappingURL=cache-operations.js.map