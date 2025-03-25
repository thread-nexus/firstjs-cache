/**
 * @fileoverview Metrics constants for the cache system
 */

/**
 * Metric names
 */
export const METRIC_NAME = {
  /**
   * Cache hits
   */
  HITS: 'hits',
  
  /**
   * Cache misses
   */
  MISSES: 'misses',
  
  /**
   * Hit rate
   */
  HIT_RATE: 'hitRate',
  
  /**
   * Get operation duration
   */
  GET_DURATION: 'getDuration',
  
  /**
   * Set operation duration
   */
  SET_DURATION: 'setDuration',
  
  /**
   * Delete operation duration
   */
  DELETE_DURATION: 'deleteDuration',
  
  /**
   * Clear operation duration
   */
  CLEAR_DURATION: 'clearDuration',
  
  /**
   * Compute operation duration
   */
  COMPUTE_DURATION: 'computeDuration',
  
  /**
   * Memory usage
   */
  MEMORY_USAGE: 'memoryUsage',
  
  /**
   * Item count
   */
  ITEM_COUNT: 'itemCount',
  
  /**
   * Error count
   */
  ERROR_COUNT: 'errorCount',
  
  /**
   * Eviction count
   */
  EVICTION_COUNT: 'evictionCount',
  
  /**
   * Background refresh count
   */
  BACKGROUND_REFRESH_COUNT: 'backgroundRefreshCount',
  
  /**
   * Operations per second
   */
  OPERATIONS_PER_SECOND: 'operationsPerSecond',
};

/**
 * Metric dimensions
 */
export const METRIC_DIMENSION = {
  /**
   * Provider name
   */
  PROVIDER: 'provider',
  
  /**
   * Operation type
   */
  OPERATION: 'operation',
  
  /**
   * Status (success/error)
   */
  STATUS: 'status',
  
  /**
   * Cache layer
   */
  LAYER: 'layer',
  
  /**
   * Error code
   */
  ERROR_CODE: 'errorCode',
  
  /**
   * Key pattern
   */
  KEY_PATTERN: 'keyPattern',
  
  /**
   * Tag
   */
  TAG: 'tag',
};

/**
 * Default metrics configuration
 */
export const DEFAULT_METRICS_CONFIG = {
  /**
   * Whether to enable metrics collection
   */
  ENABLED: true,
  
  /**
   * Collection interval in milliseconds (1 minute)
   */
  COLLECTION_INTERVAL: 60000,
  
  /**
   * Maximum number of metrics to keep in history
   */
  MAX_HISTORY_SIZE: 60,
  
  /**
   * Whether to track detailed metrics
   */
  DETAILED_METRICS: false,
  
  /**
   * Whether to track operation durations
   */
  TRACK_DURATIONS: true,
  
  /**
   * Whether to track memory usage
   */
  TRACK_MEMORY_USAGE: true,
  
  /**
   * Whether to track key patterns
   */
  TRACK_KEY_PATTERNS: false,
  
  /**
   * Maximum number of unique dimensions to track
   */
  MAX_DIMENSION_CARDINALITY: 100,
};

/**
 * Metric aggregation methods
 */
export const METRIC_AGGREGATION = {
  /**
   * Sum values
   */
  SUM: 'sum',
  
  /**
   * Average values
   */
  AVERAGE: 'average',
  
  /**
   * Minimum value
   */
  MIN: 'min',
  
  /**
   * Maximum value
   */
  MAX: 'max',
  
  /**
   * Count occurrences
   */
  COUNT: 'count',
  
  /**
   * Last value
   */
  LAST: 'last',
  
  /**
   * Percentile value
   */
  PERCENTILE: 'percentile',
};