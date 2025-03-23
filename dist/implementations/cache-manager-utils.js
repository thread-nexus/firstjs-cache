"use strict";
/**
 * @fileoverview Shared utilities and helper functions for cache management
 * with optimized implementations for common operations.
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
exports.KEY_PREFIXES = void 0;
exports.createCacheKey = createCacheKey;
exports.mergeCacheOptions = mergeCacheOptions;
exports.calculateExpiration = calculateExpiration;
exports.isExpired = isExpired;
exports.formatCacheSize = formatCacheSize;
exports.parseDuration = parseDuration;
exports.createKeyPattern = createKeyPattern;
exports.trackOperation = trackOperation;
exports.batchOperations = batchOperations;
exports.debounce = debounce;
exports.throttle = throttle;
const cache_events_1 = require("../events/cache-events");
const key_utils_1 = require("../utils/key-utils");
const default_config_1 = require("../config/default-config");
/**
 * Prefix map for different types of cache keys
 */
exports.KEY_PREFIXES = {
    USER: 'user',
    SESSION: 'session',
    QUERY: 'query',
    CONFIG: 'config',
    COMPUTE: 'compute',
    METADATA: 'meta'
};
/**
 * Generate a namespaced cache key
 */
function createCacheKey(prefix, ...parts) {
    return (0, key_utils_1.generateKey)(exports.KEY_PREFIXES[prefix], ...parts);
}
/**
 * Merge cache options with defaults
 */
function mergeCacheOptions(options, defaults) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return Object.assign({ ttl: (_b = (_a = options === null || options === void 0 ? void 0 : options.ttl) !== null && _a !== void 0 ? _a : defaults === null || defaults === void 0 ? void 0 : defaults.ttl) !== null && _b !== void 0 ? _b : default_config_1.CACHE_CONSTANTS.DEFAULT_TTL, tags: [...((defaults === null || defaults === void 0 ? void 0 : defaults.tags) || []), ...((options === null || options === void 0 ? void 0 : options.tags) || [])], compression: (_c = options === null || options === void 0 ? void 0 : options.compression) !== null && _c !== void 0 ? _c : defaults === null || defaults === void 0 ? void 0 : defaults.compression, compressionThreshold: (_e = (_d = options === null || options === void 0 ? void 0 : options.compressionThreshold) !== null && _d !== void 0 ? _d : defaults === null || defaults === void 0 ? void 0 : defaults.compressionThreshold) !== null && _e !== void 0 ? _e : default_config_1.CACHE_CONSTANTS.DEFAULT_COMPRESSION_THRESHOLD, backgroundRefresh: (_f = options === null || options === void 0 ? void 0 : options.backgroundRefresh) !== null && _f !== void 0 ? _f : defaults === null || defaults === void 0 ? void 0 : defaults.backgroundRefresh, refreshThreshold: (_h = (_g = options === null || options === void 0 ? void 0 : options.refreshThreshold) !== null && _g !== void 0 ? _g : defaults === null || defaults === void 0 ? void 0 : defaults.refreshThreshold) !== null && _h !== void 0 ? _h : default_config_1.CACHE_CONSTANTS.DEFAULT_REFRESH_THRESHOLD }, options);
}
/**
 * Calculate cache key expiration time
 */
function calculateExpiration(ttl) {
    if (!ttl)
        return null;
    return Date.now() + (ttl * 1000);
}
/**
 * Check if a cache entry is expired
 */
function isExpired(timestamp) {
    if (!timestamp)
        return false;
    return Date.now() > timestamp;
}
/**
 * Format cache size for display
 */
function formatCacheSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}
/**
 * Parse cache duration string
 */
function parseDuration(duration) {
    const match = duration.match(/^(\d+)(s|m|h|d)$/);
    if (!match)
        throw new Error('Invalid duration format');
    const [, value, unit] = match;
    const multipliers = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400
    };
    return parseInt(value) * multipliers[unit];
}
/**
 * Create a cache key pattern for searching
 */
function createKeyPattern(prefix, pattern) {
    return `${exports.KEY_PREFIXES[prefix]}:${pattern}`;
}
/**
 * Track cache operation timing
 */
function trackOperation(operation, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const startTime = performance.now();
        try {
            const result = yield operation();
            const duration = performance.now() - startTime;
            (0, cache_events_1.emitCacheEvent)(context.type, Object.assign({ key: context.key, duration }, context.additionalData));
            return result;
        }
        catch (error) {
            const duration = performance.now() - startTime;
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, Object.assign({ key: context.key, error,
                duration, operation: context.type }, context.additionalData));
            throw error;
        }
    });
}
/**
 * Batch operations helper
 */
function batchOperations(items_1, operation_1) {
    return __awaiter(this, arguments, void 0, function* (items, operation, options = {}) {
        const { batchSize = default_config_1.CACHE_CONSTANTS.DEFAULT_BATCH_SIZE, concurrency = default_config_1.CACHE_CONSTANTS.MAX_CONCURRENT_OPERATIONS, onProgress } = options;
        const results = [];
        const batches = [];
        // Split into batches
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        let completed = 0;
        const total = items.length;
        // Process batches with concurrency limit
        for (let i = 0; i < batches.length; i += concurrency) {
            const currentBatches = batches.slice(i, i + concurrency);
            const batchResults = yield Promise.all(currentBatches.map((batch) => __awaiter(this, void 0, void 0, function* () {
                return yield Promise.all(batch.map((item) => __awaiter(this, void 0, void 0, function* () {
                    const result = yield operation(item);
                    completed++;
                    onProgress === null || onProgress === void 0 ? void 0 : onProgress(completed, total);
                    return result;
                })));
            })));
            results.push(...batchResults.flat());
        }
        return results;
    });
}
/**
 * Create a debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
/**
 * Create a throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
