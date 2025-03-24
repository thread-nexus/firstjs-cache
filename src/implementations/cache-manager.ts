import {CacheOptions} from '../types';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheMetadata} from './cache-metadata';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import {CacheErrorCode, createCacheError, ensureError, handleCacheError} from '../utils/error-utils';
import {mergeCacheOptions, providerHasMethod} from './cache-manager-utils';
import {DEFAULT_CONFIG} from '../config/default-config';

/**
 * Main cache manager implementation
 */
export class CacheManager {
    private providers = new Map<string, ICacheProvider>();
    private metadata = new CacheMetadata();
    private config = DEFAULT_CONFIG;
    private inFlightRequests = new Map<string, Promise<any>>();

    /**
     * Create a new cache manager
     */
    constructor(config = {}) {
        this.config = {...DEFAULT_CONFIG, ...config};
    }

    /**
     * Get a value from cache
     */
    async get<T = any>(key: string): Promise<T | null> {
        try {
            this.validateKey(key);

            for (const provider of this.providers.values()) {
                const value = await provider.get(key);
                if (value !== null) {
                    this.metadata.recordAccess(key);
                    return value as T;
                }
            }
            return null;
        } catch (error) {
            return this.handleOperationError(error, 'get', {key});
        }
    }

    /**
     * Set a value in cache
     */
    async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
        try {
            this.validateKey(key);
            this.validateValue(value);

            const mergedOptions = mergeCacheOptions(options, this.config.defaultOptions);

            await this.executeForAllProviders(provider => provider.set(key, value, mergedOptions));
            this.metadata.set(key, {tags: mergedOptions.tags || []});
        } catch (error) {
            this.handleOperationError(error, 'set', {key}, true);
        }
    }

    /**
     * Delete a value from cache
     */
    async delete(key: string): Promise<boolean> {
        try {
            let deleted = false;

            for (const provider of this.providers.values()) {
                const result = await provider.delete(key);
                deleted = deleted || result;
            }

            if (deleted) {
                this.metadata.delete(key);
            }

            return deleted;
        } catch (error) {
            return this.handleOperationError(error, 'delete', {key});
        }
    }

    /**
     * Clear all values from cache
     */
    async clear(): Promise<void> {
        try {
            await this.executeForAllProviders(provider => provider.clear());
            this.metadata.clear();
        } catch (error) {
            this.handleOperationError(error, 'clear');
        }
    }

    /**
     * Check if a key exists in the cache
     */
    async has(key: string): Promise<boolean> {
        try {
            for (const provider of this.providers.values()) {
                if (providerHasMethod(provider, 'has') && await provider.has(key)) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            return this.handleOperationError(error, 'has', {key});
        }
    }

    /**
     * Register a cache provider
     */
    registerProvider(name: string, provider: ICacheProvider): void {
        if (!provider.name) {
            (provider as any).name = name;
        }

        this.providers.set(name, provider);
        emitCacheEvent(CacheEventType.PROVIDER_INITIALIZED, {provider: name});
    }

    /**
     * Get or compute a value
     */
    async getOrCompute<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: CacheOptions
    ): Promise<T> {
        try {
            // Check if we should deduplicate in-flight requests
            if (this.config.deduplicateRequests && this.inFlightRequests.has(key)) {
                return await this.inFlightRequests.get(key) as T;
            }

            // Check cache first
            const cachedValue = await this.get<T>(key);
            if (cachedValue !== null) {
                return cachedValue;
            }

            const fetchPromise = this.createFetchPromise(key, fetcher, options);

            // Store the promise for deduplication
            if (this.config.deduplicateRequests) {
                this.inFlightRequests.set(key, fetchPromise);
            }

            return await fetchPromise;
        } catch (error) {
            const safeError = ensureError(error);
            emitCacheEvent(CacheEventType.COMPUTE_ERROR, {key, error: safeError});

            this.inFlightRequests.delete(key);
            throw safeError;
        }
    }

    /**
     * Create a cached wrapper for a function
     */
    wrap<T extends (...args: any[]) => Promise<any>>(
        fn: T,
        keyGenerator: (...args: T extends ((...args: infer P) => any) ? P : never[]) => string,
        options?: CacheOptions
    ): T {
        return (async (...args: T extends ((...args: infer P) => any) ? P : never[]): Promise<ReturnType<T>> => {
            const key = keyGenerator(...args);
            return await this.getOrCompute(
                key,
                () => fn(...args),
                options
            ) as Promise<ReturnType<T>>;
        }) as T;
    }

    /**
     * Invalidate cache entries by tag
     */
    async invalidateByTag(tag: string): Promise<number> {
        return this.invalidateByFilter(tag, 'tag', keys => this.metadata.findByTag(tag));
    }

    /**
     * Invalidate cache entries by prefix
     */
    async invalidateByPrefix(prefix: string): Promise<number> {
        return this.invalidateByFilter(prefix, 'prefix', keys => this.metadata.findByPrefix(prefix));
    }

    // Helper methods

    /**
     * Validates if a key is valid
     */
    private validateKey(key: string): void {
        if (!key) {
            throw createCacheError('Invalid cache key', CacheErrorCode.INVALID_KEY);
        }
    }

    /**
     * Validates if a value can be cached
     */
    private validateValue(value: any): void {
        if (value === undefined) {
            throw createCacheError('Cannot cache undefined value', CacheErrorCode.INVALID_VALUE);
        }
    }

    /**
     * Executes an operation for all providers
     */
    private async executeForAllProviders(operation: (provider: ICacheProvider) => Promise<void>): Promise<void> {
        for (const provider of this.providers.values()) {
            await operation(provider);
        }
    }

    /**
     * Handles operation errors and provides consistent fallback values
     */
    private handleOperationError(error: unknown, operation: string, context: Record<string, any> = {}, rethrow = false): any {
        handleCacheError(error, {operation, ...context});
        if (rethrow) {
            throw error;
        }

        // Default fallback values for operations
        const fallbackValues = {
            get: null,
            delete: false,
            has: false,
            clear: undefined,
            invalidateByTag: 0,
            invalidateByPrefix: 0
        };

        return fallbackValues[operation as keyof typeof fallbackValues];
    }

    /**
     * Creates a fetch promise for getOrCompute
     */
    private async createFetchPromise<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T> {
        try {
            emitCacheEvent(CacheEventType.COMPUTE_START, {key});
            const value = await fetcher();

            await this.set(key, value, options);
            emitCacheEvent(CacheEventType.COMPUTE_SUCCESS, {key});

            return value;
        } finally {
            this.inFlightRequests.delete(key);
        }
    }

    /**
     * Common logic for invalidation by filter
     */
    private async invalidateByFilter(
        filterValue: string,
        filterType: string,
        getKeys: () => string[]
    ): Promise<number> {
        try {
            const keys = getKeys();

            let count = 0;
            for (const key of keys) {
                const deleted = await this.delete(key);
                if (deleted) count++;
            }

            emitCacheEvent(CacheEventType.INVALIDATE, {
                [filterType]: filterValue,
                entriesRemoved: count
            });

            return count;
        } catch (error) {
            return this.handleOperationError(error, `invalidateBy${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`, {[filterType]: filterValue});
        }
    }
}