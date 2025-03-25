/**
 * Memory storage adapter implementation
 */
import {CacheOptions} from '../types';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';

/**
 * Constants used throughout the adapter
 */
const CONSTANTS = {
    NO_EXPIRATION: 0,
    DEFAULT_MAX_EVICTION_ATTEMPTS: 10,
    DEFAULT_ADAPTER_NAME: 'memory'
};

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
    [x: string]: any;
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
     * Added missing provider name
     */
    public name: string = 'memory';

    /**
     * Create a new memory storage adapter
     */
    constructor(options: MemoryStorageOptions = {}) {
        this.options = {
            maxSize: Infinity,
            maxItems: Infinity,
            defaultTtl: CONSTANTS.NO_EXPIRATION,
            updateAgeOnGet: true,
            allowStale: false,
            maxEvictionAttempts: CONSTANTS.DEFAULT_MAX_EVICTION_ATTEMPTS,
            name: CONSTANTS.DEFAULT_ADAPTER_NAME,
            ...options
        };
        this.stats.maxSize = this.options.maxSize || 0;
    }

    /**
     * Get a value from the cache
     */
    async get(key: string): Promise<any> {
        if (!this.cache.has(key)) {
            this.recordMiss();
            return null;
        }

        if (this.isExpired(key) && !this.options.allowStale) {
            await this.delete(key);
            this.recordMiss();
            return null;
        }

        const value = this.cache.get(key);
        this.updateAccessMetadata(key);
        this.recordHit();

        return value;
    }

    /**
     * Set a value in the cache
     */
    async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
        const size = this.calculateSize(value);

        if (size > 0) {
            await this.ensureCapacity(size);
        }

        const ttl = options.ttl !== undefined ? options.ttl : this.options.defaultTtl;
        const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : undefined;

        this.cache.set(key, value);

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
        this.updateTagIndex(key, meta.tags);
        this.updateStatsAfterSet(size);

        this.emitEvent(CacheEventType.SET, { key, ttl });
    }

    /**
     * Delete a value from the cache
     */
    async delete(key: string): Promise<boolean> {
        if (!this.cache.has(key)) {
            return false;
        }

        const meta = this.metadata.get(key);

        if (meta) {
            this.removeFromTagIndex(key, meta.tags);
            this.stats.size -= meta.size;
        }

        const deleted = this.cache.delete(key);
        this.metadata.delete(key);

        this.updateStatsAfterDelete();
        this.emitEvent(CacheEventType.DELETE, { key });

        return deleted;
    }

    /**
     * Clear all values from the cache
     */
    async clear(): Promise<void> {
        this.cache.clear();
        this.metadata.clear();
        this.tagIndex.clear();

        this.stats.keyCount = 0;
        this.stats.size = 0;
        this.stats.lastUpdated = Date.now();

        this.emitEvent(CacheEventType.CLEAR, {});
    }

    /**
     * Check if a key exists in the cache
     */
    async has(key: string): Promise<boolean> {
        if (!this.cache.has(key)) {
            return false;
        }

        return !this.isExpired(key) || this.options.allowStale;
    }

    /**
     * Checks if a cache entry is expired
     */
    private isExpired(key: string): boolean {
        const meta = this.metadata.get(key);
        return !!(meta && meta.expiresAt && meta.expiresAt < Date.now());
    }

    /**
     * Updates access metadata for a key
     */
    private updateAccessMetadata(key: string): void {
        const meta = this.metadata.get(key);
        if (meta && this.options.updateAgeOnGet) {
            meta.lastAccessed = Date.now();
            meta.accessCount++;

            this.emitEvent(CacheEventType.GET_HIT, { key });
        }
    }

    /**
     * Updates tag index with the given tags for a key
     */
    private updateTagIndex(key: string, tags: string[]): void {
        if (tags.length === 0) return;

        for (const tag of tags) {
            if (!this.tagIndex.has(tag)) {
                this.tagIndex.set(tag, new Set());
            }
            this.tagIndex.get(tag)?.add(key);
        }
    }

    /**
     * Removes a key from the tag index
     */
    private removeFromTagIndex(key: string, tags: string[]): void {
        if (tags.length === 0) return;

        for (const tag of tags) {
            const tagSet = this.tagIndex.get(tag);
            if (tagSet) {
                tagSet.delete(key);
                if (tagSet.size === 0) {
                    this.tagIndex.delete(tag);
                }
            }
        }
    }

    /**
     * Calculates the size of a value (method stub)
     */
    private calculateSize(value: any): number {
        // Implementation would go here
        return 0;
    }

    /**
     * Ensures capacity for new items (method stub)
     */
    private async ensureCapacity(size: number): Promise<void> {
        // Implementation would go here
    }

    /**
     * Records a cache hit
     */
    private recordHit(): void {
        this.stats.hits++;
    }

    /**
     * Records a cache miss
     */
    private recordMiss(): void {
        this.stats.misses++;
    }

    /**
     * Updates stats after setting a value
     */
    private updateStatsAfterSet(size: number): void {
        this.stats.keyCount = this.cache.size;
        this.stats.size += size;
        this.stats.lastUpdated = Date.now();
    }

    /**
     * Updates stats after deleting a value
     */
    private updateStatsAfterDelete(): void {
        this.stats.keyCount = this.cache.size;
        this.stats.lastUpdated = Date.now();
    }

    /**
     * Emits a cache event
     */
    private emitEvent(eventType: CacheEventType, data: Record<string, any>): void {
        emitCacheEvent(eventType, {
            ...data,
            provider: this.options.name,
            timestamp: Date.now()
        });
    }
}