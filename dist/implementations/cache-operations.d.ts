/**
 * @fileoverview Core cache operations with optimized implementations
 * for common caching patterns and batch operations.
 */
import { CacheOptions } from '../types/common';
import { ICacheProvider } from '../interfaces/i-cache-provider';
/**
 * Optimized batch operation handler
 */
export declare class BatchOperationHandler {
    private batch;
    private timer;
    private maxBatchSize;
    private maxWaitTime;
    /**
     * Add operation to batch
     */
    add(key: string, value: any): Promise<void>;
    /**
     * Schedule batch processing
     */
    private scheduleBatchProcess;
    /**
     * Process current batch
     */
    private processBatch;
}
/**
 * Set cache value with optimizations
 *
 * @param provider - Cache provider
 * @param key - Cache key
 * @param value - Value to cache
 * @param options - Cache options
 */
export declare function setCacheValue(provider: ICacheProvider, key: string, value: any, options?: CacheOptions): Promise<void>;
/**
 * Get cache value with optimizations
 *
 * @param provider - Cache provider
 * @param key - Cache key
 */
export declare function getCacheValue<T = any>(provider: ICacheProvider, key: string): Promise<T | null>;
/**
 * Delete cache value with optimizations
 *
 * @param provider - Cache provider
 * @param key - Cache key
 */
export declare function deleteCacheValue(provider: ICacheProvider, key: string): Promise<boolean>;
/**
 * Clear all cache values
 *
 * @param provider - Cache provider
 */
export declare function clearCache(provider: ICacheProvider): Promise<void>;
/**
 * Get multiple cache values efficiently
 *
 * @param provider - Cache provider
 * @param keys - Array of cache keys
 */
export declare function getManyValues<T = any>(provider: ICacheProvider, keys: string[]): Promise<Record<string, T | null>>;
/**
 * Set multiple cache values efficiently
 *
 * @param provider - Cache provider
 * @param entries - Record of key-value pairs
 * @param options - Cache options
 */
export declare function setManyValues(provider: ICacheProvider, entries: Record<string, any>, options?: CacheOptions): Promise<void>;
