/**
 * @fileoverview High-performance query utilities for cache operations
 * with batching, deduplication, and background refresh capabilities.
 */
import { CacheOptions } from '../types/common';
import { DocCategory, DocPriority, PerformanceImpact } from '../docs/types';
/**
 * Query result interface with metadata
 */
export interface QueryResult<T> {
    /** Query result data */
    data: T | null;
    /** Error if query failed */
    error: Error | null;
    /** Whether the data is stale */
    isStale: boolean;
    /** Timestamp of the result */
    timestamp: number;
    /** Performance metrics */
    metrics?: {
        /** Query execution time */
        duration: number;
        /** Cache hit/miss */
        cacheHit: boolean;
        /** Data size in bytes */
        size?: number;
    };
}
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
export declare function executeQuery<T>(queryName: string, queryFn: () => Promise<T>, params?: Record<string, any>, options?: CacheOptions): Promise<QueryResult<T>>;
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
export declare function batchQueries<T>(queries: Array<{
    name: string;
    fn: () => Promise<T>;
    params?: Record<string, any>;
    options?: CacheOptions;
}>): Promise<Record<string, QueryResult<T>>>;
/**
 * Prefetch queries for improved performance
 *
 * @param queries - Array of queries to prefetch
 *
 * @complexity Time: O(n) where n is number of queries
 * @category Optimization
 * @priority Medium
 */
export declare function prefetchQueries(queries: Array<{
    name: string;
    fn: () => Promise<any>;
    params?: Record<string, any>;
    options?: CacheOptions;
}>): Promise<void>;
/**
 * Invalidate queries matching a pattern
 *
 * @param pattern - Pattern to match query keys
 *
 * @complexity Time: O(n) where n is number of cached queries
 * @category Core
 * @priority High
 */
export declare function invalidateQueries(pattern: string): Promise<void>;
export declare const metadata: {
    category: DocCategory;
    priority: DocPriority;
    complexity: {
        time: string;
        space: string;
        impact: PerformanceImpact;
        notes: string;
    };
    examples: {
        title: string;
        code: string;
        description: string;
    }[];
    since: string;
};
