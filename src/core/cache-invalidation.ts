/**
 * @fileoverview Cache invalidation strategies
 */

import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheMonitoring} from '../utils/monitoring-utils';
import {RateLimiter} from '../utils/rate-limiter';
import {CacheErrorCode, createCacheError} from '../utils/error-utils';
import {CacheValidation} from './cache-validation';
import {CacheProviderSelector} from './cache-provider-selection';
import {CacheOperations} from './cache-operations';

/**
 * The CacheInvalidation class provides functionality for managing and invalidating cache entries
 * across multiple cache providers. It supports operations such as invalidating entries by tag,
 * prefix, or pattern, as well as retrieving keys based on specific patterns.
 */
export class CacheInvalidation {
    /**
     * Create a new cache invalidation instance
     */
    constructor(
        private providers: Map<string, ICacheProvider>,
        private monitor: CacheMonitoring,
        private rateLimiter: RateLimiter,
        private validation: CacheValidation,
        private providerSelector: CacheProviderSelector,
        private operations: CacheOperations
    ) {}

    /**
     * Invalidate all entries with a given tag
     */
    async invalidateByTag(tag: string): Promise<void> {
        const startTime = performance.now();
        try {
            const provider = this.providerSelector.selectProvider();
            if (!provider) {
                throw createCacheError('No provider available', CacheErrorCode.PROVIDER_ERROR);
            }
            
            if (typeof provider.invalidateByTag === 'function') {
                await provider.invalidateByTag(tag);
            }
            
            this.monitor.recordHit(performance.now() - startTime);
        } catch (error) {
            this.validation.handleError('invalidateByTag', error as Error, {tag});
        }
    }

    /**
     * Invalidate all entries with a given prefix
     */
    async invalidateByPrefix(prefix: string): Promise<void> {
        const startTime = performance.now();
        try {
            const provider = this.providerSelector.selectProvider();
            
            // Get all keys (ensure provider has keys method or use a default empty array)
            const keys = typeof provider.keys === 'function' ? await provider.keys() : [];
            const toDelete = keys.filter((key: string) => key.startsWith(prefix));
            await Promise.all(toDelete.map((key: string) => this.operations.delete(key)));
            
            this.monitor.recordHit(performance.now() - startTime);
        } catch (error) {
            this.validation.handleError('invalidateByPrefix', error as Error, {prefix});
        }
    }

    /**
     * Delete entries matching a pattern
     */
    async deleteByPattern(pattern: string): Promise<void> {
        try {
            const provider = this.providerSelector.selectProvider();
            if (!provider || typeof provider.keys !== 'function') {
                throw createCacheError('No provider available or provider does not support key listing', 
                    CacheErrorCode.PROVIDER_ERROR);
            }

            const keys = await provider.keys();
            const matchingKeys = keys.filter((key) => new RegExp(pattern).test(key));
            await Promise.all(matchingKeys.map((key) => this.operations.delete(key)));
        } catch (error) {
            this.validation.handleError('deleteByPattern', error as Error, {pattern});
        }
    }

    /**
     * Get keys matching a pattern
     */
    async keys(pattern?: string): Promise<string[]> {
        try {
            const provider = this.providerSelector.selectProvider();
            if (!provider || typeof provider.keys !== 'function') {
                return [];
            }
            
            const keys = await provider.keys();
            if (pattern) {
                const regex = new RegExp(pattern);
                return keys.filter(key => regex.test(key));
            }
            return keys;
        } catch (error) {
            this.validation.handleError('keys', error as Error, {pattern});
            return [];
        }
    }
}