/**
 * @fileoverview Metrics types for the cache system
 */

/**
 * Performance metrics for cache operations
 */
export interface CacheMetrics {
  /**
   * Hit rate (0-1)
   */
  hitRate: number;
  
  /**
   * Miss rate (0-1)
   */
  missRate: number;
  
  /**
   * Total number of operations
   */
  operations: number;
  
  /**
   * Number of hits
   */
  hits: number;
  
  /**
   * Number of misses
   */
  misses: number;
  
  /**
   * Average operation duration in milliseconds
   */
  averageDuration: number;
  
  /**
   * Average get operation duration in milliseconds
   */
  averageGetDuration: number;
  
  /**
   * Average set operation duration in milliseconds
   */
  averageSetDuration: number;
  
  /**
   * Average compute duration in milliseconds
   */
  averageComputeDuration: number;
  
  /**
   * Memory usage in bytes
   */
  memoryUsage: number;
  
  /**
   * Number of entries
   */
  entries: number;
  
  /**
   * Average entry size in bytes
   */
  averageEntrySize: number;
  
  /**
   * Number of evictions
   */
  evictions: number;
  
  /**
   * Number of background refreshes
   */
  backgroundRefreshes: number;
  
  /**
   * Number of errors
   */
  errors: number;
  
  /**
   * Time period for these metrics in seconds
   */
  period: number;
  
  /**
   * When metrics were collected
   */
  timestamp: Date;
  
  /**
   * Provider-specific metrics
   */
  providers: Record<string, ProviderMetrics>;
}

/**
 * Metrics for a specific provider
 */
export interface ProviderMetrics {
  /**
   * Provider name
   */
  name: string;
  
  /**
   * Hit rate (0-1)
   */
  hitRate: number;
  
  /**
   * Number of hits
   */
  hits: number;
  
  /**
   * Number of misses
   */
  misses: number;
  
  /**
   * Average operation duration in milliseconds
   */
  averageDuration: number;
  
  /**
   * Memory usage in bytes
   */
  memoryUsage: number;
  
  /**
   * Number of entries
   */
  entries: number;
  
  /**
   * Provider-specific metrics
   */
  [key: string]: any;
}

/**
 * Metrics snapshot for a time period
 */
export interface MetricsSnapshot {
  /**
   * Metrics data
   */
  metrics: CacheMetrics;
  
  /**
   * Start of time period
   */
  startTime: Date;
  
  /**
   * End of time period
   */
  endTime: Date;
  
  /**
   * Snapshot ID
   */
  id: string;
}