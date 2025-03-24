/**
 * Memory storage adapter implementation
 */

import {CacheOptions, CacheStats, HealthStatus} from '../types';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';

/**
 * Memory storage options
 */
export interface MemoryStorageOptions {
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
     * Maximum number of eviction attempts
     */
    maxEvictionAttempts?: number;

    /**
     * Name for this adapter instance
     */
    name?: string;
}

/**
 * Cache entry metadata
 */
interface CacheEntryMetadata {
    /**
     * Tags associated with the entry
     */
    tags: string[];

    /**
     * When the entry was created
     */
    createdAt: number;

    /**
     * When the entry expires
     */
    expiresAt?: number;

    /**
     * Size of the entry in bytes
     */
    size: number;

    /**
     * Whether the entry is compressed
     */
    compressed?: boolean;

    /**
     * When the entry was last accessed
     */
    lastAccessed: number;

    /**
     * Number of times the entry has been accessed
     */
    accessCount: number;
}

/**
 * Memory storage adapter
 */
export class MemoryAdapter implements ICacheProvider {
    /**
     * Cache data
     */
    private cache = new Map<string, any>();

    /**
     * Cache metadata
     */
    private metadata = new Map<string, CacheEntryMetadata>();

    /**
     * Cache statistics
     */
    private stats = {
        hits: 0,
        misses: 0,
        keyCount: 0,
        size: 0,
        maxSize: 0,
        memoryUsage: 0,
        lastUpdated: Date.now(),
        entries: 0,
        avgTtl: 0,
        maxTtl: 0
    };

    /**
     * Tag index for quick lookup
     */
    private tagIndex = new Map<string, Set<string>>();

    /**
     * Storage options
     */
    private options: Required<MemoryStorageOptions>;

    /**
     * Create a new memory storage adapter
     */
    constructor(options: MemoryStorageOptions = {}) {
        this.options = {
            maxSize: Infinity,
            maxItems: Infinity,
            defaultTtl: 0, // 0 means no expiration
            updateAgeOnGet: true,
            allowStale: false,
            maxEvictionAttempts: 10,
            name: 'memory',
            ...options
        };

        this.stats.maxSize = this.options.maxSize || 0;
    }

    /**
     * Get a value from the cache
     */
    async get(key: string): Promise<any> {
        // Check if key exists
        if (!this.cache.has(key)) {
            this.stats.misses++;
            return null;
        }

        // Check if entry is expired
        const meta = this.metadata.get(key);
        if (meta && meta.expiresAt && meta.expiresAt < Date.now()) {
            if (!this.options.allowStale) {
                await this.delete(key);
                this.stats.misses++;
                return null;
            }
        }

        // Get value
        const value = this.cache.get(key);

        // Update metadata
        if (meta) {
            meta.lastAccessed = Date.now();
            meta.accessCount++;

            // Emit event
            emitCacheEvent(CacheEventType.GET_HIT, {
                key,
                provider: this.options.name,
                timestamp: Date.now()
            });
        }

        this.stats.hits++;
        return value;
    }

    /**
     * Set a value in the cache
     */
    async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
        // Calculate size
        const size = this.calculateSize(value);

        // Ensure capacity
        if (size > 0) {
            await this.ensureCapacity(size);
        }

        // Calculate expiration
        const ttl = options.ttl !== undefined ? options.ttl : this.options.defaultTtl;
        const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : undefined;

        // Store value
        this.cache.set(key, value);

        // Store metadata
        const meta: CacheEntryMetadata = {
            tags: options.tags || [],
            createdAt: Date.now(),
            expiresAt,
            size,
            compressed: options.compression || false,
            lastAccessed: Date.now(),
            accessCount: 0
        };

        this.metadata.set(key, meta);

        // Update tag index
        if (meta.tags.length > 0) {
            for (const tag of meta.tags) {
                if (!this.tagIndex.has(tag)) {
                    this.tagIndex.set(tag, new Set());
                }
                this.tagIndex.get(tag)?.add(key);
            }
        }

        // Update stats
        this.stats.keyCount = this.cache.size;
        this.stats.size += size;
        this.stats.lastUpdated = Date.now();

        // Emit event
        emitCacheEvent(CacheEventType.SET, {
            key,
            provider: this.options.name,
            timestamp: Date.now(),
            ttl
        });
    }

    /**
     * Delete a value from the cache
     */
    async delete(key: string): Promise<boolean> {
        // Check if key exists
        if (!this.cache.has(key)) {
            return false;
        }

        // Get metadata
        const meta = this.metadata.get(key);

        // Remove from tag index
        if (meta && meta.tags.length > 0) {
            for (const tag of meta.tags) {
                const tagSet = this.tagIndex.get(tag);
                if (tagSet) {
                    tagSet.delete(key);
                    if (tagSet.size === 0) {
                        this.tagIndex.delete(tag);
                    }
                }
            }
        }

        // Update stats
        if (meta) {
            this.stats.size -= meta.size;
        }

        // Delete value and metadata
        const deleted = this.cache.delete(key);
        this.metadata.delete(key);

        // Update stats
        this.stats.keyCount = this.cache.size;
        this.stats.lastUpdated = Date.now();

        // Emit event
        emitCacheEvent(CacheEventType.DELETE, {
            key,
            provider: this.options.name,
            timestamp: Date.now()
        });

        return deleted;
    }

    /**
     * Clear all values from the cache
     */
    async clear(): Promise<void> {
        // Clear cache and metadata
        this.cache.clear();
        this.metadata.clear();
        this.tagIndex.clear();

        // Reset stats
        this.stats.keyCount = 0;
        this.stats.size = 0;
        this.stats.lastUpdated = Date.now();

        // Emit event
        emitCacheEvent(CacheEventType.CLEAR, {
            provider: this.options.name,
            timestamp: Date.now()
        });
    }

    /**
     * Check if a key exists in the cache
     */
    async has(key: string): Promise<boolean> {
        // Check if key exists
        if (!this.cache.has(key)) {
            return false;
        }

        // Check if entry is expired
        const meta = this.metadata.get(key);
        if (meta && meta.expiresAt && meta.expiresAt < Date.now()) {
            if (!this.options.allowStale) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get multiple values from the cache
     */
    async getMany<T>(keys: string[]): Promise<Record<string, T | null>> {
        const result: Record<string, T | null> = {};

        for (const key of keys) {
            result[key] = await this.get(key);
        }

        return result;
    }

    /**
     * Set multiple values in the cache
     */
    async setMany(entries: Record<string, any>, options: CacheOptions = {}): Promise<void> {
        for (const [key, value] of Object.entries(entries)) {
            await this.set(key, value, options);
        }
    }

    /**
     * Get metadata for a key
     */
    async getMetadata(key: string): Promise<CacheEntryMetadata | null> {
        return this.metadata.get(key) || null;
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<CacheStats> {
        // Calculate average TTL
        let totalTtl = 0;
        let ttlCount = 0;

        for (const meta of this.metadata.values()) {
            if (meta.expiresAt) {
                const ttl = (meta.expiresAt - meta.createdAt) / 1000;
                totalTtl += ttl;
                ttlCount++;
            }
        }

        // Update stats
        this.stats.avgTtl = ttlCount > 0 ? totalTtl / ttlCount : 0;
        this.stats.entries = this.cache.size;
        this.stats.lastUpdated = Date.now();

        // Estimate memory usage
        this.stats.memoryUsage = this.stats.size;

        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            keyCount: this.stats.keyCount,
            size: this.stats.size,
            maxSize: this.stats.maxSize,
            memoryUsage: this.stats.memoryUsage,
            lastUpdated: this.stats.lastUpdated,
            entries: this.stats.entries,
            avgTtl: this.stats.avgTtl,
            maxTtl: this.stats.maxTtl
        };
    }

    /**
     * Invalidate cache entries by tag
     */
    async invalidateByTag(tag: string): Promise<void> {
        const tagSet = this.tagIndex.get(tag);

        if (tagSet) {
            // Create a copy of the keys to avoid modification during iteration
            const keys = Array.from(tagSet);

            for (const key of keys) {
                await this.delete(key);
            }

            // Emit event
            emitCacheEvent(CacheEventType.INVALIDATE, {
                tag,
                provider: this.options.name,
                timestamp: Date.now(),
                entriesRemoved: keys.length
            });
        }
    }

    /**
     * Invalidate cache entries by prefix
     */
    async invalidateByPrefix(prefix: string): Promise<void> {
        const keysToDelete: string[] = [];

        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            await this.delete(key);
        }

        // Emit event
        emitCacheEvent(CacheEventType.INVALIDATE, {
            prefix,
            provider: this.options.name,
            timestamp: Date.now(),
            entriesRemoved: keysToDelete.length
        });
    }

    /**
     * Get keys matching a pattern
     */
    async keys(pattern?: string): Promise<string[]> {
        if (!pattern) {
            return Array.from(this.cache.keys());
        }

        const regex = new RegExp(pattern);
        return Array.from(this.cache.keys()).filter(key => regex.test(key));
    }

    /**
     * Perform a health check
     */
    async healthCheck(): Promise<HealthStatus> {
        try {
            const testKey = `__health_check_${Date.now()}`;
            const testValue = {timestamp: Date.now()};

            await this.set(testKey, testValue);
            const retrieved = await this.get(testKey);
            await this.delete(testKey);

            if (JSON.stringify(retrieved) !== JSON.stringify(testValue)) {
                return {
                    healthy: false,
                    message: 'Health check failed: retrieved value does not match stored value',
                    status: 'unhealthy',
                    lastCheck: new Date()
                };
            }

            return {
                healthy: true,
                status: 'healthy',
                lastCheck: new Date()
            };
        } catch (error) {
            return {
                healthy: false,
                message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
                status: 'unhealthy',
                lastCheck: new Date()
            };
        }
    }

    /**
     * Calculate size of a value
     */
    private calculateSize(value: any): number {
        if (value === null || value === undefined) {
            return 0;
        }

        if (typeof value === 'string') {
            return value.length * 2; // Approximate size in bytes
        }

        if (typeof value === 'number') {
            return 8; // 64-bit number
        }

        if (typeof value === 'boolean') {
            return 4;
        }

        if (Array.isArray(value)) {
            return value.reduce((size, item) => size + this.calculateSize(item), 0);
        }

        if (typeof value === 'object') {
            try {
                const json = JSON.stringify(value);
                return json.length * 2; // Approximate size in bytes
            } catch (e) {
                return 1024; // Default size for objects that can't be stringified
            }
        }

        return 8; // Default size
    }

    /**
     * Ensure the cache has capacity for new items
     */
    private async ensureCapacity(requiredSize: number = 0): Promise<void> {
        // Check if we need to evict items due to size constraints
        if (this.options.maxSize !== Infinity && this.stats.size + requiredSize > this.options.maxSize) {
            let attempts = 0;
            const maxAttempts = this.options.maxEvictionAttempts;

            while (this.stats.size + requiredSize > this.options.maxSize && attempts < maxAttempts) {
                const evicted = await this.evictLRU();
                if (!evicted) {
                    break; // Nothing left to evict
                }
                attempts++;
            }

            if (this.stats.size + requiredSize > this.options.maxSize) {
                throw new Error('Unable to free enough space after maximum eviction attempts');
            }
        }

        // Check if we need to evict items due to count constraints
        if (this.options.maxItems !== Infinity && this.cache.size >= this.options.maxItems) {
            let attempts = 0;
            const maxAttempts = this.options.maxEvictionAttempts;

            while (this.cache.size >= this.options.maxItems && attempts < maxAttempts) {
                const evicted = await this.evictLRU();
                if (!evicted) {
                    break; // Nothing left to evict
                }
                attempts++;
            }

            if (this.cache.size >= this.options.maxItems) {
                throw new Error('Unable to free enough space after maximum eviction attempts');
            }
        }
    }

    /**
     * Evict least recently used item
     */
    private async evictLRU(): Promise<boolean> {
        if (this.cache.size === 0) {
            return false;
        }

        let oldestKey: string | null = null;
        let oldestAccess = Date.now();

        // Find the least recently accessed item
        for (const [key, meta] of this.metadata.entries()) {
            if (meta.lastAccessed < oldestAccess) {
                oldestAccess = meta.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            await this.delete(oldestKey);
            return true;
        }

        return false;
    }

    /**
     * Calculate the total size of all cache entries
     */
    private calculateTotalSize(): number {
        let totalSize = 0;

        for (const meta of this.metadata.values()) {
            totalSize += meta.size;
        }

        return totalSize;
    }
}