"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
function executeWithDeduplication(key, operation) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = inFlightRequests.get(key);
        if (existing) {
            return existing;
        }
        const promise = operation().finally(() => {
            inFlightRequests.delete(key);
        });
        inFlightRequests.set(key, promise);
        return promise;
    });
}
/**
 * Retry operation with backoff
 */
function retryOperation(operation_1) {
    return __awaiter(this, arguments, void 0, function* (operation, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return yield operation();
            }
            catch (error) {
                lastError = error;
                const delay = baseDelay * Math.pow(2, attempt);
                yield new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    });
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
function handleBackgroundRefresh(key, provider, compute, options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_START, { key });
            const value = yield compute();
            yield provider.set(key, value, options);
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_SUCCESS, { key });
        }
        catch (error) {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_ERROR, { key, error });
            throw error;
        }
    });
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
function batchOperations(items_1, operation_1) {
    return __awaiter(this, arguments, void 0, function* (items, operation, batchSize = 10) {
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            yield Promise.all(batch.map(operation));
        }
    });
}
/**
 * Safe delete operation
 */
function safeDelete(key, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield provider.delete(key);
        }
        catch (error) {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, {
                key,
                error,
                message: 'Failed to delete cache entry'
            });
            return false;
        }
    });
}
/**
 * Safe clear operation
 */
function safeClear(provider) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield provider.clear();
        }
        catch (error) {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, {
                error,
                message: 'Failed to clear cache'
            });
        }
    });
}
