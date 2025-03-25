/**
 * Cache statistics and health check implementation
 */

import {CacheStats} from '../types';
import {CACHE_STATUS} from '../constants';
import {CacheManagerCore} from './cache-manager-core';
import {providerHasMethod, safelyCallProviderMethod} from './cache-manager-utils';

/**
 * Cache statistics and health check implementation
 */
export class CacheManagerStats {
    /**
     * Create a new cache statistics manager
     */
    constructor(private core: CacheManagerCore) {}

    /**
     * Get cache statistics from all layers
     * 
     * @returns Object containing stats for each cache layer
     */
    async getStats(): Promise<Record<string, CacheStats>> {
        const result: Record<string, CacheStats> = {};
        
        for (const [name, provider] of this.core.getProviders().entries()) {
            if (providerHasMethod(provider, 'getStats')) {
                try {
                    const stats = await safelyCallProviderMethod(
                        provider,
                        'getStats'
                    );
                    
                    if (stats) {
                        result[name] = <CacheStats>stats;
                    }
                } catch (error) {
                    console.error(`Failed to get stats from provider ${name}:`, error);
                }
            }
        }
        
        return result;
    }

    /**
     * Perform health checks on all providers
     */
    async healthCheck(): Promise<Record<string, { 
        healthy: boolean; 
        message?: string; 
        status?: string;
        lastCheck: number; 
    }>> {
        const result: Record<string, { 
            healthy: boolean; 
            message?: string; 
            status?: string;
            lastCheck: number; 
        }> = {};
        
        const now = Date.now();

        for (const [name, provider] of this.core.getProviders().entries()) {
            if (providerHasMethod(provider, 'healthCheck')) {
                try {
                    const health = await safelyCallProviderMethod<{
                        healthy: boolean;
                        message?: string;
                        status?: string;
                        lastCheck?: number;
                    }>(
                        provider,
                        'healthCheck'
                    );

                    if (health) {
                        const healthy = health.status === CACHE_STATUS.SUCCESS ||
                            health.status === undefined && health.healthy;

                        result[name] = {
                            healthy,
                            message: health.message,
                            status: health.status || (healthy ? 'healthy' : 'unhealthy'),
                            lastCheck: health.lastCheck || now 
                        };
                    }
                } catch (error) {
                    result[name] = {
                        healthy: false,
                        message: error instanceof Error ? error.message : String(error),
                        status: CACHE_STATUS.ERROR,
                        lastCheck: now
                    };
                }
            } else {
                // Basic health check
                try {
                    const testKey = `__health_check_${now}`;
                    await provider.set(testKey, {timestamp: now});
                    await provider.get(testKey);
                    await provider.delete(testKey);

                    result[name] = {
                        healthy: true,
                        status: 'healthy',
                        lastCheck: now
                    };
                } catch (error) {
                    result[name] = {
                        healthy: false,
                        message: error instanceof Error ? error.message : String(error),
                        status: CACHE_STATUS.ERROR,
                        lastCheck: now
                    };
                }
            }
        }

        return result;
    }

    /**
     * Calculate aggregate statistics across all cache layers
     * 
     * @param layerStats - Statistics from individual cache layers
     * @returns Aggregated statistics
     */
    calculateAggregateStats(
        layerStats: Record<string, CacheStats>
    ): CacheStats {
        let aggregate: CacheStats;
        aggregate = {
            size: 0,
            hits: 0,
            misses: 0,
            keyCount: 0,
            memoryUsage: 0,
            lastUpdated: Date.now()
        };

        for (const stats of Object.values(layerStats)) {
            this.aggregateStats(aggregate, stats);
        }

        return aggregate;
    }

    /**
     * Aggregate statistics
     * 
     * @param target - Target stats object
     * @param source - Source stats object
     */
    private aggregateStats(target: Partial<CacheStats>, source: CacheStats): void {
        target.size = (target.size || 0) + source.size;
        target.hits = (target.hits || 0) + source.hits;
        target.misses = (target.misses || 0) + source.misses;
        target.keyCount = (target.keyCount || 0) + source.keyCount;
        target.memoryUsage = (target.memoryUsage || 0) + source.memoryUsage;
        
        // Use the most recent lastUpdated
        if (!target.lastUpdated || (source.lastUpdated && source.lastUpdated > target.lastUpdated)) {
            target.lastUpdated = source.lastUpdated;
        }
    }
}
