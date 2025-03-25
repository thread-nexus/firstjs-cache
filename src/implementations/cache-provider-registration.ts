/**
 * @fileoverview Provider registration and management
 */

import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import {CacheProviderManager, ProviderEntry} from './cache-provider-manager';

/**
 * Provider registration and management
 */
export class CacheProviderRegistration {
    /**
     * Create a new provider registration manager
     */
    constructor(private manager: CacheProviderManager) {}

    /**
     * Register a new cache provider
     */
    registerProvider(
        name: string,
        provider: ICacheProvider,
        priority: number = 0
    ): void {
        const entry: ProviderEntry = {
            name,
            instance: provider,
            priority,
            stats: {
                hits: 0,
                misses: 0,
                size: 0,
                keyCount: 0,
                memoryUsage: 0,
                lastUpdated: Date.now(), // Using number instead of Date
                entries: 0,
                avgTtl: 0,
                maxTtl: 0
            },
            errorCount: 0
        };

        this.manager.getProviders().set(name, entry);
        this.manager.updateProviderOrder();
        this.manager.getHealthStatusMap().set(name, {healthy: true, errors: 0});

        // Add required properties to event payload
        emitCacheEvent(CacheEventType.PROVIDER_INITIALIZED, {
            key: name,
            timestamp: Date.now()
        });
    }

    /**
     * Remove a cache provider
     */
    removeProvider(name: string): boolean {
        const removed = this.manager.getProviders().delete(name);
        if (removed) {
            this.manager.updateProviderOrder();
            // Add required properties to event payload
            emitCacheEvent(CacheEventType.PROVIDER_REMOVED, {
                key: name,
                timestamp: Date.now()
            });
        }
        return removed;
    }

    /**
     * Get a specific provider by name
     */
    getProvider(name: string): ICacheProvider | undefined {
        return this.manager.getProviders().get(name)?.instance;
    }
}