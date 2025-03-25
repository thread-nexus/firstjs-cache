/**
 * Cache provider management implementation
 */

import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import {CacheErrorCode, createCacheError} from '../utils/error-utils';
import {CacheManagerCore} from './cache-manager-core';
import {providerHasMethod, safelyCallProviderMethod} from './cache-manager-utils';

/**
 * Cache provider management implementation
 */
export class CacheManagerProviders {
    /**
     * Create a new cache provider manager
     */
    constructor(private core: CacheManagerCore) {}

    /**
     * Register a cache provider
     */
    registerProvider(name: string, provider: ICacheProvider, priority = 100): void {
        // Add name to provider if not set
        if (!provider.name) {
            (provider as any).name = name;
        }

        this.core.providers.set(name, provider);

        // Update event payload
        emitCacheEvent(CacheEventType.PROVIDER_INITIALIZED, {
            provider: name,
            timestamp: Date.now()
        });
    }

    /**
     * Get a provider by name
     */
    getProvider(name?: string): ICacheProvider | null {
        const providerName = name || this.core.config.defaultProvider;

        if (!providerName) {
            // Return first provider if no name specified
            const firstProvider = [...this.core.providers.values()][0];
            return firstProvider || null;
        }

        return this.core.providers.get(providerName) || null;
    }

    /**
     * Get all providers
     */
    getProviders(): Map<string, ICacheProvider> {
        return this.core.providers;
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
     * Dispose of all providers
     */
    async disposeProviders(): Promise<void> {
        for (const [name, provider] of this.core.providers.entries()) {
            if (providerHasMethod(provider, 'dispose')) {
                try {
                    await safelyCallProviderMethod(provider, 'dispose');
                } catch (error) {
                    console.error(`Error disposing provider ${name}:`, error);
                }
            }
        }
    }
}