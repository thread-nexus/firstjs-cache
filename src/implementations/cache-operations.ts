/**
 * Cache operations implementation
 */

import {CacheOptions} from '../types';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {handleCacheError} from '../utils/error-utils';
import {CACHE_CONSTANTS} from '../config/default-config';

/**
 * Cache operations
 */
export class CacheOperations {
    /**
     * Cache provider
     */
    private provider: ICacheProvider;

    /**
     * Maximum batch size
     */
    private maxBatchSize = CACHE_CONSTANTS.DEFAULT_BATCH_SIZE;

    /**
     * Create a new cache operations instance
     *
     * @param provider - Cache provider
     */
    constructor(provider: ICacheProvider) {
        this.provider = provider;
    }

    /**
     * Get a value from cache
     *
     * @param key - Cache key
     * @returns Cached value or null if not found
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            // Get value from provider
            const value = await this.provider.get(key);

            // Return value
            return value as T;
        } catch (error) {
            handleCacheError(error, {operation: 'get', key}, false);
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
    async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
        try {
            // Process value (e.g., compression)
            const processedValue = await this.processValue(value, options);

            // Set value in provider
            await this.provider.set(key, processedValue, options);
        } catch (error) {
            handleCacheError(error, {operation: 'set', key}, false);
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
        try {
            // Delete value from provider
            return await this.provider.delete(key);
        } catch (error) {
            handleCacheError(error, {operation: 'delete', key}, false);
            return false;
        }
    }

    /**
     * Clear all values from cache
     */
    async clear(): Promise<void> {
        try {
            // Clear provider
            await this.provider.clear();
        } catch (error) {
            handleCacheError(error, {operation: 'clear'}, false);
        }
    }

    /**
     * Get metadata for a key
     *
     * @param key - Cache key
     * @returns Metadata or null if not found
     */
    async getMetadata(key: string): Promise<any> {
        try {
            // Check if provider supports getMetadata
            if (this.provider.getMetadata) {
                return await this.provider.getMetadata(key);
            }

            return null;
        } catch (error) {
            handleCacheError(error, {operation: 'getMetadata', key}, false);
            return null;
        }
    }

    /**
     * Get multiple values from cache
     *
     * @param keys - Cache keys
     * @returns Values by key
     */
    async getMany<T>(keys: string[]): Promise<Record<string, T | null>> {
        try {
            // Check if provider supports getMany
            if (this.provider.getMany) {
                const getMany = this.provider.getMany as <U>(keys: string[]) => Promise<Record<string, U | null>>;
                return await getMany<T>(keys);
            }

            // Fall back to individual gets
            const results: Record<string, T | null> = {};

            for (const key of keys) {
                results[key] = await this.get<T>(key);
            }

            return results;
        } catch (error) {
            handleCacheError(error, {operation: 'getMany', keys}, false);

            // Return null for all keys on error
            return keys.reduce((acc, key) => {
                acc[key] = null;
                return acc;
            }, {} as Record<string, T | null>);
        }
    }

    /**
     * Set multiple values in cache
     *
     * @param entries - Cache entries
     * @param options - Cache options
     */
    async setMany<T>(entries: Record<string, T>, options?: CacheOptions): Promise<void> {
        try {
            // Check if provider supports setMany
            if (this.provider.setMany) {
                const entriesMap = new Map<string, T>(Object.entries(entries));
                await this.provider.setMany(entriesMap, options);
                return;
            }

            // Fall back to individual sets
            for (const [key, value] of Object.entries(entries)) {
                await this.set(key, value as T, options);
            }
        } catch (error) {
            handleCacheError(error, {operation: 'setMany', entries: Object.keys(entries)}, false);
            throw error;
        }
    }

    /**
     * Check if a key exists in cache
     *
     * @param key - Cache key
     * @returns Whether the key exists
     */
    async has(key: string): Promise<boolean> {
        try {
            // Check if provider supports has
            if (this.provider.has) {
                return await this.provider.has(key);
            }

            // Fall back to get
            const value = await this.provider.get(key);
            return value !== null;
        } catch (error) {
            handleCacheError(error, {operation: 'has', key}, false);
            return false;
        }
    }

    /**
     * Process a value before caching
     *
     * @param value - Value to process
     * @param options - Cache options
     * @returns Processed value
     */
    private async processValue<T>(value: T, options?: CacheOptions): Promise<T> {
        // For now, return the value as is
        // In a real implementation, this would handle compression, serialization, etc.
        return value;
    }
}