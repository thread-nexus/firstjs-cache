"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const CacheMetadata_1 = require("./CacheMetadata");
/**
 * CacheManager implementation
 */
class CacheManager {
    constructor() {
        this.providers = new Map();
        this.metadata = new CacheMetadata_1.CacheMetadata();
    }
    /**
     * Register a cache provider
     *
     * @param name Unique name for the provider
     * @param provider The cache provider instance
     */
    registerProvider(name, provider) {
        this.providers.set(name, provider);
    }
    /**
     * Get a value from cache
     */
    async get(key) {
        for (const provider of this.providers.values()) {
            const value = await provider.get(key);
            if (value !== null) {
                this.metadata.recordAccess(key);
                return value;
            }
        }
        return null;
    }
    /**
     * Store a value in cache
     */
    async set(key, value, options) {
        for (const provider of this.providers.values()) {
            await provider.set(key, value, options);
        }
        this.metadata.set(key, { tags: options?.tags || [] });
    }
    /**
     * Delete a value from all cache layers
     */
    async delete(key) {
        let deleted = false;
        for (const provider of this.providers.values()) {
            deleted = (await provider.delete(key)) || deleted;
        }
        this.metadata.delete(key);
        return deleted;
    }
    /**
     * Clear all cache layers
     */
    async clear() {
        for (const provider of this.providers.values()) {
            await provider.clear();
        }
        this.metadata.clear();
    }
    /**
     * Get cache statistics from all layers
     */
    async getStats() {
        const stats = {};
        for (const [name, provider] of this.providers.entries()) {
            // Check if getStats exists before calling it
            if (typeof provider.getStats === 'function') {
                stats[name] = await provider.getStats();
            }
            else {
                // Provide default stats if getStats is not available
                stats[name] = {
                    hits: 0,
                    misses: 0,
                    size: 0,
                    memoryUsage: 0,
                    lastUpdated: Date.now(),
                    keyCount: 0,
                    entries: 0,
                    avgTtl: 0,
                    maxTtl: 0
                };
            }
        }
        return stats;
    }
    /**
     * Get or compute a value - returns from cache if available or computes and caches it
     */
    async getOrCompute(key, fn, options) {
        const cachedValue = await this.get(key);
        if (cachedValue !== null) {
            return cachedValue;
        }
        const computedValue = await fn();
        await this.set(key, computedValue, options);
        return computedValue;
    }
    /**
     * Wrap a function with caching
     */
    wrap(fn, keyGenerator, options) {
        const wrappedFn = async (...args) => {
            const key = keyGenerator(...args);
            return this.getOrCompute(key, () => fn(...args), options);
        };
        wrappedFn.invalidateCache = async (...args) => {
            const key = keyGenerator(...args);
            await this.delete(key);
        };
        return wrappedFn;
    }
    /**
     * Invalidate all entries with a given tag
     */
    async invalidateByTag(tag) {
        const keys = this.metadata.findByTag(tag);
        for (const key of keys) {
            await this.delete(key);
        }
    }
    /**
     * Get a specific cache provider by layer name
     */
    getProvider(layer) {
        return this.providers.get(layer) || null;
    }
    /**
     * Get metadata for a cache key
     */
    getMetadata(key) {
        return this.metadata.get(key);
    }
    /**
     * Invalidate cache entries by prefix
     */
    async invalidateByPrefix(prefix) {
        const keys = this.metadata.findByPrefix(prefix);
        for (const key of keys) {
            await this.delete(key);
        }
    }
    /**
     * Delete cache entries matching a pattern
     */
    async deleteByPattern(pattern) {
        const keys = this.metadata.findByPattern(pattern);
        for (const key of keys) {
            await this.delete(key);
        }
    }
    /**
     * Get all keys matching a pattern
     */
    async keys(pattern) {
        if (!pattern) {
            return this.metadata.keys();
        }
        return this.metadata.findByPattern(pattern);
    }
    /**
     * Get multiple values from cache
     */
    async getMany(keys) {
        const result = {};
        for (const key of keys) {
            result[key] = await this.get(key);
        }
        return result;
    }
    /**
     * Set multiple values in cache
     */
    async setMany(entries, options) {
        for (const [key, value] of Object.entries(entries)) {
            await this.set(key, value, options);
        }
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=CacheManager.js.map