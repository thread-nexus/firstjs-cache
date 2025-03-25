/**
 * @fileoverview Cache provider selection and initialization
 */

import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheErrorCode, createCacheError} from '../utils/error-utils';

/**
 * Cache provider selection implementation
 */
export class CacheProviderSelector {
    /**
     * Create a new provider selector
     */
    constructor(private providers: Map<string, ICacheProvider>) {}

    /**
     * Initialize providers from configuration
     */
    initializeProviders(providerConfigs: Record<string, any>): void {
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

    /**
     * Select a provider based on preference or default
     */
    selectProvider(preferredProvider?: string): ICacheProvider {
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

    /**
     * Get a provider by name
     */
    getProvider(name: string): ICacheProvider | null {
        return this.providers.get(name) || null;
    }
}