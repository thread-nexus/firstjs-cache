/**
 * @fileoverview Advanced cache manager implementation combining multiple features
 * including multi-layer caching, background refresh, and monitoring.
 */

import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheOptions, CacheStats} from '../types';
import {CacheProviderManager} from './cache-providers';
import {CacheCompute} from './cache-compute';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import {validateCacheKey, validateCacheOptions} from '../utils/validation-utils';
import {CacheErrorCode, createCacheError, handleCacheError} from '../utils/error-utils';
import {CacheManagerCore} from './cache-manager-core';
import {providerHasMethod} from '../utils/provider-utils';

export class CacheManagerAdvanced {
    private providerManager: CacheProviderManager;
    private readonly compute: CacheCompute;
    private statsInterval: NodeJS.Timer | null = null;
    private core: CacheManagerCore;

    constructor(
        private options: {
            providers?: Array<{
                name: string;
                instance: ICacheProvider;
                priority?: number;
            }>;
            defaultTtl?: number;
            backgroundRefresh?: boolean;
            refreshThreshold?: number;
            statsInterval?: number;
            maxRetries?: number;
            retryDelay?: number;
        } = {}
    ) {
        this.providerManager = new CacheProviderManager();

        // Initialize providers
        options.providers?.forEach(({name, instance, priority}) => {
            this.providerManager.registerProvider(name, instance, priority);
        });

        // Fix issue with 'provider' not being a valid property
        this.core = new CacheManagerCore({ 
            defaultProvider: this.providerManager.getProvider('primary')?.name || 
                options.providers?.[0]?.name 
        });

        // Initialize compute manager with compatible options
        const provider = this.core.getProvider();
        if (!provider) {
            throw createCacheError('No cache provider available', CacheErrorCode.NO_PROVIDER);
        }
        this.compute = new CacheCompute(provider, {
            defaultTtl: options.defaultTtl,
            backgroundRefresh: options.backgroundRefresh,
            refreshThreshold: options.refreshThreshold
            // Remove incompatible properties
            // maxRetries: options.maxRetries,
            // retryDelay: options.retryDelay
        });

        // Start stats collection if enabled
        if (options.statsInterval) {
            this.startStatsCollection(options.statsInterval);
        }
    }

    /**
     * Get a value from cache with advanced features
     */
    async get<T>(key: string): Promise<T | null> {
        validateCacheKey(key);

        try {
            const value = await this.providerManager.get<T>(key);

            emitCacheEvent(
                value !== null ? CacheEventType.GET_HIT : CacheEventType.GET_MISS,
                {key}
            );

            return value;
        } catch (error) {
            handleCacheError(error, {
                operation: 'get',
                key
            }, true);
            return null;
        }
    }

    /**
     * Set a value in cache with advanced features
     */
    async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
        validateCacheKey(key);
        validateCacheOptions(options);

        try {
            await this.providerManager.set(key, value, options);

            emitCacheEvent(CacheEventType.SET, {
                key,
                size: JSON.stringify(value).length
            });
        } catch (error) {
            handleCacheError(error, {
                operation: 'set',
                key
            }, true);
            throw error;
        }
    }

    /**
     * Get or compute a value with advanced features
     */
    async getOrCompute<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: CacheOptions
    ): Promise<T> {
        validateCacheKey(key);
        validateCacheOptions(options);

        try {
            // Use the compute manager if available
            if (this.compute) {
                const result = await this.compute.getOrCompute(key, fetcher, options);
                
                if (result.stale) {
                    emitCacheEvent(CacheEventType.GET_STALE, {
                        key,
                        computeTime: result.computeTime
                    });
                }
                
                return result.value;
            }
            
            // Fallback implementation
            const provider = this.core.getProvider();
            if (!provider) {
                throw createCacheError('No cache provider available', CacheErrorCode.NO_PROVIDER);
            }

            // Check cache first
            const value = await provider.get(key) as T | null;
            if (value !== null) {
                return value;
            }

            // Compute value
            const computed = await fetcher();

            // Store in cache
            await provider.set(key, computed, options);

            return computed;
        } catch (error) {
            handleCacheError(error, {
                operation: 'getOrCompute',
                key
            }, true);
            throw error;
        }
    }

    /**
     * Delete a value from cache
     */
    async delete(key: string): Promise<boolean> {
        validateCacheKey(key);

        try {
            const deleted = await this.providerManager.delete(key);

            emitCacheEvent(CacheEventType.DELETE, {
                key,
                deleted  // Use 'deleted' property name instead of 'success'
            });

            return deleted;
        } catch (error) {
            handleCacheError(error, {
                operation: 'delete',
                key
            }, true);
            return false;
        }
    }

    /**
     * Clear all cache data
     */
    async clear(): Promise<void> {
        try {
            await this.providerManager.clear();
            emitCacheEvent(CacheEventType.CLEAR, {});
        } catch (error) {
            handleCacheError(error, {
                operation: 'clear'
            }, true);
            throw error;
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<Record<string, CacheStats>> {
        try {
            const stats = await this.providerManager.getStats();
            const computeStatus = this.compute.getComputeStatus
                ? this.compute.getComputeStatus()
                : {activeComputes: 0, activeRefreshes: 0};

            // Convert computeStatus to string when emitting event
            const computeStatusStr = JSON.stringify(computeStatus);

            // First event with string computeStatus
            emitCacheEvent(CacheEventType.STATS_UPDATE, {
                computeStatus: computeStatusStr, // String as required by the interface
                type: CacheEventType.STATS_UPDATE.toString(),
                timestamp: Date.now()
            });

            // Second event with different payload structure
            // Avoid including computeStatus in this event to prevent type errors
            emitCacheEvent(CacheEventType.STATS_UPDATE, {
                stats,
                type: CacheEventType.STATS_UPDATE.toString(),
                timestamp: Date.now()
            });

            return stats;
        } catch (error) {
            handleCacheError(error, {
                operation: 'getStats'
            }, true);
            throw error;
        }
    }

    /**
     * Stop stats collection
     */
    stopStatsCollection(): void {
        // Fix clearInterval type issue
        if (this.statsInterval) {
            clearInterval(this.statsInterval as NodeJS.Timeout);
            this.statsInterval = null;
        }
    }

    /**
     * Get provider health status
     */
    getProviderHealth() {
        return this.providerManager.getProviderHealth();
    }

    /**
     * Reset provider error counts
     */
    resetProviderErrors(): void {
        this.providerManager.resetErrorCounts();
    }
    
    /**
     * Invalidate all entries with a given tag
     */
    async invalidateByTag(tag: string): Promise<number> {
        const provider = this.core.getProvider();
        if (!provider) return 0;

        if (providerHasMethod(provider, 'invalidateByTag')) {
            await provider.invalidateByTag?.(tag);
            return 0; // Return 0 as we can't determine the count
        }

        return 0;
    }

    /**
     * Find keys by pattern
     *
     * @param pattern - Pattern to match keys against
     * @returns Matching keys
     */
    async findKeysByPattern(pattern: string): Promise<string[]> {
        return this.keys(pattern);
    }

    /**
     * Get keys matching a pattern
     */
    async keys(pattern?: string): Promise<string[]> {
        const provider = this.core.getProvider();
        if (!provider) return [];

        if (providerHasMethod(provider, 'keys')) {
            const keysMethod = provider.keys as (pattern?: string) => Promise<string[]>;
            return await keysMethod(pattern);
        }

        return [];
    }

    /**
     * Cleanup resources
     */
    dispose(): void {
        this.stopStatsCollection();
    }

    /**
     * Start a periodic stats collection
     */
    private startStatsCollection(interval: number): void {
        this.statsInterval = setInterval(async () => {
            try {
                const stats = await this.getStats();
                emitCacheEvent(CacheEventType.STATS_UPDATE, {stats});
            } catch (error) {
                handleCacheError(error, {
                    operation: 'statsCollection'
                }, true);
            }
        }, interval);
    }
}
