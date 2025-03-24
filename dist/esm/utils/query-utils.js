/**
 * @fileoverview High-performance query utilities for cache operations
 * with batching, deduplication, and background refresh capabilities.
 */
import { generateQueryKey } from './key-utils';
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import * as cacheCore from '../implementations/cache-manager-core';
import { deleteCacheValue } from "../implementations/delete-cache-value";
// Performance optimization: Query deduplication cache
const inFlightQueries = new Map();
/**
 * Execute a cached query with deduplication and performance tracking
 *
 * @param queryName - Name of the query
 * @param queryFn - Function to execute the query
 * @param params - Query parameters
 * @param options - Cache options
 * @returns Query result with metadata
 *
 * @complexity Time: O(1) for cache hits, O(n) for cache misses where n is query execution time
 * @category Core
 * @priority Critical
 *
 * @example
 * ```typescript
 * const result = await executeQuery(
 *   'getUserProfile',
 *   () => fetchUserProfile(userId),
 *   { userId },
 *   { ttl: 3600 }
 * );
 * ```
 */
export async function executeQuery(queryName, queryFn, params, options) {
    const key = generateQueryKey(queryName, params);
    const startTime = performance.now();
    // Check for in-flight queries
    const inFlight = inFlightQueries.get(key);
    if (inFlight) {
        return inFlight;
    }
    try {
        // Create promise for this query
        const queryPromise = (async () => {
            try {
                // Add required properties to event payload
                emitCacheEvent(CacheEventType.COMPUTE_START, {
                    key,
                    type: CacheEventType.COMPUTE_START.toString(),
                    timestamp: Date.now()
                });
                // Try cache first
                const cached = cacheCore.getCacheValue(key);
                if (cached !== null) {
                    const duration = performance.now() - startTime;
                    // Add required properties to event payload
                    emitCacheEvent(CacheEventType.GET_HIT, {
                        key,
                        duration,
                        size: JSON.stringify(cached).length,
                        type: CacheEventType.GET_HIT.toString(),
                        timestamp: Date.now()
                    });
                    return {
                        data: cached,
                        error: null,
                        isStale: false,
                        timestamp: Date.now(),
                        metrics: {
                            duration,
                            cacheHit: true,
                            size: JSON.stringify(cached).length
                        }
                    };
                }
                // Execute query
                const result = await queryFn();
                const duration = performance.now() - startTime;
                // Cache result
                await cacheCore.setCacheValue(key, result, options);
                // Add required properties to event payload
                emitCacheEvent(CacheEventType.COMPUTE_SUCCESS, {
                    key,
                    duration,
                    size: JSON.stringify(result).length,
                    type: CacheEventType.COMPUTE_SUCCESS.toString(),
                    timestamp: Date.now()
                });
                return {
                    data: result,
                    error: null,
                    isStale: false,
                    timestamp: Date.now(),
                    metrics: {
                        duration,
                        cacheHit: false,
                        size: JSON.stringify(result).length
                    }
                };
            }
            finally {
                // Clean up in-flight query
                inFlightQueries.delete(key);
            }
        })();
        // Store promise
        inFlightQueries.set(key, queryPromise);
        return queryPromise;
    }
    catch (error) {
        // Add required properties to event payload and fix error type
        emitCacheEvent(CacheEventType.COMPUTE_ERROR, {
            key,
            error: error instanceof Error ? error : new Error('Unknown error'),
            type: CacheEventType.COMPUTE_ERROR.toString(),
            timestamp: Date.now()
        });
        return {
            data: null,
            error: error instanceof Error ? error : new Error('Unknown error occurred'),
            isStale: false,
            timestamp: Date.now(),
            metrics: {
                duration: performance.now() - startTime,
                cacheHit: false
            }
        };
    }
}
/**
 * Batch multiple queries for efficient execution
 *
 * @param queries - Array of queries to execute
 * @returns Record of query results
 *
 * @complexity Time: O(n) where n is number of queries
 * @category Core
 * @priority High
 *
 * @example
 * ```typescript
 * const results = await batchQueries([
 *   {
 *     name: 'getUser',
 *     fn: () => fetchUser(userId),
 *     params: { userId }
 *   },
 *   {
 *     name: 'getPosts',
 *     fn: () => fetchUserPosts(userId),
 *     params: { userId }
 *   }
 * ]);
 * ```
 */
export async function batchQueries(queries) {
    const startTime = performance.now();
    const results = {};
    try {
        await Promise.all(queries.map(async ({ name, fn, params, options }) => {
            results[name] = await executeQuery(name, fn, params, options);
        }));
        const duration = performance.now() - startTime;
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.COMPUTE_SUCCESS, {
            message: 'Batch queries completed',
            duration,
            queryCount: queries.length,
            type: CacheEventType.COMPUTE_SUCCESS.toString(),
            timestamp: Date.now()
        });
    }
    catch (error) {
        // Fix error type in event payload
        emitCacheEvent(CacheEventType.COMPUTE_ERROR, {
            error: error instanceof Error ? error : new Error('Unknown error'),
            message: 'Batch queries failed',
            type: CacheEventType.COMPUTE_ERROR.toString(),
            timestamp: Date.now()
        });
    }
    return results;
}
/**
 * Prefetch queries for improved performance
 *
 * @param queries - Array of queries to prefetch
 *
 * @complexity Time: O(n) where n is number of queries
 * @category Optimization
 * @priority Medium
 */
export async function prefetchQueries(queries) {
    const startTime = performance.now();
    try {
        await Promise.all(queries.map(({ name, fn, params, options }) => executeQuery(name, fn, params, {
            ...options,
            background: true
        })));
        const duration = performance.now() - startTime;
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.COMPUTE_SUCCESS, {
            message: 'Prefetch completed',
            duration,
            queryCount: queries.length
        });
    }
    catch (error) {
        // Fix error type
        emitCacheEvent(CacheEventType.COMPUTE_ERROR, {
            error: error instanceof Error ? error : new Error('Unknown error'),
            message: 'Prefetch failed',
            type: CacheEventType.COMPUTE_ERROR.toString(),
            timestamp: Date.now()
        });
    }
}
/**
 * Invalidate queries matching a pattern
 *
 * @param pattern - Pattern to match query keys
 *
 * @complexity Time: O(n) where n is number of cached queries
 * @category Core
 * @priority High
 */
export async function invalidateQueries(pattern) {
    const startTime = performance.now();
    try {
        const keys = await cacheCore.findKeysByPattern(`query:${pattern}`);
        if (keys && keys.length > 0) {
            await Promise.all(keys.map(key => deleteCacheValue(key)));
        }
        const duration = performance.now() - startTime;
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.INVALIDATE, {
            pattern,
            duration,
            keysInvalidated: keys ? keys.length : 0,
            type: CacheEventType.INVALIDATE.toString(),
            timestamp: Date.now()
        });
    }
    catch (error) {
        // Fix error type
        emitCacheEvent(CacheEventType.ERROR, {
            error: error instanceof Error ? error : new Error(String(error)),
            message: 'Query invalidation failed',
            pattern,
            type: CacheEventType.ERROR.toString(),
            timestamp: Date.now()
        });
        throw error instanceof Error ? error : new Error(String(error));
    }
}
// Documentation metadata
export const metadata = {
    category: "Core" /* DocCategory.CORE */,
    priority: 1 /* DocPriority.CRITICAL */,
    complexity: {
        time: 'O(1) for cache hits, O(n) for cache misses',
        space: 'O(m) where m is number of in-flight queries',
        impact: "high" /* PerformanceImpact.HIGH */,
        notes: 'Optimized with query deduplication and batching'
    },
    examples: [{
            title: 'Basic Query Execution',
            code: `
      const result = await executeQuery(
        'getUserProfile',
        () => fetchUserProfile(userId),
        { userId },
        { ttl: 3600 }
      );
      
      if (result.data) {
        console.log('Profile:', result.data);
        console.log('Cache hit:', result.metrics?.cacheHit);
        console.log('Duration:', result.metrics?.duration);
      }
    `,
            description: 'Execute a cached query with performance tracking'
        }],
    since: '1.0.0'
};
//# sourceMappingURL=query-utils.js.map