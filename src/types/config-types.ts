/**
 * @fileoverview Configuration types for the cache system
 */

import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheOptions} from './cache-types';
// Change the import to avoid name conflict
import {MonitoringConfig as BaseMonitoringConfig} from './monitoring-types';

/**
 * Configuration for the cache manager
 */
export interface CacheConfig {
  /**
   * Configured cache providers
   */
  providers: ProviderConfig[];
  
  /**
   * Default TTL in seconds
   */
  defaultTtl?: number;
  
  /**
   * Default options for cache operations
   */
  defaultOptions?: CacheOptions;
  
  /**
   * Whether to throw errors or suppress them
   */
  throwOnErrors?: boolean;
  
  /**
   * Whether to enable background refresh
   */
  backgroundRefresh?: boolean;
  
  /**
   * Default refresh threshold (0-1)
   */
  refreshThreshold?: number;
  
  /**
   * Whether to deduplicate in-flight requests
   */
  deduplicateRequests?: boolean;
  
  /**
   * Whether to enable logging
   */
  logging?: boolean;
  
  /**
   * Whether to include stack traces in logs
   */
  logStackTraces?: boolean;
  
  /**
   * Custom logger function
   */
  logger?: (logEntry: any) => void;
  
  /**
   * Monitoring configuration
   */
  monitoring?: BaseMonitoringConfig;
  
  /**
   * Serialization configuration
   */
  serialization?: SerializationConfig;
  
  /**
   * Rate limiting configuration
   */
  rateLimit?: RateLimitConfig;
  
  /**
   * Circuit breaker configuration
   */
  circuitBreaker?: CircuitBreakerConfig;
  
  /**
   * Compression configuration
   */
  compression?: CompressionConfig;
  
  /**
   * Name of default provider to use
   */
  defaultProvider?: string;
  
  /**
   * Statistics collection interval in seconds
   */
  statsInterval?: number;
}

/**
 * Configuration for a cache provider
 */
export interface ProviderConfig {
  /**
   * Name/identifier for this provider
   */
  name: string;
  
  /**
   * The provider instance
   */
  instance: ICacheProvider;
  
  /**
   * Priority (lower = faster/first checked)
   */
  priority?: number;
  
  /**
   * Provider-specific options
   */
  options?: any;
}

/**
 * Configuration for monitoring
 */
export interface MonitoringConfig {
  /**
   * Whether to enable monitoring
   */
  enabled?: boolean;
  
  /**
   * Metrics collection interval in milliseconds
   */
  interval?: number;
  
  /**
   * Whether to track detailed metrics
   */
  detailedMetrics?: boolean;
  
  /**
   * Maximum number of events to keep in history
   */
  maxEventHistory?: number;
  
  /**
   * Custom metrics reporter
   */
  reporter?: (metrics: any) => void;
}

/**
 * Configuration for serialization
 */
export interface SerializationConfig {
  /**
   * Custom serializer function
   */
  serialize?: (value: any) => string;
  
  /**
   * Custom deserializer function
   */
  deserialize?: (data: string) => any;
  
  /**
   * Type handlers for special types
   */
  typeHandlers?: Record<string, {
    serialize: (value: any) => any;
    deserialize: (data: any) => any;
  }>;
}

/**
 * Configuration for rate limiting
 */
export interface RateLimitConfig {
  /**
   * Whether to enable rate limiting
   */
  enabled?: boolean;
  
  /**
   * Maximum number of operations per interval
   */
  limit?: number;
  
  /**
   * Time interval in milliseconds
   */
  interval?: number;
  
  /**
   * Whether to queue or reject operations that exceed the limit
   */
  queueExceeding?: boolean;
  
  /**
   * Maximum queue size
   */
  maxQueueSize?: number;
  
  /**
   * Time window in milliseconds
   */
  window?: number;
  
  /**
   * Whether to throw error when limit is exceeded
   */
  throwOnLimit?: boolean;
  
  /**
   * Maximum wait time in milliseconds
   */
  maxWaitTime?: number;
}

/**
 * Configuration for circuit breaker
 */
export interface CircuitBreakerConfig {
  /**
   * Whether to enable circuit breaker
   */
  enabled?: boolean;
  
  /**
   * Failure threshold to trip the circuit
   */
  failureThreshold?: number;
  
  /**
   * Reset timeout in milliseconds
   */
  resetTimeout?: number;
  
  /**
   * Whether to fallback to next provider when circuit is open
   */
  fallbackToNextProvider?: boolean;
}

/**
 * Configuration for compression
 */
export interface CompressionConfig {
  /**
   * Whether to enable compression
   */
  enabled?: boolean;
  
  /**
   * Minimum size in bytes for compression to be applied
   */
  threshold?: number;
  
  /**
   * Compression level (1-9, where 9 is maximum compression)
   */
  level?: number;
  
  /**
   * Compression algorithm
   */
  algorithm?: 'gzip' | 'deflate' | 'brotli';
}

/**
 * Serialization options
 */
export interface SerializationOptions {
  /**
   * Format to use for serialization
   */
  format?: 'json' | 'msgpack' | 'cbor' | 'none';
  
  /**
   * Whether to compress serialized data
   */
  compression?: boolean;
  
  /**
   * Minimum size in bytes for compression
   */
  compressionThreshold?: number;
  
  /**
   * Compression algorithm
   */
  compressionAlgorithm?: string;
}