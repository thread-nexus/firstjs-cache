/**
 * Core cache manager implementation
 */

import {CacheOptions, CacheStats} from '../types';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import {CacheErrorCode, createCacheError, handleCacheError} from '../utils/error-utils';
import {DEFAULT_CONFIG} from '../config/default-config';
import {providerHasMethod, safelyCallProviderMethod} from './cache-manager-utils';

/**
 * Extended configuration for cache manager core
 */
interface ExtendedCacheConfig {
    defaultTtl: number;
    defaultOptions: CacheOptions;
    throwOnErrors: boolean;
    backgroundRefresh: boolean;
    refreshThreshold: number;
    deduplicateRequests: boolean;
    logging: boolean;
    logStackTraces: boolean;
    logger: (logEntry: any) => void;
    batchSize: number;
    retry: {
        attempts: number;
        delay: number;
    };
    // Additional properties
    statsInterval?: number;
    defaultProvider?: string;
}

/**
 * Core cache manager implementation
 */
export class CacheManagerCore {
    protected providers = new Map<string, ICacheProvider>();
    protected config: ExtendedCacheConfig;
    private statsTimer: NodeJS.Timeout | null = null;

    /**
     * Create a new cache manager core
     */
    constructor(config = {}) {
        this.config = {...DEFAULT_CONFIG, ...config} as ExtendedCacheConfig;

        // Start stats collection if configured
        if (this.config.statsInterval && this.config.statsInterval > 0) {
            this.startStatsCollection();
        }
    }

    /**
     * Get a value from cache
     *
     * @param key - Cache key
     * @returns Cached value or null if not found
     */
    async get<T = any>(key: string): Promise<T | null> {
        const provider = this.getProvider();
        if (!provider) return null;

        try {
            const value = await provider.get(key);
            return value as T;
        } catch (error) {
            handleCacheError(error, {operation: 'get', key});
            return null;
        }
    }

    /**
     * Set a value in cache
     *
     * @param key - Cache key
     * @param value - Value to cache
     * @param options - Cache options
     */
    async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
        const provider = this.getProvider();
        if (!provider) {
            throw createCacheError('No cache provider available', CacheErrorCode.NO_PROVIDER);
        }

        try {
            await provider.set(key, value, options);
        } catch (error) {
            handleCacheError(error, {operation: 'set', key});
            throw error;
        }
    }

    /**
     * Delete a value from cache
     *
     * @param key - Cache key
     * @returns Whether the value was deleted
     */
    async delete(key: string): Promise<boolean> {
        const provider = this.getProvider();
        if (!provider) return false;

        try {
            return await provider.delete(key);
        } catch (error) {
            handleCacheError(error, {operation: 'delete', key});
            return false;
        }
    }

    /**
     * Clear all values from cache
     */
    async clear(): Promise<void> {
        const provider = this.getProvider();
        if (!provider) return;

        try {
            await provider.clear();
        } catch (error) {
            handleCacheError(error, {operation: 'clear'});
        }
    }

    /**
     * Get or compute a value
     *
     * @param key - Cache key
     * @param fetcher - Function to fetch the value if not in cache
     * @param options - Cache options
     * @returns Cached or computed value
     */
    async getOrCompute<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: CacheOptions
    ): Promise<T> {
        const provider = this.getProvider();
        if (!provider) {
            throw createCacheError('No cache provider available', CacheErrorCode.NO_PROVIDER);
        }

        try {
            // Check cache first
            const value = await provider.get(key) as T | null;
            if (value !== null) {
                return value;
            }

            // Compute value
            const computed = await fetcher();

            // Store in cache
            await provider.set(key, computed, options);

            return computed;
        } catch (error) {
            handleCacheError(error, {operation: 'getOrCompute', key});
            throw error;
        }
    }

    /**
     * Get a value from cache (alias for get)
     *
     * @param key - Cache key
     * @returns Cached value or null if not found
     */
    async getCacheValue<T = any>(key: string): Promise<T | null> {
        return this.get<T>(key);
    }

    /**
     * Set a value in cache (alias for set)
     *
     * @param key - Cache key
     * @param value - Value to cache
     * @param options - Cache options
     */
    async setCacheValue<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
        return this.set<T>(key, value, options);
    }

    /**
     * Find keys by pattern
     *
     * @param pattern - Pattern to match keys against
     * @returns Matching keys
     */
    async findKeysByPattern(pattern: string): Promise<string[]> {
        return this.keys(pattern);
    }

    /**
     * Register a cache provider
     */
    registerProvider(name: string, provider: ICacheProvider, priority = 100): void {
        // Add name to provider if not set
        if (!provider.name) {
            (provider as any).name = name;
        }

        this.providers.set(name, provider);

        emitCacheEvent(CacheEventType.PROVIDER_INITIALIZED, {
            provider: name,
            priority
        });
    }

    /**
     * Get a provider by name
     */
    getProvider(name?: string): ICacheProvider | null {
        const providerName = name || this.config.defaultProvider;

        if (!providerName) {
            // Return first provider if no name specified
            const firstProvider = [...this.providers.values()][0];
            return firstProvider || null;
        }

        return this.providers.get(providerName) || null;
    }

    /**
     * Get all providers
     */
    getProviders(): Map<string, ICacheProvider> {
        return this.providers;
    }

    /**
     * Invalidate all entries with a given tag
     */
    async invalidateByTag(tag: string): Promise<number> {
        const provider = this.getProvider();
        if (!provider) return 0;

        if (providerHasMethod(provider, 'invalidateByTag')) {
            await provider.invalidateByTag?.(tag);
            return 0; // Return 0 as we can't determine the count
        }

        return 0;
    }

    /**
     * Dispose of the cache manager
     */
    async dispose(): Promise<void> {
        // Stop stats collection
        if (this.statsTimer) {
            clearInterval(this.statsTimer);
            this.statsTimer = null;
        }

        // Dispose of providers
        for (const [name, provider] of this.providers.entries()) {
            if (providerHasMethod(provider, 'dispose')) {
                try {
                    await safelyCallProviderMethod(provider, 'dispose');
                } catch (error) {
                    console.error(`Error disposing provider ${name}:`, error);
                }
            }
        }

        // Clear providers
        this.providers.clear();
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<Record<string, CacheStats>> {
        const result: Record<string, CacheStats> = {};

        for (const [name, provider] of this.providers.entries()) {
            if (providerHasMethod(provider, 'getStats')) {
                try {
                    const stats = await safelyCallProviderMethod<CacheStats>(provider, 'getStats');
                    if (stats) {
                        result[name] = stats;
                    }
                } catch (error) {
                    console.error(`Error getting stats for provider ${name}:`, error);
                }
            }
        }

        return result;
    }

    /**
     * Perform health checks on all providers
     */
    async healthCheck(): Promise<Record<string, { healthy: boolean; message?: string; status?: string }>> {
        const result: Record<string, { healthy: boolean; message?: string; status?: string }> = {};

        for (const [name, provider] of this.providers.entries()) {
            if (providerHasMethod(provider, 'healthCheck')) {
                try {
                    const health = await safelyCallProviderMethod<{
                        healthy: boolean;
                        message?: string;
                        status?: string
                    }>(
                        provider,
                        'healthCheck'
                    );

                    if (health) {
                        const healthy = health.status === 'healthy' ||
                            health.status === undefined && health.healthy;

                        result[name] = {
                            healthy,
                            message: health.message,
                            status: health.status || (healthy ? 'healthy' : 'unhealthy')
                        };
                    }
                } catch (error) {
                    result[name] = {
                        healthy: false,
                        message: error instanceof Error ? error.message : String(error),
                        status: 'error'
                    };
                }
            } else {
                // Basic health check
                try {
                    const testKey = `__health_check_${Date.now()}`;
                    await provider.set(testKey, {timestamp: Date.now()});
                    await provider.get(testKey);
                    await provider.delete(testKey);

                    result[name] = {
                        healthy: true,
                        status: 'healthy'
                    };
                } catch (error) {
                    result[name] = {
                        healthy: false,
                        message: error instanceof Error ? error.message : String(error),
                        status: 'error'
                    };
                }
            }
        }

        return result;
    }

    /**
     * Get configuration
     */
    getConfig(): Record<string, any> {
        return {
            providers: Array.from(this.providers.keys()),
            defaultTtl: this.config.defaultTtl,
            defaultProvider: this.config.defaultProvider,
            backgroundRefresh: this.config.backgroundRefresh,
            refreshThreshold: this.config.refreshThreshold,
            deduplicateRequests: this.config.deduplicateRequests
        };
    }

    /**
     * Get configuration info (alias for getConfig)
     */
    getConfigInfo(): Record<string, any> {
        return this.getConfig();
    }

    /**
     * Get keys matching a pattern
     */
    async keys(pattern?: string): Promise<string[]> {
        const provider = this.getProvider();
        if (!provider) return [];

        if (providerHasMethod(provider, 'keys')) {
            const keysMethod = provider.keys as (pattern?: string) => Promise<string[]>;
            return await keysMethod(pattern);
        }

        return [];
    }

    /**
     * Create a new provider adapter
     */
    createAdapter(name: string, type: string, options: any = {}): ICacheProvider {
        // This is just a stub - implementation would depend on available adapters
        throw createCacheError(
            `Adapter type '${type}' not supported`,
            CacheErrorCode.INITIALIZATION_ERROR
        );
    }

    /**
     * Start collecting stats at regular intervals
     */
    private startStatsCollection(): void {
        // Ensure we don't have multiple timers
        if (this.statsTimer) {
            clearInterval(this.statsTimer);
        }

        // Set up interval for stats collection
        this.statsTimer = setInterval(async () => {
            try {
                const stats = await this.getStats();
                emitCacheEvent(CacheEventType.STATS_UPDATE, {stats});
            } catch (error) {
                console.error('Error collecting cache stats:', error);
            }
        }, (this.config.statsInterval || 60) * 1000);
    }
}