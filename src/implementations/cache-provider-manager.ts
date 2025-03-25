/**
 * @fileoverview Provider management and orchestration for multi-layer caching
 * 
 * This module implements a comprehensive provider management system that allows
 * for multiple cache providers to be registered, prioritized, and managed.
 * It handles provider health monitoring, statistics collection, and graceful
 * fallback between providers.
 * 
 * @module implementations/cache-provider-manager
 */

import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions, CacheStats } from '../types';
import { MemoryProvider } from '../adapters/memory-provider';
import { CacheProviderRegistration } from './cache-provider-registration';
import { CacheProviderOperations } from './cache-provider-operations';
import { CacheProviderHealth } from './cache-provider-health';
import { CacheProviderStats } from './cache-provider-stats';
import { CacheErrorCode, createCacheError, handleCacheError } from '../utils/error-utils';
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

/**
 * Provider configuration with priority and metadata
 * Represents a registered cache provider with its metadata
 * 
 * @interface ProviderEntry
 */
export interface ProviderEntry {
    /**
     * Provider name used for identification
     */
    name: string;
    
    /**
     * Actual provider implementation instance
     */
    instance: ICacheProvider;
    
    /**
     * Priority value (lower values indicate higher priority)
     */
    priority: number;
    
    /**
     * Provider-specific statistics
     */
    stats: Record<string, any>;
    
    /**
     * Last error encountered by this provider
     */
    lastError?: Error;
    
    /**
     * Count of errors encountered by this provider
     */
    errorCount: number;
}

/**
 * Cache provider manager for multi-layer caching
 * 
 * Manages multiple cache providers, handles fallback between providers,
 * tracks provider health, and implements operations across providers.
 * 
 * @class CacheProviderManager
 */
export class CacheProviderManager {
    /**
     * Map of registered providers by name
     * @private
     */
    private providers: Map<string, ProviderEntry> = new Map();
    
    /**
     * Providers sorted by priority for operations
     * @private
     */
    private sortedProviders: ProviderEntry[] = [];
    
    /**
     * Health status of providers
     * @private
     */
    private healthStatus: Map<string, { healthy: boolean; errors: number }> = new Map();
    
    /**
     * Provider registration component
     * @private
     */
    private registration: CacheProviderRegistration = {} as CacheProviderRegistration;
    
    /**
     * Provider operations component
     * @private
     */
    private operations: CacheProviderOperations = {} as CacheProviderOperations;
    
    /**
     * Provider health monitoring component
     * @private
     */
    private health: CacheProviderHealth = {} as CacheProviderHealth;
    
    /**
     * Provider statistics component
     * @private
     */
    private stats: CacheProviderStats = {} as CacheProviderStats;

    /**
     * Creates a new cache provider manager
     * Initializes components and a default memory provider
     * 
     * @constructor
     */
    constructor() {
        try {
            // Initialize composed functionality - properly initialize in the constructor
            this.registration = new CacheProviderRegistration(this);
            this.operations = new CacheProviderOperations(this);
            this.health = new CacheProviderHealth(this);
            this.stats = new CacheProviderStats();
            
            // Register default memory provider
            this.initializeMemoryProvider();
        } catch (error) {
            handleCacheError(error, {
                operation: 'constructor',
                context: 'CacheProviderManager',
                message: 'Failed to initialize cache provider manager'
            }, false);
        }
    }

    /**
     * Initialize the default memory provider with compatibility
     * Creates a standardized adapter for the memory provider
     * 
     * @private
     */
    private initializeMemoryProvider(): void {
        try {
            const memoryProvider = new MemoryProvider();

            // Create an adapter to bridge interface differences
            const providerAdapter: ICacheProvider = {
                name: 'primary',
                get: async <T>(key: string): Promise<T | null> => {
                    return await memoryProvider.get<T>(key);
                },
                set: async <T>(key: string, value: T, options?: CacheOptions): Promise<void> => {
                    await memoryProvider.set(key, value, options);
                },
                delete: async (key: string): Promise<boolean> => {
                    return await memoryProvider.delete(key);
                },
                clear: async (): Promise<void> => {
                    await memoryProvider.clear();
                },
                has: async (key: string): Promise<boolean> => {
                    return await memoryProvider.has(key);
                },
                keys: async (pattern?: string): Promise<string[]> => {
                    // Safely check for keys method and provide fallback
                    if ('keys' in memoryProvider && typeof memoryProvider.keys === 'function') {
                        return await memoryProvider.keys(pattern);
                    }
                    return [];
                },
                getMany: async <T>(keys: string[]): Promise<Map<string, T>> => {
                    const result = new Map<string, T>();
                    
                    if (memoryProvider.getMany) {
                        const records = await memoryProvider.getMany<T>(keys);
                        // If the provider returns a map directly
                        if (records instanceof Map) {
                            return records;
                        }
                        
                        // If the provider returns a record/object
                        if (typeof records === 'object' && records !== null) {
                            for (const key of Object.keys(records)) {
                                const value = records[key as keyof typeof records];
                                if (value !== null) {
                                    result.set(key, value as T);
                                }
                            }
                        }
                    } else {
                        // Fallback implementation if getMany isn't available
                        for (const key of keys) {
                            const value = await memoryProvider.get<T>(key);
                            if (value !== null) {
                                result.set(key, value);
                            }
                        }
                    }
                    
                    return result;
                },
                setMany: async <T>(entries: Map<string, T>, options?: CacheOptions): Promise<void> => {
                    if (memoryProvider.setMany) {
                        // Convert Map to Record if needed
                        const recordEntries: Record<string, T> = {};
                        entries.forEach((value, key) => {
                            recordEntries[key] = value;
                        });
                        
                        if (memoryProvider.setMany.length === 2) {
                            // Provider accepts Record
                            await (memoryProvider.setMany as any)(recordEntries, options);
                        } else {
                            // Provider accepts Map
                            await memoryProvider.setMany(entries, options);
                        }
                    } else {
                        // Fallback implementation
                        for (const [key, value] of entries.entries()) {
                            await memoryProvider.set(key, value, options);
                        }
                    }
                },
                getStats: async (): Promise<CacheStats> => {
                    return memoryProvider.getStats ? await memoryProvider.getStats() : {
                        hits: 0,
                        misses: 0,
                        size: 0,
                        keyCount: 0,
                        memoryUsage: 0,
                        lastUpdated: Date.now()
                    };
                },
                dispose: async (): Promise<void> => {
                    // Safely check for dispose method
                    if ('dispose' in memoryProvider && typeof memoryProvider.dispose === 'function') {
                        await (memoryProvider.dispose as () => Promise<void>)();
                    }
                }
            };
            
            // Register the adapter
            this.registerProvider('primary', providerAdapter, 0);
        } catch (error) {
            handleCacheError(error, {
                operation: 'initializeMemoryProvider',
                message: 'Failed to initialize memory provider'
            }, false);
            // Create a minimal fallback provider to prevent errors
            this.createFallbackProvider();
        }
    }
    
    /**
     * Create a minimal fallback provider in case initialization fails
     * This ensures the system can continue to operate even if provider
     * initialization fails
     * 
     * @private
     */
    private createFallbackProvider(): void {
        const fallbackProvider: ICacheProvider = {
            name: 'fallback',
            get: async () => null,
            set: async () => {},
            delete: async () => false,
            clear: async () => {},
            has: async () => false,
            getStats: async () => ({
                hits: 0,
                misses: 0,
                size: 0,
                keyCount: 0,
                memoryUsage: 0,
                lastUpdated: Date.now()
            })
        };
        
        this.registerProvider('fallback', fallbackProvider, 999);
        console.warn('Using fallback cache provider due to initialization error');
    }

    /**
     * Gets the map of all registered providers
     * 
     * @returns {Map<string, ProviderEntry>} Map of provider entries indexed by name
     */
    getProviders(): Map<string, ProviderEntry> {
        return this.providers;
    }

    /**
     * Gets providers sorted by priority (lowest to highest)
     * 
     * @returns {ProviderEntry[]} Array of providers in priority order
     */
    getSortedProviders(): ProviderEntry[] {
        return this.sortedProviders;
    }

    /**
     * Gets the health status map for all providers
     * 
     * @returns {Map<string, { healthy: boolean; errors: number }>} Health status by provider name
     */
    getHealthStatusMap(): Map<string, { healthy: boolean; errors: number }> {
        return this.healthStatus;
    }

    /**
     * Updates provider ordering based on priority
     * Should be called when providers are added/removed or priorities change
     */
    updateProviderOrder(): void {
        try {
            this.sortedProviders = Array.from(this.providers.values())
                .sort((a, b) => a.priority - b.priority);
        } catch (error) {
            handleCacheError(error, {
                operation: 'updateProviderOrder',
                message: 'Failed to update provider order'
            }, false);
        }
    }

    /**
     * Registers a cache provider with the manager
     * 
     * @param {string} name - Unique name for the provider
     * @param {ICacheProvider} provider - Provider implementation
     * @param {number} [priority=100] - Provider priority (lower is higher priority)
     * @throws {CacheError} If name or provider is invalid
     */
    registerProvider(name: string, provider: ICacheProvider, priority = 100): void {
        // Input validation
        if (!name) {
            throw createCacheError(
                'Provider name is required',
                CacheErrorCode.INVALID_ARGUMENT
            );
        }
        
        if (!provider) {
            throw createCacheError(
                'Provider instance is required',
                CacheErrorCode.INVALID_ARGUMENT
            );
        }
        
        // Verify required provider methods
        const requiredMethods = ['get', 'set', 'delete', 'clear'];
        for (const method of requiredMethods) {
            if (typeof provider[method as keyof ICacheProvider] !== 'function') {
                logger.warn(`Provider ${name} is missing required method: ${method}`, {
                    provider: name
                });
            }
        }
        
        // Store name on provider for easier access and verify provider has the minimal required methods
        provider.name = name;
        
        // Create provider entry with metrics tracking
        const entry: ProviderEntry = {
            name,
            instance: provider,
            priority,
            stats: {
                hits: 0,
                misses: 0,
                errors: 0,
                size: 0,
                keyCount: 0,
                memoryUsage: 0,
                lastUpdated: Date.now()
            },
            errorCount: 0
        };
        
        // Store provider
        this.providers.set(name, entry);
        
        // Update sorted providers
        this.updateProviderOrder();
        
        // Initialize health status
        this.healthStatus.set(name, { healthy: true, errors: 0 });
        
        // Report metrics about registered providers
        metrics.gauge('cache.providers.count', this.providers.size);
        metrics.increment('cache.providers.registered', 1, {
            provider: name
        });
        
        logger.info(`Registered cache provider: ${name}`, {
            priority,
            provider: name
        });
        
        // Emit provider initialized event
        emitCacheEvent(CacheEventType.PROVIDER_INITIALIZED, {
            provider: name,
            timestamp: Date.now()
        });
    }

    /**
     * Removes a provider from the manager
     * 
     * @param {string} name - Name of the provider to remove
     * @returns {boolean} Whether the provider was found and removed
     */
    removeProvider(name: string): boolean {
        try {
            const removed = this.providers.delete(name);
            
            if (removed) {
                // Update sorted providers
                this.updateProviderOrder();
                
                // Remove health status
                this.healthStatus.delete(name);
                
                // Emit provider removed event
                emitCacheEvent(CacheEventType.PROVIDER_REMOVED, {
                    provider: name,
                    timestamp: Date.now()
                });
            }
            
            return removed;
        } catch (error) {
            handleCacheError(error, {
                operation: 'removeProvider',
                provider: name,
                message: 'Failed to remove provider'
            }, false);
            return false;
        }
    }

    /**
     * Gets a provider by name
     * 
     * @param {string} name - Provider name to look up
     * @returns {ICacheProvider | undefined} Provider instance or undefined if not found
     */
    getProvider(name: string): ICacheProvider | undefined {
        try {
            const entry = this.providers.get(name);
            return entry?.instance;
        } catch (error) {
            handleCacheError(error, {
                operation: 'getProvider',
                provider: name,
                message: 'Failed to get provider'
            }, false);
            return undefined;
        }
    }

    /**
     * Gets a cache value from the highest priority provider that has it
     * 
     * @template T Type of cached value
     * @param {string} key - Cache key to retrieve
     * @returns {Promise<T | null>} Cached value or null if not found
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            return await this.operations.get<T>(key);
        } catch (error) {
            handleCacheError(error, {
                operation: 'get',
                key,
                message: 'Failed to get cache value'
            }, false);
            return null;
        }
    }

    /**
     * Sets a cache value in all registered providers
     * 
     * @param {string} key - Cache key to set
     * @param {any} value - Value to cache
     * @param {CacheOptions} [options] - Cache options
     * @returns {Promise<void>}
     */
    async set(key: string, value: any, options?: CacheOptions): Promise<void> {
        try {
            return await this.operations.set(key, value, options);
        } catch (error) {
            handleCacheError(error, {
                operation: 'set',
                key,
                message: 'Failed to set cache value'
            }, false);
        }
    }

    /**
     * Deletes a cache key from all providers
     * 
     * @param {string} key - Cache key to delete
     * @returns {Promise<boolean>} True if key was deleted from any provider
     */
    async delete(key: string): Promise<boolean> {
        try {
            return await this.operations.delete(key);
        } catch (error) {
            handleCacheError(error, {
                operation: 'delete',
                key,
                message: 'Failed to delete cache value'
            }, false);
            return false;
        }
    }

    /**
     * Clears all cache data from all providers
     * 
     * @returns {Promise<void>}
     */
    async clear(): Promise<void> {
        try {
            return await this.operations.clear();
        } catch (error) {
            handleCacheError(error, {
                operation: 'clear',
                message: 'Failed to clear cache'
            }, false);
        }
    }

    /**
     * Handles an error from a provider
     * Updates error counts and emits appropriate events
     * 
     * @param {ProviderEntry | string} provider - Provider entry or name that encountered the error
     * @param {unknown} error - Error that occurred
     */
    handleProviderError(provider: ProviderEntry | string, error: unknown): void {
        try {
            this.health.handleProviderError(provider, error);
        } catch (err) {
            handleCacheError(err, {
                operation: 'handleProviderError',
                provider: typeof provider === 'string' ? provider : provider.name,
                message: 'Failed to handle provider error'
            }, false);
        }
    }

    /**
     * Resets error counts for all providers
     * Useful after system recovery or maintenance
     */
    resetErrorCounts(): void {
        try {
            this.health.resetErrorCounts();
        } catch (error) {
            handleCacheError(error, {
                operation: 'resetErrorCounts',
                message: 'Failed to reset error counts'
            }, false);
        }
    }

    /**
     * Gets comprehensive health status for all providers
     * 
     * @returns {Record<string, {status: string, errorCount: number, lastError?: Error, healthy: boolean}>}
     *          Health status for each provider
     */
    getProviderHealth(): Record<string, {
        status: 'healthy' | 'degraded' | 'unhealthy';
        errorCount: number;
        lastError?: Error;
        healthy: boolean;
    }> {
        try {
            return this.health.getProviderHealth();
        } catch (error) {
            handleCacheError(error, {
                operation: 'getProviderHealth',
                message: 'Failed to get provider health'
            }, false);
            return {};
        }
    }

    /**
     * Gets health status for a specific provider
     * 
     * @param {string} name - Provider name
     * @returns {Object | undefined} Provider health status or undefined if provider not found
     */
    getProviderStatus(name: string): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        healthy: boolean;
        errorCount: number;
        lastError?: Error;
    } | undefined {
        try {
            return this.health.getProviderStatus(name);
        } catch (error) {
            handleCacheError(error, {
                operation: 'getProviderStatus',
                provider: name,
                message: 'Failed to get provider status'
            }, false);
            return undefined;
        }
    }

    /**
     * Gets cache statistics for all providers
     * 
     * @returns {Promise<Record<string, CacheStats>>} Statistics by provider
     */
    async getStats(): Promise<Record<string, CacheStats>> {
        try {
            const stats: Record<string, CacheStats> = {};
            
            for (const [name, entry] of this.providers.entries()) {
                if (entry.instance.getStats) {
                    try {
                        stats[name] = await entry.instance.getStats();
                    } catch (err) {
                        stats[name] = {
                            hits: 0,
                            misses: 0,
                            size: 0,
                            keyCount: 0,
                            memoryUsage: 0,
                            lastUpdated: Date.now(),
                            error: err instanceof Error ? err.message : String(err)
                        };
                    }
                }
            }
            
            return stats;
        } catch (error) {
            handleCacheError(error, {
                operation: 'getStats',
                message: 'Failed to get cache statistics'
            }, false);
            return {};
        }
    }

    /**
     * Gets aggregated statistics across all providers
     * 
     * @returns {CacheStats} Aggregated statistics
     */
    getProviderStats(): CacheStats {
        try {
            // Aggregate stats across all providers
            const aggregateStats: CacheStats = {
                hits: 0,
                misses: 0,
                size: 0,
                keyCount: 0,
                memoryUsage: 0,
                lastUpdated: Date.now()
            };
            
            for (const entry of this.providers.values()) {
                if (entry.stats) {
                    aggregateStats.hits += entry.stats.hits || 0;
                    aggregateStats.misses += entry.stats.misses || 0;
                    aggregateStats.size += entry.stats.size || 0;
                    aggregateStats.keyCount += entry.stats.keyCount || 0;
                    aggregateStats.memoryUsage += entry.stats.memoryUsage || 0;
                }
            }
            
            return aggregateStats;
        } catch (error) {
            handleCacheError(error, {
                operation: 'getProviderStats',
                message: 'Failed to get provider statistics'
            }, false);
            return {
                hits: 0,
                misses: 0,
                size: 0,
                keyCount: 0,
                memoryUsage: 0,
                lastUpdated: Date.now()
            };
        }
    }

    /**
     * Disposes all providers and cleans up resources
     * Should be called when shutting down the application
     * 
     * @returns {Promise<void>}
     */
    async disposeProviders(): Promise<void> {
        try {
            // Call dispose on all providers that support it
            const disposePromises: Promise<void>[] = [];
            
            for (const [name, entry] of this.providers.entries()) {
                if (entry.instance.dispose) {
                    try {
                        disposePromises.push(entry.instance.dispose());
                    } catch (err) {
                        console.error(`Error disposing provider ${name}:`, err);
                    }
                }
            }
            
            // Wait for all dispose operations to complete
            await Promise.all(disposePromises);
            
            // Clear providers
            this.providers.clear();
            this.sortedProviders = [];
            this.healthStatus.clear();
        } catch (error) {
            handleCacheError(error, {
                operation: 'disposeProviders',
                message: 'Failed to dispose providers'
            }, false);
        }
    }
}