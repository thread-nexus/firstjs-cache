/**
 * @fileoverview Default configuration for cache module
 */

import { CacheConfig } from '../types/cache-types';

/**
 * Default cache configuration
 */
export const DEFAULT_CONFIG: CacheConfig = {
  defaultTtl: 3600, // 1 hour
  deduplicateRequests: true,
  backgroundRefresh: false,
  refreshThreshold: 0.75,
  throwOnErrors: false,
  logging: true,
  logStackTraces: false,
  monitoring: {
    enabled: false,
    interval: 60000, // 1 minute
    detailedStats: false
  },
  defaultOptions: {
    ttl: 3600,
    tags: [],
    compression: false,
    compressionThreshold: 1024,
    refreshThreshold: 0.75
  }
};

/**
 * Cache constants
 */
export const CACHE_CONSTANTS = {
  // Key constraints
  MAX_KEY_LENGTH: 1024,
  
  // Value constraints
  MAX_VALUE_SIZE: 50 * 1024 * 1024, // 50MB
  
  // TTL constraints
  MIN_TTL: 1, // 1 second
  MAX_TTL: 60 * 60 * 24 * 365, // 1 year
  
  // Batch operations
  DEFAULT_BATCH_SIZE: 100,
  MAX_BATCH_SIZE: 1000,
  
  // Retry settings
  DEFAULT_RETRIES: 3,
  DEFAULT_RETRY_DELAY: 1000, // 1 second
  MAX_RETRY_DELAY: 30000, // 30 seconds
  
  // Circuit breaker
  ERROR_THRESHOLD: 5,
  CIRCUIT_RESET_TIMEOUT: 60000 // 1 minute
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  INVALID_KEY: 'Invalid cache key',
  KEY_TOO_LONG: 'Cache key too long',
  VALUE_TOO_LARGE: 'Cache value too large',
  SERIALIZATION_FAILED: 'Failed to serialize value',
  DESERIALIZATION_FAILED: 'Failed to deserialize value',
  COMPRESSION_FAILED: 'Failed to compress value',
  DECOMPRESSION_FAILED: 'Failed to decompress value',
  PROVIDER_NOT_FOUND: 'Cache provider not found',
  PROVIDER_ERROR: 'Cache provider error',
  OPERATION_FAILED: 'Cache operation failed',
  TRANSACTION_FAILED: 'Cache transaction failed',
  CIRCUIT_OPEN: 'Circuit breaker open',
  TIMEOUT: 'Operation timed out'
};

/**
 * Key prefixes for different types of cache entries
 */
export const KEY_PREFIXES = {
  USER: 'user',
  SESSION: 'session',
  QUERY: 'query',
  DATA: 'data',
  CONFIG: 'config',
  TEMP: 'temp',
  LOCK: 'lock'
};