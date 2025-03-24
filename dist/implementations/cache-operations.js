"use strict";
/**
 * @fileoverview Core cache operations with optimized implementations
 * for common caching patterns and batch operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchOperationHandler = void 0;
exports.setCacheValue = setCacheValue;
exports.getCacheValue = getCacheValue;
exports.deleteCacheValue = deleteCacheValue;
exports.clearCache = clearCache;
exports.getManyValues = getManyValues;
exports.setManyValues = setManyValues;
const cache_events_1 = require("../events/cache-events");
const compression_utils_1 = require("../utils/compression-utils");
const validation_utils_1 = require("../utils/validation-utils");
const error_utils_1 = require("../utils/error-utils");
const default_config_1 = require("../config/default-config");
/**
 * Map to track in-flight operations for deduplication
 */
const inFlightOps = new Map();
/**
 * Optimized batch operation handler
 */
class BatchOperationHandler {
    constructor() {
        this.batch = new Map();
        this.timer = null;
        this.maxBatchSize = default_config_1.CACHE_CONSTANTS.MAX_BATCH_SIZE;
        this.maxWaitTime = 50; // ms
    }
    /**
     * Add operation to batch
     */
    add(key, value) {
        return new Promise((resolve, reject) => {
            this.batch.set(key, { value, resolve, reject });
            this.scheduleBatchProcess();
        });
    }
    /**
     * Schedule batch processing
     */
    scheduleBatchProcess() {
        if (this.timer)
            return;
        if (this.batch.size >= this.maxBatchSize) {
            this.processBatch().then(r => { });
        }
        else {
            this.timer = setTimeout(() => this.processBatch(), this.maxWaitTime);
        }
    }
    /**
     * Process current batch
     */
    async processBatch() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        const currentBatch = new Map(this.batch);
        this.batch.clear();
        try {
            // Process batch operations
            const results = await Promise.all(Array.from(currentBatch.entries()).map(async ([key, { value }]) => {
                try {
                    return await value;
                }
                catch (error) {
                    return { error, key };
                }
            }));
            // Handle results
            results.forEach((result, index) => {
                const key = Array.from(currentBatch.keys())[index];
                const { resolve, reject } = currentBatch.get(key);
                if (result?.error) {
                    reject(result.error);
                }
                else {
                    resolve(result);
                }
            });
        }
        catch (error) {
            // Handle batch-level errors
            for (const { reject } of currentBatch.values()) {
                reject(error);
            }
        }
    }
}
exports.BatchOperationHandler = BatchOperationHandler;
// Create singleton batch handler
const batchHandler = new BatchOperationHandler();
/**
 * Set cache value with optimizations
 *
 * @param provider - Cache provider
 * @param key - Cache key
 * @param value - Value to cache
 * @param options - Cache options
 */
async function setCacheValue(provider, key, value, options) {
    (0, validation_utils_1.validateCacheKey)(key);
    (0, validation_utils_1.validateCacheOptions)(options);
    const startTime = performance.now();
    try {
        // Compress if needed
        const { data: processedValue, compressed } = await (0, compression_utils_1.compressIfNeeded)(JSON.stringify(value), {
            threshold: options?.compressionThreshold,
            algorithm: options?.compression ? 'gzip' : undefined,
            enabled: options?.compression
        });
        // Add to batch if supported
        if (provider.setMany) {
            await batchHandler.add(key, {
                value: processedValue,
                compressed,
                options
            });
        }
        else {
            await provider.set(key, processedValue, {
                ...options,
                compressed
            });
        }
        const duration = performance.now() - startTime;
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
            key,
            duration,
            compressed,
            size: processedValue.length
        });
    }
    catch (error) {
        (0, error_utils_1.handleCacheError)(error, {
            operation: 'set',
            key,
            provider: provider.constructor.name
        });
        throw error;
    }
}
/**
 * Get cache value with optimizations
 *
 * @param provider - Cache provider
 * @param key - Cache key
 */
async function getCacheValue(provider, key) {
    (0, validation_utils_1.validateCacheKey)(key);
    const startTime = performance.now();
    try {
        // Check for in-flight operations
        const inFlight = inFlightOps.get(key);
        if (inFlight) {
            return inFlight;
        }
        // Create promise for this operation
        const promise = (async () => {
            try {
                const value = await provider.get(key);
                if (value === null) {
                    (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.GET_MISS, { key });
                    return null;
                }
                // Decompress if needed
                const metadata = await provider.getMetadata?.(key);
                const decompressed = metadata?.compressed
                    ? await (0, compression_utils_1.decompressIfNeeded)(value, metadata.algorithm || 'gzip')
                    : value;
                const duration = performance.now() - startTime;
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.GET_HIT, {
                    key,
                    duration,
                    size: decompressed.length
                });
                return JSON.parse(decompressed);
            }
            finally {
                inFlightOps.delete(key);
            }
        })();
        inFlightOps.set(key, promise);
        return promise;
    }
    catch (error) {
        (0, error_utils_1.handleCacheError)(error, {
            operation: 'get',
            key,
            provider: provider.constructor.name
        });
        return null;
    }
}
/**
 * Delete cache value with optimizations
 *
 * @param provider - Cache provider
 * @param key - Cache key
 */
async function deleteCacheValue(provider, key) {
    (0, validation_utils_1.validateCacheKey)(key);
    try {
        const deleted = await provider.delete(key);
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.DELETE, {
            key,
            success: deleted
        });
        return deleted;
    }
    catch (error) {
        (0, error_utils_1.handleCacheError)(error, {
            operation: 'delete',
            key,
            provider: provider.constructor.name
        });
        return false;
    }
}
/**
 * Clear all cache values
 *
 * @param provider - Cache provider
 */
async function clearCache(provider) {
    try {
        await provider.clear();
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.CLEAR, {});
    }
    catch (error) {
        (0, error_utils_1.handleCacheError)(error, {
            operation: 'clear',
            provider: provider.constructor.name
        });
        throw error;
    }
}
/**
 * Get multiple cache values efficiently
 *
 * @param provider - Cache provider
 * @param keys - Array of cache keys
 */
async function getManyValues(provider, keys) {
    const startTime = performance.now();
    try {
        if (provider.getMany) {
            // Use native batch get if available
            const results = await provider.getMany(keys);
            const duration = performance.now() - startTime;
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.GET, {
                keys,
                duration,
                batchSize: keys.length
            });
            return results;
        }
        else {
            // Fall back to individual gets
            const results = {};
            await Promise.all(keys.map(async (key) => {
                results[key] = await getCacheValue(provider, key);
            }));
            return results;
        }
    }
    catch (error) {
        (0, error_utils_1.handleCacheError)(error, {
            operation: 'getMany',
            keys,
            provider: provider.constructor.name
        });
        return {};
    }
}
/**
 * Set multiple cache values efficiently
 *
 * @param provider - Cache provider
 * @param entries - Record of key-value pairs
 * @param options - Cache options
 */
async function setManyValues(provider, entries, options) {
    const startTime = performance.now();
    try {
        if (provider.setMany) {
            // Use native batch set if available
            await provider.setMany(entries, options);
        }
        else {
            // Fall back to individual sets
            await Promise.all(Object.entries(entries).map(([key, value]) => setCacheValue(provider, key, value, options)));
        }
        const duration = performance.now() - startTime;
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
            duration,
            batchSize: Object.keys(entries).length
        });
    }
    catch (error) {
        (0, error_utils_1.handleCacheError)(error, {
            operation: 'setMany',
            provider: provider.constructor.name
        });
        throw error;
    }
}
//# sourceMappingURL=cache-operations.js.map