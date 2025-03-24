/**
 * @fileoverview Cache manager statistics implementation
 */
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { CacheManager } from './cache-manager';
/**
 * Extension of CacheManager with statistics functionality
 */
export class CacheManagerStats extends CacheManager {
    constructor() {
        super();
        // Change from private to protected to avoid inheritance conflict
        this.statsConfig = {
            throwOnErrors: false,
            defaultTtl: 3600, // Add reasonable defaults
            maxSize: 10485760, // 10MB
            maxItems: 1000,
            compressionThreshold: 1024,
            compressionLevel: 6,
            refreshThreshold: 0.75,
            backgroundRefresh: true,
            statsInterval: 60000,
            providers: ['memory'],
            defaultProvider: 'memory'
        };
        this.providerMap = new Map();
    }
    /**
     * Get cache statistics from all layers
     *
     * @returns Object containing stats for each cache layer
     */
    async getStats() {
        try {
            const stats = {};
            // Gather stats from each provider
            const providers = Array.from(this.providerMap.entries());
            const statsPromises = providers.map(async ([layerName, provider]) => {
                try {
                    // Check if the provider implements a getStats method
                    if (provider && typeof provider.getStats === 'function') {
                        const providerStats = await provider.getStats();
                        return [layerName, providerStats];
                    }
                    else {
                        // Default stats for providers that don't implement getStats
                        return [layerName, {
                                size: 0,
                                hits: 0,
                                misses: 0,
                                keyCount: 0,
                                memoryUsage: 0,
                                lastUpdated: Date.now()
                            }];
                    }
                }
                catch (error) {
                    this.logError(`Failed to get stats from cache layer ${layerName}`, error);
                    // Return basic stats object on error
                    return [layerName, {
                            size: 0,
                            hits: 0,
                            misses: 0,
                            keyCount: 0,
                            memoryUsage: 0,
                            lastUpdated: Date.now(),
                            error: error instanceof Error ? error.message : String(error)
                        }];
                }
            });
            // Wait for all stats to be collected
            const results = await Promise.all(statsPromises);
            // Build the stats object from results
            for (const result of results) {
                const [layerName, layerStats] = result;
                stats[layerName] = layerStats;
            }
            // Add aggregate statistics
            stats['aggregate'] = this.calculateAggregateStats(stats);
            // Add required properties to event payload
            emitCacheEvent(CacheEventType.STATS_UPDATE, {
                stats,
                type: CacheEventType.STATS_UPDATE.toString(),
                timestamp: Date.now()
            });
            return stats;
        }
        catch (error) {
            this.logError('Error collecting cache statistics', error);
            if (this.statsConfig.throwOnErrors) {
                throw error;
            }
            // Return empty stats on error
            return {};
        }
    }
    /**
     * Calculate aggregate statistics across all cache layers
     *
     * @param layerStats - Statistics from individual cache layers
     * @returns Aggregated statistics
     * @private
     */
    calculateAggregateStats(layerStats) {
        const aggregate = {
            size: 0,
            hits: 0,
            misses: 0,
            keyCount: 0,
            entries: 0, // Add this
            avgTtl: 0, // Add this
            maxTtl: 0, // Add this
            memoryUsage: 0,
            lastUpdated: Date.now()
        };
        // Handle potential undefined memoryUsage safely
        for (const [layerName, stats] of Object.entries(layerStats)) {
            aggregate.size += stats.size || 0;
            aggregate.hits += stats.hits || 0;
            aggregate.misses += stats.misses || 0;
            aggregate.keyCount += stats.keyCount || 0;
            // Check if memoryUsage exists before adding
            if (stats.memoryUsage !== undefined) {
                aggregate.memoryUsage += stats.memoryUsage;
            }
        }
        // Calculate hit ratio instead of hitRate
        const totalOperations = aggregate.hits + aggregate.misses;
        // Use hitRatio property instead of hitRate
        return {
            ...aggregate,
            hitRatio: totalOperations > 0 ? aggregate.hits / totalOperations : 0
        };
    }
    /**
     * Log an error message
     *
     * @param message - Error message
     * @param error - Error object
     * @private
     */
    logError(message, error) {
        console.error(message, error);
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.ERROR, {
            message,
            error: error instanceof Error ? error : new Error(String(error)),
            type: CacheEventType.ERROR.toString(),
            timestamp: Date.now()
        });
    }
}
//# sourceMappingURL=CacheManagerStats.js.map