"use strict";
/**
 * @fileoverview Provider management and orchestration for multi-layer caching
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
exports.CacheProviderManager = void 0;
const cache_events_1 = require("../events/cache-events");
const error_utils_1 = require("../utils/error-utils");
class CacheProviderManager {
    constructor() {
        this.providers = new Map();
        this.sortedProviders = [];
    }
    /**
     * Register a new cache provider
     */
    registerProvider(name, provider, priority = 0) {
        const entry = {
            name,
            instance: provider,
            priority,
            stats: {
                hits: 0,
                misses: 0,
                size: 0,
                keyCount: 0,
                memoryUsage: 0,
                lastUpdated: new Date(),
                keys: []
            },
            errorCount: 0
        };
        this.providers.set(name, entry);
        this.updateProviderOrder();
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.PROVIDER_INITIALIZED, { provider: name });
    }
    /**
     * Update provider ordering based on priority
     * @private
     */
    updateProviderOrder() {
        this.sortedProviders = Array.from(this.providers.values())
            .sort((a, b) => a.priority - b.priority);
    }
    /**
     * Get a value from cache providers in priority order
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const provider of this.sortedProviders) {
                try {
                    const value = yield provider.instance.get(key);
                    if (value !== null) {
                        provider.stats.hits++;
                        return value;
                    }
                    provider.stats.misses++;
                }
                catch (error) {
                    this.handleProviderError(provider, error);
                }
            }
            return null;
        });
    }
    /**
     * Set a value across all cache providers
     */
    set(key, value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = this.sortedProviders.map((provider) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield provider.instance.set(key, value, options);
                }
                catch (error) {
                    this.handleProviderError(provider, error);
                }
            }));
            yield Promise.allSettled(promises);
        });
    }
    /**
     * Delete a value from all cache providers
     */
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let deleted = false;
            const promises = this.sortedProviders.map((provider) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const result = yield provider.instance.delete(key);
                    deleted = deleted || result;
                }
                catch (error) {
                    this.handleProviderError(provider, error);
                }
            }));
            yield Promise.allSettled(promises);
            return deleted;
        });
    }
    /**
     * Clear all cache providers
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = this.sortedProviders.map((provider) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield provider.instance.clear();
                }
                catch (error) {
                    this.handleProviderError(provider, error);
                }
            }));
            yield Promise.allSettled(promises);
        });
    }
    /**
     * Get stats from all providers
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = {};
            for (const provider of this.sortedProviders) {
                try {
                    const providerStats = yield provider.instance.getStats();
                    stats[provider.name] = Object.assign(Object.assign({}, providerStats), { hits: provider.stats.hits, misses: provider.stats.misses });
                }
                catch (error) {
                    this.handleProviderError(provider, error);
                    stats[provider.name] = provider.stats;
                }
            }
            return stats;
        });
    }
    /**
     * Get a specific provider by name
     */
    getProvider(name) {
        var _a;
        return ((_a = this.providers.get(name)) === null || _a === void 0 ? void 0 : _a.instance) || null;
    }
    /**
     * Handle provider errors with circuit breaking
     * @private
     */
    handleProviderError(provider, error) {
        provider.lastError = error;
        provider.errorCount++;
        (0, error_utils_1.handleCacheError)(error, {
            provider: provider.name,
            errorCount: provider.errorCount
        });
        // If provider has too many errors, move it to lowest priority
        if (provider.errorCount > 5) {
            provider.priority = Math.max(...this.sortedProviders.map(p => p.priority)) + 1;
            this.updateProviderOrder();
        }
    }
    /**
     * Reset error counts for providers
     */
    resetErrorCounts() {
        for (const provider of this.providers.values()) {
            provider.errorCount = 0;
            provider.lastError = undefined;
        }
    }
    /**
     * Get provider health status
     */
    getProviderHealth() {
        const health = {};
        for (const provider of this.providers.values()) {
            health[provider.name] = {
                status: provider.errorCount === 0 ? 'healthy' :
                    provider.errorCount < 5 ? 'degraded' : 'failing',
                errorCount: provider.errorCount,
                lastError: provider.lastError
            };
        }
        return health;
    }
}
exports.CacheProviderManager = CacheProviderManager;
