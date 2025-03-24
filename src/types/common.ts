/**
 * Common types for the cache system
 */

/**
 * Cache options for operations
 */
export interface CacheOptions {
    /**
     * Time-to-live in seconds
     */
    ttl?: number;

    /**
     * Tags for grouping and invalidation
     */
    tags?: string[];

    /**
     * Whether to refresh in background when stale
     */
    backgroundRefresh?: boolean;

    /**
     * Threshold (0-1) of TTL after which to refresh
     */
    refreshThreshold?: number;

    /**
     * Time taken to compute the value, for metrics
     */
    computeTime?: number;

    /**
     * When the value was last refreshed
     */
    refreshedAt?: Date;

    /**
     * Whether to compress the value
     */
    compression?: boolean;

    /**
     * Compression threshold in bytes
     */
    compressionThreshold?: number;

    /**
     * Provider to use (optional)
     */
    provider?: string;

    /**
     * Whether to throw errors
     */
    throwOnError?: boolean;

    /**
     * Additional options passed to providers
     */
    [key: string]: any;
}

/**
 * Cache statistics
 */
export interface CacheStats {
    /**
     * Total size in bytes (if applicable)
     */
    size?: number;

    /**
     * Cache hit count
     */
    hits: number;

    /**
     * Cache miss count
     */
    misses: number;

    /**
     * Number of keys in cache
     */
    keyCount: number;

    /**
     * Memory usage in bytes (if applicable)
     */
    memoryUsage?: number;

    /**
     * When stats were last updated
     */
    lastUpdated: Date | number;

    /**
     * Optional list of keys
     */
    keys?: string[];

    /**
     * Any error message if stats collection failed
     */
    error?: string;

    /**
     * Additional provider-specific stats
     */
    [key: string]: any;
}

/**
 * Entry metadata
 */
export interface EntryMetadata {
    /**
     * When the entry was first created
     */
    createdAt: number | Date;

    /**
     * When the entry was last updated
     */
    updatedAt?: number | Date;

    /**
     * Number of times the entry has been accessed
     */
    accessCount: number;

    /**
     * Tags associated with this entry
     */
    tags: string[];

    /**
     * Time taken to compute the value (if applicable)
     */
    computeTime?: number;

    /**
     * When the entry was last refreshed
     */
    refreshedAt?: number | Date;

    /**
     * When the entry expires
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
     * When the entry was last accessed
     */
    lastAccessed?: number | Date;

    /**
     * Custom metadata
     */
    [key: string]: any;
}

/**
 * Cache event payload
 */
export interface CacheEventPayload {
    /**
     * Event type
     */
    type?: string;

    /**
     * Cache key
     */
    key?: string;

    /**
     * Multiple cache keys
     */
    keys?: string[];

    /**
     * Cache tag
     */
    tag?: string;

    /**
     * Cache layer
     */
    layer?: string;

    /**
     * Time-to-live in seconds
     */
    ttl?: number;

    /**
     * Tags for the cache entry
     */
    tags?: string[];

    /**
     * Error object
     */
    error?: any;

    /**
     * Message
     */
    message?: string;

    /**
     * Operation duration in milliseconds
     */
    duration?: number;

    /**
     * Provider name
     */
    provider?: string;

    /**
     * Cache statistics
     */
    stats?: any;

    /**
     * Source cache layer
     */
    fromLayer?: string;

    /**
     * Destination cache layer
     */
    toLayer?: string;

    /**
     * Event timestamp
     */
    timestamp?: number;

    /**
     * Metadata
     */
    metadata?: any;

    /**
     * Number of entries removed during invalidation
     */
    entriesRemoved?: number;

    /**
     * Cache prefix
     */
    prefix?: string;

    /**
     * Count of items
     */
    count?: number;

    /**
     * Additional properties
     */
    [key: string]: any;
}

/**
 * Performance metrics for cache operations
 */
export interface PerformanceMetrics {
    /**
     * Time taken to complete the operation in milliseconds
     */
    duration: number;

    /**
     * Size of the data in bytes
     */
    size: number;

    /**
     * Whether compression was used
     */
    compressed: boolean;

    /**
     * Original size before compression (if applicable)
     */
    originalSize?: number;

    /**
     * Time spent on serialization
     */
    serializationTime?: number;

    /**
     * Time spent on compression
     */
    compressionTime?: number;

    /**
     * Network latency (for remote providers)
     */
    networkLatency?: number;

    /**
     * Error count
     */
    errorCount: number;

    /**
     * CPU usage percentage
     */
    cpuUsage?: number;

    /**
     * Latency statistics
     */
    latency: LatencyStats;
}

/**
 * Health status for cache providers
 */
export interface HealthStatus {
    /**
     * Whether the provider is healthy
     */
    healthy: boolean;

    /**
     * Status message
     */
    message?: string;

    /**
     * Last check time
     */
    lastCheck?: Date;

    /**
     * Status code
     */
    status: 'healthy' | 'degraded' | 'unhealthy';

    /**
     * Timestamp of the health check
     */
    timestamp?: number;

    /**
     * Detailed information about the health check
     */
    details?: Record<string, any>;

    /**
     * Error information if unhealthy
     */
    error?: string;
}

/**
 * Cache operation context
 */
export interface CacheOperationContext {
    /**
     * Operation name
     */
    operation: string;

    /**
     * Cache key
     */
    key?: string;

    /**
     * Multiple cache keys
     */
    keys?: string[];

    /**
     * Cache tag
     */
    tag?: string;

    /**
     * Cache prefix
     */
    prefix?: string;

    /**
     * Cache entries
     */
    entries?: Record<string, any>;

    /**
     * Error count
     */
    errorCount?: number;

    /**
     * Additional context
     */
    [key: string]: any;
}

/**
 * Cache provider interface
 */
export interface CacheProvider {
    /**
     * Provider name
     */
    name: string;

    /**
     * Get a value from cache
     */
    get: (key: string) => Promise<any>;

    /**
     * Set a value in cache
     */
    set: (key: string, value: any, options?: CacheOptions) => Promise<void>;

    /**
     * Delete a value from cache
     */
    delete: (key: string) => Promise<boolean>;

    /**
     * Clear all values
     */
    clear: () => Promise<void>;

    /**
     * Get cache statistics
     */
    getStats?: () => Promise<CacheStats>;

    /**
     * Invalidate all entries with a given tag
     */
    invalidateByTag?: (tag: string) => Promise<void>;
}

/**
 * Options for useCache hook
 */
export interface UseCacheQueryOptions<T = any> {
    /**
     * Cache key
     */
    key: string;

    /**
     * Function to fetch data
     */
    fetcher: () => Promise<T>;

    /**
     * Cache options
     */
    options?: CacheOptions;

    /**
     * Whether to auto-fetch data
     */
    autoFetch?: boolean;

    /**
     * Stale time in milliseconds
     */
    staleTime?: number;

    /**
     * Retry count
     */
    retryCount?: number;

    /**
     * Retry delay in milliseconds
     */
    retryDelay?: number;

    /**
     * Callback on success
     */
    onSuccess?: (data: T) => void;

    /**
     * Callback on error
     */
    onError?: (error: Error) => void;
}

/**
 * Compression result
 */
export interface CompressionResult {
    /**
     * Compressed data
     */
    data: string | Uint8Array;

    /**
     * Original size in bytes
     */
    originalSize: number;

    /**
     * Compressed size in bytes
     */
    compressedSize: number;

    /**
     * Compression ratio
     */
    ratio: number;

    /**
     * Compression algorithm used
     */
    algorithm: CompressionAlgorithm;

    /**
     * Time taken to compress in milliseconds
     */
    compressionTime: number;

    /**
     * Whether the data is compressed
     */
    compressed: boolean;

    /**
     * Size of the compressed data in bytes
     */
    size?: number;
}

/**
 * Compression algorithm
 */
export type CompressionAlgorithm = 'gzip' | 'deflate' | 'brotli' | 'lz4' | 'none';

/**
 * Compression options
 */
export interface CompressionOptions {
    /**
     * Compression algorithm
     */
    algorithm?: CompressionAlgorithm;

    /**
     * Compression level (1-9)
     */
    level?: number;

    /**
     * Minimum size to compress in bytes
     */
    threshold?: number;

    /**
     * Whether to enable compression
     */
    enabled?: boolean;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
    /**
     * Whether to enable monitoring
     */
    enabled: boolean;

    /**
     * Sampling rate (0-1)
     */
    samplingRate?: number;

    /**
     * Whether to track detailed metrics
     */
    detailedMetrics?: boolean;

    /**
     * Metrics reporting interval in seconds
     */
    reportingInterval?: number;

    /**
     * Custom metrics reporter
     */
    reporter?: (metrics: any) => void;
}

/**
 * Security options
 */
export interface SecurityOptions {
    /**
     * Whether to encrypt values
     */
    encrypt?: boolean;

    /**
     * Encryption key
     */
    encryptionKey?: string;

    /**
     * Whether to sign values
     */
    sign?: boolean;

    /**
     * Signing key
     */
    signingKey?: string;

    /**
     * Whether to sanitize keys
     */
    sanitizeKeys?: boolean;
}

/**
 * Latency statistics
 */
export interface LatencyStats {
    /**
     * Average latency in milliseconds
     */
    avg: number;

    /**
     * Minimum latency in milliseconds
     */
    min: number;

    /**
     * Maximum latency in milliseconds
     */
    max: number;

    /**
     * 95th percentile latency in milliseconds
     */
    p95: number;

    /**
     * 99th percentile latency in milliseconds
     */
    p99: number;

    /**
     * Sample count
     */
    samples: number;
}

/**
 * Cache metrics
 */
export interface CacheMetrics {
    /**
     * Hit rate (0-1)
     */
    hitRate: number;

    /**
     * Hit count
     */
    hits: number;

    /**
     * Miss count
     */
    misses: number;

    /**
     * Error count
     */
    errors: number;

    /**
     * Average latency in milliseconds
     */
    avgLatency: number;

    /**
     * Memory usage in bytes
     */
    memoryUsage: number;

    /**
     * Number of keys
     */
    keyCount: number;

    /**
     * Operation count
     */
    operationCount: number;

    /**
     * Throughput (operations per second)
     */
    throughput: number;

    /**
     * Error rate (0-1)
     */
    errorRate: number;

    /**
     * Maximum latency in milliseconds
     */
    maxLatency: number;

    /**
     * Average latency in milliseconds (alias for avgLatency)
     */
    averageLatency: number;

    /**
     * Number of operations
     */
    operations: number;
}

/**
 * Cache error information
 */
export interface CacheErrorInfo {
    /**
     * Error message
     */
    message: string;

    /**
     * Error code
     */
    code: string;

    /**
     * Error stack
     */
    stack?: string;

    /**
     * Error context
     */
    context?: Record<string, any>;

    /**
     * Error timestamp
     */
    timestamp: number;
}

/**
 * Cache key generator function
 */
export type CacheKeyGenerator = (...args: any[]) => string;

/**
 * Cache function wrapper
 */
export type CacheFunctionWrapper = <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator?: (...args: any[]) => string,
    options?: CacheOptions
) => T;

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
    /**
     * Maximum requests per window
     */
    limit: number;

    /**
     * Window duration in milliseconds
     */
    window: number;

    /**
     * Whether to throw on rate limit exceeded
     */
    throwOnLimit?: boolean;

    /**
     * Whether to queue requests when rate limited
     */
    queueExceeding?: boolean;

    /**
     * Maximum queue size
     */
    maxQueueSize?: number;

    /**
     * Maximum wait time in queue in milliseconds
     */
    maxWaitTime?: number;
}