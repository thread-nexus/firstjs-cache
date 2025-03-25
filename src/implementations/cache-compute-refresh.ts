/**
 * @fileoverview Cache compute and refresh implementation
 * 
 * This module provides the functionality for computing and refreshing cache values,
 * including background refresh capabilities. It manages a system for refreshing
 * stale cache entries in the background while serving stale data to clients.
 * 
 * @module implementations/cache-compute-refresh
 */

import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import {CacheOptions} from '../types';
import {TIME_CONSTANTS} from '../constants';
import {ComputeOptions, ComputeResult} from './cache-compute-types';
import {CacheComputeUtils} from './cache-compute-utils';
import {logger} from '../utils/logger';
import {metrics} from '../utils/metrics';

/**
 * Manages cache compute and refresh operations
 * Handles computation of cache values and background refresh mechanics
 * 
 * @class CacheComputeRefresh
 */
export class CacheComputeRefresh {
    /**
     * Default TTL for cached values in seconds
     * @private
     */
    private readonly defaultTtl: number;
    
    /**
     * Whether background refresh is enabled
     * @private
     */
    private readonly backgroundRefresh: boolean;
    
    /**
     * Threshold as percentage of TTL when stale entries should be refreshed
     * @private
     */
    private readonly refreshThreshold: number;
    
    /**
     * Map of active refresh promises by key
     * @private
     */
    private refreshPromises: Map<string, Promise<any>> = new Map();
    
    /**
     * Compute utilities for helper functions
     * @private
     */
    private utils: CacheComputeUtils;

    /**
     * Creates a cache compute refresh manager
     *
     * @param {ICacheProvider} provider - Cache provider to use
     * @param {Object} [options] - Configuration options
     * @param {number} [options.defaultTtl] - Default time-to-live in seconds
     * @param {boolean} [options.backgroundRefresh] - Whether to enable background refresh
     * @param {number} [options.refreshThreshold] - Threshold as percentage (0-1) of TTL for refresh
     */
    constructor(
        private provider: ICacheProvider,
        private options: {
            defaultTtl?: number;
            backgroundRefresh?: boolean;
            refreshThreshold?: number;
        } = {}
    ) {
        this.defaultTtl = options.defaultTtl || 3600;
        this.backgroundRefresh = options.backgroundRefresh !== false;
        this.refreshThreshold = options.refreshThreshold || 0.75;
        this.utils = new CacheComputeUtils();
    }

    /**
     * Schedule an immediate refresh operation for a key
     * 
     * @template T Type of value to compute
     * @param {string} key - Cache key to refresh
     * @param {() => Promise<T>} fetcher - Function to compute the new value
     * @param {ComputeOptions} [options] - Compute options
     * @returns {Promise<void>}
     * @throws {Error} If refresh fails
     */
    async scheduleRefresh<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: ComputeOptions
    ): Promise<void> {
        try {
            emitCacheEvent(CacheEventType.REFRESH_START, {key});
            await this.computeAndCache(key, fetcher, options);
            emitCacheEvent(CacheEventType.REFRESH_SUCCESS, {key});
        } catch (error) {
            emitCacheEvent(CacheEventType.REFRESH_ERROR, {
                key,
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw error;
        }
    }

    /**
     * Cancel a background refresh for a key
     * Useful for cleanup when a key is explicitly invalidated
     * 
     * @param {string} key - Cache key to cancel refresh for
     */
    cancelRefresh(key: string): void {
        this.refreshPromises.delete(key);
    }

    /**
     * Get current status of compute operations
     * 
     * @returns {Object} Status information with counts of active operations
     */
    getRefreshStatus(): {
        activeComputes: number;
        activeRefreshes: number;
    } {
        return {
            activeComputes: 0,
            activeRefreshes: this.refreshPromises.size
        };
    }

    /**
     * Schedule a background refresh for a cache key
     * The refresh happens asynchronously without blocking the caller
     * 
     * @template T Type of value to compute
     * @param {string} key - Cache key to refresh
     * @param {() => Promise<T>} fetcher - Function to compute the new value
     * @param {ComputeOptions} [options] - Compute options
     * @returns {Promise<void>}
     */
    async scheduleBackgroundRefresh<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: ComputeOptions
    ): Promise<void> {
        // Check if refresh is already scheduled
        if (this.refreshPromises.has(key)) {
            return;
        }

        logger.debug(`Scheduling background refresh for key: ${key}`, {
            operation: 'refresh',
            key
        });
        
        // Add metrics for refresh operations
        metrics.increment('cache.refresh.scheduled', 1, {
            key_length: key.length.toString()
        });

        const refreshPromise = (async () => {
            try {
                const startTime = performance.now();
                emitCacheEvent(CacheEventType.REFRESH_START, {
                    key,
                    timestamp: Date.now()
                });
                
                // Add metrics for active refreshes
                metrics.gauge('cache.refresh.active', this.refreshPromises.size);
                
                // Compute new value
                const value = await this.computeAndCache(key, fetcher, options);
                const duration = performance.now() - startTime;
                
                // Log success
                logger.debug(`Background refresh succeeded for key: ${key}`, {
                    operation: 'refresh',
                    key,
                    duration
                });
                
                // Add metrics for successful refresh
                metrics.timer('cache.refresh.duration', duration, { hit: 'hit', provider: 'cache-compute-refresh' });
                
                emitCacheEvent(CacheEventType.REFRESH_SUCCESS, {
                    key,
                    duration,
                    timestamp: Date.now()
                });
            } catch (error) {
                // Log detailed error
                logger.error(`Background refresh failed for key: ${key}`, {
                    operation: 'refresh',
                    key,
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
                
                // Add metrics for failed refresh
                metrics.increment('cache.refresh.errors', 1);
                
                emitCacheEvent(CacheEventType.REFRESH_ERROR, {
                    key,
                    error: error instanceof Error ? error : new Error(String(error)),
                    timestamp: Date.now()
                });
            } finally {
                this.refreshPromises.delete(key);
                
                // Update active refreshes metric
                metrics.gauge('cache.refresh.active', this.refreshPromises.size);
            }
        })();

        this.refreshPromises.set(key, refreshPromise);

        // Set a maximum timeout to prevent hanging refreshes
        const timeout = options?.timeout || TIME_CONSTANTS.ONE_MINUTE;
        
        setTimeout(() => {
            if (this.refreshPromises.has(key)) {
                logger.warn(`Background refresh timeout for key: ${key}`, {
                    operation: 'refresh',
                    key,
                    timeout
                });
                
                // Add metric for timed out refreshes
                metrics.increment('cache.refresh.timeouts', 1);
                
                this.refreshPromises.delete(key);
            }
        }, timeout);
    }

    /**
     * Compute a value and store it in the cache
     * 
     * @template T Type of value to compute
     * @param {string} key - Cache key
     * @param {() => Promise<T>} fetcher - Function to compute the value
     * @param {ComputeOptions} [options] - Compute options
     * @returns {Promise<ComputeResult<T>>} Computation result with metadata
     * @private
     */
    private async computeAndCache<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: ComputeOptions
    ): Promise<ComputeResult<T>> {
        const startTime = performance.now();

        try {
            emitCacheEvent(CacheEventType.COMPUTE_START, {key});
            const value = await this.utils.executeWithRetry(() => fetcher(), options);
            const computeTime = performance.now() - startTime;

            // Create internal options with metadata
            const internalOptions = {
                ...options,
                ttl: options?.ttl || this.defaultTtl,
                computeTime: computeTime,
                // Store metadata in our internal property
                _metadata: {
                    computeTime: computeTime,
                    source: 'compute',
                    timestamp: Date.now()
                }
            };

            // Cache the computed value
            await this.provider.set(key, value, internalOptions as CacheOptions);

            emitCacheEvent(CacheEventType.COMPUTE_SUCCESS, {
                key,
                duration: computeTime
            });

            return {
                value,
                computeTime,
                stale: false
            };
        } catch (error) {
            emitCacheEvent(CacheEventType.COMPUTE_ERROR, {
                key,
                error: error instanceof Error ? error : new Error(String(error))
            });
            throw error;
        }
    }
}