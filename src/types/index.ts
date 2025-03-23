/**
   * @fileoverview Core type definitions for the cache module
   * @module @fourjs/cache
   */

  /**
   * Cache operation options
   * @interface CacheOptions
   */
  export interface CacheOptions {
    /** Time-to-live in seconds */
    ttl?: number;

    /** Tags for grouping and invalidation */
    tags?: string[];

    /** Whether to refresh in background when stale */
    backgroundRefresh?: boolean;

    /** Threshold (0-1) of TTL after which to refresh */
    refreshThreshold?: number;

    /** Whether to enable compression */
    compression?: boolean;

    /** Minimum size in bytes for compression */
    compressionThreshold?: number;

    /** Custom serializer/deserializer */
    serializer?: {
      serialize: (data: any) => string;
      deserialize: (str: string) => any;
    };

    /** Additional provider-specific options */
    [key: string]: any;
  }

  /**
   * Cache statistics interface
   * @interface CacheStats
   */
  export interface CacheStats {
    /** Total size in bytes */
    size: number;

    /** Number of cache hits */
    hits: number;

    /** Number of cache misses */
    misses: number;

    /** Number of keys in the cache */
    keyCount: number;

    /** Memory usage in bytes (if applicable) */
    memoryUsage: number;

    /** When the stats were last updated */
    lastUpdated: Date;

    /** Optional list of keys */
    keys?: string[];

    /** Any error message if stats collection failed */
    error?: string;

    /** Additional provider-specific stats */
    [key: string]: any;
  }

  /**
   * Metadata for cache entries
   * @interface EntryMetadata
   */
  export interface EntryMetadata {
    /** When the entry was first created */
    createdAt: Date;

    /** When the entry was last updated */
    updatedAt: Date;

    /** Number of times the entry has been accessed */
    accessCount: number;

    /** Tags associated with this entry */
    tags: string[];

    /** Time taken to compute the value (if applicable) */
    computeTime?: number;

    /** When the entry was last refreshed */
    refreshedAt?: Date;

    /** Custom metadata */
    [key: string]: any;
  }

  /**
   * Provider configuration interface
   * @interface ProviderConfig
   */
  export interface ProviderConfig {
    /** Unique name for this provider */
    name: string;

    /** Priority order (lower numbers are checked first) */
    priority?: number;

    /** Provider-specific options */
    options?: Record<string, any>;
  }

  /**
   * Cache configuration interface
   * @interface CacheConfig
   */
  export interface CacheConfig {
    /** Default TTL in seconds */
    defaultTtl?: number;

    /** Default cache options */
    defaultOptions?: CacheOptions;

    /** Whether to deduplicate in-flight requests */
    deduplicateRequests?: boolean;

    /** Whether to enable background refresh */
    backgroundRefresh?: boolean;

    /** Threshold for background refresh (0-1) */
    refreshThreshold?: number;

    /** Whether to throw errors or suppress them */
    throwOnErrors?: boolean;

    /** Whether to enable logging */
    logging?: boolean;

    /** Whether to include stack traces in logs */
    logStackTraces?: boolean;

    /** Custom logger function */
    logger?: (logEntry: any) => void;

    /** Monitoring configuration */
    monitoring?: {
      /** Whether to enable monitoring */
      enabled: boolean;
      /** Stats collection interval in milliseconds */
      interval: number;
      /** Maximum events to track */
      maxEvents: number;
    };
  }

  /**
   * Cache operation result interface
   * @interface CacheResult
   */
  export interface CacheResult<T> {
    /** Operation result data */
    data: T | null;
    /** Operation error if any */
    error: Error | null;
    /** Whether the data is stale */
    isStale: boolean;
    /** Operation metrics */
    metrics?: {
      /** Operation duration in milliseconds */
      duration: number;
      /** Whether it was a cache hit */
      cacheHit: boolean;
      /** Size of the data in bytes */
      size?: number;
    };
  }

  /**
   * Cache event payload interface
   * @interface CacheEventPayload
   */
  export interface CacheEventPayload {
    /** Event type */
    type: string;
    /** Cache key */
    key?: string;
    /** Operation duration */
    duration?: number;
    /** Error if any */
    error?: Error;
    /** Additional event data */
    data?: any;
    /** Event timestamp */
    timestamp: number;
  }

  /**
   * Storage adapter configuration
   * @interface StorageConfig
   */
  export interface StorageConfig {
    /** Key prefix for namespacing */
    prefix?: string;
    /** Default TTL in seconds */
    defaultTtl?: number;
    /** Maximum size in bytes */
    maxSize?: number;
    /** Custom serializer */
    serializer?: {
      serialize: (data: any) => string;
      deserialize: (data: string) => any;
    };
  }