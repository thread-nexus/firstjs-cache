/**
 * @fileoverview Error types for the cache system
 */

/**
 * Error codes for cache operations
 */
export enum CacheErrorCode {
  /**
   * Generic error
   */
  GENERIC_ERROR = 'GENERIC_ERROR',
  
  /**
   * Error during get operation
   */
  GET_ERROR = 'GET_ERROR',
  
  /**
   * Error during set operation
   */
  SET_ERROR = 'SET_ERROR',
  
  /**
   * Error during delete operation
   */
  DELETE_ERROR = 'DELETE_ERROR',
  
  /**
   * Error during clear operation
   */
  CLEAR_ERROR = 'CLEAR_ERROR',
  
  /**
   * Error during invalidation
   */
  INVALIDATION_ERROR = 'INVALIDATION_ERROR',
  
  /**
   * Error during computation
   */
  COMPUTATION_ERROR = 'COMPUTATION_ERROR',
  
  /**
   * Error during serialization
   */
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  
  /**
   * Error during deserialization
   */
  DESERIALIZATION_ERROR = 'DESERIALIZATION_ERROR',
  
  /**
   * Error during compression
   */
  COMPRESSION_ERROR = 'COMPRESSION_ERROR',
  
  /**
   * Error during decompression
   */
  DECOMPRESSION_ERROR = 'DECOMPRESSION_ERROR',
  
  /**
   * Connection error
   */
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  
  /**
   * Timeout error
   */
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  /**
   * Provider not found
   */
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  
  /**
   * Invalid key
   */
  INVALID_KEY = 'INVALID_KEY',
  
  /**
   * Invalid value
   */
  INVALID_VALUE = 'INVALID_VALUE',
  
  /**
   * Invalid options
   */
  INVALID_OPTIONS = 'INVALID_OPTIONS',
  
  /**
   * Circuit open
   */
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  
  /**
   * Rate limit exceeded
   */
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  /**
   * Memory limit exceeded
   */
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  
  /**
   * Initialization error
   */
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  
  /**
   * Configuration error
   */
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

/**
 * Cache error interface
 */
export interface ICacheError extends Error {
  /**
   * Error code
   */
  code: CacheErrorCode;
  
  /**
   * Operation that caused the error
   */
  operation?: string;
  
  /**
   * Cache key involved
   */
  key?: string;
  
  /**
   * Provider name
   */
  provider?: string;
  
  /**
   * Original error
   */
  cause?: Error;
  
  /**
   * Additional context
   */
  context?: Record<string, any>;
}

/**
 * Error details for logging and reporting
 */
export interface ErrorDetails {
  /**
   * Error message
   */
  message: string;
  
  /**
   * Error code
   */
  code: CacheErrorCode;
  
  /**
   * Stack trace
   */
  stack?: string;
  
  /**
   * Operation that caused the error
   */
  operation?: string;
  
  /**
   * Cache key involved
   */
  key?: string;
  
  /**
   * Provider name
   */
  provider?: string;
  
  /**
   * When the error occurred
   */
  timestamp: Date;
  
  /**
   * Additional context
   */
  context?: Record<string, any>;
}