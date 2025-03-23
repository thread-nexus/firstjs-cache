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
const cache_providers_1 = require("./cache-providers");
const cache_compute_1 = require("./cache-compute");
const cache_statistics_1 = require("./cache-statistics");
const cache_metadata_manager_1 = require("./cache-metadata-manager");
const cache_manager_operations_1 = require("./cache-manager-operations");
const cache_events_1 = require("../events/cache-events");
const validation_utils_1 = require("../utils/validation-utils");
const error_utils_1 = require("../utils/error-utils");
const default_config_1 = require("../config/default-config");
/**
 * Core implementation of the cache manager
 */
class CacheManagerCore {
    constructor(config = default_config_1.DEFAULT_CONFIG) {
        var _a;
        this.config = config;
        // Initialize components
        this.providers = new cache_providers_1.CacheProviderManager();
        this.compute = new cache_compute_1.CacheCompute(this.providers.getProvider('primary'), {
            defaultTtl: config.defaultTtl,
            backgroundRefresh: config.backgroundRefresh,
            refreshThreshold: config.refreshThreshold,
        });
        this.statistics = new cache_statistics_1.CacheStatistics();
        this.metadata = new cache_metadata_manager_1.CacheMetadataManager();
        this.operations = new cache_manager_operations_1.CacheManagerOperations(this.providers.getProvider('primary'));
        // Start monitoring if enabled
        if ((_a = config.monitoring) === null || _a === void 0 ? void 0 : _a.enabled) {
            this.startMonitoring();
        }
    }
    /**
     * Register a cache provider
     */
    registerProvider(name, provider, priority = 0) {
        this.providers.registerProvider(name, provider, priority);
    }
    /**
     * Get a value from cache
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, validation_utils_1.validateCacheKey)(key);
            const startTime = performance.now();
            try {
                const value = yield this.providers.get(key);
                const duration = performance.now() - startTime;
                if (value !== null) {
                    this.statistics.recordHit(duration);
                    this.metadata.recordAccess(key);
                }
                else {
                    this.statistics.recordMiss(duration);
                }
                return value;
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, { operation: 'get', key });
                return null;
            }
        });
    }
    /**
     * Set a value in cache
     */
    set(key, value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, validation_utils_1.validateCacheKey)(key);
            (0, validation_utils_1.validateCacheOptions)(options);
            const startTime = performance.now();
            try {
                yield this.providers.set(key, value, options);
                const duration = performance.now() - startTime;
                this.statistics.recordSet(JSON.stringify(value).length, duration);
                this.metadata.set(key, { tags: options === null || options === void 0 ? void 0 : options.tags });
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, { operation: 'set', key });
                throw error;
            }
        });
    }
    /**
     * Delete a value from cache
     */
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.providers.delete(key);
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error instanceof Error ? error : new Error(String(error)), { operation: 'delete', key });
                return false;
            }
        });
    }
    /**
     * Clear the entire cache
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.providers.clear();
                this.statistics.reset();
                this.metadata.clear();
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, { operation: 'clear' });
                throw error;
            }
        });
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.statistics.getStats();
        });
    }
    /**
     * Get or compute a value
     */
    getOrCompute(key, fetcher, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.compute.getOrCompute(key, fetcher, options);
            return result.value;
        });
    }
    /**
     * Start monitoring cache operations
     */
    startMonitoring() {
        // Implementation would go here
    }
}
// Singleton instance for the core cache manager
let cacheManagerInstance = null;
/**
 * Get the singleton cache manager instance
 */
function getCacheManager(config = default_config_1.DEFAULT_CONFIG) {
    if (!cacheManagerInstance) {
        cacheManagerInstance = new CacheManagerCore(config);
    }
    return cacheManagerInstance;
}
/**
 * Cache Manager API facade
 */
exports.CacheManager = {
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                (0, validation_utils_1.validateCacheKey)(key);
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.GET, { key });
                const manager = getCacheManager();
                const result = yield manager.get(key);
                new cache_events_1.emitCacheEvent(result !== null ? cache_events_1.CacheEventType.GET_HIT : cache_events_1.CacheEventType.GET_MISS, { key, found: result !== null });
                return result;
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, { operation: 'get', key });
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.ERROR, { operation: 'get', key });
                return null;
            }
        });
    },
    /**
     * Get or compute a value
     */
    getOrCompute(key, fetcher, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                (0, validation_utils_1.validateCacheKey)(key);
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.COMPUTE_START, { key });
                const manager = getCacheManager();
                const result = yield manager.getOrCompute(key, fetcher, options);
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.COMPUTE_SUCCESS, { key });
                return result;
            }
            catch (error) {
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.COMPUTE_ERROR, { key, error });
                throw error;
            }
        });
    },
    /**
     * Delete a value from cache
     */
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                (0, validation_utils_1.validateCacheKey)(key);
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.DELETE, { key });
                const manager = getCacheManager();
                return yield manager.delete(key);
            }
            catch (error) {
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.ERROR, { operation: 'delete', key, error });
                return false;
            }
        });
    },
    /**
     * Set a value in cache
     */
    set(key, value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                (0, validation_utils_1.validateCacheKey)(key);
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.SET, { key });
                const manager = getCacheManager();
                yield manager.set(key, value, options);
            }
            catch (error) {
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.ERROR, { operation: 'set', key, error });
                throw error;
            }
        });
    },
    /**
     * Get cache statistics
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const manager = getCacheManager();
                const stats = yield manager.getStats();
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.STATS_UPDATE, { stats });
                return stats;
            }
            catch (error) {
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.ERROR, { operation: 'getStats', error });
                throw error;
            }
        });
    },
    /**
     * Clear the entire cache
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.CLEAR, {});
                const manager = getCacheManager();
                yield manager.clear();
            }
            catch (error) {
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.ERROR, { operation: 'clear', error });
                throw error;
            }
        });
    },
    /**
     * Get multiple values from cache
     */
    getMany(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const manager = getCacheManager();
                // Process in parallel for better performance
                const promises = keys.map((key) => __awaiter(this, void 0, void 0, function* () {
                    (0, validation_utils_1.validateCacheKey)(key);
                    const value = yield manager.get(key);
                    return { key, value };
                }));
                const resolvedResults = yield Promise.all(promises);
                // Populate results
                const results = {};
                for (const { key, value } of resolvedResults) {
                    results[key] = value;
                }
                return results;
            }
            catch (error) {
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.ERROR, { operation: 'getMany', error });
                throw error;
            }
        });
    },
    /**
     * Set multiple values in cache
     */
    setMany(entries, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const manager = getCacheManager();
                // Process in parallel
                const promises = Object.entries(entries).map(([key, value]) => {
                    (0, validation_utils_1.validateCacheKey)(key);
                    return manager.set(key, value, options);
                });
                yield Promise.all(promises);
            }
            catch (error) {
                new cache_events_1.emitCacheEvent(cache_events_1.CacheEventType.ERROR, { operation: 'setMany', error });
                throw error;
            }
        });
    },
    /**
     * Register a cache provider
     */
    registerProvider(name, provider, priority = 0) {
        const manager = getCacheManager();
        manager.registerProvider(name, provider, priority);
    }
};
