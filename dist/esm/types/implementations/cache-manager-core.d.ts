import { DEFAULT_CONFIG } from '../config/default-config';
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions, CacheStats } from '../types/common';
/**
 * Core implementation of the cache manager
 */
export declare class CacheManagerCore {
    private config;
    private providers;
    private healthStatus;
    private monitoringInterval;
    constructor(config?: typeof DEFAULT_CONFIG);
    /**
     * Get a value from cache
     */
    get(key: string): Promise<any>;
    /**
     * Set a value in cache
     */
    set(key: string, value: any, options?: CacheOptions): Promise<void>;
    /**
     * Delete a value from cache
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear the entire cache
     */
    clear(): Promise<void>;
    /**
     * Get multiple values from cache
     */
    getMany(keys: string[]): Promise<Record<string, any>>;
    /**
     * Set multiple values in cache
     */
    setMany(entries: Record<string, any>, options?: CacheOptions): Promise<void>;
    /**
     * Get or compute a value
     */
    getOrCompute(key: string, fetcher: () => Promise<any>, options?: CacheOptions): Promise<any>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<CacheStats>;
    /**
     * Get a provider by name
     */
    getProvider(name?: string): ICacheProvider;
    /**
     * Get provider operations
     */
    getOperations(provider?: string): any;
    /**
     * Invalidate cache entries by tag
     */
    invalidateByTag(tag: string): Promise<number>;
    /**
     * Invalidate cache entries by prefix
     */
    invalidateByPrefix(prefix: string): Promise<number>;
    /**
     * Get all keys matching a pattern
     */
    keys(pattern?: string): Promise<string[]>;
    /**
     * Delete cache entries matching a pattern
     */
    deleteByPattern(pattern: string): Promise<number>;
    /**
     * Start monitoring provider health
     */
    startMonitoring(): void;
    /**
     * Stop monitoring provider health
     */
    stopMonitoring(): void;
    /**
     * Check provider health
     */
    private checkProviderHealth;
    /**
     * Get provider health status
     */
    getProviderStatus(name: string): {
        healthy: boolean;
        errors: number;
        status: 'healthy' | 'degraded' | 'unhealthy';
    };
    /**
     * Wrap a function with caching
     */
    wrap<T extends (...args: any[]) => Promise<any>>(fn: T, keyGenerator: ((...args: Parameters<T>) => string) | undefined, options?: CacheOptions): T & {
        invalidateCache: (...args: Parameters<T>) => Promise<void>;
    };
    /**
     * Get a safe copy of configuration information
     * This exposes configuration in a safe way for UI components
     */
    getConfigInfo(): Record<string, any>;
}
/**
 * Get cache value by key
 */
export declare function getCacheValue<T>(key: string): T | null;
/**
 * Set cache value with key
 */
export declare function setCacheValue<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
/**
 * Find keys by pattern
 */
export declare function findKeysByPattern(pattern: string): Promise<string[]>;
