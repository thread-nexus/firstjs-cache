/**
 * @fileoverview Error constants for the cache system
 */

/**
 * Error codes for cache operations
 */
export const ERROR_CODE = {
  /**
   * Generic error
   */
  GENERIC_ERROR: 'GENERIC_ERROR',
  
  /**
   * Error during get operation
   */
  GET_ERROR: 'GET_ERROR',
  
  /**
   * Error during set operation
   */
  SET_ERROR: 'SET_ERROR',
  
  /**
   * Error during delete operation
   */
  DELETE_ERROR: 'DELETE_ERROR',
  
  /**
   * Error during clear operation
   */
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  /**
   * Error during invalidation
   */
  INVALIDATION_ERROR: 'INVALIDATION_ERROR',
  
  /**
   * Error during computation
   */
  COMPUTATION_ERROR: 'COMPUTATION_ERROR',
  
  /**
   * Error during serialization
   */
  SERIALIZATION_ERROR: 'SERIALIZATION_ERROR',
  
  /**
   * Error during deserialization
   */
  DESERIALIZATION_ERROR: 'DESERIALIZATION_ERROR',
  
  /**
   * Error during compression
   */
  COMPRESSION_ERROR: 'COMPRESSION_ERROR',
  
  /**
   * Error during decompression
   */
  DECOMPRESSION_ERROR: 'DECOMPRESSION_ERROR',
  
  /**
   * Connection error
   */
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  /**
   * Timeout error
   */
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  /**
   * Provider not found
   */
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  
  /**
   * Invalid key
   */
  INVALID_KEY: 'INVALID_KEY',
  
  /**
   * Invalid value
   */
  INVALID_VALUE: 'INVALID_VALUE',
  
  /**
   * Invalid options
   */
  INVALID_OPTIONS: 'INVALID_OPTIONS',
  
  /**
   * Circuit open
   */
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  
  /**
   * Rate limit exceeded
   */
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  /**
   * Memory limit exceeded
   */
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  
  /**
   * Initialization error
   */
  INITIALIZATION_ERROR: 'INITIALIZATION_ERROR',
  
  /**
   * Configuration error
   */
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
};

/**
 * Error messages for cache operations
 */
export const ERROR_MESSAGE = {
  /**
   * Generic error message
   */
  GENERIC_ERROR: 'An error occurred during cache operation',
  
  /**
   * Error during get operation
   */
  GET_ERROR: 'Failed to retrieve value from cache',
  
  /**
   * Error during set operation
   */
  SET_ERROR: 'Failed to store value in cache',
  
  /**
   * Error during delete operation
   */
  DELETE_ERROR: 'Failed to delete value from cache',
  
  /**
   * Error during clear operation
   */
  CLEAR_ERROR: 'Failed to clear cache',
  
  /**
   * Error during invalidation
   */
  INVALIDATION_ERROR: 'Failed to invalidate cache entries',
  
  /**
   * Error during computation
   */
  COMPUTATION_ERROR: 'Failed to compute value',
  
  /**
   * Error during serialization
   */
  SERIALIZATION_ERROR: 'Failed to serialize value',
  
  /**
   * Error during deserialization
   */
  DESERIALIZATION_ERROR: 'Failed to deserialize value',
  
  /**
   * Error during compression
   */
  COMPRESSION_ERROR: 'Failed to compress value',
  
  /**
   * Error during decompression
   */
  DECOMPRESSION_ERROR: 'Failed to decompress value',
  
  /**
   * Connection error
   */
  CONNECTION_ERROR: 'Failed to connect to cache provider',
  
  /**
   * Timeout error
   */
  TIMEOUT_ERROR: 'Cache operation timed out',
  
  /**
   * Provider not found
   */
  PROVIDER_NOT_FOUND: 'Cache provider not found',
  
  /**
   * Invalid key
   */
  INVALID_KEY: 'Invalid cache key',
  
  /**
   * Invalid value
   */
  INVALID_VALUE: 'Invalid cache value',
  
  /**
   * Invalid options
   */
  INVALID_OPTIONS: 'Invalid cache options',
  
  /**
   * Circuit open
   */
  CIRCUIT_OPEN: 'Circuit breaker is open',
  
  /**
   * Rate limit exceeded
   */
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  
  /**
   * Memory limit exceeded
   */
  MEMORY_LIMIT_EXCEEDED: 'Memory limit exceeded',
  
  /**
   * Initialization error
   */
  INITIALIZATION_ERROR: 'Failed to initialize cache',
  
  /**
   * Configuration error
   */
  CONFIGURATION_ERROR: 'Invalid cache configuration',
};

/**
 * HTTP status codes for cache errors
 */
export const ERROR_HTTP_STATUS = {
  /**
   * Generic error
   */
  GENERIC_ERROR: 500,
  
  /**
   * Not found
   */
  NOT_FOUND: 404,
  
  /**
   * Bad request
   */
  BAD_REQUEST: 400,
  
  /**
   * Timeout
   */
  TIMEOUT: 504,
  
  /**
   * Too many requests
   */
  TOO_MANY_REQUESTS: 429,
  
  /**
   * Service unavailable
   */
  SERVICE_UNAVAILABLE: 503,
};