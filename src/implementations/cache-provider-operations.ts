/**
 * @fileoverview Basic cache operations for provider manager
 */

import {CacheOptions} from '../types';
import {CacheProviderManager} from './cache-provider-manager';

/**
 * Basic cache operations for provider manager
 */
export class CacheProviderOperations {
    /**
     * Create a new cache operations manager
     */
    constructor(private manager: CacheProviderManager) {}

    /**
     * Get a value from cache providers in priority order
     */
    async get<T>(key: string): Promise<T | null> {
        const sortedProviders = this.manager.getSortedProviders();
        
        for (const provider of sortedProviders) {
            try {
                const value = await provider.instance.get(key);
                if (value !== null) {
                    provider.stats.hits++;
                    return value;
                }
                provider.stats.misses++;
            } catch (error) {
                this.manager.handleProviderError(provider, error);
                // If this is the only provider or the last one, rethrow the error
                if (sortedProviders.length === 1 ||
                    provider === sortedProviders[sortedProviders.length - 1]) {
                    throw error;
                }
            }
        }
        return null;
    }

    /**
     * Set a value across all cache providers
     */
    async set(key: string, value: any, options?: CacheOptions): Promise<void> {
        const sortedProviders = this.manager.getSortedProviders();
        
        const promises = sortedProviders.map(async provider => {
            try {
                await provider.instance.set(key, value, options);
            } catch (error) {
                this.manager.handleProviderError(provider, error);
                // If this is the primary provider, rethrow the error
                if (provider === sortedProviders[0]) {
                    throw error;
                }
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Delete a value from all cache providers
     */
    async delete(key: string): Promise<boolean> {
        let deleted = false;
        const sortedProviders = this.manager.getSortedProviders();
        
        const promises = sortedProviders.map(async provider => {
            try {
                const result = await provider.instance.delete(key);
                deleted = deleted || result;
            } catch (error) {
                this.manager.handleProviderError(provider, error);
            }
        });

        await Promise.allSettled(promises);
        return deleted;
    }

    /**
     * Clear all cache providers
     */
    async clear(): Promise<void> {
        const sortedProviders = this.manager.getSortedProviders();
        
        const promises = sortedProviders.map(async provider => {
            try {
                await provider.instance.clear();
            } catch (error) {
                this.manager.handleProviderError(provider, error);
            }
        });

        await Promise.allSettled(promises);
    }
}