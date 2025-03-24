import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions } from '../types/common';
/**
 * Options for compute operations
 */
interface ComputeOptions extends CacheOptions {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
    staleIfError?: boolean;
}
/**
 * Result of a compute operation
 */
interface ComputeResult<T> {
    value: T;
    computeTime: number;
    stale: boolean;
}
/**
 * Cache compute implementation
 */
export declare class CacheCompute {
    private provider;
    private options;
    private readonly defaultTtl;
    private readonly backgroundRefresh;
    private readonly refreshThreshold;
    private refreshPromises;
    /**
     * Create a new cache compute instance
     *
     * @param provider - Cache provider
     * @param options - Compute options
     */
    constructor(provider: ICacheProvider, options?: {
        defaultTtl?: number;
        backgroundRefresh?: boolean;
        refreshThreshold?: number;
    });
    /**
     * Get a value from cache or compute it if not found
     *
     * @param key - Cache key
     * @param fetcher - Function to compute the value
     * @param options - Cache options
     * @returns Compute result
     */
    getOrCompute<T>(key: string, fetcher: () => Promise<T>, options?: ComputeOptions): Promise<ComputeResult<T>>;
    /**
     * Compute value and cache it
     */
    private computeAndCache;
    /**
     * Execute with retry logic
     */
    private executeWithRetry;
    /**
     * Check if a value is stale
     */
    private isValueStale;
    /**
     * Check if background refresh should be used
     */
    private shouldBackgroundRefresh;
    /**
     * Schedule a background refresh
     */
    private scheduleBackgroundRefresh;
    /**
     * Schedule a refresh operation for a key
     *
     * @param key - Cache key to refresh
     * @param fetcher - Function to compute the new value
     * @param options - Cache options
     * @returns Promise that resolves when the refresh is complete
     */
    scheduleRefresh<T>(key: string, fetcher: () => Promise<T>, options?: ComputeOptions): Promise<void>;
    /**
     * Cancel background refresh for a key
     */
    cancelRefresh(key: string): void;
    /**
     * Get status of compute operations
     */
    getRefreshStatus(): {
        activeComputes: number;
        activeRefreshes: number;
    };
    /**
     * Get status of compute operations
     */
    getComputeStatus(): {
        activeComputes: number;
        activeRefreshes: number;
    };
}
export {};
