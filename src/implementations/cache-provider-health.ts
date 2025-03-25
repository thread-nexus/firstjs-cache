/**
 * @fileoverview Health monitoring and error handling for cache providers
 * 
 * This module implements health monitoring and error handling for cache providers.
 * It tracks error rates, maintains health status, and provides utilities for
 * health checks and error management.
 * 
 * @module implementations/cache-provider-health
 */

import { CacheEventType } from '../events/cache-events';
import { eventManager } from '../events/event-manager';
import { handleCacheError } from '../utils/error-handling';
import { CacheProviderManager, ProviderEntry } from './cache-provider-manager';
import { getProviderHealth } from '../utils/provider-method-utils';

/**
 * Health monitoring and error handling for cache providers
 * Manages provider error tracking and health status reporting
 * 
 * @class CacheProviderHealth
 */
export class CacheProviderHealth {
    /**
     * Creates a new provider health monitor
     * 
     * @param {CacheProviderManager} manager - Provider manager to monitor
     */
    constructor(private manager: CacheProviderManager) {}

    /**
     * Handles errors from a cache provider
     * Tracks error counts, emits events, and adjusts provider priorities
     * 
     * @param {ProviderEntry | string} provider - Provider entry or provider name
     * @param {unknown} error - Error that occurred
     */
    handleProviderError(provider: ProviderEntry | string, error: unknown): void {
        if (typeof provider === 'string') {
            // Handle string provider case
            handleCacheError(error, {
                operation: 'provider',
                provider: provider
            });
        } else {
            // Handle ProviderEntry case
            const cacheError = handleCacheError(error, {
                operation: 'provider',
                provider: provider.name,
                context: { errorCount: provider.errorCount }
            });
            
            provider.lastError = cacheError;
            provider.errorCount++;

            // If provider has too many errors, move it to lowest priority
            if (provider.errorCount > 5) {
                const sortedProviders = this.manager.getSortedProviders();
                provider.priority = Math.max(
                    ...sortedProviders.map(p => p.priority)
                ) + 1;
                this.manager.updateProviderOrder();
            }

            // Emit error event with required properties
            eventManager.emit(CacheEventType.PROVIDER_ERROR, {
                provider: provider.name,
                error: cacheError,
                metadata: {
                    errorCount: provider.errorCount
                },
                timestamp: Date.now()
            });
        }
    }

    /**
     * Reset error counts for all providers
     * Useful after a system recovery or when issues are resolved
     */
    resetErrorCounts(): void {
        for (const provider of this.manager.getProviders().values()) {
            provider.errorCount = 0;
            provider.lastError = undefined;
        }
    }

    /**
     * Get health status for all providers
     * 
     * @returns {Record<string, Object>} Health status by provider name
     */
    getProviderHealth(): Record<string, {
        status: 'healthy' | 'degraded' | 'unhealthy';
        errorCount: number;
        lastError?: Error;
        healthy: boolean;
        lastCheck: number; 
        timestamp: number;
    }> {
        const health: Record<string, any> = {};
        const now = Date.now();
        
        for (const provider of this.manager.getProviders().values()) {
            // Check if the provider implements healthCheck
            const providerInstance = provider.instance;
            const providerName = provider.name;
            
            // Use the getProviderHealth utility to get health status
            getProviderHealth(providerInstance, providerName)
                .then(healthStatus => {
                    health[providerName] = {
                        ...healthStatus,
                        errorCount: provider.errorCount,
                        lastError: provider.lastError,
                        timestamp: now
                    };
                })
                .catch(() => {
                    // Fallback to error-count based health if healthCheck fails
                    const status = provider.errorCount === 0 ? 'healthy' :
                        provider.errorCount < 5 ? 'degraded' : 'unhealthy';
                    
                    health[providerName] = {
                        status,
                        errorCount: provider.errorCount,
                        lastError: provider.lastError,
                        healthy: status === 'healthy',
                        timestamp: now,
                        lastCheck: now
                    };
                });
        }

        return health;
    }

    /**
     * Get health status for a specific provider
     * 
     * @param {string} name - Provider name
     * @returns {Object | undefined} Provider health status or undefined if not found
     */
    async getProviderStatus(name: string): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        healthy: boolean;
        errorCount: number;
        lastError?: Error;
        lastCheck: number;
    } | undefined> {
        const provider = this.manager.getProviders().get(name);
        if (!provider) return undefined;

        try {
            const healthStatus = await getProviderHealth(provider.instance, name);
            
            return {
                ...healthStatus,
                errorCount: provider.errorCount,
                lastError: provider.lastError
            };
        } catch {
            // Fallback to error-count based health
            const status = provider.errorCount === 0 ? 'healthy' :
                provider.errorCount < 5 ? 'degraded' : 'unhealthy';
            
            return {
                status,
                healthy: provider.errorCount === 0,
                errorCount: provider.errorCount,
                lastError: provider.lastError,
                lastCheck: Date.now()
            };
        }
    }
}