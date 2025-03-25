/**
 * @fileoverview Options types for the cache system
 */

import {CacheOptions} from './cache-types';

/**
 * Options for EasyCache
 */
export interface EasyCacheOptions {
  /**
   * Maximum cache size in bytes (default: 100MB)
   */
  maxSize?: number;
  
  /**
   * Default time-to-live in seconds (default: 3600)
   */
  ttl?: number;
  
  /**
   * Tags for grouping and invalidation
   */
  tags?: string[];
  
  /**
   * Whether to refresh values in background when stale (default: true)
   */
  backgroundRefresh?: boolean;
  
  /**
   * Threshold (0-1) of TTL after which to refresh (default: 0.75)
   */
  refreshThreshold?: number;
  
  /**
   * Whether to deduplicate in-flight requests (default: true)
   */
  deduplicateRequests?: boolean;
  
  /**
   * Whether to throw errors (default: false)
   */
  throwOnErrors?: boolean;
  
  /**
   * Whether to enable compression
   */
  compression?: boolean;
  
  /**
   * Minimum size in bytes for compression to be applied
   */
  compressionThreshold?: number;
  
  /**
   * Custom serializer
   */
  serializer?: {
    serialize: (value: any) => string;
    deserialize: (data: string) => any;
  };
  
  /**
   * Whether to enable logging
   */
  logging?: boolean;
  
  /**
   * Custom logger function
   */
  logger?: (message: string, level: string, context?: any) => void;
}

/**
 * Options for get operations
 */
export interface GetOptions extends CacheOptions {
  /**
   * Default value if key not found
   */
  defaultValue?: any;
  
  /**
   * Provider to use
   */
  provider?: string;
  
  /**
   * Whether to throw on error
   */
  throwOnError?: boolean;
  
  /**
   * Fallback function to call if key not found
   */
  fallback?: () => Promise<any>;
}

/**
 * Options for set operations
 */
export interface SetOptions extends CacheOptions {
  /**
   * Provider to use
   */
  provider?: string;
  
  /**
   * Whether to throw on error
   */
  throwOnError?: boolean;
  
  /**
   * Whether to overwrite existing value
   */
  overwrite?: boolean;
  
  /**
   * Whether to skip setting if key already exists
   */
  skipIfExists?: boolean;
}

/**
 * Options for delete operations
 */
export interface DeleteOptions {
  /**
   * Provider to use
   */
  provider?: string;
  
  /**
   * Whether to throw on error
   */
  throwOnError?: boolean;
}

/**
 * Options for clear operations
 */
export interface ClearOptions {
  /**
   * Provider to use
   */
  provider?: string;
  
  /**
   * Whether to throw on error
   */
  throwOnError?: boolean;
  
  /**
   * Prefix to clear (if not specified, clears all)
   */
  prefix?: string;
}

/**
 * Options for getOrCompute operations
 */
export interface GetOrComputeOptions extends CacheOptions {
  /**
   * Provider to use
   */
  provider?: string;
  
  /**
   * Whether to throw on error
   */
  throwOnError?: boolean;
  
  /**
   * Whether to skip cache and always compute
   */
  skipCache?: boolean;
  
  /**
   * Whether to skip storing the computed value
   */
  skipStore?: boolean;
  
  /**
   * Whether to return stale value while refreshing
   */
  staleWhileRevalidate?: boolean;
  
  /**
   * Maximum time in milliseconds to wait for computation
   */
  computeTimeout?: number;
}

/**
 * Options for wrap operations
 */
export interface WrapOptions extends CacheOptions {
  /**
   * Provider to use
   */
  provider?: string;
  
  /**
   * Whether to throw on error
   */
  throwOnError?: boolean;
  
  /**
   * Whether to skip cache and always execute the function
   */
  skipCache?: boolean;
  
  /**
   * Maximum time in milliseconds to wait for function execution
   */
  timeout?: number;
}

/**
 * Options for React hooks
 */
export interface UseCacheOptions extends CacheOptions {
  /**
   * Callback function called when data is successfully fetched
   */
  onSuccess?: (data: any) => void;
  
  /**
   * Callback function called when an error occurs during fetch
   */
  onError?: (error: Error) => void;
  
  /**
   * Whether to skip the initial fetch
   */
  skip?: boolean;
  
  /**
   * Whether to disable caching for this query
   */
  disableCache?: boolean;
  
  /**
   * Whether to suspend rendering until data is available
   */
  suspense?: boolean;
  
  /**
   * Whether to deduplicate identical requests
   */
  deduplicate?: boolean;
  
  /**
   * Whether to retry on error
   */
  retry?: boolean;
  
  /**
   * Number of retry attempts
   */
  retryCount?: number;
  
  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number;
  
  /**
   * Whether to fetch on component mount
   */
  fetchOnMount?: boolean;
  
  /**
   * Whether to refetch on window focus
   */
  refetchOnWindowFocus?: boolean;
  
  /**
   * Whether to refetch on network reconnect
   */
  refetchOnReconnect?: boolean;
  
  /**
   * Polling interval in milliseconds
   */
  pollingInterval?: number;
}