/**
 * @fileoverview Provider management and orchestration for multi-layer caching
 */
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions, CacheStats } from '../types/common';
export declare class CacheProviderManager {
    private providers;
    private sortedProviders;
    private healthStatus;
    constructor();
    /**
     * Register a new cache provider
     */
    registerProvider(name: string, provider: ICacheProvider, priority?: number): void;
    /**
     * Remove a cache provider
     */
    removeProvider(name: string): boolean;
    /**
     * Update provider ordering based on priority
     * @private
     */
    private updateProviderOrder;
    /**
     * Get a value from cache providers in priority order
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set a value across all cache providers
     */
    set(key: string, value: any, options?: CacheOptions): Promise<void>;
    /**
     * Delete a value from all cache providers
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear all cache providers
     */
    clear(): Promise<void>;
    /**
     * Get stats from all providers
     */
    getStats(): Promise<Record<string, CacheStats>>;
    /**
     * Get a specific provider by name
     */
    getProvider(name: string): ICacheProvider | undefined;
    /**
     * Handle provider errors
     */
    private handleProviderError;
    /**
     * Reset error counts for providers
     */
    resetErrorCounts(): void;
    /**
     * Get provider health status
     */
    getProviderHealth(): Record<string, {
        status: 'healthy' | 'degraded' | 'unhealthy';
        errorCount: number;
        lastError?: Error;
        healthy: boolean;
    }>;
    /**
     * Get provider status
     */
    getProviderStatus(name: string): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        healthy: boolean;
        errorCount: number;
        lastError?: Error;
    } | undefined;
    private getProviderStats;
}
