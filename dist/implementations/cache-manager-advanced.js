"use strict";
/**
 * @fileoverview Advanced cache manager implementation combining multiple features
 * including multi-layer caching, background refresh, and monitoring.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManagerAdvanced = void 0;
const cache_providers_1 = require("./cache-providers");
const cache_compute_1 = require("./cache-compute");
const cache_events_1 = require("../events/cache-events");
const validation_utils_1 = require("../utils/validation-utils");
const error_utils_1 = require("../utils/error-utils");
class CacheManagerAdvanced {
    constructor(options = {}) {
        this.options = options;
        this.statsInterval = null;
        this.providerManager = new cache_providers_1.CacheProviderManager();
        // Initialize providers
        options.providers?.forEach(({ name, instance, priority }) => {
            this.providerManager.registerProvider(name, instance, priority);
        });
        // Initialize compute manager with compatible options
        this.compute = new cache_compute_1.CacheCompute(this.providerManager.getProvider('primary') || options.providers?.[0]?.instance, {
            defaultTtl: options.defaultTtl,
            backgroundRefresh: options.backgroundRefresh,
            refreshThreshold: options.refreshThreshold
            // Remove incompatible properties
            // maxRetries: options.maxRetries,
            // retryDelay: options.retryDelay
        });
        // Start stats collection if enabled
        if (options.statsInterval) {
            this.startStatsCollection(options.statsInterval);
        }
    }
    /**
     * Get a value from cache with advanced features
     */
    async get(key) {
        (0, validation_utils_1.validateCacheKey)(key);
        try {
            const value = await this.providerManager.get(key);
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
    }
    /**
     * Set a value in cache with advanced features
     */
    async set(key, value, options) {
        (0, validation_utils_1.validateCacheKey)(key);
        (0, validation_utils_1.validateCacheOptions)(options);
        try {
            await this.providerManager.set(key, value, options);
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
    }
    /**
     * Get or compute a value with advanced features
     */
    async getOrCompute(key, compute, options) {
        (0, validation_utils_1.validateCacheKey)(key);
        (0, validation_utils_1.validateCacheOptions)(options);
        try {
            const result = await this.compute.getOrCompute(key, compute, options);
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
    }
    /**
     * Delete a value from cache
     */
    async delete(key) {
        (0, validation_utils_1.validateCacheKey)(key);
        try {
            const deleted = await this.providerManager.delete(key);
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
    }
    /**
     * Clear all cache data
     */
    async clear() {
        try {
            await this.providerManager.clear();
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.CLEAR, {});
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'clear'
            });
            throw error;
        }
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        try {
            const stats = await this.providerManager.getStats();
            const computeStatus = this.compute.getComputeStatus
                ? this.compute.getComputeStatus()
                : { activeComputes: 0, activeRefreshes: 0 };
            // Convert computeStatus to string when emitting event
            const computeStatusStr = JSON.stringify(computeStatus);
            // First event with string computeStatus
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.STATS_UPDATE, {
                computeStatus: computeStatusStr, // String as required by the interface
                type: cache_events_1.CacheEventType.STATS_UPDATE.toString(),
                timestamp: Date.now()
            });
            // Second event with different payload structure
            // Avoid including computeStatus in this event to prevent type errors
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.STATS_UPDATE, {
                stats,
                type: cache_events_1.CacheEventType.STATS_UPDATE.toString(),
                timestamp: Date.now()
            });
            return stats;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'getStats'
            });
            throw error;
        }
    }
    /**
     * Start periodic stats collection
     */
    startStatsCollection(interval) {
        this.statsInterval = setInterval(async () => {
            try {
                const stats = await this.getStats();
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.STATS_UPDATE, { stats });
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'statsCollection'
                });
            }
        }, interval);
    }
    /**
     * Stop stats collection
     */
    stopStatsCollection() {
        // Fix clearInterval type issue
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
//# sourceMappingURL=cache-manager-advanced.js.map