/**
 * Base payload for cache events
 */
export interface CacheEventPayload {
  /**
   * Timestamp when the event occurred
   */
  timestamp?: number;
  
  /**
   * Cache key involved in the operation
   */
  key?: string;
  
  /**
   * Operation duration in ms
   */
  duration?: number;
  
  /**
   * Size of the cache entry in bytes
   */
  size?: number;
  
  /**
   * Error object if the operation failed
   */
  error?: Error | string;
  
  /**
   * Provider name
   */
  provider?: string;
  
  /**
   * Time-to-live in seconds
   */
  ttl?: number;
  
  /**
   * Number of entries removed
   */
  entriesRemoved?: number;
  
  /**
   * Tag used for invalidation
   */
  tag?: string;
  
  /**
   * Reason for cache action
   */
  reason?: string;
  
  /**
   * Type of operation
   */
  type?: string;
  
  /**
   * Message associated with the event
   */
  message?: string;
  
  /**
   * Array of keys for batch operations
   */
  keys?: string[];
  
  /**
   * Number of cache hits
   */
  hits?: number;
  
  /**
   * Number of cache misses
   */
  misses?: number;
  
  /**
   * Cache statistics
   */
  stats?: any;
  
  /**
   * Compute time in ms
   */
  computeTime?: number;
  
  /**
   * Compute status
   */
  computeStatus?: string;
  
  /**
   * Provider name
   */
  providerName?: string;
  
  /**
   * Whether the operation was successful
   */
  deleted?: boolean;
  
  /**
   * Age of the cache entry
   */
  age?: number;
  
  /**
   * Number of keys cleared
   */
  clearedKeys?: number;
  
  /**
   * Batch size for operations
   */
  batchSize?: number;
  
  /**
   * Host information
   */
  host?: string;
  
  /**
   * Port information
   */
  port?: number;
  
  /**
   * Provider priority
   */
  priority?: number;
  
  /**
   * Error count
   */
  errorCount?: number;
}
