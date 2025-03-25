import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import {handleCacheError} from '../utils/error-utils';
import {CacheOptions} from '../types';
import {CACHE_OPERATION, DEFAULT_CACHE_CONFIG} from '../constants';
import {CacheComputeRefresh} from './cache-compute-refresh';
import {CacheComputeUtils} from './cache-compute-utils';
import {ComputeOptions, ComputeResult, InternalCacheOptions} from './cache-compute-types';

/**
 * Represents a caching mechanism with compute capabilities. This class provides methods
 * to fetch data from cache or compute it if not available, manage cache refresh operations,
 * and handle the overall lifecycle of cached data.
 */
export class CacheCompute {
    private readonly defaultTtl: number;
    private readonly backgroundRefresh: boolean;
    private readonly refreshThreshold: number;
    
    // Composition of functionality from other classes
    private refresh: CacheComputeRefresh;
    private utils: CacheComputeUtils;
    /**
     * Create a new cache compute instance
     *
     * @param provider - Cache provider
     * @param options - Compute options
     */
    constructor(
        private provider: ICacheProvider,
        private options: {
            defaultTtl?: number;
            backgroundRefresh?: boolean;
            refreshThreshold?: number;
        } = {}
    ) {
        this.defaultTtl = options.defaultTtl || DEFAULT_CACHE_CONFIG.DEFAULT_TTL;
        this.backgroundRefresh = options.backgroundRefresh !== false;
        this.refreshThreshold = options.refreshThreshold || DEFAULT_CACHE_CONFIG.DEFAULT_REFRESH_THRESHOLD;
        
        // Initialize composed functionality
        this.refresh = new CacheComputeRefresh(provider, {
            defaultTtl: this.defaultTtl,
            backgroundRefresh: this.backgroundRefresh,
            refreshThreshold: this.refreshThreshold
        });
        this.utils = new CacheComputeUtils();
    }

    /**
     * Get a value from cache or compute it if not found
     *
     * @param key - Cache key
     * @param fetcher - Function to compute the value
     * @param options - Cache options
     * @returns Compute result
     */
    async getOrCompute<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: ComputeOptions
    ): Promise<ComputeResult<T>> {
        try {
            // Try to get from cache
            const cachedValue = await this.provider.get(key);

            // If found, check if refresh needed
            if (cachedValue !== null) {
                const metadata = await this.provider.getMetadata?.(key);
                const refreshedAt = typeof metadata?.refreshedAt === 'number' ? new Date(metadata.refreshedAt) : metadata?.refreshedAt;
                const isStale = this.utils.isValueStale(refreshedAt, options, this.defaultTtl, this.refreshThreshold);

                // Schedule background refresh if needed
                if (isStale && this.utils.shouldBackgroundRefresh(options, this.backgroundRefresh)) {
                    await this.refresh.scheduleBackgroundRefresh(key, fetcher, options);
                }

                return {
                    value: cachedValue,
                    computeTime: metadata?.computeTime || 0,
                    stale: isStale
                };
            }

            // Compute new value
            return await this.computeAndCache(key, fetcher, options);
        } catch (error) {
            handleCacheError(error, {
                operation: 'compute',
                key
            }, false);
            throw error;
        }
    }

    /**
     * Schedule a refresh operation for a key
     *
     * @param key - Cache key to refresh
     * @param fetcher - Function to compute the new value
     * @param options - Cache options
     * @returns Promise that resolves when the refresh is complete
     */
    async scheduleRefresh<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: ComputeOptions
    ): Promise<void> {
        return this.refresh.scheduleRefresh(key, fetcher, options);
    }
    /**
     * Cancel background refresh for a key
     */
    cancelRefresh(key: string): void {
        this.refresh.cancelRefresh(key);
    }

    /**
     * Get status of compute operations
     */
    getRefreshStatus(): {
        activeComputes: number;
        activeRefreshes: number;
    } {
        return this.refresh.getRefreshStatus();
    }

    /**
     * Get status of compute operations
     */
    getComputeStatus(): {
        activeComputes: number;
        activeRefreshes: number;
    } {
        return this.refresh.getRefreshStatus();
    }

    /**
     * Compute value and cache it
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
            const internalOptions: InternalCacheOptions = {
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
