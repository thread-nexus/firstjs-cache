"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheCompute = void 0;
const cache_events_1 = require("../events/cache-events");
const error_utils_1 = require("../utils/error-utils");
/**
 * Cache compute implementation
 */
class CacheCompute {
    /**
     * Create a new cache compute instance
     *
     * @param provider - Cache provider
     * @param options - Compute options
     */
    constructor(provider, options = {}) {
        this.provider = provider;
        this.options = options;
        this.refreshPromises = new Map();
        this.defaultTtl = options.defaultTtl || 3600;
        this.backgroundRefresh = options.backgroundRefresh !== false;
        this.refreshThreshold = options.refreshThreshold || 0.75;
    }
    /**
     * Get a value from cache or compute it if not found
     *
     * @param key - Cache key
     * @param fetcher - Function to compute the value
     * @param options - Cache options
     * @returns Compute result
     */
    async getOrCompute(key, fetcher, options) {
        try {
            // Try to get from cache
            const cachedValue = await this.provider.get(key);
            // If found, check if refresh needed
            if (cachedValue !== null) {
                const metadata = await this.provider.getMetadata?.(key);
                const isStale = this.isValueStale(metadata?.refreshedAt, options);
                // Schedule background refresh if needed
                if (isStale && this.shouldBackgroundRefresh(options)) {
                    await this.scheduleBackgroundRefresh(key, fetcher, options);
                }
                return {
                    value: cachedValue,
                    computeTime: metadata?.computeTime || 0,
                    stale: isStale
                };
            }
            // Compute new value
            return await this.computeAndCache(key, fetcher, options);
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
     * Compute value and cache it
     */
    async computeAndCache(key, fetcher, options) {
        const startTime = performance.now();
        try {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.COMPUTE_START, { key });
            const value = await this.executeWithRetry(() => fetcher(), options);
            const computeTime = performance.now() - startTime;
            // Create internal options with metadata
            const internalOptions = {
                ...options,
                ttl: options?.ttl || this.defaultTtl,
                computeTime: computeTime,
                // Store metadata in our internal property
                _metadata: {
                    computeTime: computeTime,
                    source: 'compute',
                    timestamp: Date.now()
                }
            };
            // Cache the computed value
            await this.provider.set(key, value, internalOptions);
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.COMPUTE_SUCCESS, {
                key,
                duration: computeTime
            });
            return {
                value,
                computeTime,
                stale: false
            };
        }
        catch (error) {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.COMPUTE_ERROR, {
                key,
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw error;
        }
    }
    /**
     * Execute with retry logic
     */
    async executeWithRetry(operation, options) {
        const maxRetries = options?.maxRetries || 3;
        const retryDelay = options?.retryDelay || 1000;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                if (attempt >= maxRetries) {
                    throw error;
                }
                const delay = retryDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error('Exceeded maximum number of retries');
    }
    /**
     * Check if a value is stale
     */
    isValueStale(refreshedAt, options) {
        if (!refreshedAt)
            return true;
        const ttl = options?.ttl || this.defaultTtl;
        const threshold = options?.refreshThreshold || this.refreshThreshold;
        const age = Date.now() - refreshedAt.getTime();
        return age > ttl * threshold * 1000;
    }
    /**
     * Check if background refresh should be used
     */
    shouldBackgroundRefresh(options) {
        return options?.backgroundRefresh ?? this.backgroundRefresh;
    }
    /**
     * Schedule a background refresh
     */
    async scheduleBackgroundRefresh(key, fetcher, options) {
        // Check if refresh is already scheduled
        if (this.refreshPromises.has(key)) {
            return;
        }
        const refreshPromise = (async () => {
            try {
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_START, { key });
                await this.computeAndCache(key, fetcher, options);
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_SUCCESS, { key });
            }
            catch (error) {
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_ERROR, { key, error: error instanceof Error ? error : new Error(String(error)) });
            }
            finally {
                this.refreshPromises.delete(key);
            }
        })();
        this.refreshPromises.set(key, refreshPromise);
        // Prevent refresh spam
        await new Promise(resolve => setTimeout(resolve, 60000));
        this.refreshPromises.delete(key);
    }
    /**
     * Schedule a refresh operation for a key
     *
     * @param key - Cache key to refresh
     * @param fetcher - Function to compute the new value
     * @param options - Cache options
     * @returns Promise that resolves when the refresh is complete
     */
    async scheduleRefresh(key, fetcher, options) {
        try {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_START, { key });
            await this.computeAndCache(key, fetcher, options);
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_SUCCESS, { key });
        }
        catch (error) {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_ERROR, { key, error: error instanceof Error ? error : new Error(String(error)) });
            throw error;
        }
    }
    /**
     * Cancel background refresh for a key
     */
    cancelRefresh(key) {
        this.refreshPromises.delete(key);
    }
    /**
     * Get status of compute operations
     */
    getRefreshStatus() {
        return {
            activeComputes: 0,
            activeRefreshes: this.refreshPromises.size
        };
    }
    /**
     * Get status of compute operations
     */
    getComputeStatus() {
        return {
            activeComputes: 0,
            activeRefreshes: this.refreshPromises.size
        };
    }
}
exports.CacheCompute = CacheCompute;
//# sourceMappingURL=cache-compute.js.map