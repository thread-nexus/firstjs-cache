"use strict";
/**
 * @fileoverview Advanced metadata management for cache entries with
 * tag-based operations and efficient lookups.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheMetadataManager = void 0;
const cache_events_1 = require("../events/cache-events");
class CacheMetadataManager {
    constructor() {
        // Primary metadata storage
        this.metadata = new Map();
        // Index for tag-based lookups
        this.tagIndex = new Map();
        // LRU tracking
        this.accessOrder = [];
        this.maxAccessHistory = 1000;
    }
    /**
     * Set metadata for a cache entry
     */
    set(key, data) {
        const now = new Date();
        const existing = this.metadata.get(key);
        const entry = Object.assign({ key, createdAt: (existing === null || existing === void 0 ? void 0 : existing.createdAt) || now, updatedAt: now, accessCount: (existing === null || existing === void 0 ? void 0 : existing.accessCount) || 0, tags: [...((existing === null || existing === void 0 ? void 0 : existing.tags) || []), ...(data.tags || [])], computeTime: data.computeTime, refreshedAt: data.refreshedAt }, data);
        // Update metadata
        this.metadata.set(key, entry);
        // Update tag index
        entry.tags.forEach(tag => {
            if (!this.tagIndex.has(tag)) {
                this.tagIndex.set(tag, new Set());
            }
            this.tagIndex.get(tag).add(key);
        });
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.METADATA_UPDATE, {
            key,
            metadata: entry
        });
    }
    /**
     * Get metadata for a cache entry
     */
    get(key) {
        const entry = this.metadata.get(key);
        if (!entry)
            return undefined;
        // Check expiration
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.delete(key);
            return undefined;
        }
        return Object.assign({}, entry);
    }
    /**
     * Record access to a cache entry
     */
    recordAccess(key) {
        const entry = this.metadata.get(key);
        if (!entry)
            return;
        // Update access stats
        entry.accessCount++;
        entry.updatedAt = new Date();
        // Update LRU tracking
        this.accessOrder = [
            key,
            ...this.accessOrder.filter(k => k !== key)
        ].slice(0, this.maxAccessHistory);
    }
    /**
     * Delete metadata for a cache entry
     */
    delete(key) {
        const entry = this.metadata.get(key);
        if (!entry)
            return false;
        // Remove from tag index
        entry.tags.forEach(tag => {
            const tagSet = this.tagIndex.get(tag);
            if (tagSet) {
                tagSet.delete(key);
                if (tagSet.size === 0) {
                    this.tagIndex.delete(tag);
                }
            }
        });
        // Remove from metadata and access order
        this.metadata.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.METADATA_DELETE, {
            key,
            metadata: entry
        });
        return true;
    }
    /**
     * Find keys by tag
     */
    findByTag(tag) {
        return Array.from(this.tagIndex.get(tag) || []);
    }
    /**
     * Find keys by pattern
     */
    findByPattern(pattern) {
        try {
            const regex = new RegExp(pattern);
            return Array.from(this.metadata.keys()).filter(key => regex.test(key));
        }
        catch (error) {
            // If pattern is not a valid regex, treat it as a prefix
            return this.findByPrefix(pattern);
        }
    }
    /**
     * Find keys by prefix
     */
    findByPrefix(prefix) {
        return Array.from(this.metadata.keys())
            .filter(key => key.startsWith(prefix));
    }
    /**
     * Get all cache keys
     */
    keys() {
        return Array.from(this.metadata.keys());
    }
    /**
     * Get recently accessed keys
     */
    getRecentlyAccessed(limit = 10) {
        return this.accessOrder.slice(0, limit);
    }
    /**
     * Get metadata statistics
     */
    getStats() {
        let totalAccess = 0;
        const keyAccessCounts = [];
        this.metadata.forEach((entry, key) => {
            totalAccess += entry.accessCount;
            keyAccessCounts.push({
                key,
                accessCount: entry.accessCount
            });
        });
        // Sort by access count descending
        keyAccessCounts.sort((a, b) => b.accessCount - a.accessCount);
        return {
            totalEntries: this.metadata.size,
            tagCount: this.tagIndex.size,
            averageAccessCount: totalAccess / Math.max(1, this.metadata.size),
            recentlyAccessed: this.accessOrder.length,
            tags: Array.from(this.tagIndex.keys()),
            mostAccessedKeys: keyAccessCounts.slice(0, 10)
        };
    }
    /**
     * Clear all metadata
     */
    clear() {
        const stats = this.getStats();
        this.metadata.clear();
        this.tagIndex.clear();
        this.accessOrder = [];
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.METADATA_CLEAR, {
            stats,
            message: 'All metadata cleared'
        });
    }
    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        const expiredEntries = [];
        this.metadata.forEach((entry, key) => {
            if (entry.expiresAt && entry.expiresAt < now) {
                expiredEntries.push(entry);
                this.delete(key);
                cleaned++;
            }
        });
        if (cleaned > 0) {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.CLEANUP, {
                entriesRemoved: cleaned,
                expiredEntries: expiredEntries.map(entry => ({
                    key: entry.key,
                    tags: entry.tags,
                    createdAt: entry.createdAt,
                    expiresAt: entry.expiresAt
                }))
            });
        }
        return cleaned;
    }
}
exports.CacheMetadataManager = CacheMetadataManager;
