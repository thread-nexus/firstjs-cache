/**
 * @fileoverview Memory cache provider implementation
 */
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions, CacheStats, HealthStatus } from '../types/common';
/**
 * Memory cache provider implementation
 */
export declare class MemoryProvider implements ICacheProvider {
    private adapter;
    readonly name = "memory";
    private stats;
    /**
     * Create a new memory cache provider
     *
     * @param options - Memory storage options
     */
    constructor(options?: {
        maxSize?: number;
        maxItems?: number;
        defaultTtl?: number;
        updateAgeOnGet?: boolean;
        allowStale?: boolean;
    });
    private updateStats;
    /**
     * Get a value from the cache
     *
     * @param key - Cache key
     * @returns Cached value or null if not found
     */
    get<T = any>(key: string): Promise<T | null>;
    /**
     * Set a value in the cache
     *
     * @param key - Cache key
     * @param value - Value to cache
     * @param options - Cache options
     */
    set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /**
     * Delete a value from the cache
     *
     * @param key - Cache key
     * @returns Whether the key was deleted
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear all values from the cache
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics
     *
     * @returns Cache statistics
     */
    getStats(): Promise<CacheStats>;
    /**
     * Perform a health check
     *
     * @returns Health status
     */
    healthCheck(): Promise<HealthStatus>;
    getMany<T = any>(keys: string[]): Promise<Record<string, T | null>>;
    setMany<T = any>(entries: Record<string, T>, options?: CacheOptions): Promise<void>;
    has(key: string): Promise<boolean>;
    invalidateByPrefix(prefix: string): Promise<void>;
    invalidateByTag(tag: string): Promise<number>;
}
