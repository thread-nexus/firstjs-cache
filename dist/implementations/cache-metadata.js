"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheMetadataManager = void 0;
class CacheMetadataManager {
    constructor() {
        this.metadata = new Map();
    }
    set(key, data) {
        const now = Date.now();
        const existing = this.metadata.get(key);
        const entry = {
            tags: data.tags || existing?.tags || [],
            createdAt: existing?.createdAt || now,
            lastAccessed: now,
            updatedAt: now,
            accessCount: existing?.accessCount || 0,
            size: data.size || existing?.size || 0,
            compressed: data.compressed || existing?.compressed,
            computeTime: data.computeTime,
            expiresAt: data.expiresAt,
        };
        this.metadata.set(key, entry);
    }
    get(key) {
        return this.metadata.get(key);
    }
    /**
     * Clear all metadata
     */
    clear() {
        this.metadata.clear();
    }
    /**
     * Delete metadata for a cache key
     *
     * @param key - The cache key
     * @returns True if metadata was deleted, false otherwise
     */
    delete(key) {
        return this.metadata.delete(key);
    }
    /**
     * Find keys by tag
     *
     * @param tag - Tag to search for
     * @returns Array of keys with the specified tag
     */
    findByTag(tag) {
        const result = [];
        this.metadata.forEach((data, key) => {
            if (data.tags.includes(tag)) {
                result.push(key);
            }
        });
        return result;
    }
    /**
     * Find keys by prefix
     *
     * @param prefix - Prefix to search for
     * @returns Array of keys with the specified prefix
     */
    findByPrefix(prefix) {
        const result = [];
        this.metadata.forEach((_, key) => {
            if (key.startsWith(prefix)) {
                result.push(key);
            }
        });
        return result;
    }
    /**
     * Find keys by pattern
     *
     * @param pattern - Pattern to match against keys
     * @returns Array of keys matching the pattern
     */
    findByPattern(pattern) {
        try {
            const regex = new RegExp(pattern);
            const result = [];
            this.metadata.forEach((_, key) => {
                if (regex.test(key)) {
                    result.push(key);
                }
            });
            return result;
        }
        catch (error) {
            // If the pattern is not a valid regex, treat it as a literal string
            return this.findByPrefix(pattern);
        }
    }
    /**
     * Update access count for a key
     *
     * @param key - The cache key
     */
    recordAccess(key) {
        const metadata = this.metadata.get(key);
        if (metadata) {
            metadata.accessCount += 1;
            metadata.updatedAt = Date.now();
        }
    }
    /**
     * Get all keys
     *
     * @returns Array of all keys
     */
    keys() {
        return Array.from(this.metadata.keys());
    }
    /**
     * Get the number of entries
     *
     * @returns Number of entries
     */
    size() {
        return this.metadata.size;
    }
}
exports.CacheMetadataManager = CacheMetadataManager;
//# sourceMappingURL=cache-metadata.js.map