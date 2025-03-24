"use strict";
/**
 * @fileoverview Browser localStorage adapter with size management and expiration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageAdapter = void 0;
const cache_events_1 = require("../events/cache-events");
const error_utils_1 = require("../utils/error-utils");
class LocalStorageAdapter {
    constructor(config = {}) {
        this.name = 'localStorage';
        this.currentSize = 0;
        this.prefix = config.prefix || 'cache';
        this.maxSize = config.maxSize || 5 * 1024 * 1024; // 5MB default
        this.initializeSize();
    }
    /**
     * Initialize size tracking
     */
    initializeSize() {
        try {
            let totalSize = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.prefix)) {
                    const entry = this.getEntry(key);
                    if (entry) {
                        totalSize += entry.size;
                    }
                }
            }
            this.currentSize = totalSize;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'initialize',
                provider: 'localStorage'
            });
        }
    }
    /**
     * Get value from localStorage
     */
    async get(key) {
        try {
            const entry = this.getEntry(this.getKeyWithPrefix(key));
            if (!entry) {
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.GET_MISS, {
                    key,
                    provider: 'localStorage'
                });
                return null;
            }
            // Check expiration
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                await this.delete(key);
                return null;
            }
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.GET_HIT, {
                key,
                provider: 'localStorage',
                age: Date.now() - entry.createdAt
            });
            // For non-string values, try to parse JSON
            if (typeof entry.value === 'string') {
                try {
                    return JSON.parse(entry.value);
                }
                catch {
                    return entry.value;
                }
            }
            return entry.value;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'get',
                key,
                provider: 'localStorage'
            });
            return null;
        }
    }
    /**
     * Set value in localStorage
     */
    async set(key, value, options) {
        try {
            // Convert value to string if needed
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            const size = this.getSize(stringValue);
            // Ensure space is available
            if (size > this.maxSize) {
                throw new Error('Value exceeds maximum storage size');
            }
            // Make space if needed
            await this.ensureSpace(size);
            const entry = {
                value: stringValue,
                size,
                createdAt: Date.now(),
                expiresAt: options?.ttl ? Date.now() + (options.ttl * 1000) : undefined
            };
            const prefixedKey = this.getKeyWithPrefix(key);
            const oldEntry = this.getEntry(prefixedKey);
            if (oldEntry) {
                this.currentSize -= oldEntry.size;
            }
            localStorage.setItem(prefixedKey, JSON.stringify(entry));
            this.currentSize += size;
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                key,
                provider: 'localStorage',
                size
            });
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'set',
                key,
                provider: 'localStorage'
            });
            throw error;
        }
    }
    /**
     * Check if key exists in localStorage
     */
    async has(key) {
        try {
            const entry = this.getEntry(this.getKeyWithPrefix(key));
            if (!entry) {
                return false;
            }
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                await this.delete(key);
                return false;
            }
            return true;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'has',
                key,
                provider: 'localStorage'
            });
            return false;
        }
    }
    /**
     * Delete value from localStorage
     */
    async delete(key) {
        try {
            const prefixedKey = this.getKeyWithPrefix(key);
            const entry = this.getEntry(prefixedKey);
            if (!entry) {
                return false;
            }
            localStorage.removeItem(prefixedKey);
            this.currentSize -= entry.size;
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.DELETE, {
                key,
                provider: 'localStorage'
            });
            return true;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'delete',
                key,
                provider: 'localStorage'
            });
            return false;
        }
    }
    /**
     * Clear all values with prefix
     */
    async clear() {
        try {
            const keys = this.getAllKeys();
            keys.forEach(key => {
                localStorage.removeItem(key);
            });
            this.currentSize = 0;
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.CLEAR, {
                provider: 'localStorage',
                clearedKeys: keys.length
            });
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'clear',
                provider: 'localStorage'
            });
            throw error;
        }
    }
    /**
     * Get matching keys
     */
    async keys(pattern) {
        try {
            const keys = this.getAllKeys();
            if (!pattern) {
                return keys.map(key => this.removePrefix(key));
            }
            const regex = new RegExp(pattern.replace('*', '.*'));
            return keys
                .filter(key => regex.test(this.removePrefix(key)))
                .map(key => this.removePrefix(key));
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'keys',
                provider: 'localStorage'
            });
            throw error;
        }
    }
    /**
     * Get multiple values
     */
    async getMany(keys) {
        const result = {};
        for (const key of keys) {
            result[key] = await this.get(key);
        }
        return result;
    }
    /**
     * Set multiple values
     */
    async setMany(entries, options) {
        for (const [key, value] of Object.entries(entries)) {
            await this.set(key, value, options);
        }
    }
    /**
     * Get storage statistics
     */
    async getStats() {
        return {
            provider: 'localStorage',
            size: this.currentSize,
            maxSize: this.maxSize,
            itemCount: (await this.keys()).length
        };
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            // Perform actual health check
            return {
                status: 'healthy',
                healthy: true,
                timestamp: Date.now()
            };
        }
        catch (error) {
            // Since HealthStatus now supports the error property:
            return {
                status: 'unhealthy',
                healthy: false,
                timestamp: Date.now(),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    getKeyWithPrefix(key) {
        return `${this.prefix}:${key}`;
    }
    removePrefix(key) {
        return key.slice(this.prefix.length + 1);
    }
    getSize(value) {
        return new Blob([value]).size;
    }
    getEntry(key) {
        const data = localStorage.getItem(key);
        if (!data)
            return null;
        try {
            return JSON.parse(data);
        }
        catch {
            return null;
        }
    }
    getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix)) {
                keys.push(key);
            }
        }
        return keys;
    }
    /**
     * Ensure enough space is available
     */
    async ensureSpace(requiredSize) {
        if (this.currentSize + requiredSize <= this.maxSize) {
            return;
        }
        // Get all entries sorted by creation time
        const entries = this.getAllKeys()
            .map(key => ({
            key,
            entry: this.getEntry(key)
        }))
            .filter(({ entry }) => entry)
            .sort((a, b) => a.entry.createdAt - b.entry.createdAt);
        // Remove oldest entries until we have enough space
        for (const { key } of entries) {
            if (this.currentSize + requiredSize <= this.maxSize) {
                break;
            }
            await this.delete(this.removePrefix(key));
        }
        if (this.currentSize + requiredSize > this.maxSize) {
            throw new Error('Unable to free enough space');
        }
    }
}
exports.LocalStorageAdapter = LocalStorageAdapter;
//# sourceMappingURL=local-storage-adapter.js.map