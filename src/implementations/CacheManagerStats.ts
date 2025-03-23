/**
 * CacheManagerStats.ts
 * 
 * Implementation of cache statistics and monitoring functionality
 */
import { CacheStats } from '../interfaces/ICacheConfig';
import { emitCacheEvent } from '../events/cacheEvents';
import { CacheManagerAdvanced } from './CacheManagerAdvanced';

/**
 * Extension of CacheManager with statistics functionality
 */
export class CacheManagerStats extends CacheManagerAdvanced {
  /**
   * Get cache statistics from all layers
   * 
   * @returns Object containing stats for each cache layer
   */
  async getStats(): Promise<Record<string, CacheStats>> {
    try {
      const stats: Record<string, CacheStats> = {};
      
      // Gather stats from each provider concurrently
      const statsPromises = Array.from(this.providers.entries()).map(
        async ([layerName, provider]): Promise<[string, CacheStats]> => {
          try {
            // Check if the provider implements a getStats method
            if (typeof provider.getStats === 'function') {
              const providerStats = await provider.getStats();
              return [layerName, providerStats];
            } else {
              // Default stats for providers that don't implement getStats
              return [layerName, {
                size: 0,
                hits: 0, 
                misses: 0,
                keyCount: 0,
                memoryUsage: 0,
                lastUpdated: new Date()
              }];
            }
          } catch (error) {
            this.logError(`Failed to get stats from cache layer ${layerName}`, error);
            // Return basic stats object on error
            return [layerName, {
              size: 0,
              hits: 0,
              misses: 0,
              keyCount: 0,
              memoryUsage: 0,
              lastUpdated: new Date(),
              error: error.message
            }];
          }
        }
      );
      
      // Wait for all stats to be collected
      const results = await Promise.all(statsPromises);
      
      // Build the stats object from results
      for (const [layerName, layerStats] of results) {
        stats[layerName] = layerStats;
      }
      
      // Add aggregate statistics
      stats['aggregate'] = this.calculateAggregateStats(stats);
      
      emitCacheEvent('stats', { stats });
      return stats;
    } catch (error) {
      this.logError('Error collecting cache statistics', error);
      
      if (this.config.throwOnErrors) {
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
  private calculateAggregateStats(
    layerStats: Record<string, CacheStats>
  ): CacheStats {
    const aggregate: CacheStats = {
      size: 0,
      hits: 0,
      misses: 0,
      keyCount: 0,
      memoryUsage: 0,
      lastUpdated: new Date()
    };
    
    for (const [layerName, stats] of Object.entries(layerStats)) {
      aggregate.size += stats.size || 0;
      aggregate.hits += stats.hits || 0;
      aggregate.misses += stats.misses || 0;
      aggregate.keyCount += stats.keyCount || 0;
      aggregate.memoryUsage += stats.memoryUsage || 0;
    }
    
    return aggregate;
  }
}