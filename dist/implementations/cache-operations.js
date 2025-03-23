"use strict";
/**
 * @fileoverview Core cache operations with optimized implementations
 * for common caching patterns and batch operations.
 */
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
        this.maxBatchSize = default_config_1.CACHE_CONSTANTS.DEFAULT_BATCH_SIZE;
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
    processBatch() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            const currentBatch = new Map(this.batch);
            this.batch.clear();
            try {
                // Process batch operations
                const results = yield Promise.all(Array.from(currentBatch.entries()).map((_a) => __awaiter(this, [_a], void 0, function* ([key, { value }]) {
                    try {
                        return yield value;
                    }
                    catch (error) {
                        return { error, key };
                    }
                })));
                // Handle results
                results.forEach((result, index) => {
                    const key = Array.from(currentBatch.keys())[index];
                    const { resolve, reject } = currentBatch.get(key);
                    if (result === null || result === void 0 ? void 0 : result.error) {
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
        });
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
function setCacheValue(provider, key, value, options) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, validation_utils_1.validateCacheKey)(key);
        (0, validation_utils_1.validateCacheOptions)(options);
        const startTime = performance.now();
        try {
            // Compress if needed
            const { value: processedValue, compressed } = yield (0, compression_utils_1.compressIfNeeded)(JSON.stringify(value), options);
            // Add to batch if supported
            if (provider.setMany) {
                yield batchHandler.add(key, {
                    value: processedValue,
                    compressed,
                    options
                });
            }
            else {
                yield provider.set(key, processedValue, Object.assign(Object.assign({}, options), { compressed }));
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
    });
}
/**
 * Get cache value with optimizations
 *
 * @param provider - Cache provider
 * @param key - Cache key
 */
function getCacheValue(provider, key) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, validation_utils_1.validateCacheKey)(key);
        const startTime = performance.now();
        try {
            // Check for in-flight operations
            const inFlight = inFlightOps.get(key);
            if (inFlight) {
                return inFlight;
            }
            // Create promise for this operation
            const promise = (() => __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    const value = yield provider.get(key);
                    if (value === null) {
                        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.GET_MISS, { key });
                        return null;
                    }
                    // Decompress if needed
                    const metadata = yield ((_a = provider.getMetadata) === null || _a === void 0 ? void 0 : _a.call(provider, key));
                    const decompressed = (metadata === null || metadata === void 0 ? void 0 : metadata.compressed)
                        ? yield (0, compression_utils_1.decompressIfNeeded)(value, true)
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
            }))();
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
    });
}
/**
 * Delete cache value with optimizations
 *
 * @param provider - Cache provider
 * @param key - Cache key
 */
function deleteCacheValue(provider, key) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, validation_utils_1.validateCacheKey)(key);
        try {
            const deleted = yield provider.delete(key);
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
    });
}
/**
 * Clear all cache values
 *
 * @param provider - Cache provider
 */
function clearCache(provider) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield provider.clear();
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.CLEAR, {});
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'clear',
                provider: provider.constructor.name
            });
            throw error;
        }
    });
}
/**
 * Get multiple cache values efficiently
 *
 * @param provider - Cache provider
 * @param keys - Array of cache keys
 */
function getManyValues(provider, keys) {
    return __awaiter(this, void 0, void 0, function* () {
        const startTime = performance.now();
        try {
            if (provider.getMany) {
                // Use native batch get if available
                const results = yield provider.getMany(keys);
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
                yield Promise.all(keys.map((key) => __awaiter(this, void 0, void 0, function* () {
                    results[key] = yield getCacheValue(provider, key);
                })));
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
    });
}
/**
 * Set multiple cache values efficiently
 *
 * @param provider - Cache provider
 * @param entries - Record of key-value pairs
 * @param options - Cache options
 */
function setManyValues(provider, entries, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const startTime = performance.now();
        try {
            if (provider.setMany) {
                // Use native batch set if available
                yield provider.setMany(entries, options);
            }
            else {
                // Fall back to individual sets
                yield Promise.all(Object.entries(entries).map(([key, value]) => setCacheValue(provider, key, value, options)));
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
    });
}
