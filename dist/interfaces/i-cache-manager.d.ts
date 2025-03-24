import { ICacheProvider } from './i-cache-provider';
import { CacheOptions, CacheStats, EntryMetadata } from '../types/common';
/**
 * Cache manager interface
 */
export interface ICacheManager {
    /**
     * Get a value from cache
     *
     * @param key The cache key
     * @returns The cached value or null if not found
     */
    get<T = any>(key: string): Promise<T | null>;
    /**
     * Store a value in cache
     *
     * @param key The cache key
     * @param value The value to cache
     * @param options Optional caching options
     */
    set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /**
     * Delete a value from all cache layers
     *
     * @param key The cache key
     * @returns True if the item was deleted, false otherwise
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear all cache layers
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics from all layers
     *
     * @returns Object containing stats for each cache layer
     */
    getStats(): Promise<Record<string, CacheStats>>;
    /**
     * Get or compute a value - returns from cache if available or computes and caches it
     *
     * @param key The cache key
     * @param fn The function to compute the value if not in cache
     * @param options Optional caching options
     * @returns The cached or computed value
     */
    getOrCompute<T = any>(key: string, fn: () => Promise<T>, options?: CacheOptions): Promise<T>;
    /**
     * Wrap a function with caching
     *
     * @param fn The function to cache
     * @param keyGenerator Function to generate cache key from args
     * @param options Optional caching options
     * @returns Wrapped function that uses cache
     */
    wrap<T extends (...args: any[]) => Promise<any>>(fn: T, keyGenerator?: (...args: Parameters<T>) => string, options?: CacheOptions): T & {
        invalidateCache: (...args: Parameters<T>) => Promise<void>;
    };
    /**
     * Invalidate all entries with a given tag
     *
     * @param tag Tag to invalidate
     */
    invalidateByTag(tag: string): Promise<void>;
    /**
     * Get a specific cache provider by layer name
     *
     * @param layer The layer name
     * @returns The cache provider or null if not found
     */
    getProvider(layer: string): ICacheProvider | null;
    /**
     * Get metadata for a cache key
     *
     * @param key The cache key
     * @returns Metadata for the key or undefined if not found
     */
    getMetadata(key: string): EntryMetadata | undefined;
    /**
     * Invalidate cache entries by prefix
     *
     * @param prefix The key prefix to invalidate
     */
    invalidateByPrefix(prefix: string): Promise<void>;
    /**
     * Delete cache entries matching a pattern
     *
     * @param pattern The pattern to match against keys
     */
    deleteByPattern(pattern: string): Promise<void>;
    /**
     * Get all keys matching a pattern
     *
     * @param pattern Optional pattern to match against keys
     * @returns Array of matching keys
     */
    keys(pattern?: string): Promise<string[]>;
    /**
     * Get multiple values from cache
     *
     * @param keys Array of cache keys
     * @returns Record of key-value pairs
     */
    getMany(keys: string[]): Promise<Record<string, any>>;
    /**
     * Set multiple values in cache
     *
     * @param entries Record of key-value pairs to cache
     * @param options Optional caching options
     */
    setMany(entries: Record<string, any>, options?: CacheOptions): Promise<void>;
}
