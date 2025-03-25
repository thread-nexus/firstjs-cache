/**
 * @fileoverview Provider types for the cache system
 */

import {CacheOptions} from './cache-types';

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  /**
   * Whether the provider supports tags
   */
  supportsTags: boolean;
  
  /**
   * Whether the provider supports batch operations
   */
  supportsBatch: boolean;
  
  /**
   * Whether the provider supports compression
   */
  supportsCompression: boolean;
  
  /**
   * Whether the provider supports TTL
   */
  supportsTTL: boolean;
  
  /**
   * Whether the provider supports pattern-based operations
   */
  supportsPatterns: boolean;
  
  /**
   * Whether the provider supports atomic operations
   */
  supportsAtomic: boolean;
  
  /**
   * Whether the provider supports transactions
   */
  supportsTransactions: boolean;
  
  /**
   * Whether the provider supports health checks
   */
  supportsHealthCheck: boolean;
  
  /**
   * Whether the provider supports statistics
   */
  supportsStats: boolean;
  
  /**
   * Whether the provider supports metadata
   */
  supportsMetadata: boolean;
  
  /**
   * Whether the provider is persistent
   */
  isPersistent: boolean;
  
  /**
   * Whether the provider is distributed
   */
  isDistributed: boolean;
  
  /**
   * Maximum key length supported
   */
  maxKeyLength?: number;
  
  /**
   * Maximum value size supported in bytes
   */
  maxValueSize?: number;
}

/**
 * Provider connection options
 */
export interface ProviderConnectionOptions {
  /**
   * Host
   */
  host?: string;
  
  /**
   * Port
   */
  port?: number;
  
  /**
   * Username
   */
  username?: string;
  
  /**
   * Password
   */
  password?: string;
  
  /**
   * Database name
   */
  database?: string;
  
  /**
   * Connection timeout in milliseconds
   */
  connectionTimeout?: number;
  
  /**
   * Operation timeout in milliseconds
   */
  operationTimeout?: number;
  
  /**
   * Maximum number of connection retries
   */
  maxRetries?: number;
  
  /**
   * Retry delay in milliseconds
   */
  retryDelay?: number;
  
  /**
   * Whether to use TLS
   */
  tls?: boolean;
  
  /**
   * TLS options
   */
  tlsOptions?: Record<string, any>;
  
  /**
   * Connection pool options
   */
  pool?: {
    /**
     * Minimum number of connections
     */
    min?: number;
    
    /**
     * Maximum number of connections
     */
    max?: number;
    
    /**
     * Connection idle timeout in milliseconds
     */
    idleTimeout?: number;
  };
  
  /**
   * Additional connection options
   */
  [key: string]: any;
}

/**
 * Provider storage options
 */
export interface ProviderStorageOptions {
  /**
   * Maximum size in bytes
   */
  maxSize?: number;
  
  /**
   * Maximum number of items
   */
  maxItems?: number;
  
  /**
   * Default TTL in seconds
   */
  defaultTtl?: number;
  
  /**
   * Whether to update item age on get
   */
  updateAgeOnGet?: boolean;
  
  /**
   * Whether to allow stale items
   */
  allowStale?: boolean;
  
  /**
   * Eviction policy
   */
  evictionPolicy?: 'lru' | 'lfu' | 'fifo' | 'random';
  
  /**
   * Cleanup interval in seconds
   */
  cleanupInterval?: number;
  
  /**
   * Persistence options
   */
  persistence?: {
    /**
     * Whether to enable persistence
     */
    enabled: boolean;
    
    /**
     * Path to persistence file
     */
    path?: string;
    
    /**
     * Sync interval in seconds
     */
    syncInterval?: number;
  };
  
  /**
   * Serialization options
   */
  serialization?: {
    /**
     * Custom serializer function
     */
    serialize?: (value: any) => string;
    
    /**
     * Custom deserializer function
     */
    deserialize?: (data: string) => any;
  };
}

/**
 * Provider initialization options
 */
export interface ProviderInitOptions {
  /**
   * Provider name
   */
  name: string;
  
  /**
   * Connection options
   */
  connection?: ProviderConnectionOptions;
  
  /**
   * Storage options
   */
  storage?: ProviderStorageOptions;
  
  /**
   * Default cache options
   */
  defaults?: CacheOptions;
  
  /**
   * Logger function
   */
  logger?: (message: string, level: string, context?: any) => void;
  
  /**
   * Additional provider-specific options
   */
  [key: string]: any;
}