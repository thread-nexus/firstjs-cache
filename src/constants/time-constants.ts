/**
 * @fileoverview Time constants for the cache system
 */

/**
 * Time constants in milliseconds
 */
export const TIME_MS = {
  /**
   * One millisecond
   */
  MILLISECOND: 1,
  
  /**
   * One second in milliseconds
   */
  SECOND: 1000,
  
  /**
   * One minute in milliseconds
   */
  MINUTE: 60 * 1000,
  
  /**
   * One hour in milliseconds
   */
  HOUR: 60 * 60 * 1000,
  
  /**
   * One day in milliseconds
   */
  DAY: 24 * 60 * 60 * 1000,
  
  /**
   * One week in milliseconds
   */
  WEEK: 7 * 24 * 60 * 60 * 1000,
  
  /**
   * 30 days in milliseconds (approximate month)
   */
  MONTH: 30 * 24 * 60 * 60 * 1000,
  
  /**
   * 365 days in milliseconds (approximate year)
   */
  YEAR: 365 * 24 * 60 * 60 * 1000,
};

/**
 * Time constants in milliseconds for cache operations
 */
export const TIME_CONSTANTS = {
  ONE_SECOND: 1000,
  ONE_MINUTE: 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  SECOND: 1000
};

/**
 * Time constants in seconds
 */
export const TIME_SEC = {
  /**
   * One second
   */
  SECOND: 1,
  
  /**
   * One minute in seconds
   */
  MINUTE: 60,
  
  /**
   * One hour in seconds
   */
  HOUR: 60 * 60,
  
  /**
   * One day in seconds
   */
  DAY: 24 * 60 * 60,
  
  /**
   * One week in seconds
   */
  WEEK: 7 * 24 * 60 * 60,
  
  /**
   * 30 days in seconds (approximate month)
   */
  MONTH: 30 * 24 * 60 * 60,
  
  /**
   * 365 days in seconds (approximate year)
   */
  YEAR: 365 * 24 * 60 * 60,
};

/**
 * Default timeout values in milliseconds
 */
export const TIMEOUT = {
  /**
   * Default operation timeout (5 seconds)
   */
  DEFAULT_OPERATION: 5000,
  
  /**
   * Default connection timeout (10 seconds)
   */
  DEFAULT_CONNECTION: 10000,
  
  /**
   * Default computation timeout (30 seconds)
   */
  DEFAULT_COMPUTATION: 30000,
  
  /**
   * Default health check timeout (5 seconds)
   */
  DEFAULT_HEALTH_CHECK: 5000,
  
  /**
   * Default lock timeout (10 seconds)
   */
  DEFAULT_LOCK: 10000,
  
  /**
   * Default batch operation timeout (15 seconds)
   */
  DEFAULT_BATCH: 15000,
};

/**
 * Default interval values in milliseconds
 */
export const INTERVAL = {
  /**
   * Default cleanup interval (5 minutes)
   */
  DEFAULT_CLEANUP: 5 * 60 * 1000,
  
  /**
   * Default refresh interval (1 minute)
   */
  DEFAULT_REFRESH: 60 * 1000,
  
  /**
   * Default stats collection interval (1 minute)
   */
  DEFAULT_STATS: 60 * 1000,
  
  /**
   * Default health check interval (1 minute)
   */
  DEFAULT_HEALTH_CHECK: 60 * 1000,
  
  /**
   * Default persistence sync interval (5 minutes)
   */
  DEFAULT_PERSISTENCE_SYNC: 5 * 60 * 1000,
  
  /**
   * Default retry interval (1 second)
   */
  DEFAULT_RETRY: 1000,
};