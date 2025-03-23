"use strict";
/**
 * @fileoverview In-memory storage adapter implementation with LRU caching
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStorageAdapter = exports.MemoryAdapter = void 0;
const cache_events_1 = require("../events/cache-events");
class MemoryAdapter {
    constructor(config = {}) {
        this.store = new Map();
        this.currentSize = 0;
        this.maxSize = config.maxSize || 100 * 1024 * 1024; // 100MB default
        this.prefix = config.prefix || '';
    }
    /**
     * Get value from memory
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const prefixedKey = this.getKeyWithPrefix(key);
            const entry = this.store.get(prefixedKey);
            if (!entry) {
                return null;
            }
            // Check expiration
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                this.store.delete(prefixedKey);
                this.currentSize -= entry.size;
                return null;
            }
            // Update last accessed
            entry.lastAccessed = Date.now();
            return entry.value;
        });
    }
    /**
     * Set value in memory
     */
    set(key, value, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            const prefixedKey = this.getKeyWithPrefix(key);
            const size = this.getSize(value);
            // Ensure enough space
            while (this.currentSize + size > this.maxSize && this.store.size > 0) {
                this.evictLRU();
            }
            const entry = {
                value,
                size,
                lastAccessed: Date.now(),
                expiresAt: ttl ? Date.now() + (ttl * 1000) : undefined
            };
            // Update size tracking
            if (this.store.has(prefixedKey)) {
                this.currentSize -= this.store.get(prefixedKey).size;
            }
            this.currentSize += size;
            this.store.set(prefixedKey, entry);
        });
    }
    /**
     * Check if key exists
     */
    has(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const prefixedKey = this.getKeyWithPrefix(key);
            const entry = this.store.get(prefixedKey);
            if (!entry) {
                return false;
            }
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                this.store.delete(prefixedKey);
                this.currentSize -= entry.size;
                return false;
            }
            return true;
        });
    }
    /**
     * Delete value from memory
     */
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const prefixedKey = this.getKeyWithPrefix(key);
            const entry = this.store.get(prefixedKey);
            if (entry) {
                this.store.delete(prefixedKey);
                this.currentSize -= entry.size;
                return true;
            }
            return false;
        });
    }
    /**
     * Clear all values
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            this.store.clear();
            this.currentSize = 0;
        });
    }
    /**
     * Get matching keys
     */
    keys(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = Array.from(this.store.keys());
            if (!pattern) {
                return keys.map(key => this.removePrefix(key));
            }
            const regex = new RegExp(pattern.replace('*', '.*'));
            return keys
                .filter(key => regex.test(this.removePrefix(key)))
                .map(key => this.removePrefix(key));
        });
    }
    /**
     * Get multiple values
     */
    getMany(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = {};
            for (const key of keys) {
                result[key] = yield this.get(key);
            }
            return result;
        });
    }
    /**
     * Set multiple values
     */
    setMany(entries, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [key, value] of Object.entries(entries)) {
                yield this.set(key, value, ttl);
            }
        });
    }
    /**
     * Get storage stats
     */
    getStats() {
        return {
            size: this.currentSize,
            count: this.store.size,
            maxSize: this.maxSize
        };
    }
    getKeyWithPrefix(key) {
        return this.prefix ? `${this.prefix}:${key}` : key;
    }
    removePrefix(key) {
        return this.prefix ? key.slice(this.prefix.length + 1) : key;
    }
    getSize(value) {
        return Buffer.byteLength(value, 'utf8');
    }
    evictLRU() {
        let oldestKey = null;
        let oldestAccess = Infinity;
        for (const [key, entry] of this.store.entries()) {
            if (entry.lastAccessed < oldestAccess) {
                oldestAccess = entry.lastAccessed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            const entry = this.store.get(oldestKey);
            this.store.delete(oldestKey);
            this.currentSize -= entry.size;
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.EXPIRE, {
                key: this.removePrefix(oldestKey),
                reason: 'lru'
            });
        }
    }
}
exports.MemoryAdapter = MemoryAdapter;
class MemoryStorageAdapter {
}
exports.MemoryStorageAdapter = MemoryStorageAdapter;
