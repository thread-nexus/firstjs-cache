"use strict";
/**
 * @fileoverview Browser localStorage adapter with size management and expiration
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
exports.LocalStorageAdapter = void 0;
const cache_events_1 = require("../events/cache-events");
const error_utils_1 = require("../utils/error-utils");
class LocalStorageAdapter {
    constructor(config = {}) {
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
                if (key === null || key === void 0 ? void 0 : key.startsWith(this.prefix)) {
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
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const entry = this.getEntry(this.getKeyWithPrefix(key));
                if (!entry) {
                    new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.GET_MISS, {
                        key,
                        provider: 'localStorage'
                    });
                    return null;
                }
                // Check expiration
                if (entry.expiresAt && Date.now() > entry.expiresAt) {
                    yield this.delete(key);
                    return null;
                }
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.GET_HIT, {
                    key,
                    provider: 'localStorage',
                    age: Date.now() - entry.createdAt
                });
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
        });
    }
    /**
     * Set value in localStorage
     */
    set(key, value, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const size = this.getSize(value);
                // Ensure space is available
                if (size > this.maxSize) {
                    throw new Error('Value exceeds maximum storage size');
                }
                // Make space if needed
                yield this.ensureSpace(size);
                const entry = {
                    value,
                    size,
                    createdAt: Date.now(),
                    expiresAt: ttl ? Date.now() + (ttl * 1000) : undefined
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
        });
    }
    /**
     * Check if key exists in localStorage
     */
    has(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const entry = this.getEntry(this.getKeyWithPrefix(key));
                if (!entry) {
                    return false;
                }
                if (entry.expiresAt && Date.now() > entry.expiresAt) {
                    yield this.delete(key);
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
        });
    }
    /**
     * Delete value from localStorage
     */
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    /**
     * Clear all values with prefix
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    /**
     * Get matching keys
     */
    keys(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    pattern,
                    provider: 'localStorage'
                });
                throw error;
            }
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
        catch (_a) {
            return null;
        }
    }
    getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key === null || key === void 0 ? void 0 : key.startsWith(this.prefix)) {
                keys.push(key);
            }
        }
        return keys;
    }
    /**
     * Ensure enough space is available
     */
    ensureSpace(requiredSize) {
        return __awaiter(this, void 0, void 0, function* () {
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
                yield this.delete(this.removePrefix(key));
            }
            if (this.currentSize + requiredSize > this.maxSize) {
                throw new Error('Unable to free enough space');
            }
        });
    }
}
exports.LocalStorageAdapter = LocalStorageAdapter;
