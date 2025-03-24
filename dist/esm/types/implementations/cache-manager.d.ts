import { CacheOptions } from '../types/common';
import { ICacheProvider } from '../interfaces/i-cache-provider';
/**
 * Main cache manager implementation
 */
export declare class CacheManager {
    private providers;
    private metadata;
    private config;
    /**
     * Create a new cache manager
     */
    constructor(config?: {});
    /**
     * Get a value from cache
     */
    get<T = any>(key: string): Promise<T | null>;
    /**
     * Set a value in cache
     */
    set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /**
     * Delete a value from cache
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear all values from cache
     */
    clear(): Promise<void>;
    /**
     * Check if a key exists in cache
     */
    has(key: string): Promise<boolean>;
    /**
     * Register a cache provider
     */
    registerProvider(name: string, provider: ICacheProvider): void;
    /**
     * Get or compute a value
     */
    getOrCompute<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T>;
    /**
     * Create a cached wrapper for a function
     */
    wrap<T extends (...args: any[]) => Promise<any>>(fn: T, keyGenerator: (...args: T extends ((...args: infer P) => any) ? P : never[]) => string, options?: CacheOptions): T;
    /**
     * Invalidate cache entries by tag
     */
    invalidateByTag(tag: string): Promise<number>;
    /**
     * Invalidate cache entries by prefix
     */
    invalidateByPrefix(prefix: string): Promise<number>;
    /**
     * Get multiple values from cache
     */
    getMany<T>(keys: string[]): Promise<Record<string, T | null>>;
    /**
     * Set multiple values in cache
     */
    setMany<T>(entries: Record<string, T>, options?: CacheOptions): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<Record<string, any>>;
}
