"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManagerStats = void 0;
const cache_events_1 = require("../events/cache-events");
const cache_manager_advanced_1 = require("./cache-manager-advanced");
/**
 * Extension of CacheManager with statistics functionality
 */
class CacheManagerStats extends cache_manager_advanced_1.CacheManagerAdvanced {
    /**
     * Get cache statistics from all layers
     *
     * @returns Object containing stats for each cache layer
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = {};
                // Gather stats from each provider concurrently
                const statsPromises = Array.from(this.providers.entries()).map((_a) => __awaiter(this, [_a], void 0, function* ([layerName, provider]) {
                    try {
                        // Check if the provider implements a getStats method
                        if (typeof provider.getStats === 'function') {
                            const providerStats = yield provider.getStats();
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
                                    lastUpdated: new Date(),
                                    keys: []
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
                                lastUpdated: new Date(),
                                error: error.message,
                                keys: []
                            }];
                    }
                }));
                // Wait for all stats to be collected
                const results = yield Promise.all(statsPromises);
                // Build the stats object from results
                for (const [layerName, layerStats] of results) {
                    stats[layerName] = layerStats;
                }
                // Add aggregate statistics
                stats['aggregate'] = this.calculateAggregateStats(stats);
                (0, cache_events_1.emitCacheEvent)('stats', { stats });
                return stats;
            }
            catch (error) {
                this.logError('Error collecting cache statistics', error);
                if (this.config.throwOnErrors) {
                    throw error;
                }
                // Return empty stats on error
                return {};
            }
        });
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
            lastUpdated: new Date(),
            keys: []
        };
        for (const [layerName, stats] of Object.entries(layerStats)) {
            aggregate.size += stats.size || 0;
            aggregate.hits += stats.hits || 0;
            aggregate.misses += stats.misses || 0;
            aggregate.keyCount += stats.keyCount || 0;
            aggregate.memoryUsage += stats.memoryUsage || 0;
            // Merge keys arrays if they exist
            if (stats.keys && Array.isArray(stats.keys)) {
                aggregate.keys = [...aggregate.keys, ...stats.keys];
            }
        }
        return aggregate;
    }
}
exports.CacheManagerStats = CacheManagerStats;
