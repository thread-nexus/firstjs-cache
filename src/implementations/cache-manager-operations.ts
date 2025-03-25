/**
 * Cache manager operations implementation
 */

import {CacheOptions} from '../types';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheErrorCode, createCacheError, handleCacheError, providerHasMethod} from '../utils/error-utils';
import {CACHE_OPERATION} from '../constants';
import {CacheManagerCore} from './cache-manager-core';

/**
 * Cache manager operations
 */
export class CacheManagerOperations {
    /**
     * Cache provider
     */
    protected provider: ICacheProvider;

    /**
     * Create a new cache manager operations instance
     *
     * @param coreOrProvider - Cache core or provider
     */
    constructor(coreOrProvider: CacheManagerCore | ICacheProvider) {
        if ('getProvider' in coreOrProvider) {
            const provider = coreOrProvider.getProvider();
            if (!provider) {
                throw createCacheError('No cache provider available', CacheErrorCode.NO_PROVIDER);
            }
            this.provider = provider;
        } else {
            this.provider = coreOrProvider;
        }
    }

    /**
     * Get a value from cache
     *
     * @param key - Cache key
     * @returns Cached value or null if not found
     */
    async get<T = any>(key: string): Promise<T | null> {
        try {
            const value = await this.provider.get(key);
            return value as T;
        } catch (error) {
            handleCacheError(error, {operation: CACHE_OPERATION.GET, key}, true);
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
        try {
            await this.provider.set(key, value, options);
        } catch (error) {
            handleCacheError(error, {operation: CACHE_OPERATION.SET, key}, true);
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
            return await this.provider.delete(key);
        } catch (error) {
            handleCacheError(error, {operation: CACHE_OPERATION.DELETE, key}, true);
            return false;
        }
    }

    /**
     * Clear all values from cache
     */
    async clear(): Promise<void> {
        try {
            await this.provider.clear();
        } catch (error) {
            handleCacheError(error, {operation: CACHE_OPERATION.CLEAR}, true);
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
     * Push a value to an array in cache
     *
     * @param key - Cache key
     * @param value - Value to push
     * @param options - Cache options
     * @returns Updated array length
     */
    async pushToArray<T>(key: string, value: T, options?: CacheOptions): Promise<number> {
        try {
            // Get current array or create new one
            const current = await this.provider.get(key) as T[] | null;
            const array = current || [];

            // Push value
            if (Array.isArray(array)) {
                array.push(value);

                // Update cache
                await this.provider.set(key, array, options);

                return array.length;
            } else {
                throw createCacheError(
                    `Value at key '${key}' is not an array`,
                    CacheErrorCode.INVALID_VALUE
                );
            }
        } catch (error) {
            handleCacheError(error, {operation: 'pushToArray', key}, true);
            throw error;
        }
    }

    /**
     * Pop a value from an array in cache
     *
     * @param key - Cache key
     * @param options - Cache options
     * @returns Popped value or undefined if array is empty
     */
    async popFromArray<T>(key: string, options?: CacheOptions): Promise<T | undefined> {
        try {
            // Get current array
            const current = await this.provider.get(key) as T[] | null;

            if (!current || !Array.isArray(current)) {
                return undefined;
            }

            // Pop value
            const value = current.pop();

            // Update cache
            await this.provider.set(key, current, options);

            return value;
        } catch (error) {
            handleCacheError(error, {operation: 'popFromArray', key}, true);
            throw error;
        }
    }

    /**
     * Increment a value in cache
     *
     * @param key - Cache key
     * @param increment - Increment amount
     * @param options - Cache options
     * @returns New value
     */
    async increment(key: string, increment = 1, options?: CacheOptions): Promise<number> {
        try {
            // Get current value
            const current = await this.provider.get(key) as number | null;

            // Calculate new value
            const value = (typeof current === 'number' ? current : 0) + increment;

            // Update cache
            await this.provider.set(key, value, options);

            return value;
        } catch (error) {
            handleCacheError(error, {operation: 'increment', key}, true);
            throw error;
        }
    }

    /**
     * Decrement a value in cache
     *
     * @param key - Cache key
     * @param decrement - Decrement amount
     * @param options - Cache options
     * @returns New value
     */
    async decrement(key: string, decrement = 1, options?: CacheOptions): Promise<number> {
        return this.increment(key, -decrement, options);
    }

    /**
     * Update a value in cache
     *
     * @param key - Cache key
     * @param updater - Function to update the value
     * @param options - Cache options
     * @returns Updated value
     */
    async update<T>(
        key: string,
        updater: (currentValue: T | null) => T,
        options?: CacheOptions
    ): Promise<T> {
        try {
            // Get current value
            const previous = await this.provider.get(key) as T | null;

            // Update value
            const value = updater(previous);

            // Update cache
            await this.provider.set(key, value, options);

            return value;
        } catch (error) {
            handleCacheError(error, {operation: 'update', key}, true);
            throw error;
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
            if (providerHasMethod(this.provider, 'getMany')) {
                const getMany = this.provider.getMany as <U>(keys: string[]) => Promise<Record<string, U | null>>;
                return await getMany<T>(keys);
            }

            // Fall back to individual gets
            const result: Record<string, T | null> = {};

            for (const key of keys) {
                result[key] = await this.provider.get(key) as T | null;
            }

            return result;
        } catch (error) {
            handleCacheError(error, {operation: 'getMany', keys}, true);

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
            if (providerHasMethod(this.provider, 'setMany')) {
                const setMany = this.provider.setMany as (entries: Record<string, any>, options?: CacheOptions) => Promise<void>;
                await setMany(entries, options);
                return;
            }

            // Fall back to individual sets
            for (const [key, value] of Object.entries(entries)) {
                await this.provider.set(key, value, options);
            }
        } catch (error) {
            handleCacheError(error, {operation: 'setMany', entries: Object.keys(entries)}, true);
            throw error;
        }
    }

    /**
     * Delete multiple values from cache
     *
     * @param keys - Cache keys
     * @returns Number of deleted keys
     */
    async deleteMany(keys: string[]): Promise<number> {
        try {
            let count = 0;

            for (const key of keys) {
                const deleted = await this.provider.delete(key);
                if (deleted) count++;
            }

            return count;
        } catch (error) {
            handleCacheError(error, {operation: 'deleteMany', keys}, true);
            throw error;
        }
    }

    /**
     * Add a value to a set in cache
     *
     * @param key - Cache key
     * @param value - Value to add
     * @param options - Cache options
     * @returns Whether the value was added
     */
    async addToSet<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
        try {
            // Get current set or create new one
            const current = await this.provider.get(key) as T[] | null;
            const set = current || [];

            // Check if the value already exists
            if (Array.isArray(set)) {
                const exists = set.some(item => JSON.stringify(item) === JSON.stringify(value));

                if (!exists) {
                    // Add value
                    set.push(value);

                    // Update cache
                    await this.provider.set(key, set, options);

                    return true;
                }

                return false;
            } else {
                throw createCacheError(
                    `Value at key '${key}' is not an array`,
                    CacheErrorCode.INVALID_VALUE
                );
            }
        } catch (error) {
            handleCacheError(error, {operation: 'addToSet', key}, true);
            throw error;
        }
    }

    /**
     * Remove a value from a set in cache
     *
     * @param key - Cache key
     * @param value - Value to remove
     * @param options - Cache options
     * @returns Whether the value was removed
     */
    async removeFromSet<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
        try {
            // Get current set
            const current = await this.provider.get(key) as T[] | null;

            if (!current || !Array.isArray(current)) {
                return false;
            }

            // Find value index
            const index = current.findIndex(item => JSON.stringify(item) === JSON.stringify(value));

            if (index !== -1) {
                // Remove value
                current.splice(index, 1);

                // Update cache
                await this.provider.set(key, current, options);

                return true;
            }

            return false;
        } catch (error) {
            handleCacheError(error, {operation: 'removeFromSet', key}, true);
            throw error;
        }
    }

    /**
     * Check if a value exists in a set
     *
     * @param key - Cache key
     * @param value - Value to check
     * @returns Whether the value exists in the set
     */
    async isInSet<T>(key: string, value: T): Promise<boolean> {
        try {
            // Get current set
            const current = await this.provider.get(key) as T[] | null;

            if (!current || !Array.isArray(current)) {
                return false;
            }

            // Check if value exists
            return current.some(item => JSON.stringify(item) === JSON.stringify(value));
        } catch (error) {
            handleCacheError(error, {operation: 'isInSet', key}, true);
            return false;
        }
    }
}
