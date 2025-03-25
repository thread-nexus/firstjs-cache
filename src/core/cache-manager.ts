/**
 * @fileoverview Enhanced cache manager implementation
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */

import {ICacheManager} from '../interfaces/i-cache-manager';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheError, CacheErrorCode, createCacheError} from '../utils/error-utils';
import {CacheMonitoring} from '../utils/monitoring-utils';
import {deserialize, serialize} from '../utils/serialization-utils';
import {RateLimiter} from '../utils/rate-limiter';
import {CacheOptions, CacheStats, EntryMetadata} from '../types';
import {CircuitBreaker} from '../utils/circuit-breaker';
import {metrics} from "../utils/metrics";
import {logger} from "../utils/logger";

/**
 * Configuration interface for CacheManager.
 *
 * This interface defines the structure of the configuration object used to
 * initialize and customize the behavior of the CacheManager.
 */
interface CacheManagerConfig {
    providers: Record<string, any>;
    monitoring?: any;
    serialization?: any;
    rateLimit?: any;
    circuitBreaker?: any;
}

/**
 * Interface representing the options available to customize a "get" operation.
 *
 * Extends the `CacheOptions` interface to include additional properties
 * for specialized behavior during the retrieval process.
 *
 * @interface
 */
interface GetOptions extends CacheOptions {
    fallback?: () => Promise<any>;
    provider?: string;
}

/**
 * Interface representing options for setting cache entries.
 *
 * Extends the `CacheOptions` interface and provides additional
 * properties specific to defining options when setting a cache value.
 *
 * Properties:
 * - `ttl` (optional): Specifies the time-to-live (in seconds) for the cache entry.
 * - `tags` (optional): An array of strings used to categorize or associate tags with the cache entry.
 * - `provider` (optional): A string indicating the specific provider associated with the cache.
 */
interface SetOptions extends CacheOptions {
    ttl?: number;
    tags?: string[];
    provider?: string;
}

/**
 * Represents the configuration options for managing batches of requests or operations.
 * Extends the CacheOptions interface to include additional settings related to batching behavior.
 *
 * This interface is typically used to control behaviors such as
 * - Setting size limits for each batch.
 * - Specifying a provider for handling the batch processing.
 *
 * Properties:
 * - maxBatchSize: Defines the maximum number of items that can be included in a single batch.
 * - provider: Specifies the name or identifier of the provider responsible for processing the batches.
 *
 * This flexibility allows customization of batch management, enabling optimized processing
 * suited to specific use cases or requirements.
 */
interface BatchOptions extends CacheOptions {
    maxBatchSize?: number;
    provider?: string;
}

/**
 * Interface representing a batch operation.
 *
 * BatchOperation provides a structure to define an individual operation
 * that can be part of a batch process. It specifies the type of operation,
 * the key targets, and any associated value or options.
 *
 * Properties:
 * - type: Specifies the operation type, which can be 'get', 'set', or 'delete'.
 * - key: Specifies the target key for the operation.
 * - value: Optional. Specifies the value associated with the operation,
 *   typically used for 'set' operations.
 * - options: Optional. Specify additional options related to the operation,
 *   depending on the context or implementation.
 */
interface BatchOperation {
    type: 'get' | 'set' | 'delete';
    key: string;
    value?: any;
    options?: any;
}

/**
 * Represents the result of processing a batch operation.
 *
 * @interface BatchResult
 * @property {string} key - A unique identifier associated with the batch item.
 * @property {boolean} success - Indicates whether the batch operation was completed successfully.
 * @property {any} [value] - The resulting value if the operation was successful. Optional.
 * @property {string} [error] - The error message if the operation failed. Optional.
 */
interface BatchResult {
    key: string;
    success: boolean;
    value?: any;
    error?: string;
}

/**
 * CacheManager is responsible for managing multiple cache providers, performing cache-related operations,
 * and handling features like rate limiting, serialization, circuit breaking, and monitoring.
 * It serves as an orchestration layer to provide a unified interface for caching operations across providers.
 */
export class CacheManager implements ICacheManager {
    private providers: Map<string, ICacheProvider>;
    private readonly monitor: CacheMonitoring;
    private serializer: { serialize: typeof serialize, deserialize: typeof deserialize };
    private rateLimiter: RateLimiter;
    private readonly circuitBreaker: CircuitBreaker;

    constructor(config: CacheManagerConfig) {
        this.providers = new Map();
        this.monitor = new CacheMonitoring(config.monitoring);
        this.serializer = {
            serialize,
            deserialize
        };
        this.rateLimiter = new RateLimiter(config.rateLimit);
        this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
        this.initializeProviders(config.providers);
    }

    async delete(key: string): Promise<boolean> {
        await this.rateLimiter.limit('delete');
        const startTime = performance.now();

        try {
            this.validateKey(key);
            const provider = this.selectProvider();
            const result = await provider.delete(key);

            if (!result) {
                this.monitor.recordMiss(performance.now() - startTime);
            }

            return result;
        } catch (error) {
            this.handleError('delete', error as Error, {key});
            return false;
        }
    }

    async clear(): Promise<void> {
        await this.rateLimiter.limit('clear');
        const startTime = performance.now();

        try {
            const provider = this.selectProvider();
            await provider.clear();

            this.monitor.recordMiss(performance.now() - startTime);
        } catch (error) {
            this.handleError('clear', error as Error);
        }
    }

    async getStats(): Promise<Record<string, CacheStats>> {
        const result: Record<string, CacheStats> = {};
        try {
            const provider = this.getProvider('default'); // Provide a default provider name

            if (provider !== null && typeof provider.getStats === 'function') {
                result['default'] = await provider.getStats();
            } else {
                // Return default stats if method doesn't exist
                result['default'] = {
                    hits: 0,
                    misses: 0,
                    size: 0,
                    memoryUsage: 0,
                    lastUpdated: Date.now(),
                    keyCount: 0
                };
            }

            return result;
        } catch (error) {
            console.error('Error getting cache stats:', error);
            // Return default stats on error
            return {
                'default': {
                    hits: 0,
                    misses: 0,
                    size: 0,
                    memoryUsage: 0,
                    lastUpdated: Date.now(),
                    keyCount: 0
                }
            };
        }
    }

    getProvider(name: string): ICacheProvider | null {
        return this.providers.get(name) || null;
    }

    async getOrCompute<T = any>(
        key: string,
        fn: () => Promise<T>,
        options?: CacheOptions
    ): Promise<T> {
        await this.rateLimiter.limit('compute');
        const startTime = performance.now();

        try {
            const cached = await this.get<T>(key);
            if (cached !== null) {
                return cached;
            }

            const value = await fn();
            await this.set(key, value, options);

            this.monitor.recordMiss(performance.now() - startTime);
            
            return value;
        } catch (error) {
            this.handleError('compute', error as Error, {key});
            throw error;
        }
    }

    async get<T>(key: string, options?: GetOptions): Promise<T | null> {
        await this.rateLimiter.limit('get');
        const startTime = performance.now();

        try {
            this.validateKey(key);
            const provider = this.selectProvider(options?.provider);

            // Check circuit breaker state
            if (this.circuitBreaker && typeof this.circuitBreaker.isOpen === 'function' && this.circuitBreaker.isOpen()) {
                throw createCacheError(
                    'Circuit breaker is open',
                    CacheErrorCode.CIRCUIT_OPEN
                );
            }

            const result = await provider.get(key);

            if (result === null && options?.fallback) {
                return this.handleFallback<T>(key, options);
            }

            // Fix: Remove the type parameter from deserialize
            const value = result ? await this.serializer.deserialize(result) as T : null;
            const isHit = value !== null;

            if (isHit) {
                this.monitor.recordHit(performance.now() - startTime);
            } else {
                this.monitor.recordMiss(performance.now() - startTime);
            }

            return value;
        } catch (error) {
            this.handleError('get', error as Error, {key});
            return null;
        }
    }

    async set<T = any>(
        key: string,
        value: T,
        options?: SetOptions
    ): Promise<void> {
        await this.rateLimiter.limit('set');
        const startTime = performance.now();

        try {
            this.validateKey(key);
            this.validateValue(value);

            const serializedValue = this.serializer.serialize(value);
            const provider = this.selectProvider(options?.provider);

            // Check circuit breaker state
            if (this.circuitBreaker && typeof this.circuitBreaker.isOpen === 'function' && this.circuitBreaker.isOpen()) {
                throw createCacheError(
                    'Circuit breaker is open',
                    CacheErrorCode.CIRCUIT_OPEN
                );
            }

            const ttl = options?.ttl;
            const cacheOptions: CacheOptions = {
                ...options,
                ttl
            };
            
            await provider.set(key, serializedValue, cacheOptions);
            
            this.monitor.recordHit(performance.now() - startTime);
        } catch (error) {
            this.handleError('set', error as Error, {key, value});
        }
    }

    /**
     * Wrap a function with caching behavior
     */
    wrap<T extends (...args: any[]) => Promise<any>>(
        fn: T,
        keyGenerator?: (...args: any[]) => string,
        options?: CacheOptions
    ): T & { invalidateCache: (...args: any[]) => Promise<void> } {
        // Track metadata about the wrapped function
        const functionName = fn.name || 'anonymous';
        
        // Create a key generator if one wasn't provided
        const generateKey = keyGenerator || ((...args: any[]) => {
            try {
                // Use a more robust key generation approach
                const normalizedArgs = args.map(arg => {
                    if (arg === null) return 'null';
                    if (arg === undefined) return 'undefined';
                    if (typeof arg === 'function') return 'function';
                    if (typeof arg === 'object') {
                        try {
                            // Handle circular references
                            return JSON.stringify(arg, (key, value) => {
                                if (key && typeof value === 'object' && value !== null) {
                                    if (seen.has(value)) {
                                        return '[Circular]';
                                    }
                                    seen.add(value);
                                }
                                return value;
                            });
                        } catch (error) {
                            logger.warn(`Error serializing argument for cache key`, {
                                function: functionName,
                                error: error instanceof Error ? error.message : String(error)
                            });
                            return '[Object]';
                        }
                    }
                    return String(arg);
                });
                
                return `${functionName}:${normalizedArgs.join(':')}`;
            } catch (error) {
                // Don't let key generation errors break the function
                logger.error(`Error generating cache key`, {
                    function: functionName,
                    error: error instanceof Error ? error.message : String(error)
                });
                
                // Use a timestamp-based fallback key
                return `${functionName}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
            }
        });

        // Create a WeakSet to track objects for circular reference detection
        const seen = new WeakSet();
        
        // Create the wrapped function
        const wrapped = async (...args: any[]): Promise<ReturnType<T>> => {
            const key = generateKey(...args);
            
            // Add timing metrics
            const timerId = metrics.startTimer(`cache.wrapped.${functionName}`);
            let hit = false;
            
            try {
                const cachedValue = await this.get(key);
                
                if (cachedValue !== null) {
                    hit = true;
                    metrics.increment('cache.wrapped.hits', 1, { function: functionName });
                    metrics.stopTimer(timerId, { result: 'hit', function: functionName });
                    return cachedValue as ReturnType<T>;
                }
                
                // Record cache miss
                metrics.increment('cache.wrapped.misses', 1, { function: functionName });
                
                // Execute the original function
                const result = await fn(...args);
                
                // Cache the result
                await this.set(key, result, options);
                
                metrics.stopTimer(timerId, { result: 'miss', function: functionName });
                return result;
            } catch (error) {
                metrics.stopTimer(timerId, { result: 'error', function: functionName });
                
                logger.error(`Error in wrapped function`, {
                    function: functionName,
                    key,
                    error: error instanceof Error ? error.message : String(error)
                });
                
                throw error;
            }
        };

        const invalidateCache = async (...args: any[]): Promise<void> => {
            const key = generateKey(...args);
            
            try {
                // Track cache invalidations
                metrics.increment('cache.invalidations', 1, { function: functionName });
                
                const deleted = await this.delete(key);
                
                logger.debug(`Cache invalidation for wrapped function`, {
                    function: functionName,
                    key,
                    deleted
                });
            } catch (error) {
                logger.error(`Error invalidating cache for wrapped function`, {
                    function: functionName,
                    key,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        };

        // Return the wrapped function with the invalidateCache method attached
        return Object.assign(wrapped, { invalidateCache }) as T & {
            invalidateCache: (...args: any[]) => Promise<void>
        };
    }

    async invalidateByTag(tag: string): Promise<void> {
        const startTime = performance.now();
        try {
            const provider = this.selectProvider();
            if (!provider) {
                throw createCacheError('No provider available', CacheErrorCode.PROVIDER_ERROR);
            }
            
            // Implementation would go here
            // For now, just ensure it returns void as per interface
            if (typeof provider.invalidateByTag === 'function') {
                await provider.invalidateByTag(tag);
            }
            
            this.monitor.recordHit(performance.now() - startTime);
        } catch (error) {
            this.handleError('invalidateByTag', error as Error, {tag});
        }
    }

    async invalidateByPrefix(prefix: string): Promise<void> {
        const startTime = performance.now();
        try {
            const provider = this.selectProvider();
            
            // Get all keys (ensure provider has keys method or use a default empty array)
            const keys = typeof provider.keys === 'function' ? await provider.keys() : [];
            const toDelete = keys.filter((key: string) => key.startsWith(prefix));
            await Promise.all(toDelete.map((key: string) => this.delete(key)));
            
            this.monitor.recordHit(performance.now() - startTime);
        } catch (error) {
            this.handleError('invalidateByPrefix', error as Error, {prefix});
        }
    }

    getMetadata(key: string): EntryMetadata | undefined {
        try {
            const provider = this.getProvider('default');
            if (!provider || typeof provider.getMetadata !== 'function') {
                return undefined;
            }

            const metadata = provider.getMetadata(key);
            if (metadata &&
                typeof metadata === 'object' &&
                'tags' in metadata &&
                'createdAt' in metadata &&
                'size' in metadata &&
                'lastAccessed' in metadata &&
                'accessCount' in metadata) {
                return metadata as unknown as EntryMetadata;
            }

            return undefined;
        } catch (error) {
            console.error('Error getting metadata:', error);
            return undefined;
        }
    }

    async deleteByPattern(pattern: string): Promise<void> {
        try {
            const provider = this.selectProvider();
            if (!provider || typeof provider.keys !== 'function') {
                throw createCacheError('No provider available or provider does not support key listing', 
                    CacheErrorCode.PROVIDER_ERROR);
            }

            const keys = await provider.keys();
            const matchingKeys = keys.filter((key) => new RegExp(pattern).test(key));
            await Promise.all(matchingKeys.map((key) => this.delete(key)));
        } catch (error) {
            this.handleError('deleteByPattern', error as Error, {pattern});
        }
    }

    async keys(pattern?: string): Promise<string[]> {
        try {
            const provider = this.selectProvider();
            if (!provider || typeof provider.keys !== 'function') {
                return [];
            }
            
            const keys = await provider.keys();
            if (pattern) {
                const regex = new RegExp(pattern);
                return keys.filter(key => regex.test(key));
            }
            return keys;
        } catch (error) {
            this.handleError('keys', error as Error, {pattern});
            return [];
        }
    }

    async getMany(keys: string[]): Promise<Record<string, any>> {
        try {
            const result: Record<string, any> = {};
            await Promise.all(
                keys.map(async key => {
                    const value = await this.get(key);
                    if (value !== null) {
                        result[key] = value;
                    }
                })
            );
            return result;
        } catch (error) {
            this.handleError('getMany', error as Error, {keys});
            return {};
        }
    }

    async setMany(entries: Record<string, any>, options?: CacheOptions): Promise<void> {
        try {
            await Promise.all(
                Object.entries(entries).map(([key, value]) => 
                    this.set(key, value, options)
                )
            );
        } catch (error) {
            this.handleError('setMany', error as Error, {entries});
        }
    }

    private validateKey(key: string): void {
        if (!key || typeof key !== 'string') {
            throw createCacheError(
                'Cache key must be a non-empty string',
                CacheErrorCode.INVALID_KEY
            );
        }

        if (key.length > 250) {
            throw createCacheError(
                'Cache key must be less than 256 characters',
                CacheErrorCode.KEY_TOO_LONG
            );
        }
    }

    private validateValue(value: any): void {
        if (value === undefined) {
            throw createCacheError(
                'Cannot cache undefined value',
                CacheErrorCode.INVALID_VALUE
            );
        }
    }

    private handleError(
        operation: string,
        error: Error,
        context?: Record<string, any>
    ): void {
        // Record circuit breaker failure if available
        // Removed check for non-existent 'recordFailure' method on CircuitBreaker
        
        // Record error in monitoring if available
        if (this.monitor && typeof this.monitor.recordError === 'function') {
            this.monitor.recordError(new Error(operation));
        }

        const cacheError = error instanceof CacheError ? error :
            createCacheError(
                `Cache ${operation} operation failed: ${error.message}`,
                CacheErrorCode.UNKNOWN_ERROR,
                error
            );

        if (this.monitor && typeof this.monitor.recordError === 'function') {
            this.monitor.recordError(new Error(operation));
        }

        console.error(`CacheManager error in operation "${operation}":`, cacheError);

        throw cacheError;
    }

    private handleFallback<T>(key: string, options?: GetOptions): Promise<T | null> {
        // Implement fallback logic
        if (options?.fallback) {
            return options.fallback();
        }
        return Promise.resolve(null);
    }

    private selectProvider(preferredProvider?: string): ICacheProvider {
        if (preferredProvider) {
            const provider = this.providers.get(preferredProvider);
            if (provider) return provider;
        }

        // Select first available provider
        const provider = Array.from(this.providers.values())[0];
        if (!provider) {
            throw createCacheError(
                'No cache provider available',
                CacheErrorCode.PROVIDER_ERROR
            );
        }

        return provider;
    }

    private initializeProviders(providerConfigs: Record<string, any>): void {
        for (const [name, config] of Object.entries(providerConfigs)) {
            try {
                const Provider = require(`../providers/${name}-provider`).default;
                const provider = new Provider(config);
                this.providers.set(name, provider);
            } catch (error) {
                console.error(`Failed to initialize provider ${name}:`, error);
            }
        }
    }
}