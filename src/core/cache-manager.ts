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
import {CacheOptions, CacheStats, EntryMetadata, LatencyStats} from '../types';
import {CircuitBreaker} from '../utils/circuit-breaker';
import {getMetadata} from '@/utils/cache-metadata-utils';

// Configuration interface for the cache manager
interface CacheManagerConfig {
    providers: Record<string, any>;
    monitoring?: any;
    serialization?: any;
    rateLimit?: any;
    circuitBreaker?: any;
}

// Define missing types locally if they aren't exported from common
interface GetOptions extends CacheOptions {
    fallback?: () => Promise<any>;
    provider?: string;
}

interface SetOptions extends CacheOptions {
    ttl?: number;
    tags?: string[];
    provider?: string;
}

interface BatchOptions extends CacheOptions {
    maxBatchSize?: number;
    provider?: string;
}

interface BatchOperation {
    type: 'get' | 'set' | 'delete';
    key: string;
    value?: any;
    options?: any;
}

interface BatchResult {
    key: string;
    success: boolean;
    value?: any;
    error?: string;
}

export class CacheManager implements ICacheManager {
    private providers: Map<string, ICacheProvider>;
    private monitor: CacheMonitoring;
    private serializer: { serialize: typeof serialize, deserialize: typeof deserialize };
    private rateLimiter: RateLimiter;
    private circuitBreaker: CircuitBreaker;

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
                    keyCount: 0,
                    entries: 0,
                    avgTtl: 0,
                    maxTtl: 0
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
                    keyCount: 0,
                    entries: 0,
                    avgTtl: 0,
                    maxTtl: 0
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

            const serializedValue = await this.serializer.serialize(value);
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

    wrap<T extends (...args: any[]) => Promise<any>>(
        fn: T,
        keyGenerator?: (...args: Parameters<T>) => string,
        options?: CacheOptions
    ): T & { invalidateCache: (...args: Parameters<T>) => Promise<void> } {
        const wrapped = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
            const key = keyGenerator ? keyGenerator(...args) : `${fn.name}:${JSON.stringify(args)}`;
            return await this.getOrCompute(
                key,
                () => fn(...args),
                options
            ) as Promise<ReturnType<T>>;
        };

        const invalidateCache = async (...args: Parameters<T>): Promise<void> => {
            const key = keyGenerator ? keyGenerator(...args) : `${fn.name}:${JSON.stringify(args)}`;
            await this.delete(key);
        };

        return Object.assign(wrapped, { invalidateCache }) as T & {
            invalidateCache: (...args: Parameters<T>) => Promise<void>
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
                return metadata as EntryMetadata;
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