/**
 * @fileoverview Basic cache operations
 */

import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheMonitoring} from '../utils/monitoring-utils';
import {CacheErrorCode, createCacheError} from '../utils/error-utils';
import {RateLimiter} from '../utils/rate-limiter';
import {CircuitBreaker} from '../utils/circuit-breaker';
import {CacheStats} from '../types';
import {CacheValidation} from './cache-validation';
import {CacheProviderSelector} from './cache-provider-selection';
import {GetOptions, SetOptions} from './enhanced-cache';

/**
 * A class responsible for cache operations such as getting, setting, deleting, and clearing cache entries.
 * It also provides functionality for cache monitoring, rate limiting, fallback handling, and statistics retrieval.
 */
export class CacheOperations {
    /**
     * Create a new cache operations instance
     */
    constructor(
        private providers: Map<string, ICacheProvider>,
        private monitor: CacheMonitoring,
        private serializer: { serialize: Function, deserialize: Function },
        private rateLimiter: RateLimiter,
        private circuitBreaker: CircuitBreaker,
        private validation: CacheValidation,
        private providerSelector: CacheProviderSelector
    ) {}
    /**
     * Get a value from cache
     */
    async get<T>(key: string, options?: GetOptions): Promise<T | null> {
        await this.rateLimiter.limit('get');
        const startTime = performance.now();
        try {
            this.validation.validateKey(key);
            const provider = this.providerSelector.selectProvider(options?.provider);

            // Check circuit breaker state
            if (this.circuitBreaker && typeof this.circuitBreaker.isOpen === 'function' && this.circuitBreaker.isOpen()) {
        throw createCacheError(
                    'Circuit breaker is open',
                    CacheErrorCode.CIRCUIT_OPEN
        );
    }

            const result = await provider.get(key);

            if (result === null && options?.fallback) {
                return this.handleFallback<T>(key, options);
            }

            const value = result ? await this.serializer.deserialize(result) as T : null;
            const isHit = value !== null;

            if (isHit) {
                this.monitor.recordHit(performance.now() - startTime);
            } else {
                this.monitor.recordMiss(performance.now() - startTime);
            }

            return value;
        } catch (error) {
            this.validation.handleError('get', error as Error, {key});
            return null;
        }
    }

    /**
     * Set a value in cache
     */
    async set<T = any>(key: string, value: T, options?: SetOptions): Promise<void> {
        await this.rateLimiter.limit('set');
        const startTime = performance.now();
        try {
            this.validation.validateKey(key);
            this.validation.validateValue(value);

            const serializedValue = this.serializer.serialize(value);
            const provider = this.providerSelector.selectProvider(options?.provider);

            // Check circuit breaker state
            if (this.circuitBreaker && typeof this.circuitBreaker.isOpen === 'function' && this.circuitBreaker.isOpen()) {
            throw createCacheError(
                    'Circuit breaker is open',
                    CacheErrorCode.CIRCUIT_OPEN
            );
        }

            const ttl = options?.ttl;
            const cacheOptions = {
                ...options,
                ttl
            };
            
            await provider.set(key, serializedValue, cacheOptions);
            
            this.monitor.recordHit(performance.now() - startTime);
        } catch (error) {
            this.validation.handleError('set', error as Error, {key, value});
    }
    }

    /**
     * Delete a value from cache
     */
    async delete(key: string): Promise<boolean> {
        await this.rateLimiter.limit('delete');
        const startTime = performance.now();

        try {
            this.validation.validateKey(key);
            const provider = this.providerSelector.selectProvider();
            const result = await provider.delete(key);

            if (!result) {
                this.monitor.recordMiss(performance.now() - startTime);
            }

            return result;
        } catch (error) {
            this.validation.handleError('delete', error as Error, {key});
            return false;
        }
    }

    /**
     * Clear all values from cache
     */
    async clear(): Promise<void> {
        await this.rateLimiter.limit('clear');
        const startTime = performance.now();

        try {
            const provider = this.providerSelector.selectProvider();
            await provider.clear();

            this.monitor.recordMiss(performance.now() - startTime);
        } catch (error) {
            this.validation.handleError('clear', error as Error);
        }
    }
    /**
     * Get cache statistics
     */
    async getStats(): Promise<Record<string, CacheStats>> {
        const result: Record<string, CacheStats> = {};
        try {
            const provider = this.providerSelector.getProvider('default');

            if (provider !== null && typeof provider.getStats === 'function') {
                result['default'] = await provider.getStats();
            } else {
                // Return default stats if method doesn't exist
                result['default'] = {
                    hits: 0,
                    misses: 0,
                    size: 0,
                    memoryUsage: 0,
                    lastUpdated: Date.now(),
                    keyCount: 0
                };
            }

            return result;
        } catch (error) {
            console.error('Error getting cache stats:', error);
            // Return default stats on error
            return {
                'default': {
                    hits: 0,
                    misses: 0,
                    size: 0,
                    memoryUsage: 0,
                    lastUpdated: Date.now(),
                    keyCount: 0
                }
            };
        }
    }

    /**
     * Handle fallback for cache misses
     */
    private async handleFallback<T>(key: string, options?: GetOptions): Promise<T | null> {
        if (options?.fallback) {
            return options.fallback();
        }
        return Promise.resolve(null);
    }
}
