/**
 * Memory cache provider implementation
 */

import {CacheOptions, CacheStats, HealthStatus} from '../types';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {MemoryAdapter} from './memory-adapter';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';

/**
 * Memory provider options
 */
export interface MemoryProviderOptions {
    /**
     * Maximum cache size in bytes
     */
    maxSize?: number;

    /**
     * Maximum number of items
     */
    maxItems?: number;

    /**
     * Default TTL in seconds
     */
    defaultTtl?: number;

    /**
     * Whether to update item age on get
     */
    updateAgeOnGet?: boolean;

    /**
     * Whether to return stale items
     */
    allowStale?: boolean;

    /**
     * Name for this provider
     */
    name?: string;
}

/**
 * Memory cache provider
 */
export class MemoryProvider<T = any> implements ICacheProvider {
    /**
     * Provider name
     */
    public name: string;

    /**
     * Memory adapter instance
     */
    private adapter: MemoryAdapter;

    /**
     * Cache statistics
     */
    private stats = {
        hits: 0,
        misses: 0,
        operations: 0,
        lastUpdated: Date.now()
    };

    /**
     * Create a new memory cache provider
     */
    constructor(options: MemoryProviderOptions = {}) {
        this.name = options.name || 'memory';
        this.adapter = new MemoryAdapter({
            maxSize: options.maxSize,
            maxItems: options.maxItems,
            defaultTtl: options.defaultTtl,
            updateAgeOnGet: options.updateAgeOnGet,
            allowStale: options.allowStale,
            name: this.name
        });
    }

    /**
     * Get a value from the cache
     */
    async get(key: string): Promise<T | null> {
        try {
            const start = Date.now();
            const value = await this.adapter.get(key);
            const duration = Date.now() - start;

            this.updateStats(value !== null);

            emitCacheEvent(value !== null ? CacheEventType.GET_HIT : CacheEventType.GET_MISS, {
                key,
                provider: this.name,
                duration,
                timestamp: Date.now()
            });

            return value;
        } catch (error) {
            this.stats.misses++;

            emitCacheEvent(CacheEventType.ERROR, {
                key,
                provider: this.name,
                error,
                timestamp: Date.now()
            });

            return null;
        }
    }

    /**
     * Set a value in the cache
     */
    async set(key: string, value: T, options: CacheOptions = {}): Promise<void> {
        try {
            const start = Date.now();
            await this.adapter.set(key, value, options);
            const duration = Date.now() - start;

            this.stats.operations++;

            emitCacheEvent(CacheEventType.SET, {
                key,
                provider: this.name,
                duration,
                timestamp: Date.now()
            });
        } catch (error) {
            emitCacheEvent(CacheEventType.ERROR, {
                key,
                provider: this.name,
                error,
                timestamp: Date.now()
            });

            throw error;
        }
    }

    /**
     * Delete a value from the cache
     */
    async delete(key: string): Promise<boolean> {
        try {
            const start = Date.now();
            const result = await this.adapter.delete(key);
            const duration = Date.now() - start;

            this.stats.operations++;

            emitCacheEvent(CacheEventType.DELETE, {
                key,
                provider: this.name,
                duration,
                timestamp: Date.now()
            });

            return result;
        } catch (error) {
            emitCacheEvent(CacheEventType.ERROR, {
                key,
                provider: this.name,
                error,
                timestamp: Date.now()
            });

            return false;
        }
    }

    /**
     * Clear all values from the cache
     */
    async clear(): Promise<void> {
        try {
            const start = Date.now();
            await this.adapter.clear();
            const duration = Date.now() - start;

            this.stats.operations++;

            emitCacheEvent(CacheEventType.CLEAR, {
                provider: this.name,
                duration,
                timestamp: Date.now()
            });
        } catch (error) {
            emitCacheEvent(CacheEventType.ERROR, {
                provider: this.name,
                error,
                timestamp: Date.now()
            });

            throw error;
        }
    }

    /**
     * Check if a key exists in the cache
     */
    async has(key: string): Promise<boolean> {
        try {
            return await this.adapter.has(key);
        } catch (error) {
            emitCacheEvent(CacheEventType.ERROR, {
                key,
                provider: this.name,
                error,
                timestamp: Date.now()
            });

            return false;
        }
    }

    /**
     * Get multiple values from the cache
     */
    async getMany<U>(keys: string[]): Promise<Record<string, U | null>> {
        try {
            const start = Date.now();
            const result = await this.adapter.getMany<U>(keys);
            const duration = Date.now() - start;

            // Update stats
            const hits = Object.values(result).filter(v => v !== null).length;
            const misses = keys.length - hits;

            this.stats.hits += hits;
            this.stats.misses += misses;
            this.stats.operations++;

            emitCacheEvent(CacheEventType.GET_MANY, {
                keys,
                provider: this.name,
                duration,
                hits,
                misses,
                timestamp: Date.now()
            });

            return result;
        } catch (error) {
            emitCacheEvent(CacheEventType.ERROR, {
                keys,
                provider: this.name,
                error,
                timestamp: Date.now()
            });

            // Return null for all keys on error
            return keys.reduce((acc, key) => {
                acc[key] = null;
                return acc;
            }, {} as Record<string, U | null>);
        }
    }

    /**
     * Set multiple values in the cache
     */
    async setMany(entries: Record<string, T>, options: CacheOptions = {}): Promise<void> {
        try {
            const start = Date.now();
            await this.adapter.setMany(entries, options);
            const duration = Date.now() - start;

            this.stats.operations++;

            emitCacheEvent(CacheEventType.SET_MANY, {
                keys: Object.keys(entries),
                provider: this.name,
                duration,
                timestamp: Date.now()
            });
        } catch (error) {
            emitCacheEvent(CacheEventType.ERROR, {
                keys: Object.keys(entries),
                provider: this.name,
                error,
                timestamp: Date.now()
            });

            throw error;
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<CacheStats> {
        try {
            const adapterStats = await this.adapter.getStats();

            return {
                ...adapterStats,
                hits: this.stats.hits,
                misses: this.stats.misses,
                operations: this.stats.operations,
                lastUpdated: Date.now()
            };
        } catch (error) {
            return {
                hits: this.stats.hits,
                misses: this.stats.misses,
                keyCount: 0,
                size: 0,
                memoryUsage: 0,
                lastUpdated: Date.now(),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Invalidate cache entries by prefix
     */
    async invalidateByPrefix(prefix: string): Promise<void> {
        try {
            // Get all keys
            const allKeys = await this.adapter.keys();
            const toDelete = allKeys.filter((key: string) => key.startsWith(prefix));
            await Promise.all(toDelete.map((key: string) => this.delete(key)));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Invalidate cache entries by tag
     */
    async invalidateByTag(tag: string): Promise<void> {
        try {
            await this.adapter.invalidateByTag(tag);
        } catch (error) {
            emitCacheEvent(CacheEventType.ERROR, {
                tag,
                provider: this.name,
                error,
                timestamp: Date.now()
            });

            throw error;
        }
    }

    /**
     * Perform a health check
     */
    async healthCheck(): Promise<HealthStatus> {
        try {
            const result = await this.adapter.healthCheck();

            return {
                healthy: result.healthy,
                message: result.message,
                lastCheck: new Date(),
                status: result.healthy ? 'healthy' : 'unhealthy'
            };
        } catch (error) {
            return {
                healthy: false,
                message: error instanceof Error ? error.message : String(error),
                lastCheck: new Date(),
                status: 'unhealthy'
            };
        }
    }

    /**
     * Get metadata for a key
     */
    async getMetadata(key: string): Promise<any> {
        try {
            return await this.adapter.getMetadata(key);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get keys matching a pattern
     */
    async keys(pattern?: string): Promise<string[]> {
        try {
            return await this.adapter.keys(pattern);
        } catch (error) {
            return [];
        }
    }

    /**
     * Update cache statistics
     */
    private updateStats(hit: boolean): void {
        if (hit) {
            this.stats.hits++;
        } else {
            this.stats.misses++;
        }

        this.stats.operations++;
        this.stats.lastUpdated = Date.now();
    }
}