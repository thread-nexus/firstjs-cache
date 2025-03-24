/**
 * @fileoverview Advanced cache manager implementation combining multiple features
 * including multi-layer caching, background refresh, and monitoring.
 */
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions, CacheStats } from '../types/common';
export declare class CacheManagerAdvanced {
    private options;
    private providerManager;
    private compute;
    private statsInterval;
    constructor(options?: {
        providers?: Array<{
            name: string;
            instance: ICacheProvider;
            priority?: number;
        }>;
        defaultTtl?: number;
        backgroundRefresh?: boolean;
        refreshThreshold?: number;
        statsInterval?: number;
        maxRetries?: number;
        retryDelay?: number;
    });
    /**
     * Get a value from cache with advanced features
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set a value in cache with advanced features
     */
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /**
     * Get or compute a value with advanced features
     */
    getOrCompute<T>(key: string, compute: () => Promise<T>, options?: CacheOptions): Promise<T>;
    /**
     * Delete a value from cache
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear all cache data
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<Record<string, CacheStats>>;
    /**
     * Start periodic stats collection
     */
    private startStatsCollection;
    /**
     * Stop stats collection
     */
    stopStatsCollection(): void;
    /**
     * Get provider health status
     */
    getProviderHealth(): Record<string, {
        status: "healthy" | "degraded" | "unhealthy";
        errorCount: number;
        lastError?: Error;
        healthy: boolean;
    }>;
    /**
     * Reset provider error counts
     */
    resetProviderErrors(): void;
    /**
     * Clean up resources
     */
    dispose(): void;
}
