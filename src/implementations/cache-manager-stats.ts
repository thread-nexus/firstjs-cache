/**
 * Cache manager statistics implementation
 */

import { CacheStats } from '../types/common';
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { handleCacheError } from '../utils/error-utils';
import { providerHasMethod } from './cache-manager-utils';

/**
 * Cache manager statistics
 */
export class CacheManagerStats {
  /**
   * Cache providers
   */
  private providers = new Map<string, ICacheProvider>();
  
  /**
   * Statistics collection interval
   */
  private statsInterval: NodeJS.Timeout | null = null;
  
  /**
   * Last collected stats
   */
  private lastStats: Record<string, CacheStats> = {};
  
  /**
   * Create a new cache manager statistics instance
   * 
   * @param providers - Cache providers
   */
  constructor(providers: Map<string, ICacheProvider>) {
    this.providers = providers;
  }
  
  /**
   * Start collecting statistics
   * 
   * @param interval - Collection interval in seconds
   */
  startCollecting(interval = 60): void {
    // Stop existing interval if any
    this.stopCollecting();
    
    // Start new interval
    this.statsInterval = setInterval(async () => {
      try {
        const stats = await this.collectStats();
        this.lastStats = stats;
        
        emitCacheEvent(CacheEventType.STATS_UPDATE, { stats });
      } catch (error) {
        console.error('Error collecting cache stats:', error);
      }
    }, interval * 1000);
  }
  
  /**
   * Stop collecting statistics
   */
  stopCollecting(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }
  
  /**
   * Collect statistics from all providers
   * 
   * @returns Statistics by provider
   */
  async collectStats(): Promise<Record<string, CacheStats>> {
    const result: Record<string, CacheStats> = {};
    
    for (const [name, provider] of this.providers.entries()) {
      try {
        if (providerHasMethod(provider, 'getStats')) {
          const getStats = provider.getStats as () => Promise<CacheStats>;
          const stats = await getStats();
          
          if (stats) {
            result[name] = stats;
          }
        }
      } catch (error) {
        console.error(`Error getting stats for provider ${name}:`, error);
        
        // Add error stats
        result[name] = {
          hits: 0,
          misses: 0,
          keyCount: 0,
          lastUpdated: Date.now(),
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
    
    return result;
  }
  
  /**
   * Get the last collected statistics
   * 
   * @returns Last collected statistics
   */
  getLastStats(): Record<string, CacheStats> {
    return this.lastStats;
  }
  
  /**
   * Get aggregated statistics
   * 
   * @returns Aggregated statistics
   */
  async getAggregatedStats(): Promise<CacheStats> {
    try {
      const stats = await this.collectStats();
      
      const aggregate: CacheStats = {
        hits: 0,
        misses: 0,
        keyCount: 0,
        size: 0,
        memoryUsage: 0,
        lastUpdated: Date.now()
      };
      
      // Aggregate stats
      for (const providerStats of Object.values(stats)) {
        aggregate.hits += providerStats.hits;
        aggregate.misses += providerStats.misses;
        aggregate.keyCount += providerStats.keyCount;
        
        // Handle possibly undefined properties
        if (providerStats.size) {
          aggregate.size = (aggregate.size || 0) + providerStats.size;
        }
        
        if (providerStats.memoryUsage) {
          aggregate.memoryUsage = (aggregate.memoryUsage || 0) + providerStats.memoryUsage;
        }
      }
      
      return aggregate;
    } catch (error) {
      handleCacheError(error, { operation: 'getAggregatedStats' });
      
      // Return basic stats on error
      return {
        hits: 0,
        misses: 0,
        keyCount: 0,
        lastUpdated: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Get hit rate
   * 
   * @returns Hit rate (0-1)
   */
  async getHitRate(): Promise<number> {
    try {
      const stats = await this.getAggregatedStats();
      const total = stats.hits + stats.misses;
      
      return total > 0 ? stats.hits / total : 0;
    } catch (error) {
      handleCacheError(error, { operation: 'getHitRate' });
      return 0;
    }
  }
  
  /**
   * Get statistics for a specific provider
   * 
   * @param providerName - Provider name
   * @returns Provider statistics
   */
  async getProviderStats(providerName: string): Promise<CacheStats | null> {
    try {
      const stats = await this.collectStats();
      return stats[providerName] || null;
    } catch (error) {
      handleCacheError(error, { operation: 'getProviderStats', provider: providerName });
      return null;
    }
  }
}