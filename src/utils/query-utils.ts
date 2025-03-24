/**
 * Query utilities for cache operations
 */

import {CacheOptions} from '../types';
import {CacheManagerCore} from '../implementations';
import {handleCacheError} from './error-utils';

// Default cache manager instance
const defaultCacheManager = new CacheManagerCore();

/**
 * Query result
 */
export interface QueryResult<T> {
    /**
     * Query data
     */
    data: T | null;

    /**
     * Error if any
     */
    error: Error | null;

    /**
     * Whether data is from cache
     */
    fromCache: boolean;

    /**
     * When data was fetched
     */
    timestamp: number;
}

/**
 * Query options
 */
export interface QueryOptions extends CacheOptions {
    /**
     * Whether to bypass cache
     */
    bypassCache?: boolean;

    /**
     * Whether to refresh in background
     */
    backgroundRefresh?: boolean;

    /**
     * Refresh threshold (0-1)
     */
    refreshThreshold?: number;

    /**
     * Custom cache manager
     */
    cacheManager?: CacheManagerCore;
}

/**
 * Execute a query with caching
 *
 * @param key - Cache key
 * @param queryFn - Query function
 * @param options - Query options
 * @returns Query result
 */
export async function executeQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: QueryOptions = {}
): Promise<QueryResult<T>> {
    const {
        bypassCache = false,
        backgroundRefresh = true,
        refreshThreshold = 0.8,
        cacheManager = defaultCacheManager,
        ...cacheOptions
    } = options;

    try {
        // Check cache first unless bypassing
        if (!bypassCache) {
            const cached = await cacheManager.get<T>(key);

            if (cached !== null) {
                // Return cached data
                const result: QueryResult<T> = {
                    data: cached,
                    error: null,
                    fromCache: true,
                    timestamp: Date.now()
                };

                // Refresh in the background if needed
                if (backgroundRefresh) {
                    await refreshInBackground(key, queryFn, cacheOptions, cacheManager);
                }

                return result;
            }
        }

        // Execute query
        const data = await queryFn();

        // Cache result
        await cacheManager.set(key, data, cacheOptions);

        // Return fresh data
        return {
            data,
            error: null,
            fromCache: false,
            timestamp: Date.now()
        };
    } catch (error) {
        // Handle error
        const queryError = error instanceof Error ? error : new Error(String(error));

        return {
            data: null,
            error: queryError,
            fromCache: false,
            timestamp: Date.now()
        };
    }
}

/**
 * Refresh data in background
 *
 * @param key - Cache key
 * @param queryFn - Query function
 * @param options - Cache options
 * @param cacheManager - Cache manager
 */
async function refreshInBackground<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: CacheOptions = {},
    cacheManager = defaultCacheManager
): Promise<void> {
    try {
        // Execute query
        const result = await queryFn();

        // Update cache
        await cacheManager.set(key, result, options);
    } catch (error) {
        console.error(`Background refresh failed for key ${key}:`, error);
    }
}

/**
 * Batch execute queries with caching
 *
 * @param queries - Queries to execute
 * @param options - Query options
 * @returns Query results
 */
export async function batchQueries<T>(
    queries: Array<{
        key: string;
        queryFn: () => Promise<T>;
        options?: QueryOptions;
    }>,
    options: QueryOptions = {}
): Promise<Record<string, QueryResult<T>>> {
    const {
        cacheManager = defaultCacheManager,
        ...defaultOptions
    } = options;

    const results: Record<string, QueryResult<T>> = {};

    // Execute queries in parallel
    await Promise.all(
        queries.map(async ({key, queryFn, options: queryOptions}) => {
            const mergedOptions = {
                ...defaultOptions,
                ...queryOptions,
                cacheManager
            };

            results[key] = await executeQuery(key, queryFn, mergedOptions);
        })
    );

    return results;
}

/**
 * Invalidate queries by pattern
 *
 * @param pattern - Pattern to match keys against
 * @param cacheManager - Cache manager
 * @returns Number of invalidated keys
 */
export async function invalidateQueries(
    pattern: string,
    cacheManager = defaultCacheManager
): Promise<number> {
    try {
        // Find keys matching pattern
        const keys = await cacheManager.findKeysByPattern(`query:${pattern}`);

        // Delete matching keys
        await Promise.all(keys.map((key: string) => deleteCacheValue(key)));

        return keys.length;
    } catch (error) {
        handleCacheError(error, {operation: 'invalidateQueries', pattern});
        return 0;
    }
}

/**
 * Delete a cache value
 *
 * @param key - Cache key
 * @param cacheManager - Cache manager
 * @returns Whether the value was deleted
 */
export async function deleteCacheValue(
    key: string,
    cacheManager = defaultCacheManager
): Promise<boolean> {
    try {
        return await cacheManager.delete(key);
    } catch (error) {
        handleCacheError(error, {operation: 'deleteCacheValue', key});
        return false;
    }
}

/**
 * Get a cache value
 *
 * @param key - Cache key
 * @param cacheManager - Cache manager
 * @returns Cached value or null if not found
 */
export async function getCacheValue<T>(
    key: string,
    cacheManager = defaultCacheManager
): Promise<T | null> {
    try {
        return await cacheManager.get<T>(key);
    } catch (error) {
        handleCacheError(error, {operation: 'getCacheValue', key});
        return null;
    }
}

/**
 * Set a cache value
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param options - Cache options
 * @param cacheManager - Cache manager
 */
export async function setCacheValue<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
    cacheManager = defaultCacheManager
): Promise<void> {
    try {
        await cacheManager.set(key, value, options);
    } catch (error) {
        handleCacheError(error, {operation: 'setCacheValue', key});
        throw error;
    }
}