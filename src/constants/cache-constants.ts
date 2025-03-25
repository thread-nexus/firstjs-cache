/**
 * @fileoverview Core cache constants
 */

/**
 * Default cache configuration values
 */
export const DEFAULT_CACHE_CONFIG = {
  /**
   * Default TTL in seconds (1 hour)
   */
  DEFAULT_TTL: 3600,
  
  /**
   * Default refresh threshold (75% of TTL)
   */
  DEFAULT_REFRESH_THRESHOLD: 0.75,
  
  /**
   * Default maximum memory size (100MB)
   */
  DEFAULT_MAX_MEMORY_SIZE: 100 * 1024 * 1024,
  
  /**
   * Default maximum items in memory cache
   */
  DEFAULT_MAX_ITEMS: 10000,
  
  /**
   * Default cleanup interval in seconds
   */
  DEFAULT_CLEANUP_INTERVAL: 300,
  
  /**
   * Default compression threshold in bytes (1KB)
   */
  DEFAULT_COMPRESSION_THRESHOLD: 1024,
  
  /**
   * Default batch size
   */
  DEFAULT_BATCH_SIZE: 100,
  
  /**
   * Default key prefix
   */
  DEFAULT_KEY_PREFIX: 'cache:',
  
  /**
   * Default tag prefix
   */
  DEFAULT_TAG_PREFIX: 'tag:',
};

/**
 * Cache layer priorities
 */
export const CACHE_LAYER_PRIORITY = {
  /**
   * Memory cache (fastest)
   */
  MEMORY: 1,
  
  /**
   * Local storage
   */
  LOCAL_STORAGE: 2,
  
  /**
   * Session storage
   */
  SESSION_STORAGE: 3,
  
  /**
   * IndexedDB
   */
  INDEXED_DB: 4,
  
  /**
   * Redis cache
   */
  REDIS: 5,
  
  /**
   * Disk cache
   */
  DISK: 6,
  
  /**
   * Remote cache
   */
  REMOTE: 7,
};

/**
 * Cache operation types
 */
export const CACHE_OPERATION = {
  /**
   * Get operation
   */
  GET: 'get',
  
  /**
   * Set operation
   */
  SET: 'set',
  
  /**
   * Delete operation
   */
  DELETE: 'delete',
  
  /**
   * Clear operation
   */
  CLEAR: 'clear',
  
  /**
   * Has operation
   */
  HAS: 'has',
  
  /**
   * Get many operation
   */
  GET_MANY: 'getMany',
  
  /**
   * Set many operation
   */
  SET_MANY: 'setMany',
  
  /**
   * Delete many operation
   */
  DELETE_MANY: 'deleteMany',
  
  /**
   * Compute operation
   */
  COMPUTE: 'compute',
  
  /**
   * Invalidate by tag operation
   */
  INVALIDATE_BY_TAG: 'invalidateByTag',
  
  /**
   * Invalidate by prefix operation
   */
  INVALIDATE_BY_PREFIX: 'invalidateByPrefix',
  
  /**
   * Get stats operation
   */
  GET_STATS: 'getStats',
  
  /**
   * Health check operation
   */
  HEALTH_CHECK: 'healthCheck',
};

/**
 * Cache result status codes
 */
export const CACHE_STATUS = {
  /**
   * Success
   */
  SUCCESS: 'success',
  
  /**
   * Error
   */
  ERROR: 'error',
  
  /**
   * Not found
   */
  NOT_FOUND: 'not_found',
  
  /**
   * Expired
   */
  EXPIRED: 'expired',
  
  /**
   * Invalid
   */
  INVALID: 'invalid',
  
  /**
   * Timeout
   */
  TIMEOUT: 'timeout',
  
  /**
   * Cache is healthy
   */
  HEALTHY: 'healthy',
  
  /**
   * Cache is degraded
   */
  DEGRADED: 'degraded',
  
  /**
   * Cache is unhealthy
   */
  UNHEALTHY: 'unhealthy',
  
  /**
   * Rate limit exceeded
   */
  RATE_LIMITED: 'rate_limited',
  
  /**
   * Invalid argument
   */
  INVALID_ARGUMENT: 'invalid_argument',
  
  /**
   * Operation in progress
   */
  IN_PROGRESS: 'in_progress',
};

/**
 * Cache error codes
 */
export const CACHE_ERROR = {
  /**
   * General error
   */
  GENERAL: 'general_error',
  
  /**
   * Connection error
   */
  CONNECTION: 'connection_error',
  
  /**
   * Authentication error
   */
  AUTHENTICATION: 'authentication_error',
  
  /**
   * Permission error
   */
  PERMISSION: 'permission_error',
  
  /**
   * Configuration error
   */
  CONFIGURATION: 'configuration_error',
  
  /**
   * Serialization error
   */
  SERIALIZATION: 'serialization_error',
  
  /**
   * Deserialization error
   */
  DESERIALIZATION: 'deserialization_error',
  
  /**
   * Network error
   */
  NETWORK: 'network_error',
  
  /**
   * Key too large
   */
  KEY_TOO_LARGE: 'key_too_large',
  
  /**
   * Value too large
   */
  VALUE_TOO_LARGE: 'value_too_large',
};

/**
 * Cache eviction policies
 */
export const EVICTION_POLICY = {
  /**
   * Least Recently Used
   */
  LRU: 'lru',
  
  /**
   * Least Frequently Used
   */
  LFU: 'lfu',
  
  /**
   * First In First Out
   */
  FIFO: 'fifo',
  
  /**
   * Random
   */
  RANDOM: 'random',
};