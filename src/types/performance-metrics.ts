/**
 * @fileoverview Performance metrics types for the cache system
 */

/**
 * Performance metrics for a single operation
 */
export interface OperationMetrics {
  /**
   * Operation type
   */
  operation: string;
  
  /**
   * Cache key
   */
  key?: string;
  
  /**
   * Start time
   */
  startTime: number;
  
  /**
   * End time
   */
  endTime: number;
  
  /**
   * Duration in milliseconds
   */
  duration: number;
  
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Whether the value was found in cache (for get operations)
   */
  hit?: boolean;
  
  /**
   * Provider used
   */
  provider?: string;
  
  /**
   * Layer where the value was found
   */
  layer?: string;
  
  /**
   * Error if operation failed
   */
  error?: Error;
  
  /**
   * Value size in bytes
   */
  valueSize?: number;
  
  /**
   * Whether the value was compressed
   */
  compressed?: boolean;
  
  /**
   * Size after compression
   */
  compressedSize?: number;
  
  /**
   * Compression ratio
   */
  compressionRatio?: number;
}

/**
 * Performance metrics for a time period
 */
export interface PerformanceMetrics {
  /**
   * Start time of the period
   */
  startTime: number;
  
  /**
   * End time of the period
   */
  endTime: number;
  
  /**
   * Total operations
   */
  totalOperations: number;
  
  /**
   * Successful operations
   */
  successfulOperations: number;
  
  /**
   * Failed operations
   */
  failedOperations: number;
  
  /**
   * Get operations
   */
  getOperations: number;
  
  /**
   * Set operations
   */
  setOperations: number;
  
  /**
   * Delete operations
   */
  deleteOperations: number;
  
  /**
   * Other operations
   */
  otherOperations: number;
  
  /**
   * Cache hits
   */
  hits: number;
  
  /**
   * Cache misses
   */
  misses: number;
  
  /**
   * Hit rate (0-1)
   */
  hitRate: number;
  
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
   * Average delete operation duration in milliseconds
   */
  averageDeleteDuration: number;
  
  /**
   * P95 operation duration in milliseconds
   */
  p95Duration: number;
  
  /**
   * P99 operation duration in milliseconds
   */
  p99Duration: number;
  
  /**
   * Maximum operation duration in milliseconds
   */
  maxDuration: number;
  
  /**
   * Total data size in bytes
   */
  totalDataSize: number;
  
  /**
   * Average data size in bytes
   */
  averageDataSize: number;
  
  /**
   * Operations per second
   */
  operationsPerSecond: number;
  
  /**
   * Bytes per second
   */
  bytesPerSecond: number;
  
  /**
   * Provider-specific metrics
   */
  providerMetrics: Record<string, ProviderPerformanceMetrics>;
}

/**
 * Performance metrics for a specific provider
 */
export interface ProviderPerformanceMetrics {
  /**
   * Provider name
   */
  provider: string;
  
  /**
   * Total operations
   */
  operations: number;
  
  /**
   * Successful operations
   */
  successfulOperations: number;
  
  /**
   * Failed operations
   */
  failedOperations: number;
  
  /**
   * Cache hits
   */
  hits: number;
  
  /**
   * Cache misses
   */
  misses: number;
  
  /**
   * Hit rate (0-1)
   */
  hitRate: number;
  
  /**
   * Average operation duration in milliseconds
   */
  averageDuration: number;
  
  /**
   * P95 operation duration in milliseconds
   */
  p95Duration: number;
  
  /**
   * Maximum operation duration in milliseconds
   */
  maxDuration: number;
}