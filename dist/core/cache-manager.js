"use strict";
/**
 * @fileoverview Enhanced cache manager implementation
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const error_utils_1 = require("../utils/error-utils");
const monitoring_utils_1 = require("../utils/monitoring-utils");
const serialization_utils_1 = require("../utils/serialization-utils");
const rate_limiter_1 = require("../utils/rate-limiter");
const circuit_breaker_1 = require("../utils/circuit-breaker");
class CacheManager {
    constructor(config) {
        this.providers = new Map();
        this.monitor = monitoring_utils_1.CacheMonitor.getInstance(config.monitoring);
        this.serializer = new serialization_utils_1.Serializer(config.serialization);
        this.rateLimiter = new rate_limiter_1.RateLimiter(config.rateLimit);
        this.circuitBreaker = new circuit_breaker_1.CircuitBreaker(config.circuitBreaker);
        this.initializeProviders(config.providers);
    }
    initializeProviders(providerConfigs) {
        for (const [name, config] of Object.entries(providerConfigs)) {
            try {
                const Provider = require(`../providers/${name}-provider`).default;
                const provider = new Provider(config);
                this.providers.set(name, provider);
            }
            catch (error) {
                console.error(`Failed to initialize provider ${name}:`, error);
            }
        }
    }
    async delete(key) {
        await this.rateLimiter.checkLimit('delete');
        const startTime = performance.now();
        try {
            this.validateKey(key);
            const provider = this.selectProvider();
            const result = await provider.delete(key);
            this.monitor.recordMetrics('delete', {
                duration: performance.now() - startTime,
                success: result,
                hits: 0,
                misses: 0,
                latency: { avg: 0, min: 0, max: 0, count: 1 },
                memoryUsage: 0,
                timestamp: Date.now()
            });
            return result;
        }
        catch (error) {
            this.handleError('delete', error, { key });
            return false;
        }
    }
    async clear() {
        await this.rateLimiter.checkLimit('clear');
        const startTime = performance.now();
        try {
            const provider = this.selectProvider();
            await provider.clear();
            this.monitor.recordMetrics('clear', {
                duration: performance.now() - startTime,
                latency: { avg: 0, min: 0, max: 0, count: 1 },
                memoryUsage: 0,
                hits: 0,
                misses: 0,
                success: true,
                timestamp: Date.now()
            });
        }
        catch (error) {
            this.handleError('clear', error);
        }
    }
    async getStats() {
        const result = {};
        try {
            const provider = this.getProvider('default'); // Provide a default provider name
            if (provider !== null && typeof provider.getStats === 'function') {
                const providerStats = await provider.getStats();
                result['default'] = providerStats;
            }
            else {
                // Return default stats if method doesn't exist
                result['default'] = {
                    hits: 0,
                    misses: 0,
                    size: 0,
                    memoryUsage: 0,
                    lastUpdated: Date.now(),
                    keyCount: 0,
                    entries: 0,
                    avgTtl: 0,
                    maxTtl: 0
                };
            }
            return result;
        }
        catch (error) {
            console.error('Error getting cache stats:', error);
            // Return default stats on error
            return {
                'default': {
                    hits: 0,
                    misses: 0,
                    size: 0,
                    memoryUsage: 0,
                    lastUpdated: Date.now(),
                    keyCount: 0,
                    entries: 0,
                    avgTtl: 0,
                    maxTtl: 0
                }
            };
        }
    }
    async getOrCompute(key, fn, options) {
        await this.rateLimiter.checkLimit('compute');
        const startTime = performance.now();
        try {
            const cached = await this.get(key);
            if (cached !== null) {
                return cached;
            }
            const value = await fn();
            await this.set(key, value, options);
            this.monitor.recordMetrics('compute', {
                duration: performance.now() - startTime,
                success: true,
                hits: 0,
                misses: 1,
                latency: { avg: 0, min: 0, max: 0, count: 1 },
                memoryUsage: 0,
                timestamp: Date.now()
            });
            return value;
        }
        catch (error) {
            this.handleError('compute', error, { key });
            throw error;
        }
    }
    wrap(fn, keyGenerator, options) {
        const wrapped = async (...args) => {
            // Implementation
            return fn(...args);
        };
        const invalidateCache = async (...args) => {
            // Implementation
        };
        return Object.assign(wrapped, { invalidateCache });
    }
    async invalidateByTag(tag) {
        const startTime = performance.now();
        await this.executeWithMetrics('invalidateByTag', async () => {
            const provider = this.selectProvider();
            // Implementation would go here
        }, { tag });
    }
    async invalidateByPrefix(prefix) {
        const startTime = performance.now();
        const provider = this.selectProvider();
        // Get all keys (ensure provider has keys method or use a default empty array)
        const keys = provider.keys ? await provider.keys() : [];
        const toDelete = keys.filter((key) => key.startsWith(prefix));
        await Promise.all(toDelete.map((key) => this.delete(key)));
        this.monitor.recordMetrics('invalidateByPrefix', {
            duration: performance.now() - startTime,
            latency: { avg: 0, min: 0, max: 0, count: 1 },
            memoryUsage: 0,
            hits: 0,
            misses: 0,
            success: true,
            timestamp: Date.now()
        });
    }
    getProvider(name) {
        return this.providers.get(name) || null;
    }
    // Removed duplicate async implementation to resolve the conflict.
    getMetadata(key) {
        try {
            const provider = this.getProvider('default');
            if (!provider || typeof provider.getMetadata !== 'function') {
                return undefined;
            }
            const metadata = provider.getMetadata(key);
            if (metadata &&
                typeof metadata === 'object' &&
                'tags' in metadata &&
                'createdAt' in metadata &&
                'size' in metadata &&
                'lastAccessed' in metadata &&
                'accessCount' in metadata) {
                return metadata;
            }
            return undefined;
        }
        catch (error) {
            console.error('Error getting metadata:', error);
            return undefined;
        }
    }
    async deleteByPattern(pattern) {
        throw new Error('Method not implemented.');
    }
    async keys(pattern) {
        throw new Error('Method not implemented.');
    }
    async getMany(keys) {
        throw new Error('Method not implemented.');
    }
    async setMany(entries, options) {
        throw new Error('Method not implemented.');
    }
    /**
     * Enhanced get operation with monitoring and error handling
     */
    async get(key, options) {
        await this.rateLimiter.checkLimit('get');
        const startTime = performance.now();
        try {
            this.validateKey(key);
            const provider = this.selectProvider(options?.provider);
            if (this.circuitBreaker.isOpen()) {
                throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.CIRCUIT_OPEN, `Circuit breaker open for provider ${provider.name}`);
            }
            const result = await provider.get(key);
            if (result === null && options?.fallback) {
                return this.handleFallback(key, options);
            }
            const value = result ? await this.serializer.deserialize(result) : null;
            const isHit = value !== null;
            this.monitor.recordMetrics('get', {
                duration: performance.now() - startTime,
                latency: { avg: 0, min: 0, max: 0, count: 1 },
                memoryUsage: 0,
                hits: isHit ? 1 : 0,
                misses: isHit ? 0 : 1,
                success: true,
                timestamp: Date.now()
            });
            return value;
        }
        catch (error) {
            this.handleError('get', error, { key });
            return null;
        }
    }
    /**
     * Enhanced set operation with validation and compression
     */
    async set(key, value, options) {
        await this.rateLimiter.checkLimit('set');
        const startTime = performance.now();
        try {
            this.validateKey(key);
            this.validateValue(value);
            const serialized = await this.serializer.serialize(value);
            const provider = this.selectProvider(options?.provider);
            await provider.set(key, serialized, {
                ttl: options?.ttl,
                tags: options?.tags
            });
            const dataSize = typeof serialized.data === 'string'
                ? Buffer.byteLength(serialized.data)
                : serialized.metadata?.size || 0;
            this.monitor.recordMetrics('set', {
                duration: performance.now() - startTime,
                latency: { avg: 0, min: 0, max: 0, count: 1 },
                memoryUsage: 0,
                hits: 0,
                misses: 0,
                success: true,
                timestamp: Date.now(),
                size: dataSize
            });
        }
        catch (error) {
            this.handleError('set', error, { key, value });
        }
    }
    /**
     * Enhanced batch operations
     */
    async batch(operations, options) {
        const startTime = performance.now();
        const results = [];
        try {
            await this.rateLimiter.checkLimit('batch', operations.length);
            const provider = this.selectProvider(options?.provider);
            const batches = this.splitIntoBatches(operations, options?.maxBatchSize || 100);
            for (const batch of batches) {
                const batchResults = await this.executeBatch(batch, provider);
                results.push(...batchResults);
            }
            this.monitor.recordMetrics('batch', {
                duration: performance.now() - startTime,
                operationCount: operations.length,
                hits: 0,
                misses: 0,
                latency: { avg: 0, min: 0, max: 0, count: 1 },
                memoryUsage: 0,
                success: true,
                timestamp: Date.now()
            });
            return results;
        }
        catch (error) {
            this.handleError('batch', error);
            return results;
        }
    }
    async executeBatch(operations, provider) {
        const results = [];
        for (const op of operations) {
            try {
                switch (op.type) {
                    case 'get':
                        results.push({
                            key: op.key,
                            success: true,
                            value: await this.get(op.key, op.options)
                        });
                        break;
                    case 'set':
                        await this.set(op.key, op.value, op.options);
                        results.push({
                            key: op.key,
                            success: true
                        });
                        break;
                    case 'delete':
                        const deleted = await this.delete(op.key);
                        results.push({
                            key: op.key,
                            success: deleted
                        });
                        break;
                }
            }
            catch (error) {
                results.push({
                    key: op.key,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        return results;
    }
    validateKey(key) {
        if (!key || typeof key !== 'string') {
            throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.INVALID_KEY, 'Invalid cache key');
        }
        if (key.length > 250) {
            throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.KEY_TOO_LONG, 'Cache key exceeds maximum length');
        }
    }
    validateValue(value) {
        if (value === undefined) {
            throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.INVALID_ARGUMENT, 'Cannot cache undefined value');
        }
    }
    selectProvider(preferredProvider) {
        if (preferredProvider) {
            const provider = this.providers.get(preferredProvider);
            if (provider)
                return provider;
        }
        // Select first available provider
        const provider = Array.from(this.providers.values())[0];
        if (!provider) {
            throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.PROVIDER_ERROR, 'No cache provider available');
        }
        return provider;
    }
    handleError(operation, error, context) {
        const cacheError = error instanceof error_utils_1.CacheError ? error :
            new error_utils_1.CacheError(error_utils_1.CacheErrorCode.UNKNOWN, error.message, { operation, ...context });
        const metrics = {
            duration: performance.now() - (context?.startTime || 0),
            hits: 0,
            misses: 1,
            latency: { avg: 0, min: 0, max: 0, count: 1 },
            memoryUsage: 0,
            timestamp: Date.now(),
            success: false,
            error: true
        };
        this.monitor.recordMetrics(operation, metrics);
        throw cacheError;
    }
    splitIntoBatches(operations, maxBatchSize) {
        const batches = [];
        for (let i = 0; i < operations.length; i += maxBatchSize) {
            batches.push(operations.slice(i, i + maxBatchSize));
        }
        return batches;
    }
    async handleFallback(key, options) {
        // Implement fallback logic
        return null;
    }
    async executeWithMetrics(operation, fn, context) {
        const startTime = performance.now();
        try {
            const result = await fn();
            this.monitor.recordMetrics(operation, {
                duration: performance.now() - startTime,
                latency: { avg: 0, min: 0, max: 0, count: 1 },
                memoryUsage: 0,
                hits: 0,
                misses: 0,
                success: true,
                timestamp: Date.now(),
                ...context
            });
            return result;
        }
        catch (error) {
            this.monitor.recordMetrics(operation, {
                duration: performance.now() - startTime,
                latency: { avg: 0, min: 0, max: 0, count: 1 },
                memoryUsage: 0,
                hits: 0,
                misses: 0,
                success: false,
                error: true,
                timestamp: Date.now(),
                ...context
            });
            throw error;
        }
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=cache-manager.js.map