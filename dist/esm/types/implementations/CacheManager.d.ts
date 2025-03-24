import { ICacheManager } from '../interfaces/i-cache-manager';
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions, CacheStats, EntryMetadata, CacheFunctionWrapper, CacheKeyGenerator } from '../types/common';
/**
 * CacheManager implementation
 */
export declare class CacheManager implements ICacheManager {
    private providers;
    private metadata;
    /**
     * Register a cache provider
     *
     * @param name Unique name for the provider
     * @param provider The cache provider instance
     */
    registerProvider(name: string, provider: ICacheProvider): void;
    /**
     * Get a value from cache
     */
    get<T = any>(key: string): Promise<T | null>;
    /**
     * Store a value in cache
     */
    set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /**
     * Delete a value from all cache layers
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear all cache layers
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics from all layers
     */
    getStats(): Promise<Record<string, CacheStats>>;
    /**
     * Get or compute a value - returns from cache if available or computes and caches it
     */
    getOrCompute<T = any>(key: string, fn: () => Promise<T>, options?: CacheOptions): Promise<T>;
    /**
     * Wrap a function with caching
     */
    wrap<T extends (...args: any[]) => Promise<any>>(fn: T, keyGenerator: CacheKeyGenerator<Parameters<T>>, options?: CacheOptions): CacheFunctionWrapper<T>;
    /**
     * Invalidate all entries with a given tag
     */
    invalidateByTag(tag: string): Promise<void>;
    /**
     * Get a specific cache provider by layer name
     */
    getProvider(layer: string): ICacheProvider | null;
    /**
     * Get metadata for a cache key
     */
    getMetadata(key: string): EntryMetadata | undefined;
    /**
     * Invalidate cache entries by prefix
     */
    invalidateByPrefix(prefix: string): Promise<void>;
    /**
     * Delete cache entries matching a pattern
     */
    deleteByPattern(pattern: string): Promise<void>;
    /**
     * Get all keys matching a pattern
     */
    keys(pattern?: string): Promise<string[]>;
    /**
     * Get multiple values from cache
     */
    getMany(keys: string[]): Promise<Record<string, any>>;
    /**
     * Set multiple values in cache
     */
    setMany(entries: Record<string, any>, options?: CacheOptions): Promise<void>;
}
