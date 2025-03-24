/**
 * @fileoverview Advanced cache manager implementation combining multiple features
 * including multi-layer caching, background refresh, and monitoring.
 */
import { CacheProviderManager } from './cache-providers';
import { CacheCompute } from './cache-compute';
import { emitCacheEvent, CacheEventType } from '../events/cache-events';
import { validateCacheKey, validateCacheOptions } from '../utils/validation-utils';
import { handleCacheError } from '../utils/error-utils';
export class CacheManagerAdvanced {
    constructor(options = {}) {
        this.options = options;
        this.statsInterval = null;
        this.providerManager = new CacheProviderManager();
        // Initialize providers
        options.providers?.forEach(({ name, instance, priority }) => {
            this.providerManager.registerProvider(name, instance, priority);
        });
        // Initialize compute manager with compatible options
        this.compute = new CacheCompute(this.providerManager.getProvider('primary') || options.providers?.[0]?.instance, {
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
        validateCacheKey(key);
        try {
            const value = await this.providerManager.get(key);
            emitCacheEvent(value !== null ? CacheEventType.GET_HIT : CacheEventType.GET_MISS, { key });
            return value;
        }
        catch (error) {
            handleCacheError(error, {
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
        validateCacheKey(key);
        validateCacheOptions(options);
        try {
            await this.providerManager.set(key, value, options);
            emitCacheEvent(CacheEventType.SET, {
                key,
                size: JSON.stringify(value).length
            });
        }
        catch (error) {
            handleCacheError(error, {
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
        validateCacheKey(key);
        validateCacheOptions(options);
        try {
            const result = await this.compute.getOrCompute(key, compute, options);
            if (result.stale) {
                emitCacheEvent(CacheEventType.GET_STALE, {
                    key,
                    computeTime: result.computeTime
                });
            }
            return result.value;
        }
        catch (error) {
            handleCacheError(error, {
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
        validateCacheKey(key);
        try {
            const deleted = await this.providerManager.delete(key);
            emitCacheEvent(CacheEventType.DELETE, {
                key,
                success: deleted
            });
            return deleted;
        }
        catch (error) {
            handleCacheError(error, {
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
            emitCacheEvent(CacheEventType.CLEAR, {});
        }
        catch (error) {
            handleCacheError(error, {
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
            emitCacheEvent(CacheEventType.STATS_UPDATE, {
                computeStatus: computeStatusStr, // String as required by the interface
                type: CacheEventType.STATS_UPDATE.toString(),
                timestamp: Date.now()
            });
            // Second event with different payload structure
            // Avoid including computeStatus in this event to prevent type errors
            emitCacheEvent(CacheEventType.STATS_UPDATE, {
                stats,
                type: CacheEventType.STATS_UPDATE.toString(),
                timestamp: Date.now()
            });
            return stats;
        }
        catch (error) {
            handleCacheError(error, {
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
                emitCacheEvent(CacheEventType.STATS_UPDATE, { stats });
            }
            catch (error) {
                handleCacheError(error, {
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
//# sourceMappingURL=cache-manager-advanced.js.map