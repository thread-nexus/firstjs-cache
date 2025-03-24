import { CacheOperationContext as BaseOperationContext } from '../utils/validation-utils';

/**
 * Cache metrics for performance monitoring
 */
export interface CacheMetrics {
  /**
   * Total number of operations
   */
  operations: number;

  /**
   * Average operation latency in milliseconds
   */
  averageLatency: number;
  /**
   * Maximum operation latency in milliseconds
   */
  maxLatency: number;
  /**
   * Error rate (0-1)
   */
  errorRate: number;
  /**
   * Hit rate (0-1)
   */
  hitRate: number;
  /**
   * Throughput in operations per second
   */
  throughput: number;
  /**
   * Memory usage in bytes
   */
  memoryUsage: number;
}
/**
 * Security options for cache
 */
export interface SecurityOptions {
  /**
   * Enable encryption for sensitive data
   */
  encryption: boolean;
  /**
   * Encryption key or key identifier
   */
  encryptionKey?: string;
  /**
   * Enable data signing
   */
  signing: boolean;
  /**
   * Signing key or key identifier
   */
  signingKey?: string;
  /**
   * Access control list
   */
  acl?: {
    /**
     * Allowed operations
     */
    allowedOperations: string[];
    /**
     * Restricted keys pattern
     */
    restrictedKeys?: string[];
  };
}
/**
 * Latency statistics
 */
export interface LatencyStats {
  /**
   * Average latency
   */
  avg: number;
  /**
   * Minimum latency
   */
  min: number;
  /**
   * Maximum latency
   */
  max: number;
  /**
   * Count of measurements
   */
  count: number;
}
/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /**
   * Enable performance monitoring
   */
  enabled: boolean;
  /**
   * Sampling rate (0-1)
   */
  samplingRate: number;
  /**
   * Metrics collection interval in milliseconds
   */
  interval: number;
  /**
   * Maximum number of events to keep in history
   */
  historySize: number;
  /**
   * Metrics to collect
   */
  metrics: string[];
  /**
   * Alert thresholds
   */
  alertThresholds: {
    /**
     * Latency threshold in milliseconds
     */
    latency: number;
    /**
     * Error rate threshold (0-100)
     */
    errorRate: number;
    /**
     * CPU usage threshold (percentage)
     */
    cpuUsage?: number;
    /**
     * Memory usage threshold (bytes)
     */
    memoryUsage?: number;
    /**
     * Maximum allowed connections
     */
    connections?: number;
  };
  /**
   * Resource monitoring options
   */
  resourceMonitoring?: {
    /**
     * Enable CPU monitoring
     */
    cpu: boolean;
    /**
     * Enable memory monitoring
     */
    memory: boolean;
    /**
     * Enable network monitoring
     */
    network: boolean;
  };
}

/**
 * Resource usage metrics
 */
export interface ResourceUsage {
  /**
   * Memory usage in bytes
   */
  memory: number;
  /**
   * CPU usage percentage (0-100)
   */
  cpu: number;
  /**
   * Active connection count
   */
  connections: number;
  /**
   * Network bandwidth usage in bytes/sec
   */
  network?: number;
  /**
   * Disk I/O usage in bytes/sec
   */
  disk?: number;
}

/**
 * Health metrics with resource usage information
 */
export interface HealthMetrics {
  /**
   * Overall health status
   */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /**
   * Error rate percentage (0-100)
   */
  errorRate: number;
  /**
   * Average latency in milliseconds
   */
  latency: number;
  /**
   * Resource utilization percentage (0-100)
   */
  utilization: number;
  /**
   * Detailed resource usage metrics
   */
  resourceUsage?: ResourceUsage;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  hits: number;
  misses: number;
  error?: boolean;
  size?: number;
  duration?: number;
  latency: LatencyStats;
  memoryUsage: number; // Make this non-optional
  success: boolean;
  timestamp: number;
  operationCount?: number;
  errorCount?: number;
  cpuUsage?: number;
  networkTransfer?: number;
}

export interface CacheErrorInfo {
  code: string;
  message: string;
  operation?: string;
  key?: string;
}

/**
 * Cache options
 */
export interface CacheOptions {
  /**
   * Time-to-live in seconds
   */
  ttl?: number;
  /**
   * Tags associated with the cache entry
   */
  tags?: string[];
  /**
   * Enable compression
   */
  compression?: boolean;
  /**
   * Compression threshold in bytes
   */
  compressionThreshold?: number;
  /**
   * Enable background refresh
   */
  background?: boolean;
  /**
   * Maximum size in bytes
   */
  maxSize?: number;
  /**
   * Maximum number of items
   */
  maxItems?: number;
  /**
   * Compression level (0-9)
   */
  compressionLevel?: number;
  /**
   * Refresh threshold (0-1)
   */
  refreshThreshold?: number;
  /**
   * Stats collection interval in milliseconds
   */
  statsInterval?: number;
  /**
   * Providers to use
   */
  providers?: string[];
  /**
   * Default provider
   */
  defaultProvider?: string;
  /**
   * Enable background refresh
   */
  backgroundRefresh?: boolean;
  /**
   * Operation name
   */
  operation?: string;
  computeTime?: number;
  maxRetries?: number;
  compressed?: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /**
   * Total number of cache hits
   */
  hits: number;
  /**
   * Total number of cache misses
   */
  misses: number;
  /**
   * Total size of cache entries in bytes
   */
  size: number;
  /**
   * Memory usage in bytes
   */
  memoryUsage: number; // Make this non-optional to solve the inconsistency
  /**
   * Last updated timestamp
   */
  lastUpdated: number;
  /**
   * Total number of cache entries
   */
  keyCount: number;
  /**
   * Cache hit ratio
   */
  hitRatio?: number;
  /**
   * Total number of cache entries
   */
  entries: number;
  /**
   * Average time-to-live for cache entries in seconds
   */
  avgTtl: number;
  /**
   * Maximum time-to-live for cache entries in seconds
   */
  maxTtl: number;
  /**
   * Timestamp
   */
  timestamp?: number;
  /**
   * Error count
   */
  errors?: number;
}

/**
 * Entry metadata
 */
export interface EntryMetadata {
  /**
   * Tags associated with the entry
   */
  tags: string[];
  /**
   * Creation timestamp
   */
  createdAt: number;
  /**
   * Expiration timestamp
   */
  expiresAt?: number;
  /**
   * Size of the entry in bytes
   */
  size: number;
  /**
   * Whether the entry is compressed
   */
  compressed?: boolean;
  /**
   * Last accessed timestamp
   */
  lastAccessed: number;
  /**
   * Last updated timestamp
   */
  updatedAt?: number;
  /**
   * Access count
   */
  accessCount: number;
  /** Compute time in ms */
  computeTime?: number;
}

/**
 * Cache operation context
 */
export type CacheOperationContext = BaseOperationContext;

/**
 * Cache key generator type
 */
export type CacheKeyGenerator<P extends any[] = any[]> = 
  (...args: P) => string;

/**
 * Cache function wrapper type
 */
export type CacheFunctionWrapper<T extends (...args: any[]) => Promise<any>> = 
  T & { 
    invalidateCache: (...args: Parameters<T>) => Promise<void> 
  };

/**
 * Cache provider type
 */
export type CacheProvider = {
  name: string;
  priority: number;
  status: 'active' | 'inactive';
  errorCount: number;
};

/**
 * Use cache query options type
 */
export type UseCacheQueryOptions<T> = CacheOptions & {
  backgroundRefresh?: boolean;
  staleWhileRevalidate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

export interface CompressionOptions {
  algorithm: CompressionAlgorithm;
  threshold?: number;
  level?: number;
}

export type CompressionAlgorithm = 'gzip' | 'deflate' | 'brotli' | 'none';

/**
 * Health status information for a cache provider or component
 */
export interface HealthStatus {
  /** Status string */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Boolean indicating if the component is healthy */
  healthy: boolean;
  /** Optional timestamp of health check */
  timestamp?: number;
  /** Optional details about health status */
  details?: Record<string, any>;
  /** Optional error information */
  error?: string;
}

/**
 * Compression result
 */
export interface CompressionResult {
  /**
   * Compressed data
   */
  data: Buffer;
  /**
   * Whether the data is compressed
   */
  compressed: boolean;
  /**
   * Compression algorithm
   */
  algorithm?: CompressionAlgorithm;
  /**
   * Compressed size in bytes
   */
  size?: number;
  /**
   * Original size in bytes - add this property
   */
  originalSize?: number;
  /**
   * Compression ratio - add this property
   */
  compressionRatio?: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  window: number; // Time window in milliseconds
  operation?: string;
}

/**
 * Cache event payload
 */
export interface CacheEventPayload {
  /**
   * Event type
   */
  type: string;
  
  /**
   * Event timestamp
   */
  timestamp: number;
  
  /**
   * Cache key
   */
  key?: string;
  
  /**
   * Operation duration in milliseconds
   */
  duration?: number;
  
  /**
   * Data size in bytes
   */
  size?: number;
  
  /**
   * Error if any
   */
  error?: Error;

  /**
   * Provider name
   */
  provider?: string;
  
  /**
   * Whether the operation was successful
   */
  success?: boolean;
  
  /**
   * Value (for debugging)
   */
  value?: any;
  
  /**
   * Tags associated with the cache entry
   */
  tags?: string[];
  
  /**
   * TTL in seconds
   */
  ttl?: number;
  
  /**
   * Reason for eviction/operation
   */
  reason?: string;
  
  /**
   * Host information for remote providers
   */
  host?: string;
  
  /**
   * Age of entry in milliseconds
   */
  age?: number;
  
  /**
   * Number of keys cleared
   */
  clearedKeys?: number;
  
  /**
   * Number of fields updated
   */
  fieldsUpdated?: string[];
  
  /**
   * Number of items appended
   */
  itemsAppended?: number;
  
  /**
   * Number of items removed
   */
  itemsRemoved?: number;
  
  /**
   * Increment value
   */
  increment?: number;
  
  /**
   * Set operation flag
   */
  set?: boolean;
  
  /**
   * Result size
   */
  resultSize?: number;
  
  /**
   * Query count
   */
  queryCount?: number;
  
  /**
   * Compute time in milliseconds
   */
  computeTime?: number;
  
  /**
   * Compute status
   */
  computeStatus?: string;
  
  /**
   * Number of keys invalidated
   */
  keysInvalidated?: number;
  
  /**
   * Additional properties
   */
  [key: string]: any;
}