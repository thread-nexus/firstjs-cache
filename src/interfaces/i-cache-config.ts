import { ICacheProvider } from './i-cache-provider';
import { CacheOptions } from '../types/common';

/**
 * Configuration for the cache system
 */
export interface ICacheConfig {
  /**
   * List of cache providers
   */
  providers: IProviderConfig[];
  
  /**
   * Default TTL in seconds
   */
  defaultTtl?: number;
  
  /**
   * Default cache options
   */
  defaultOptions?: CacheOptions;
  
  /**
   * Whether to deduplicate in-flight requests
   */
  deduplicateRequests?: boolean;
  
  /**
   * Whether to enable background refresh
   */
  backgroundRefresh?: boolean;
  
  /**
   * Threshold for background refresh (0-1, percentage of TTL)
   */
  refreshThreshold?: number;
  
  /**
   * Whether to throw errors or suppress them
   */
  throwOnErrors?: boolean;
  
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
}

/**
 * Configuration for a cache provider
 */
export interface IProviderConfig {
  /**
   * Unique name for this provider
   */
  name: string;
  
  /**
   * The provider instance
   */
  instance: ICacheProvider;
  
  /**
   * Priority order (lower numbers are checked first)
   */
  priority?: number;
  
  /**
   * Provider-specific options
   */
  options?: Record<string, any>;
}