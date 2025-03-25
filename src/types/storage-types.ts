/**
 * @fileoverview Storage adapter types for the cache system
 */

/**
 * Storage adapter configuration
 */
export interface StorageAdapterConfig {
  /**
   * Key prefix
   */
  prefix?: string;
  
  /**
   * Default TTL in seconds
   */
  defaultTtl?: number;
  
  /**
   * Serializer for converting objects to strings and back
   */
  serializer?: {
    /**
     * Function to convert an object to a string
     */
    serialize: (data: any) => string;
    
    /**
     * Function to convert a string back to an object
     */
    deserialize: (data: string) => any;
  };
  
  /**
   * Name for this storage adapter
   */
  name?: string;
  
  /**
   * Whether to log operations
   */
  logging?: boolean;
  
  /**
   * Custom logger function
   */
  logger?: (message: string, level: string, context?: any) => void;
}

/**
 * Memory storage options
 */
export interface MemoryStorageOptions extends StorageAdapterConfig {
  /**
   * Maximum cache size in bytes
   */
  maxSize?: number;
  
  /**
   * Maximum number of items
   */
  maxItems?: number;
  
  /**
   * Whether to update item age on get
   */
  updateAgeOnGet?: boolean;
  
  /**
   * Whether to return stale items
   */
  allowStale?: boolean;
  
  /**
   * Maximum number of eviction attempts
   */
  maxEvictionAttempts?: number;
  
  /**
   * Eviction policy
   */
  evictionPolicy?: 'lru' | 'lfu' | 'fifo' | 'random';
  
  /**
   * Cleanup interval in seconds
   */
  cleanupInterval?: number;
}

/**
 * Local storage options
 */
export interface LocalStorageOptions extends StorageAdapterConfig {
  /**
   * Maximum size in bytes
   */
  maxSize?: number;
  
  /**
   * Whether to compress values
   */
  compression?: boolean;
  
  /**
   * Minimum size in bytes for compression
   */
  compressionThreshold?: number;
  
  /**
   * Cleanup interval in seconds
   */
  cleanupInterval?: number;
}

/**
 * Redis storage options
 */
export interface RedisStorageOptions extends StorageAdapterConfig {
  /**
   * Redis connection options
   */
  redis: {
    /**
     * Redis host
     */
    host: string;
    
    /**
     * Redis port
     */
    port: number;
    
    /**
     * Redis password
     */
    password?: string;
    
    /**
     * Redis database number
     */
    db?: number;
    
    /**
     * Maximum connection retries
     */
    maxRetries?: number;
    
    /**
     * Connection timeout in milliseconds
     */
    connectTimeout?: number;
    
    /**
     * Command timeout in milliseconds
     */
    commandTimeout?: number;
    
    /**
     * Whether to enable TLS
     */
    tls?: boolean;
    
    /**
     * Whether to enable keep-alive
     */
    keepAlive?: boolean;
    
    /**
     * Family (IPv4/IPv6)
     */
    family?: number;
  };
  
  /**
   * Whether to use cluster mode
   */
  cluster?: boolean;
  
  /**
   * Whether to enable key scanning
   */
  enableKeyScanning?: boolean;
  
  /**
   * Scan count for Redis SCAN command
   */
  scanCount?: number;
}

/**
 * Cache entry in storage adapter
 */
export interface CacheEntry<T> {
  /**
   * The cached value
   */
  value: T;
  
  /**
   * When the entry expires (timestamp)
   */
  expiresAt: number | null;
  
  /**
   * Tags associated with the entry
   */
  tags: string[];
  
  /**
   * When the entry was created
   */
  createdAt: number;
  
  /**
   * Size of the entry in bytes
   */
  size?: number;
  
  /**
   * Whether the entry is compressed
   */
  compressed?: boolean;
  
  /**
   * When the entry was last accessed
   */
  lastAccessed?: number;
  
  /**
   * Number of times the entry has been accessed
   */
  accessCount?: number;
}