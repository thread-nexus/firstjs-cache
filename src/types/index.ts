/**
 * @fileoverview Common type definitions for the cache module
 * 
 * This module provides the central type definitions used throughout the caching system,
 * including options, statistics, and metadata structures.
 * 
 * @module types
 */

// Re-export all type definitions
export * from './cache-types';
export * from './config-types';
export * from './metadata-types';
export * from './health-types';
// Explicit re-export to avoid name conflict
export {
  MonitoringConfig,
  LatencyStats,
  CacheMetrics
} from './monitoring-types';
export * from './cache-events';
export * from './compression-types';

// Also re-export operation types
export * from '../constants/cache-operations';

/**
 * Options for cache operations
 * 
 * @interface CacheOptions
 */
export interface CacheOptions {
  /**
   * Time-to-live in seconds
   * Determines how long the cache entry remains valid
   */
  ttl?: number;
  
  /**
   * List of tags for categorizing and bulk invalidation
   * Tags can be used to invalidate multiple related entries at once
   */
  tags?: string[];
  
  /**
   * Whether to compress the value before storage
   * Reduces storage size at the cost of CPU time
   */
  compression?: boolean;
  
  /**
   * Priority for cache retention policies
   * Higher values are less likely to be evicted when cache is full
   */
  priority?: number;
  
  /**
   * Whether to refresh the entry in the background when it becomes stale
   * Enables stale-while-revalidate behavior
   */
  backgroundRefresh?: boolean;
  
  /**
   * Threshold (as a fraction of TTL) at which an entry is considered stale
   * A value of 0.75 means the entry becomes stale after 75% of its TTL
   */
  refreshThreshold?: number;
  
  /**
   * Custom serialization options for the value
   * Controls how the value is converted to a storable format
   */
  serialization?: {
    /**
     * Custom serialization function name
     */
    serializer?: string;
    
    /**
     * Custom deserialization function name
     */
    deserializer?: string;
  };
  
  /**
   * Whether to update the entry's TTL on access
   * Sliding expiration behavior
   */
  updateTtlOnAccess?: boolean;
  
  /**
   * Maximum wait time for operation in milliseconds
   * After this time, the operation will fail
   */
  timeout?: number;
  
  /**
   * Timestamp when the entry was last refreshed
   * Used for staleness calculations
   * @internal
   */
  refreshedAt?: number;
  
  /**
   * Additional metadata to store with the entry
   * Used for custom behaviors and diagnostics
   */
  metadata?: Record<string, any>;
  
  /**
   * Whether to throw on errors
   * If false, operations fail silently
   */
  throwOnError?: boolean;
}

/**
 * Cache entry metadata
 * 
 * @interface EntryMetadata
 */
export interface EntryMetadata {
  /**
   * Time when the entry was created
   */
  createdAt: number;
  
  /**
   * Time when the entry was last accessed
   */
  lastAccessed: number;
  
  /**
   * Size of the entry value in bytes
   */
  size: number;
  
  /**
   * Tags associated with this entry for bulk operations
   */
  tags?: string[];
  
  /**
   * Number of times the entry has been accessed
   */
  accessCount: number;
  
  /**
   * Time when the entry expires
   */
  expiresAt?: number;
  
  /**
   * Whether the entry is currently stale
   */
  isStale?: boolean;
  
  /**
   * Optional user-defined metadata
   */
  [key: string]: any;
}

/**
 * Cache statistics
 * 
 * @interface CacheStats
 */
export interface CacheStats {
  /**
   * Number of cache hits
   */
  hits: number;
  
  /**
   * Number of cache misses
   */
  misses: number;
  
  /**
   * Total size of cached data in bytes
   */
  size: number;
  
  /**
   * Number of keys in the cache
   */
  keyCount: number;
  
  /**
   * Memory usage of the cache in bytes
   */
  memoryUsage: number;
  
  /**
   * Time when stats were last updated
   */
  lastUpdated: number;
  
  /**
   * Optional list of cache keys
   */
  keys?: string[];
  
  /**
   * Optional error message if stats collection failed
   */
  error?: string;
}

/**
 * Log level enumeration
 * 
 * @enum {string}
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Health status of a cache component
 * 
 * @interface HealthStatus
 */
export interface HealthStatus {
  /**
   * Current status: healthy, degraded, or unhealthy
   */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /**
   * Whether the component is considered healthy
   */
  healthy: boolean;
  
  /**
   * Time when the health check was performed
   */
  timestamp: number;
  
  /**
   * Time of the last health check
   */
  lastCheck: number;
  
  /**
   * Optional error message if unhealthy
   */
  error?: string;
  
  /**
   * Optional detailed health information
   */
  details?: Record<string, any>;
}

/**
 * Cache provider configuration
 * 
 * @interface ProviderConfig
 */
export interface ProviderConfig {
  /**
   * Provider type identifier
   */
  type: string;
  
  /**
   * Provider-specific options
   */
  options: Record<string, any>;
  
  /**
   * Provider priority (lower is higher priority)
   */
  priority?: number;
  
  /**
   * Whether the provider is enabled
   */
  enabled?: boolean;
}

/**
 * Cache layer configuration
 * 
 * @interface CacheLayerConfig
 */
export interface CacheLayerConfig {
  /**
   * Layer name for identification
   */
  name: string;
  
  /**
   * Providers in this layer
   */
  providers: ProviderConfig[];
  
  /**
   * Default TTL for this layer
   */
  defaultTtl?: number;
  
  /**
   * Whether this layer is enabled
   */
  enabled?: boolean;
}

export class CacheOperationContext {
}