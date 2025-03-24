/**
 * @fileoverview Cache metadata manager for tracking additional information about cache entries
 */
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
/**
 * Cache metadata manager
 */
export class CacheMetadata {
    constructor() {
        this.metadata = new Map();
    }
    /**
     * Create a new metadata entry
     *
     * @param key - Cache key
     * @param tags - Tags to associate with the entry
     * @param options - Additional metadata options
     * @returns The created metadata entry
     */
    create(key, tags = [], options = {}) {
        if (!key || typeof key !== 'string' || key.trim() === '') {
            throw new Error('Invalid cache key');
        }
        const now = new Date();
        const entry = {
            tags: tags || [],
            createdAt: now,
            updatedAt: new Date(now.getTime() + 1), // Ensure updatedAt is greater than createdAt
            accessCount: 0,
            accessHistory: [],
            size: options.size || 0, // Ensure size property is set
            ...options
        };
        this.metadata.set(key, entry);
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.METADATA_UPDATE, {
            key,
            metadata: entry,
            type: CacheEventType.METADATA_UPDATE.toString(),
            timestamp: Date.now()
        });
        return entry;
    }
    /**
     * Create multiple metadata entries at once
     *
     * @param entries - Map of keys to metadata options
     * @returns Map of keys to created metadata entries
     */
    bulkCreate(entries) {
        const result = {};
        for (const [key, { tags, options }] of Object.entries(entries)) {
            result[key] = this.create(key, tags, options);
        }
        return result;
    }
    /**
     * Set metadata for a cache key
     *
     * @param key - Cache key
     * @param options - Metadata options
     */
    set(key, options = {}) {
        const now = new Date();
        const existingMetadata = this.metadata.get(key);
        if (existingMetadata) {
            // Update existing metadata
            const updatedMetadata = {
                ...existingMetadata,
                tags: options.tags || existingMetadata.tags,
                updatedAt: new Date(now.getTime() + 1), // Ensure updatedAt is greater than createdAt
                ...options
            };
            this.metadata.set(key, updatedMetadata);
        }
        else {
            // Create new metadata
            this.create(key, options.tags, options);
        }
    }
    /**
     * Update an existing metadata entry
     *
     * @param key - Cache key
     * @param updates - Properties to update
     * @returns The updated metadata entry or undefined if not found
     */
    update(key, updates) {
        const entry = this.metadata.get(key);
        if (!entry) {
            throw new Error(`Metadata for key "${key}" not found`);
        }
        const updatedEntry = {
            ...entry,
            ...updates,
            updatedAt: new Date()
        };
        this.metadata.set(key, updatedEntry);
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.METADATA_UPDATE, {
            key,
            metadata: updatedEntry,
            type: CacheEventType.METADATA_UPDATE.toString(),
            timestamp: Date.now()
        });
        return updatedEntry;
    }
    /**
     * Get metadata for a cache key
     *
     * @param key - Cache key
     * @returns Metadata or undefined if not found
     * Convert CacheEntryMetadata to EntryMetadata for compatibility
     */
    get(key) {
        const metadata = this.metadata.get(key);
        if (!metadata)
            return undefined;
        // Convert CacheEntryMetadata to EntryMetadata
        return {
            tags: metadata.tags,
            createdAt: metadata.createdAt.getTime(), // Convert Date to number
            lastAccessed: metadata.lastAccessed ? metadata.lastAccessed.getTime() : metadata.createdAt.getTime(),
            size: metadata.size,
            accessCount: metadata.accessCount,
            expiresAt: metadata.ttl ? metadata.createdAt.getTime() + (metadata.ttl * 1000) : undefined,
            compressed: metadata.compressed || false,
            // Include any other required properties
        };
    }
    /**
     * Delete metadata for a cache key
     *
     * @param key - Cache key
     * @returns True if metadata was deleted, false if not found
     */
    delete(key) {
        const deleted = this.metadata.delete(key);
        if (deleted) {
            // Add required properties to event payload
            emitCacheEvent(CacheEventType.METADATA_DELETE, {
                key,
                type: CacheEventType.METADATA_DELETE.toString(),
                timestamp: Date.now()
            });
        }
        return deleted;
    }
    /**
     * Clear all metadata
     */
    clear() {
        const count = this.metadata.size;
        this.metadata.clear();
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.METADATA_CLEAR, {
            count,
            type: CacheEventType.METADATA_CLEAR.toString(),
            timestamp: Date.now()
        });
    }
    /**
     * Record an access to a cache key
     *
     * @param key - Cache key
     */
    recordAccess(key) {
        const entry = this.metadata.get(key);
        if (entry) {
            entry.accessCount++;
            const now = new Date();
            entry.lastAccessed = now;
            // Track access history if available
            if (Array.isArray(entry.accessHistory)) {
                entry.accessHistory.push(now);
                // Limit history size
                if (entry.accessHistory.length > 10) {
                    entry.accessHistory = entry.accessHistory.slice(-10);
                }
            }
            else {
                entry.accessHistory = [now];
            }
        }
    }
    /**
     * Get metadata entries by tag
     *
     * @param tag - Tag to search for
     * @returns Array of matching entries with their keys
     */
    getByTag(tag) {
        const result = [];
        for (const [key, meta] of this.metadata.entries()) {
            if (meta.tags.includes(tag)) {
                result.push({ key, metadata: meta });
            }
        }
        return result;
    }
    /**
     * Find cache keys by tag
     *
     * @param tag - Tag to search for
     * @returns Array of matching keys
     */
    findByTag(tag) {
        const result = [];
        for (const [key, meta] of this.metadata.entries()) {
            if (meta.tags.includes(tag)) {
                result.push(key);
            }
        }
        return result;
    }
    /**
     * Find cache keys by prefix
     *
     * @param prefix - Key prefix to search for
     * @returns Array of matching keys
     */
    findByPrefix(prefix) {
        const result = [];
        for (const key of this.metadata.keys()) {
            if (key.startsWith(prefix)) {
                result.push(key);
            }
        }
        return result;
    }
    /**
     * Find cache keys by pattern
     *
     * @param pattern - Regular expression pattern to match keys
     * @returns Array of matching keys
     */
    findByPattern(pattern) {
        const regex = new RegExp(pattern);
        const result = [];
        for (const key of this.metadata.keys()) {
            if (regex.test(key)) {
                result.push(key);
            }
        }
        return result;
    }
    /**
     * Check if a metadata entry is expired
     *
     * @param key - Cache key
     * @returns True if expired, false otherwise
     */
    isExpired(key) {
        const entry = this.metadata.get(key);
        if (!entry || !entry.ttl) {
            return false;
        }
        const expirationTime = entry.createdAt.getTime() + (entry.ttl * 1000);
        return Date.now() > expirationTime;
    }
    /**
     * Get access history for a key
     *
     * @param key - Cache key
     * @returns Array of access timestamps or undefined if not found
     */
    getAccessHistory(key) {
        return this.metadata.get(key)?.accessHistory;
    }
    /**
     * Get all cache keys with metadata
     *
     * @returns Array of all keys
     */
    keys() {
        return Array.from(this.metadata.keys());
    }
    /**
     * Get the number of metadata entries
     *
     * @returns Number of entries
     */
    size() {
        return this.metadata.size;
    }
    /**
     * Get summary statistics about metadata
     *
     * @returns Metadata statistics
     */
    getStats() {
        let totalAccesses = 0;
        let tagCounts = {};
        for (const meta of this.metadata.values()) {
            totalAccesses += meta.accessCount;
            // Count tag occurrences
            if (meta.tags) {
                for (const tag of meta.tags) {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                }
            }
        }
        // Calculate average TTL and age
        let totalTtl = 0;
        let ttlCount = 0;
        let totalAge = 0;
        const now = Date.now();
        for (const meta of this.metadata.values()) {
            if (meta.ttl) {
                totalTtl += meta.ttl;
                ttlCount++;
            }
            if (meta.createdAt) {
                totalAge += now - meta.createdAt.getTime();
            }
        }
        return {
            entryCount: this.metadata.size,
            totalAccesses,
            avgAccessesPerKey: this.metadata.size ? totalAccesses / this.metadata.size : 0,
            avgTtl: ttlCount ? totalTtl / ttlCount : 0,
            avgAge: this.metadata.size ? totalAge / this.metadata.size : 0,
            tagStats: {
                uniqueTags: Object.keys(tagCounts).length,
                tagCounts
            }
        };
    }
}
//# sourceMappingURL=CacheMetadata.js.map