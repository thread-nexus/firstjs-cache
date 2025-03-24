/**
 * @fileoverview In-memory storage adapter implementation with LRU caching
 */
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { compressData, decompressData } from '../utils/compression-utils';
/**
 * In-memory storage adapter using LRU cache
 */
export class MemoryStorageAdapter {
    /**
     * Create a new memory storage adapter
     */
    constructor(options = {}) {
        this.store = new Map();
        this.metadata = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            size: 0
        };
        this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB default
        this.maxItems = options.maxItems || 10000;
        this.defaultTtl = options.defaultTtl || 3600; // 1 hour default
        this.updateAgeOnGet = options.updateAgeOnGet !== false;
    }
    /**
     * Get a value from the cache
     */
    async get(key) {
        try {
            const value = this.store.get(key);
            const meta = this.metadata.get(key);
            if (value === undefined) {
                this.stats.misses++;
                return null;
            }
            // Check expiration
            if (meta?.expiresAt && Date.now() > meta.expiresAt) {
                this.store.delete(key);
                this.metadata.delete(key);
                this.stats.misses++;
                return null;
            }
            this.stats.hits++;
            // Update last accessed time
            if (this.updateAgeOnGet && meta) {
                meta.lastAccessed = Date.now();
                meta.accessCount = (meta.accessCount || 0) + 1;
            }
            // Handle decompression if needed
            if (meta?.compressed && Buffer.isBuffer(value)) {
                try {
                    const decompressed = await decompressData(value, 'gzip');
                    if (typeof decompressed === 'string') {
                        try {
                            return JSON.parse(decompressed);
                        }
                        catch (e) {
                            // If parsing fails, return the string value
                            return decompressed;
                        }
                    }
                    return decompressed;
                }
                catch (e) {
                    // If decompression fails, return the raw value
                    return value;
                }
            }
            return value;
        }
        catch (error) {
            console.error(`Error getting cache key ${key}:`, error);
            return null;
        }
    }
    /**
     * Set a value in the cache
     */
    async set(key, value, options) {
        try {
            const ttl = options?.ttl !== undefined ? options.ttl : this.defaultTtl;
            // Ensure we have space - evict if needed
            this.ensureCapacity();
            let processedValue = value;
            let size;
            let compressed = false;
            // Handle compression if enabled
            if (options?.compression) {
                const threshold = options.compressionThreshold || 1024;
                // Only compress string values or objects that can be stringified
                if (typeof value === 'string' || (typeof value === 'object' && value !== null)) {
                    try {
                        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
                        if (Buffer.byteLength(serialized, 'utf8') > threshold) {
                            const compressedData = await compressData(Buffer.from(serialized));
                            processedValue = compressedData.data;
                            compressed = true;
                            size = compressedData.data.length;
                        }
                        else {
                            size = Buffer.byteLength(serialized, 'utf8');
                        }
                    }
                    catch (e) {
                        console.error('Compression error:', e);
                        // Fallback to uncompressed
                        size = this.calculateSize(value);
                    }
                }
                else {
                    size = this.calculateSize(value);
                }
            }
            else {
                size = this.calculateSize(value);
            }
            // Check if value exceeds maximum size
            if (size > this.maxSize) {
                throw new Error(`Value for key "${key}" exceeds maximum size (${size} > ${this.maxSize})`);
            }
            // Store value in cache
            this.store.set(key, processedValue);
            // Update metadata
            this.metadata.set(key, {
                tags: options?.tags || [],
                createdAt: Date.now(),
                expiresAt: ttl > 0 ? Date.now() + (ttl * 1000) : undefined,
                size,
                compressed,
                lastAccessed: Date.now(),
                accessCount: 0
            });
            this.stats.sets++;
            this.stats.size = this.calculateTotalSize();
            // Emit event
            emitCacheEvent(CacheEventType.SET, {
                key,
                size,
                ttl
            });
        }
        catch (error) {
            console.error(`Error setting cache key ${key}:`, error);
            throw error;
        }
    }
    /**
     * Delete a value from the cache
     */
    async delete(key) {
        try {
            const existed = this.store.has(key);
            if (existed) {
                this.store.delete(key);
                this.metadata.delete(key);
                this.stats.deletes++;
                this.stats.size = this.calculateTotalSize();
                emitCacheEvent(CacheEventType.DELETE, { key });
            }
            return existed;
        }
        catch (error) {
            console.error(`Error deleting cache key ${key}:`, error);
            return false;
        }
    }
    /**
     * Check if a key exists in the cache
     */
    async has(key) {
        const value = await this.get(key);
        return value !== null;
    }
    /**
     * Clear all values from the cache
     */
    async clear() {
        try {
            const count = this.store.size;
            this.store.clear();
            this.metadata.clear();
            // Reset stats
            this.stats.size = 0;
            emitCacheEvent(CacheEventType.CLEAR, { entriesRemoved: count });
        }
        catch (error) {
            console.error('Error clearing cache:', error);
        }
    }
    /**
     * Get multiple values from the cache
     */
    async getMany(keys) {
        const result = {};
        for (const key of keys) {
            result[key] = await this.get(key);
        }
        return result;
    }
    /**
     * Set multiple values in the cache
     */
    async setMany(entries, options) {
        for (const [key, value] of Object.entries(entries)) {
            await this.set(key, value, options);
        }
    }
    /**
     * Invalidate cache entries by tag
     */
    async invalidateByTag(tag) {
        let count = 0;
        // Find keys with the specified tag
        const keysToInvalidate = [];
        for (const [key, meta] of this.metadata.entries()) {
            if (meta.tags.includes(tag)) {
                keysToInvalidate.push(key);
            }
        }
        // Delete each key
        for (const key of keysToInvalidate) {
            const deleted = await this.delete(key);
            if (deleted)
                count++;
        }
        emitCacheEvent(CacheEventType.INVALIDATE, {
            tag,
            entriesRemoved: count
        });
        return count;
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            keyCount: this.store.size,
            size: this.stats.size,
            maxSize: this.maxSize
        };
    }
    /**
     * Get metadata for a key
     */
    async getMetadata(key) {
        return this.metadata.get(key) || null;
    }
    /**
     * Calculate the total size of all cache entries
     */
    calculateTotalSize() {
        let size = 0;
        for (const meta of this.metadata.values()) {
            size += meta.size;
        }
        return size;
    }
    /**
     * Calculate size of a value
     */
    calculateSize(value) {
        if (value === null || value === undefined) {
            return 8;
        }
        if (typeof value === 'string') {
            return Buffer.byteLength(value, 'utf8');
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return 8;
        }
        if (Buffer.isBuffer(value)) {
            return value.length;
        }
        try {
            const serialized = JSON.stringify(value);
            return Buffer.byteLength(serialized, 'utf8');
        }
        catch (e) {
            return 1024; // Default size if serialization fails
        }
    }
    /**
     * Ensure the cache has capacity for new items
     */
    ensureCapacity() {
        // Check item count limit
        if (this.store.size >= this.maxItems) {
            this.evictLRU();
        }
        // Check size limit
        while (this.calculateTotalSize() >= this.maxSize && this.store.size > 0) {
            this.evictLRU();
        }
    }
    /**
     * Evict least recently used item
     */
    evictLRU() {
        let oldestKey = null;
        let oldestAccess = Infinity;
        for (const [key, meta] of this.metadata.entries()) {
            if (meta.lastAccessed < oldestAccess) {
                oldestAccess = meta.lastAccessed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.delete(oldestKey).then(r => { });
            emitCacheEvent(CacheEventType.EXPIRE, {
                key: oldestKey,
                reason: 'lru'
            });
        }
    }
}
//# sourceMappingURL=memory-storage.js.map