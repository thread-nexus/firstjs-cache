/**
 * @fileoverview Core cache manager implementation
 * 
 * This module provides the central cache manager functionality that orchestrates
 * various operations, providers, and features. It implements a modular design
 * with specialized components for different aspects of cache management.
 * 
 * @module implementations/cache-manager-core
 */

import {CacheOptions, CacheStats} from '../types';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import {CacheErrorCode, createCacheError, handleCacheError} from '../utils/error-utils';
import {DEFAULT_CONFIG} from '../config/default-config';
import {CACHE_OPERATION} from '../constants';
import {logger} from '../utils/logger';
import {metrics} from '../utils/metrics';

/**
 * Extended configuration for cache manager core
 * 
 * @interface ExtendedCacheConfig
 */
export interface ExtendedCacheConfig {
    /**
     * Default time-to-live in seconds for cache entries
     */
    defaultTtl: number;
    
    /**
     * Default options for cache operations
     */
    defaultOptions: CacheOptions;
    
    /**
     * Whether to throw errors or handle them silently
     */
    throwOnErrors: boolean;
    
    /**
     * Whether to enable background refresh of stale entries
     */
    backgroundRefresh: boolean;
    
    /**
     * Threshold percentage of TTL after which an entry is considered stale
     * Values between 0-1, e.g., 0.75 means refresh at 75% of TTL
     */
    refreshThreshold: number;
    
    /**
     * Whether to deduplicate identical in-flight requests
     */
    deduplicateRequests: boolean;
    
    /**
     * Whether to enable logging
     */
    logging: boolean;
    
    /**
     * Whether to include stack traces in logs
     */
    logStackTraces: boolean;
    
    /**
     * Custom logger function
     */
    logger: (logEntry: any) => void;
    
    /**
     * Size limit for batch operations
     */
    batchSize: number;
    
    /**
     * Retry configuration
     */
    retry: {
        /**
         * Maximum retry attempts
         */
        attempts: number;
        
        /**
         * Base delay between retries in ms
         */
        delay: number;
    };
    
    /**
     * Interval in seconds for stats collection (0 to disable)
     */
    statsInterval?: number;
    
    /**
     * Name of the default provider to use
     */
    defaultProvider?: string;
}

/**
 * Interface for basic cache operations
 * 
 * @interface ICacheOperations
 */
export interface ICacheOperations {
    /**
     * Get a value from the cache
     * 
     * @template T Type of the cached value
     * @param {string} key - Cache key
     * @returns {Promise<T | null>} Cached value or null if not found
     */
    get<T = any>(key: string): Promise<T | null>;
    
    /**
     * Store a value in the cache
     * 
     * @template T Type of the value to cache
     * @param {string} key - Cache key
     * @param {T} value - Value to cache
     * @param {CacheOptions} [options] - Cache options
     * @returns {Promise<void>}
     */
    set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
    
    /**
     * Delete a value from the cache
     * 
     * @param {string} key - Cache key to delete
     * @returns {Promise<boolean>} Whether the key was deleted
     */
    delete(key: string): Promise<boolean>;
    
    /**
     * Clear all values from the cache
     * 
     * @returns {Promise<void>}
     */
    clear(): Promise<void>;
    
    /**
     * Get a cache value (alias for get)
     * 
     * @template T Type of the cached value
     * @param {string} key - Cache key
     * @returns {Promise<T | null>} Cached value or null if not found
     */
    getCacheValue<T = any>(key: string): Promise<T | null>;
    
    /**
     * Set a cache value with metadata (alias for set)
     * 
     * @template T Type of the value to cache
     * @param {string} key - Cache key
     * @param {T} value - Value to cache
     * @param {CacheOptions} [options] - Cache options
     * @returns {Promise<void>}
     */
    setCacheValue<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
}

/**
 * Interface for advanced cache operations
 * 
 * @interface ICacheAdvanced
 */
export interface ICacheAdvanced {
    /**
     * Get a value from cache or compute it if not available
     * 
     * @template T Type of the value
     * @param {string} key - Cache key
     * @param {() => Promise<T>} fetcher - Function to compute value if not cached
     * @param {CacheOptions} [options] - Cache options
     * @returns {Promise<T>} Cached or computed value
     */
    getOrCompute<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T>;
    
    /**
     * Invalidate all cache entries with the specified tag
     * 
     * @param {string} tag - Tag to invalidate
     * @returns {Promise<number>} Number of entries invalidated
     */
    invalidateByTag(tag: string): Promise<number>;
    
    /**
     * Find cache keys matching a pattern
     * 
     * @param {string} pattern - Pattern to match (regular expression)
     * @returns {Promise<string[]>} Matching keys
     */
    findKeysByPattern(pattern: string): Promise<string[]>;
    
    /**
     * Get all cache keys optionally filtered by pattern
     * 
     * @param {string} [pattern] - Optional pattern to filter keys
     * @returns {Promise<string[]>} Array of keys
     */
    keys(pattern?: string): Promise<string[]>;
}

/**
 * Interface for cache provider management
 * 
 * @interface ICacheProviderManager
 */
export interface ICacheProviderManager {
    /**
     * Register a cache provider
     * 
     * @param {string} name - Provider name
     * @param {ICacheProvider} provider - Provider implementation
     * @param {number} [priority] - Provider priority (lower is higher)
     */
    registerProvider(name: string, provider: ICacheProvider, priority?: number): void;
    
    /**
     * Get a provider by name or the default provider
     * 
     * @param {string} [name] - Provider name (optional)
     * @returns {ICacheProvider | null} Provider or null if not found
     */
    getProvider(name?: string): ICacheProvider | null;
    
    /**
     * Get all registered providers
     * 
     * @returns {Map<string, ICacheProvider>} Map of providers by name
     */
    getProviders(): Map<string, ICacheProvider>;
    
    /**
     * Create a provider adapter of a specific type
     * 
     * @param {string} name - Adapter name
     * @param {string} type - Adapter type
     * @param {any} [options] - Adapter options
     * @returns {ICacheProvider} Configured adapter
     */
    createAdapter(name: string, type: string, options?: any): ICacheProvider;
    
    /**
     * Dispose of all providers and release resources
     * 
     * @returns {Promise<void>}
     */
    disposeProviders(): Promise<void>;
}

/**
 * Interface for cache statistics
 * 
 * @interface ICacheStats
 */
export interface ICacheStats {
    /**
     * Get cache statistics
     * 
     * @returns {Promise<CacheStats>} Cache statistics
     */
    getStats(): Promise<CacheStats>;
    
    /**
     * Perform a health check on the cache system
     * 
     * @returns {Promise<Record<string, any>>} Health status
     */
    healthCheck(): Promise<Record<string, any>>;
}

/**
 * Core cache manager implementation
 * Implements fundamental cache operations and provider management
 * 
 * @class CacheManagerCore
 * @implements {ICacheOperations}
 * @implements {ICacheAdvanced}
 * @implements {ICacheProviderManager}
 * @implements {ICacheStats}
 */
export class CacheManagerCore implements ICacheOperations, ICacheAdvanced, ICacheProviderManager, ICacheStats {
    /**
     * Map of providers by name
     */
    readonly providers = new Map<string, ICacheProvider>();
    
    /**
     * Manager configuration
     */
    readonly config: ExtendedCacheConfig;
    
    /**
     * Timer for stats collection
     * @private
     */
    private statsTimer: NodeJS.Timeout | null = null;

    /**
     * Basic operations component
     * @private
     */
    private readonly operations: CacheManagerOperations;
    
    /**
     * Advanced operations component
     * @private
     */
    private readonly advanced: CacheManagerAdvanced;
    
    /**
     * Statistics component
     * @private
     */
    private readonly stats: CacheManagerStats;
    
    /**
     * Provider management component
     * @private
     */
    private readonly providerManager: CacheManagerProviders;

    /**
     * Creates a new cache manager instance
     * 
     * @param {Partial<ExtendedCacheConfig>} [config={}] - Configuration options
     */
    constructor(config: Partial<ExtendedCacheConfig> = {}) {
        this.config = {...DEFAULT_CONFIG, ...config} as ExtendedCacheConfig;

        // Initialize composed functionality
        this.operations = new CacheManagerOperations(this);
        this.advanced = new CacheManagerAdvanced(this);
        this.stats = new CacheManagerStats(this);
        this.providerManager = new CacheManagerProviders(this);

        // Start stats collection if configured
        if (this.config.statsInterval && this.config.statsInterval > 0) {
            this.startStatsCollection();
        }
    }

    // ICacheOperations implementation
    async get<T = any>(key: string): Promise<T | null> {
        return this.operations.get<T>(key);
    }

    async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
        return this.operations.set<T>(key, value, options);
    }

    async delete(key: string): Promise<boolean> {
        return this.operations.delete(key);
    }

    async clear(): Promise<void> {
        return this.operations.clear();
    }

    async getCacheValue<T = any>(key: string): Promise<T | null> {
        return this.operations.getCacheValue<T>(key);
    }

    async setCacheValue<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
        return this.operations.setCacheValue<T>(key, value, options);
    }

    // ICacheAdvanced implementation
    async getOrCompute<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T> {
        return this.advanced.getOrCompute<T>(key, fetcher, options);
    }

    async invalidateByTag(tag: string): Promise<number> {
        return this.advanced.invalidateByTag(tag);
    }

    async findKeysByPattern(pattern: string): Promise<string[]> {
        return this.advanced.findKeysByPattern(pattern);
    }

    async keys(pattern?: string): Promise<string[]> {
        return this.advanced.keys(pattern);
    }

    // ICacheProviderManager implementation
    registerProvider(name: string, provider: ICacheProvider, priority = 100): void {
        return this.providerManager.registerProvider(name, provider, priority);
    }

    getProvider(name?: string): ICacheProvider | null {
        return this.providerManager.getProvider(name);
    }

    getProviders(): Map<string, ICacheProvider> {
        return this.providers;
    }

    createAdapter(name: string, type: string, options: any = {}): ICacheProvider {
        return this.providerManager.createAdapter(name, type, options);
    }

    async disposeProviders(): Promise<void> {
        return this.providerManager.disposeProviders();
    }

    // ICacheStats implementation
    async getStats() {
        return this.stats.getStats();
    }

    async healthCheck() {
        return this.stats.healthCheck();
    }

    /**
     * Get current configuration information
     * 
     * @returns {Record<string, any>} Configuration summary
     */
    getConfigInfo(): Record<string, any> {
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
     * Get the full configuration
     * 
     * @returns {ExtendedCacheConfig} Current configuration
     */
    getConfig() {
        return this.config;
    }

    /**
     * Dispose of the cache manager and all resources
     * Should be called when the application is shutting down
     * 
     * @returns {Promise<void>}
     */
    async dispose(): Promise<void> {
        // Stop a stat collection
        if (this.statsTimer) {
            clearInterval(this.statsTimer);
            this.statsTimer = null;
        }

        // Dispose of providers
        await this.providerManager.disposeProviders();

        // Clear providers
        this.providers.clear();
    }

    /**
     * Start collecting stats at regular intervals
     * 
     * @private
     */
    private startStatsCollection(): void {
        // Ensure we don't have multiple timers
        if (this.statsTimer) {
            clearInterval(this.statsTimer);
        }

        // Set up interval for stat collection
        this.statsTimer = setInterval(async () => {
            try {
                const stats = await this.getStats();
                emitCacheEvent(CacheEventType.STATS_UPDATE, {stats});
            } catch (error) {
                logger.error('Error collecting cache stats:', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }, (this.config.statsInterval || 60) * 1000);
    }
}

/**
 * Manages basic cache operations
 * Implements core get/set/delete operations and error handling
 * 
 * @class CacheManagerOperations
 */
class CacheManagerOperations {
    /**
     * Creates an operations manager
     * 
     * @param {CacheManagerCore} core - Parent cache manager
     */
    constructor(private readonly core: CacheManagerCore) {}

    /**
     * Get a value from the cache
     * 
     * @template T Type of cached value
     * @param {string} key - Cache key
     * @returns {Promise<T | null>} Cached value or null if not found
     */
    async get<T = any>(key: string): Promise<T | null> {
        const provider = this.core.getProvider();
        if (!provider) return null;

        try {
            const timerId = metrics.startTimer('cache.get');
            const value = await provider.get(key);
            
            const duration = metrics.stopTimer(timerId, {
                provider: provider.name || 'unknown',
                hit: value !== null ? 'true' : 'false'
            });
            
            // Emit metric for cache hit/miss ratio
            if (value === null) {
                metrics.increment('cache.misses', 1, {
                    provider: provider.name || 'unknown'
                });
                logger.debug(`Cache miss for key: ${key}`, {
                    operation: 'get',
                    provider: provider.name || 'unknown'
                });
            } else {
                metrics.increment('cache.hits', 1, {
                    provider: provider.name || 'unknown'
                });
                logger.debug(`Cache hit for key: ${key}`, {
                    operation: 'get',
                    provider: provider.name || 'unknown',
                    duration
                });
            }
            
            return value as T;
        } catch (error) {
            metrics.increment('cache.errors', 1, {
                operation: 'get',
                provider: provider.name || 'unknown'
            });
            
            handleCacheError(error, {
                operation: CACHE_OPERATION.GET, 
                key,
                provider: provider.name || 'unknown'
            }, true);
            
            return null;
        }
    }

    /**
     * Store a value in the cache
     * 
     * @template T Type of value to cache
     * @param {string} key - Cache key
     * @param {T} value - Value to cache
     * @param {CacheOptions} [options] - Cache options
     * @returns {Promise<void>}
     * @throws {CacheError} If operation fails and throwOnErrors is true
     */
    async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
        const provider = this.core.getProvider();
        if (!provider) {
            throw createCacheError('No cache provider available', CacheErrorCode.NO_PROVIDER);
        }

        try {
            await provider.set(key, value, options);
        } catch (error) {
            handleCacheError(error, {operation: CACHE_OPERATION.SET, key}, true);
            throw error;
        }
    }

    /**
     * Delete a value from the cache
     * 
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Whether the key was deleted
     */
    async delete(key: string): Promise<boolean> {
        const provider = this.core.getProvider();
        if (!provider) return false;

        try {
            return await provider.delete(key);
        } catch (error) {
            handleCacheError(error, {operation: CACHE_OPERATION.DELETE, key}, true);
            return false;
        }
    }

    /**
     * Clear all cache contents
     * 
     * @returns {Promise<void>}
     */
    async clear(): Promise<void> {
        const provider = this.core.getProvider();
        if (!provider) return;

        try {
            await provider.clear();
        } catch (error) {
            handleCacheError(error, {operation: CACHE_OPERATION.CLEAR}, true);
        }
    }

    /**
     * Get a cache value (alias for get with debug logging)
     * 
     * @template T Type of cached value
     * @param {string} key - Cache key
     * @returns {Promise<T | null>} Cached value or null if not found
     */
    async getCacheValue<T = any>(key: string): Promise<T | null> {
        const provider = this.core.getProvider();
        if (!provider) return null;

        try {
            const value = await provider.get(key);
            if (value === null) {
                console.log(`Cache miss for key: ${key}`);
            } else {
                console.log(`Cache hit for key: ${key}`);
            }
            return value as T;
        } catch (error) {
            handleCacheError(error, {operation: CACHE_OPERATION.GET, key}, true);
            return null;
        }
    }

    /**
     * Set a cache value with metadata
     * Handles updating existing entries with refresh metadata
     * 
     * @template T Type of value to cache
     * @param {string} key - Cache key
     * @param {T} value - Value to cache
     * @param {CacheOptions} [options] - Cache options
     * @returns {Promise<void>}
     */
    async setCacheValue<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
        const existingValue = await this.get<T>(key);
        if (existingValue !== null) {
            const updatedOptions = {...options, refreshedAt: Date.now()};
            return this.set<T>(key, value, updatedOptions);
        }
        if (!options?.ttl) {
            options = {...options, ttl: this.core.config.defaultTtl};
        }
        return this.set<T>(key, value, options);
    }
}

// Additional class implementations follow similar patterns
class CacheManagerAdvanced {
    constructor(private readonly core: CacheManagerCore) {}

    async getOrCompute<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T> {
        const provider = this.core.getProvider();
        if (!provider) {
            throw new Error('No cache provider available');
        }

        try {
            const cachedValue = await provider.get(key);
            if (cachedValue !== null) {
                const metadata = await provider.getMetadata?.(key);
                const isStale = metadata?.refreshedAt
                    ? (Date.now() - metadata.refreshedAt >= (options?.ttl || this.core.config.defaultTtl) * 1000 * (options?.refreshThreshold || this.core.config.refreshThreshold))
                    : false;

                if (isStale && options?.backgroundRefresh) {
                    fetcher().then(async (result) => {
                        await provider.set(key, result, options);
                    }).catch(err => console.error(`Background refresh error for key "${key}":`, err));
                }

                return cachedValue;
            }

            const value = await fetcher();
            await provider.set(key, value, options);
            return value;
        } catch (error) {
            console.error(`Error in getOrCompute for key "${key}":`, error);
            throw error;
        }
    }

    async invalidateByTag(tag: string): Promise<number> {
        let invalidatedCount = 0;

        // Iterate over all providers
        for (const provider of this.core.getProviders().values()) {
            if (provider.invalidateByTag) {
                try {
                    // Attempt to invalidate by tag and accumulate the count
                    invalidatedCount += await provider.invalidateByTag(tag);
                } catch (error) {
                    console.error(`Failed to invalidate tag "${tag}" in provider ${provider.name}:`, error);
                }
            }
        }

        return invalidatedCount;
    }

    async findKeysByPattern(pattern: string): Promise<string[]> {
        const regex = new RegExp(pattern);
        const allKeys: string[] = await this.keys('*');
        return allKeys.filter(key => regex.test(key));
    }

    async keys(pattern?: string): Promise<string[]> {
        // Use Promise.all to wait for all promises to resolve
        const allKeysPromises = Array.from(this.core.getProviders().values())
            .map(provider => 
                provider.keys ? provider.keys(pattern || '*') : Promise.resolve([] as string[])
            );
        
        // Wait for all promises to resolve
        const allKeysArrays = await Promise.all(allKeysPromises);
        
        // Flatten the arrays of keys
        return allKeysArrays.flat();
    }
}

class CacheManagerStats {
    constructor(private readonly core: CacheManagerCore) {}

    async getStats(): Promise<CacheStats> {
        let totalSize = 0;
        let hits = 0;
        let misses = 0;
        let keyCount = 0;
        let memoryUsage = 0;
        const keys: string[] = [];

        try {
            for (const provider of this.core.getProviders().values()) {
                if (provider.getStats) {
                    const stats = await provider.getStats();
                    totalSize += stats.size || 0;
                    hits += stats.hits || 0;
                    misses += stats.misses || 0;
                    keyCount += stats.keyCount || 0;
                    memoryUsage += stats.memoryUsage || 0;
                    if (stats.keys) {
                        keys.push(...stats.keys);
                    }
                }
            }
        } catch (error) {
            return {
                size: totalSize,
                hits,
                misses,
                keyCount,
                memoryUsage,
                lastUpdated: Date.now(),
                error: typeof error === 'object' && error !== null && 'message' in error 
                    ? (error as Error).message 
                    : 'Error collecting stats',
            };
        }

        return {
            size: totalSize,
            hits,
            misses,
            keyCount,
            memoryUsage,
            lastUpdated: Date.now(),
            keys,
        };
    }

    async healthCheck(): Promise<Record<string, any>> {
        const providersStatus: Record<string, any> = {};
        const now = Date.now();

        for (const [name, provider] of this.core.getProviders()) {
            try {
                if (provider.healthCheck) {
                    const healthData = await provider.healthCheck();
                    // Ensure lastCheck is present
                    if (!healthData.lastCheck) {
                        healthData.lastCheck = now;
                    }
                    providersStatus[name] = healthData;
                } else {
                    providersStatus[name] = {
                        status: 'unavailable', 
                        reason: 'Health check not implemented',
                        healthy: false,
                        lastCheck: now
                    };
                }
            } catch (error) {
                providersStatus[name] = {
                    status: 'error', 
                    healthy: false,
                    lastCheck: now,
                    error: typeof error === 'object' && error !== null && 'message' in error 
                        ? (error as Error).message 
                        : 'Unknown error'
                };
            }
        }

        return {
            status: Object.values(providersStatus).every(status => status.status === 'healthy') ? 'healthy' : 'degraded',
            healthy: Object.values(providersStatus).every(status => status.healthy === true),
            lastCheck: now,
            providers: providersStatus
        };
    }
}

class CacheManagerProviders {
    constructor(private readonly core: CacheManagerCore) {}

    registerProvider(name: string, provider: ICacheProvider, priority = 100): void {
        if (!name) {
            throw createCacheError('Provider name is required', CacheErrorCode.INVALID_ARGUMENT);
        }
        
        if (!provider) {
            throw createCacheError('Provider instance is required', CacheErrorCode.INVALID_ARGUMENT);
        }
        
        // Store name on provider for easier access
        provider.name = name;
        this.core.getProviders().set(name, provider);
        
        // Emit provider initialized event
        emitCacheEvent(CacheEventType.PROVIDER_INITIALIZED, {
            provider: name,
            timestamp: Date.now()
        });
    }

    getProvider(name?: string): ICacheProvider | null {
        if (!name) {
            // Return default provider, if configured
            const defaultProviderName = this.core.config.defaultProvider;
            return defaultProviderName ? this.getProviders().get(defaultProviderName) || null : null;
        }
        // Return the provider by name
        return this.getProviders().get(name) || null;
    }

    getProviders(): Map<string, ICacheProvider> {
        return this.core.getProviders();
    }

    createAdapter(name: string, type: string, options: any = {}): ICacheProvider {
        const provider = this.getProviders().get(type);
        if (!provider) {
            throw createCacheError(
                `Provider of type "${type}" not found`,
                CacheErrorCode.INITIALIZATION_ERROR
            );
        }
        return {
            ...provider,
            name,
            ...options
        } as ICacheProvider;
    }

    async disposeProviders(): Promise<void> {
        try {
            for (const provider of this.core.getProviders().values()) {
                if (provider.dispose) {
                    try {
                        await provider.dispose();
                    } catch (error) {
                        console.error(`Failed to dispose provider ${provider.name}:`, error);
                    }
                }
            }
        } catch (error) {
            handleCacheError(error, { operation: 'disposeProviders' }, true);
        }
    }
}