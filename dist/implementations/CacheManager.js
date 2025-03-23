"use strict";
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
exports.CacheManager = void 0;
const CacheMetadata_1 = require("./CacheMetadata");
/**
 * CacheManager implementation
 */
class CacheManager {
    constructor() {
        this.providers = new Map();
        this.metadata = new CacheMetadata_1.CacheMetadata();
    }
    /**
     * Register a cache provider
     *
     * @param name Unique name for the provider
     * @param provider The cache provider instance
     */
    registerProvider(name, provider) {
        this.providers.set(name, provider);
    }
    /**
     * Get a value from cache
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const provider of this.providers.values()) {
                const value = yield provider.get(key);
                if (value !== null) {
                    this.metadata.recordAccess(key);
                    return value;
                }
            }
            return null;
        });
    }
    /**
     * Store a value in cache
     */
    set(key, value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const provider of this.providers.values()) {
                yield provider.set(key, value, options);
            }
            this.metadata.set(key, { tags: (options === null || options === void 0 ? void 0 : options.tags) || [] });
        });
    }
    /**
     * Delete a value from all cache layers
     */
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let deleted = false;
            for (const provider of this.providers.values()) {
                deleted = (yield provider.delete(key)) || deleted;
            }
            this.metadata.delete(key);
            return deleted;
        });
    }
    /**
     * Clear all cache layers
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const provider of this.providers.values()) {
                yield provider.clear();
            }
            this.metadata.clear();
        });
    }
    /**
     * Get cache statistics from all layers
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = {};
            for (const [name, provider] of this.providers.entries()) {
                stats[name] = yield provider.getStats();
            }
            return stats;
        });
    }
    /**
     * Get or compute a value - returns from cache if available or computes and caches it
     */
    getOrCompute(key, fn, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const cachedValue = yield this.get(key);
            if (cachedValue !== null) {
                return cachedValue;
            }
            const computedValue = yield fn();
            yield this.set(key, computedValue, options);
            return computedValue;
        });
    }
    /**
     * Wrap a function with caching
     */
    wrap(fn, keyGenerator, options) {
        const wrappedFunction = (...args) => __awaiter(this, void 0, void 0, function* () {
            const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
            return this.getOrCompute(key, () => fn(...args), options);
        });
        wrappedFunction.invalidateCache = (...args) => __awaiter(this, void 0, void 0, function* () {
            const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
            yield this.delete(key);
        });
        return wrappedFunction;
    }
    /**
     * Invalidate all entries with a given tag
     */
    invalidateByTag(tag) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = this.metadata.findByTag(tag);
            for (const key of keys) {
                yield this.delete(key);
            }
        });
    }
    /**
     * Get a specific cache provider by layer name
     */
    getProvider(layer) {
        return this.providers.get(layer) || null;
    }
    /**
     * Get metadata for a cache key
     */
    getMetadata(key) {
        return this.metadata.get(key);
    }
    /**
     * Invalidate cache entries by prefix
     */
    invalidateByPrefix(prefix) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = this.metadata.findByPrefix(prefix);
            for (const key of keys) {
                yield this.delete(key);
            }
        });
    }
    /**
     * Delete cache entries matching a pattern
     */
    deleteByPattern(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = this.metadata.findByPattern(pattern);
            for (const key of keys) {
                yield this.delete(key);
            }
        });
    }
    /**
     * Get all keys matching a pattern
     */
    keys(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!pattern) {
                return this.metadata.keys();
            }
            return this.metadata.findByPattern(pattern);
        });
    }
    /**
     * Get multiple values from cache
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
     * Set multiple values in cache
     */
    setMany(entries, options) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [key, value] of Object.entries(entries)) {
                yield this.set(key, value, options);
            }
        });
    }
}
exports.CacheManager = CacheManager;
