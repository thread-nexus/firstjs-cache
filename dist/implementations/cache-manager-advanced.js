"use strict";
/**
 * @fileoverview Advanced cache manager implementation combining multiple features
 * including multi-layer caching, background refresh, and monitoring.
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
exports.CacheManagerAdvanced = void 0;
const cache_providers_1 = require("./cache-providers");
const cache_compute_1 = require("./cache-compute");
const cache_events_1 = require("../events/cache-events");
const validation_utils_1 = require("../utils/validation-utils");
const error_utils_1 = require("../utils/error-utils");
class CacheManagerAdvanced {
    constructor(options = {}) {
        var _a, _b, _c;
        this.options = options;
        this.statsInterval = null;
        this.providerManager = new cache_providers_1.CacheProviderManager();
        // Initialize providers
        (_a = options.providers) === null || _a === void 0 ? void 0 : _a.forEach(({ name, instance, priority }) => {
            this.providerManager.registerProvider(name, instance, priority);
        });
        // Initialize compute manager
        this.compute = new cache_compute_1.CacheCompute(this.providerManager.getProvider('primary') || ((_c = (_b = options.providers) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.instance), {
            defaultTtl: options.defaultTtl,
            backgroundRefresh: options.backgroundRefresh,
            refreshThreshold: options.refreshThreshold,
            maxRetries: options.maxRetries,
            retryDelay: options.retryDelay
        });
        // Start stats collection if enabled
        if (options.statsInterval) {
            this.startStatsCollection(options.statsInterval);
        }
    }
    /**
     * Get a value from cache with advanced features
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, validation_utils_1.validateCacheKey)(key);
            try {
                const value = yield this.providerManager.get(key);
                (0, cache_events_1.emitCacheEvent)(value !== null ? cache_events_1.CacheEventType.GET_HIT : cache_events_1.CacheEventType.GET_MISS, { key });
                return value;
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'get',
                    key
                });
                return null;
            }
        });
    }
    /**
     * Set a value in cache with advanced features
     */
    set(key, value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, validation_utils_1.validateCacheKey)(key);
            (0, validation_utils_1.validateCacheOptions)(options);
            try {
                yield this.providerManager.set(key, value, options);
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                    key,
                    size: JSON.stringify(value).length
                });
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'set',
                    key
                });
                throw error;
            }
        });
    }
    /**
     * Get or compute a value with advanced features
     */
    getOrCompute(key, compute, options) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, validation_utils_1.validateCacheKey)(key);
            (0, validation_utils_1.validateCacheOptions)(options);
            try {
                const result = yield this.compute.getOrCompute(key, compute, options);
                if (result.stale) {
                    (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.GET_STALE, {
                        key,
                        computeTime: result.computeTime
                    });
                }
                return result.value;
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'getOrCompute',
                    key
                });
                throw error;
            }
        });
    }
    /**
     * Delete a value from cache
     */
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, validation_utils_1.validateCacheKey)(key);
            try {
                const deleted = yield this.providerManager.delete(key);
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.DELETE, {
                    key,
                    success: deleted
                });
                return deleted;
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'delete',
                    key
                });
                return false;
            }
        });
    }
    /**
     * Clear all cache data
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.providerManager.clear();
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.CLEAR, {});
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'clear'
                });
                throw error;
            }
        });
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield this.providerManager.getStats();
                const computeStatus = this.compute.getComputeStatus();
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.STATS_UPDATE, {
                    stats,
                    computeStatus
                });
                return stats;
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'getStats'
                });
                throw error;
            }
        });
    }
    /**
     * Start periodic stats collection
     */
    startStatsCollection(interval) {
        this.statsInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield this.getStats();
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.STATS_UPDATE, { stats });
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'statsCollection'
                });
            }
        }), interval);
    }
    /**
     * Stop stats collection
     */
    stopStatsCollection() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }
    /**
     * Get provider health status
     */
    getProviderHealth() {
        return this.providerManager.getProviderHealth();
    }
    /**
     * Reset provider error counts
     */
    resetProviderErrors() {
        this.providerManager.resetErrorCounts();
    }
    /**
     * Clean up resources
     */
    dispose() {
        this.stopStatsCollection();
    }
}
exports.CacheManagerAdvanced = CacheManagerAdvanced;
