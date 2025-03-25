/**
 * @fileoverview Event constants for the cache system
 */

/**
 * Cache event types
 */
export const EVENT_TYPE = {
  /**
   * Cache hit
   */
  GET_HIT: 'GET_HIT',
  
  /**
   * Cache miss
   */
  GET_MISS: 'GET_MISS',
  
  /**
   * Value set in cache
   */
  SET: 'SET',
  
  /**
   * Value deleted from cache
   */
  DELETE: 'DELETE',
  
  /**
   * Cache cleared
   */
  CLEAR: 'CLEAR',
  
  /**
   * Cache entries invalidated by tag
   */
  INVALIDATE_BY_TAG: 'INVALIDATE_BY_TAG',
  
  /**
   * Value computed and cached
   */
  COMPUTE: 'COMPUTE',
  
  /**
   * Value refreshed in background
   */
  BACKGROUND_REFRESH: 'BACKGROUND_REFRESH',
  
  /**
   * Error occurred
   */
  ERROR: 'ERROR',
  
  /**
   * Warning occurred
   */
  WARNING: 'WARNING',
  
  /**
   * Value promoted between cache layers
   */
  PROMOTE: 'PROMOTE',
  
  /**
   * Value evicted from cache
   */
  EVICT: 'EVICT',
  
  /**
   * Cache stats collected
   */
  STATS: 'STATS',
  
  /**
   * Cache provider initialized
   */
  PROVIDER_INIT: 'PROVIDER_INIT',
  
  /**
   * Cache provider disposed
   */
  PROVIDER_DISPOSE: 'PROVIDER_DISPOSE',
};

/**
 * Event severity levels
 */
export const EVENT_SEVERITY = {
  /**
   * Debug level
   */
  DEBUG: 'debug',
  
  /**
   * Info level
   */
  INFO: 'info',
  
  /**
   * Warning level
   */
  WARNING: 'warning',
  
  /**
   * Error level
   */
  ERROR: 'error',
  
  /**
   * Critical level
   */
  CRITICAL: 'critical',
};

/**
 * Event categories
 */
export const EVENT_CATEGORY = {
  /**
   * Operations category
   */
  OPERATIONS: 'operations',
  
  /**
   * Performance category
   */
  PERFORMANCE: 'performance',
  
  /**
   * Errors category
   */
  ERRORS: 'errors',
  
  /**
   * System category
   */
  SYSTEM: 'system',
  
  /**
   * Security category
   */
  SECURITY: 'security',
};

/**
 * Default event options
 */
export const DEFAULT_EVENT_OPTIONS = {
  /**
   * Maximum number of events to keep in history
   */
  MAX_EVENT_HISTORY: 1000,
  
  /**
   * Whether to include stack traces in error events
   */
  INCLUDE_STACK_TRACES: false,
  
  /**
   * Whether to include value data in events
   */
  INCLUDE_VALUES: false,
  
  /**
   * Maximum value size to include in events
   */
  MAX_VALUE_SIZE: 1024,
};