/**
 * @fileoverview Types for cache configuration and operations
 */

import { CacheOptions } from './common';

export function CacheStats() {
}


/**
 * Cache configuration
 */
export interface CacheConfig {
  /**
   * Default time to live in seconds
   */
  defaultTtl: number;
  
  /**
   * Whether to deduplicate concurrent requests for the same key
   */
  deduplicateRequests: boolean;
  
  /**
   * Whether to enable background refresh by default
   */
  backgroundRefresh: boolean;
  
  /**
   * Percentage of TTL elapsed before triggering background refresh (0-1)
   */
  refreshThreshold: number;
  
  /**
   * Whether to throw errors or handle them internally
   */
  throwOnErrors: boolean;
  
  /**
   * Whether to enable logging
   */
  logging: boolean;
  
  /**
   * Whether to include stack traces in logs
   */
  logStackTraces: boolean;
  
  /**
   * Monitoring configuration
   */
  monitoring?: {
    /**
     * Whether to enable monitoring
     */
    enabled: boolean;
    
    /**
     * Monitoring interval in milliseconds
     */
    interval: number;
    
    /**
     * Whether to collect detailed statistics
     */
    detailedStats: boolean;
  };
  
  /**
   * Default options for cache operations
   */
  defaultOptions: CacheOptions;
}

/**
 * Storage adapter configuration
 */
export interface StorageAdapterConfig {
  /**
   * Key prefix for this adapter
   */
  prefix?: string;
  
  /**
   * Default TTL in seconds
   */
  defaultTtl?: number;
  
  /**
   * Connection options for remote adapters
   */
  connection?: {
    /**
     * Connection host
     */
    host?: string;
    
    /**
     * Connection port
     */
    port?: number;
    
    /**
     * Connection URL
     */
    url?: string;
    
    /**
     * Authentication credentials
     */
    auth?: {
      username?: string;
      password?: string;
      token?: string;
    };
    
    /**
     * Connection timeout in milliseconds
     */
    timeout?: number;
    
    /**
     * Whether to use TLS/SSL
     */
    tls?: boolean;
  };
  
  /**
   * Additional adapter-specific options
   */
  [key: string]: any;
}

/**
 * Cache operation types
 */
export enum CacheOperationType {
  GET = 'get',
  SET = 'set',
  DELETE = 'delete',
  CLEAR = 'clear',
  HAS = 'has',
  COMPUTE = 'compute',
  REFRESH = 'refresh',
  INVALIDATE = 'invalidate',
  BATCH = 'batch',
  TRANSACTION = 'transaction'
}

/**
 * Cache operation context
 */
export interface CacheOperationContext {
  /**
   * Operation type
   */
  operation: CacheOperationType;
  
  /**
   * Cache key(s)
   */
  key?: string;
  keys?: string[];
  
  /**
   * Provider name
   */
  provider?: string;
  
  /**
   * Operation start time
   */
  startTime?: number;
  
  /**
   * Operation options
   */
  options?: CacheOptions;
  
  /**
   * Additional context
   */
  [key: string]: any;
}

/**
 * Cache transaction operation
 */
export interface CacheTransactionOperation {
  /**
   * Operation type
   */
  type: 'get' | 'set' | 'delete' | 'has';
  
  /**
   * Cache key
   */
  key: string;
  
  /**
   * Value for set operations
   */
  value?: any;
  
  /**
   * Operation options
   */
  options?: CacheOptions;
}