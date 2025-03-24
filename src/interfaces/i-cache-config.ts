/**
 * @fileoverview Enhanced configuration interface for the cache system
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */

import { ICacheProvider } from './i-cache-provider';
import { CacheOptions, SecurityOptions, MonitoringConfig } from '../types/common';

/**
 * Enhanced configuration for the cache system
 */
export interface ICacheConfig {
  /**
   * List of cache providers with improved typing
   */
  providers: Array<IProviderConfig>;
  
  /**
   * Default TTL in seconds
   * @minimum 0
   * @default 3600
   */
  defaultTtl?: number;
  
  /**
   * Default cache options
   */
  defaultOptions?: CacheOptions;
  
  /**
   * Request deduplication settings
   */
  deduplication?: {
    enabled: boolean;
    timeout: number;
    maxPending: number;
  };
  
  /**
   * Background refresh configuration
   */
  backgroundRefresh?: {
    enabled: boolean;
    threshold: number;
    maxConcurrent: number;
    errorHandling: 'fail-silent' | 'retry' | 'fallback';
  };
  
  /**
   * Enhanced error handling configuration
   */
  errorHandling?: {
    throwOnErrors: boolean;
    retryAttempts: number;
    retryDelay: number;
    fallbackValue?: any;
  };
  
  /**
   * Improved logging configuration
   */
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    includeStackTraces: boolean;
    format?: 'json' | 'text';
    destination?: 'console' | 'file';
    customLogger?: (entry: LogEntry) => void;
  };

  /**
   * Security settings
   */
  security?: SecurityOptions;

  /**
   * Monitoring configuration
   */
  monitoring?: MonitoringConfig;
}

/**
 * Enhanced provider configuration
 */
export interface IProviderConfig {
  /**
   * Unique provider identifier
   */
  name: string;
  
  /**
   * Provider instance
   */
  instance: ICacheProvider;
  
  /**
   * Priority (lower numbers checked first)
   * @minimum 0
   */
  priority?: number;
  
  /**
   * Connection configuration
   */
  connection?: {
    timeout: number;
    retries: number;
    poolSize?: number;
  };
  
  /**
   * Provider-specific options
   */
  options?: Record<string, any>;
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  stackTrace?: string;
}