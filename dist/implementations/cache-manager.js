"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const CacheMetadata_1 = require("./CacheMetadata");
const cache_events_1 = require("../events/cache-events");
const error_utils_1 = require("../utils/error-utils");
const default_config_1 = require("../config/default-config");
/**
 * Main cache manager implementation
 */
class CacheManager {
    /**
     * Create a new cache manager
     */
    constructor(config = {}) {
        this.providers = new Map();
        this.metadata = new CacheMetadata_1.CacheMetadata();
        this.config = default_config_1.DEFAULT_CONFIG;
        this.config = { ...default_config_1.DEFAULT_CONFIG, ...config };
    }
    /**
     * Get a value from cache
     */
    async get(key) {
        try {
            for (const provider of this.providers.values()) {
                const value = await provider.get(key);
                if (value !== null) {
                    this.metadata.recordAccess(key);
                    return value;
                }
            }
            return null;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, { operation: 'get', key });
            return null;
        }
    }
    /**
     * Set a value in cache
     */
    async set(key, value, options) {
        try {
            for (const provider of this.providers.values()) {
                await provider.set(key, value, options);
            }
            this.metadata.set(key, { tags: options?.tags || [] });
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, { operation: 'set', key });
            throw error;
        }
    }
    /**
     * Delete a value from cache
     */
    async delete(key) {
        try {
            let deleted = false;
            for (const provider of this.providers.values()) {
                const result = await provider.delete(key);
                deleted = deleted || result;
            }
            if (deleted) {
                this.metadata.delete(key);
            }
            return deleted;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, { operation: 'delete', key });
            return false;
        }
    }
    /**
     * Clear all values from cache
     */
    async clear() {
        try {
            for (const provider of this.providers.values()) {
                await provider.clear();
            }
            this.metadata.clear();
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, { operation: 'clear' });
        }
    }
    /**
     * Check if a key exists in cache
     */
    async has(key) {
        try {
            for (const provider of this.providers.values()) {
                // Safely check if provider.has exists before calling
                if (provider && typeof provider.has === 'function' && await provider.has(key)) {
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, { operation: 'has', key });
            return false;
        }
    }
    /**
     * Register a cache provider
     */
    registerProvider(name, provider) {
        this.providers.set(name, provider);
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.PROVIDER_INITIALIZED, { provider: name });
    }
    /**
     * Get or compute a value
     */
    async getOrCompute(key, fetcher, options) {
        try {
            // Check cache first
            const cachedValue = await this.get(key);
            if (cachedValue !== null) {
                return cachedValue;
            }
            // Compute value
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.COMPUTE_START, { key });
            const value = await fetcher();
            // Store in cache
            await this.set(key, value, options);
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.COMPUTE_SUCCESS, { key });
            return value;
        }
        catch (error) {
            const safeError = (0, error_utils_1.ensureError)(error);
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.COMPUTE_ERROR, {
                key,
                error: safeError
            });
            throw safeError;
        }
    }
    /**
     * Create a cached wrapper for a function
     */
    wrap(fn, keyGenerator, options) {
        return (async (...args) => {
            const key = keyGenerator(...args);
            return this.getOrCompute(key, () => fn(...args), options);
        });
    }
    /**
     * Invalidate cache entries by tag
     */
    async invalidateByTag(tag) {
        try {
            const keys = this.metadata.findByTag(tag);
            let count = 0;
            for (const key of keys) {
                const deleted = await this.delete(key);
                if (deleted)
                    count++;
            }
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.INVALIDATE, {
                tag,
                entriesRemoved: count
            });
            return count;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, { operation: 'invalidateByTag', tag });
            return 0;
        }
    }
    /**
     * Invalidate cache entries by prefix
     */
    async invalidateByPrefix(prefix) {
        try {
            const keys = this.metadata.findByPrefix(prefix);
            let count = 0;
            for (const key of keys) {
                const deleted = await this.delete(key);
                if (deleted)
                    count++;
            }
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.INVALIDATE, {
                prefix,
                entriesRemoved: count
            });
            return count;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, { operation: 'invalidateByPrefix', prefix });
            return 0;
        }
    }
    /**
     * Get multiple values from cache
     */
    async getMany(keys) {
        const result = {};
        try {
            // Try to use batch get if available on first provider
            const firstProvider = [...this.providers.values()][0];
            if (firstProvider && typeof firstProvider.getMany === 'function') {
                return await firstProvider.getMany(keys);
            }
            // Fall back to individual gets
            for (const key of keys) {
                result[key] = await this.get(key);
            }
            return result;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, { operation: 'getMany', keys });
            // Ensure we return something for each key
            for (const key of keys) {
                if (!(key in result)) {
                    result[key] = null;
                }
            }
            return result;
        }
    }
    /**
     * Set multiple values in cache
     */
    async setMany(entries, options) {
        try {
            // Fix defaultOptions access
            const ttl = this.config.defaultTtl;
            const mergedOptions = {
                ...options,
                ttl: options?.ttl ?? ttl // Use nullish coalescing to only apply default if undefined
            };
            // Try to use batch set if available on first provider
            const firstProvider = [...this.providers.values()][0];
            if (firstProvider && typeof firstProvider.setMany === 'function') {
                await firstProvider.setMany(entries, mergedOptions);
                // Update metadata
                for (const key of Object.keys(entries)) {
                    this.metadata.set(key, { tags: mergedOptions.tags || [] });
                }
                return;
            }
            // Fall back to individual sets
            for (const [key, value] of Object.entries(entries)) {
                await this.set(key, value, mergedOptions);
            }
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, { operation: 'setMany', entries: Object.keys(entries) });
            throw error;
        }
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        try {
            const stats = {
                providers: {},
                metadata: this.metadata.getStats()
            };
            // Collect stats from providers
            for (const [name, provider] of this.providers.entries()) {
                if (typeof provider.getStats === 'function') {
                    stats.providers[name] = await provider.getStats();
                }
            }
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.STATS_UPDATE, { stats });
            return stats;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, { operation: 'getStats' });
            return {};
        }
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=cache-manager.js.map