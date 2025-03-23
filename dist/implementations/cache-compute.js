"use strict";
/**
 * @fileoverview Advanced computation handling with caching, background refresh,
 * and stale-while-revalidate pattern implementation.
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
exports.CacheCompute = void 0;
const cache_events_1 = require("../events/cache-events");
const error_utils_1 = require("../utils/error-utils");
// Track compute operations in progress
const computeOperations = new Map();
// Track background refresh operations
const refreshOperations = new Map();
class CacheCompute {
    constructor(provider, options = {}) {
        this.provider = provider;
        this.options = options;
    }
    /**
     * Get or compute a cached value with advanced features
     */
    getOrCompute(key, compute, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Check for in-progress computation
            const inProgress = computeOperations.get(key);
            if (inProgress) {
                return inProgress;
            }
            try {
                // Try to get from cache first
                const cached = yield this.provider.get(key);
                if (cached !== null) {
                    const metadata = yield ((_b = (_a = this.provider).getMetadata) === null || _b === void 0 ? void 0 : _b.call(_a, key));
                    const isStale = this.isValueStale(metadata === null || metadata === void 0 ? void 0 : metadata.refreshedAt, options);
                    // Schedule background refresh if needed
                    if (isStale && this.shouldBackgroundRefresh(options)) {
                        this.scheduleBackgroundRefresh(key, compute, options);
                    }
                    return {
                        value: cached,
                        computeTime: (metadata === null || metadata === void 0 ? void 0 : metadata.computeTime) || 0,
                        stale: isStale
                    };
                }
                // Compute new value
                return this.computeAndCache(key, compute, options);
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'getOrCompute',
                    key
                });
                throw error;
            }
        });
    }
    /**
     * Compute value and cache it
     * @private
     */
    computeAndCache(key, compute, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const computePromise = (() => __awaiter(this, void 0, void 0, function* () {
                const startTime = performance.now();
                try {
                    (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.COMPUTE_START, { key });
                    const value = yield this.executeWithRetry(() => compute());
                    const computeTime = performance.now() - startTime;
                    // Cache the computed value
                    yield this.provider.set(key, value, Object.assign(Object.assign({}, options), { computeTime, refreshedAt: new Date() }));
                    (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.COMPUTE_SUCCESS, {
                        key,
                        duration: computeTime
                    });
                    return {
                        value,
                        computeTime,
                        stale: false
                    };
                }
                catch (error) {
                    (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.COMPUTE_ERROR, {
                        key,
                        error
                    });
                    throw error;
                }
                finally {
                    computeOperations.delete(key);
                }
            }))();
            computeOperations.set(key, computePromise);
            return computePromise;
        });
    }
    /**
     * Execute with retry logic
     * @private
     */
    executeWithRetry(operation_1) {
        return __awaiter(this, arguments, void 0, function* (operation, attempt = 1) {
            try {
                return yield operation();
            }
            catch (error) {
                if (attempt >= (this.options.maxRetries || 3)) {
                    throw error;
                }
                const delay = (this.options.retryDelay || 1000) * Math.pow(2, attempt - 1);
                yield new Promise(resolve => setTimeout(resolve, delay));
                return this.executeWithRetry(operation, attempt + 1);
            }
        });
    }
    /**
     * Check if a value is stale
     * @private
     */
    isValueStale(refreshedAt, options) {
        if (!refreshedAt)
            return true;
        const ttl = (options === null || options === void 0 ? void 0 : options.ttl) || this.options.defaultTtl || 3600;
        const threshold = (options === null || options === void 0 ? void 0 : options.refreshThreshold) ||
            this.options.refreshThreshold ||
            0.75;
        const age = Date.now() - refreshedAt.getTime();
        return age > ttl * threshold * 1000;
    }
    /**
     * Check if background refresh should be used
     * @private
     */
    shouldBackgroundRefresh(options) {
        var _a, _b;
        return (_b = (_a = options === null || options === void 0 ? void 0 : options.backgroundRefresh) !== null && _a !== void 0 ? _a : this.options.backgroundRefresh) !== null && _b !== void 0 ? _b : false;
    }
    /**
     * Schedule a background refresh
     * @private
     */
    scheduleBackgroundRefresh(key, compute, options) {
        // Check if refresh is already scheduled
        const existing = refreshOperations.get(key);
        if (existing && existing.nextRefresh > Date.now()) {
            return;
        }
        const refreshPromise = (() => __awaiter(this, void 0, void 0, function* () {
            try {
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_START, { key });
                const { value, computeTime } = yield this.computeAndCache(key, compute, options);
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_SUCCESS, {
                    key,
                    duration: computeTime
                });
                return value;
            }
            catch (error) {
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.REFRESH_ERROR, {
                    key,
                    error
                });
            }
            finally {
                refreshOperations.delete(key);
            }
        }))();
        refreshOperations.set(key, {
            nextRefresh: Date.now() + 60000, // Prevent refresh spam
            promise: refreshPromise
        });
    }
    /**
     * Cancel background refresh for a key
     */
    cancelBackgroundRefresh(key) {
        refreshOperations.delete(key);
    }
    /**
     * Get status of compute operations
     */
    getComputeStatus() {
        return {
            activeComputes: computeOperations.size,
            activeRefreshes: refreshOperations.size
        };
    }
}
exports.CacheCompute = CacheCompute;
