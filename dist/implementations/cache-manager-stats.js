"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManagerStats = void 0;
// Fix the import for CacheEventType
const cache_events_1 = require("../events/cache-events");
const cache_manager_advanced_1 = require("./cache-manager-advanced");
const cache_statistics_1 = require("./cache-statistics");
/**
 * Extension of CacheManager with statistics functionality
 */
class CacheManagerStats extends cache_manager_advanced_1.CacheManagerAdvanced {
    constructor(...args) {
        super(...args);
        this.cacheStats = new cache_statistics_1.CacheStatistics();
    }
    /**
     * Log an error message
     * @param message Error message
     * @param error Error object
     * @private
     */
    logError(message, error) {
        console.error(message, error);
        // You might want to implement more sophisticated logging
    }
    /**
     * Get cache statistics from all layers
     *
     * @returns Object containing stats for each cache layer
     */
    async getStats() {
        try {
            const stats = {};
            // Get providers from parent class
            const providers = this.getProviders();
            // Gather stats from each provider concurrently
            const statsPromises = Array.from(providers.entries()).map(async ([layerName, provider]) => {
                try {
                    // Check if the provider implements a getStats method
                    if (typeof provider.getStats === 'function') {
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
                                lastUpdated: Date.now(),
                                hitRatio: 0,
                                timestamp: Date.now(),
                                entries: 0,
                                avgTtl: 0,
                                maxTtl: 0
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
                            hitRatio: 0,
                            timestamp: Date.now(),
                            entries: 0,
                            avgTtl: 0,
                            maxTtl: 0
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
            // Use the imported CacheEventType
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.STATS_UPDATE, {
                stats,
                timestamp: Date.now(),
                type: cache_events_1.CacheEventType.STATS_UPDATE.toString()
            });
            return stats;
        }
        catch (error) {
            this.logError('Error collecting cache statistics', error);
            // Get config from parent class or use default
            const config = this.getConfig();
            if (config?.throwOnErrors) {
                throw error;
            }
            // Return empty stats on error
            return {};
        }
    }
    /**
     * Get providers map from parent class
     * @private
     */
    getProviders() {
        // This is a workaround - you'll need to implement this based on how providers are stored in CacheManagerAdvanced
        return this.providers || new Map();
    }
    /**
     * Get config from parent class
     * @private
     */
    getConfig() {
        // This is a workaround - you'll need to implement this based on how config is stored in CacheManagerAdvanced
        return this.config || { throwOnErrors: false };
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
            memoryUsage: 0,
            lastUpdated: Date.now(),
            hitRatio: 0,
            timestamp: Date.now(),
            entries: 0,
            avgTtl: 0,
            maxTtl: 0
        };
        for (const [layerName, stats] of Object.entries(layerStats)) {
            aggregate.size += stats.size || 0;
            aggregate.hits += stats.hits || 0;
            aggregate.misses += stats.misses || 0;
            aggregate.keyCount += (stats.keyCount || 0);
            aggregate.memoryUsage += stats.memoryUsage || 0;
        }
        // Calculate hit ratio
        const totalOps = aggregate.hits + aggregate.misses;
        aggregate.hitRatio = totalOps > 0 ? aggregate.hits / totalOps : 0;
        return aggregate;
    }
}
exports.CacheManagerStats = CacheManagerStats;
//# sourceMappingURL=cache-manager-stats.js.map