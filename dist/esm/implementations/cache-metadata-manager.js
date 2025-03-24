/**
 * @fileoverview Cache metadata management implementation
 */
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
/**
* Cache metadata manager implementation
 */
export class CacheMetadataManager {
    constructor() {
        this.metadata = new Map();
    }
    /**
     * Set metadata for a cache item
     *
     * @param key - Cache key
     * @param data - Metadata to set
     */
    set(key, data) {
        const existing = this.metadata.get(key);
        const now = Date.now();
        const metadata = {
            key,
            tags: data.tags || existing?.tags || [],
            createdAt: existing?.createdAt || now,
            lastAccessed: now,
            accessCount: existing?.accessCount || 0,
            size: data.size !== undefined ? data.size : existing?.size,
            ttl: data.ttl !== undefined ? data.ttl : existing?.ttl
        };
        // Calculate expiration if TTL is provided
        if (metadata.ttl !== undefined && metadata.ttl > 0) {
            metadata.expiresAt = now + metadata.ttl * 1000;
        }
        else {
            metadata.expiresAt = undefined;
        }
        this.metadata.set(key, metadata);
        emitCacheEvent(CacheEventType.METADATA_UPDATE, {
            key,
            metadata: { ...metadata }
        });
    }
    /**
     * Get metadata for a cache item
     *
     * @param key - Cache key
     * @returns Metadata or null if not found
     */
    get(key) {
        const metadata = this.metadata.get(key);
        return metadata ? { ...metadata } : null;
    }
    /**
     * Delete metadata for a cache item
     *
     * @param key - Cache key
     * @returns Whether metadata was deleted
     */
    delete(key) {
        const deleted = this.metadata.delete(key);
        if (deleted) {
            emitCacheEvent(CacheEventType.METADATA_DELETE, { key });
        }
        return deleted;
    }
    /**
     * Record access to a cache item
     *
     * @param key - Cache key
     */
    recordAccess(key) {
        const metadata = this.metadata.get(key);
        if (metadata) {
            metadata.lastAccessed = Date.now();
            metadata.accessCount++;
            this.metadata.set(key, metadata);
        }
    }
    /**
     * Find keys by tag
     *
     * @param tag - Tag to search for
     * @returns Array of keys with the tag
     */
    findByTag(tag) {
        const keys = [];
        for (const [key, metadata] of this.metadata.entries()) {
            if (metadata.tags.includes(tag)) {
                keys.push(key);
            }
        }
        return keys;
    }
    /**
     * Find expired keys
     *
     * @returns Array of expired keys
     */
    findExpired() {
        const now = Date.now();
        const keys = [];
        for (const [key, metadata] of this.metadata.entries()) {
            if (metadata.expiresAt && metadata.expiresAt <= now) {
                keys.push(key);
            }
        }
        return keys;
    }
    /**
     * Clear all metadata
     */
    clear() {
        this.metadata.clear();
        emitCacheEvent(CacheEventType.METADATA_CLEAR, {});
    }
    /**
     * Get all metadata
     *
     * @returns All metadata
     */
    getAll() {
        const result = {};
        for (const [key, metadata] of this.metadata.entries()) {
            result[key] = { ...metadata };
        }
        return result;
    }
}
//# sourceMappingURL=cache-metadata-manager.js.map