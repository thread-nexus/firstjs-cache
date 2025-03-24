/**
 * @fileoverview Memory cache provider implementation
 */
import { MemoryStorageAdapter } from './memory-adapter';
/**
 * Memory cache provider implementation
 */
export class MemoryProvider {
    /**
     * Create a new memory cache provider
     *
     * @param options - Memory storage options
     */
    constructor(options) {
        this.name = 'memory';
        this.adapter = new MemoryStorageAdapter(options);
        this.stats = {
            hits: 0,
            misses: 0,
            size: 0,
            entries: 0,
            avgTtl: 0,
            maxTtl: 0,
            keyCount: 0,
            memoryUsage: 0,
            lastUpdated: Date.now(),
            hitRatio: 0
        };
    }
    async updateStats(hit) {
        const stats = await this.adapter.getStats();
        this.stats = {
            ...this.stats,
            hits: hit ? this.stats.hits + 1 : this.stats.hits,
            misses: hit ? this.stats.misses : this.stats.misses + 1,
            size: stats.size || 0,
            entries: stats.size || 0,
            keyCount: stats.size || 0,
            memoryUsage: stats.memoryUsage || 0,
            lastUpdated: Date.now(),
            hitRatio: (this.stats.hits / (this.stats.hits + this.stats.misses)) || 0
        };
    }
    /**
     * Get a value from the cache
     *
     * @param key - Cache key
     * @returns Cached value or null if not found
     */
    async get(key) {
        const value = await this.adapter.get(key);
        this.updateStats(value !== null);
        return value;
    }
    /**
     * Set a value in the cache
     *
     * @param key - Cache key
     * @param value - Value to cache
     * @param options - Cache options
     */
    async set(key, value, options) {
        // Create a compatible options object without tags
        const entryOptions = {
            ttl: options?.ttl
        };
        // Handle tags separately if needed
        if (options?.tags && this.adapter.setMetadata) {
            await this.adapter.setMetadata(key, { tags: options.tags });
        }
        await this.adapter.set(key, value, entryOptions);
    }
    /**
     * Delete a value from the cache
     *
     * @param key - Cache key
     * @returns Whether the key was deleted
     */
    async delete(key) {
        return this.adapter.delete(key);
    }
    /**
     * Clear all values from the cache
     */
    async clear() {
        await this.adapter.clear();
    }
    /**
     * Get cache statistics
     *
     * @returns Cache statistics
     */
    async getStats() {
        return this.stats;
    }
    /**
     * Perform a health check
     *
     * @returns Health status
     */
    async healthCheck() {
        return {
            status: 'healthy',
            healthy: true, // Ensure this is always a boolean, not undefined
            details: {
                size: this.stats.size || 0,
                memoryUsage: process.memoryUsage().heapUsed
            }
        };
    }
    async getMany(keys) {
        return this.adapter.getMany(keys);
    }
    async setMany(entries, options) {
        return this.adapter.setMany(entries, options);
    }
    async has(key) {
        return this.adapter.has(key);
    }
    async invalidateByPrefix(prefix) {
        const keys = await this.adapter.keys();
        const toDelete = keys.filter(key => key.startsWith(prefix));
        await Promise.all(toDelete.map(key => this.delete(key)));
    }
    async invalidateByTag(tag) {
        const keys = await this.adapter.keys();
        const toDelete = [];
        for (const key of keys) {
            const metadata = await this.adapter.getMetadata(key);
            if (metadata?.tags.includes(tag)) {
                toDelete.push(key);
            }
        }
        await Promise.all(toDelete.map(key => this.delete(key)));
        return toDelete.length;
    }
}
//# sourceMappingURL=memory-provider.js.map