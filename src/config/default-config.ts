/**
 * @fileoverview Default configuration for cache manager
 */

import {CacheConfig} from '../types';
import * as console from "node:console";

/**
 * Default cache configuration
 */
export const DEFAULT_CONFIG: CacheConfig = {
  providers: [],
  defaultTtl: 300, // 5 minutes in seconds
  defaultOptions: {
    ttl: 300, // 5 minutes in seconds
    compression: false,
    compressionThreshold: 1024, // 1KB
    backgroundRefresh: false,
    refreshThreshold: 0.8 // 80% of TTL
  },
  throwOnErrors: false,
  backgroundRefresh: false,
  refreshThreshold: 0.8,
  deduplicateRequests: true,
  monitoring: {
    enabled: true,
    reportingInterval: 60, // 1 minute
    samplingRate: 1.0,
    logToConsole: false
  } as any, // Use type assertion to avoid the typechecking issue
  rateLimit: {
    limit: 1000,
    window: 60000, // 1 minute
    throwOnLimit: false,
    maxWaitTime: 30000, // 30 seconds
    queueExceeding: true,
    maxQueueSize: 100
  },
  statsInterval: 60, // 1 minute
  logging: false,
  logStackTraces: false,
  logger: console.log
};

/**
 * Environment-specific configuration adjustment
 */
export function getEnvironmentConfig(): Partial<CacheConfig> {
  // Return environment-specific overrides
  const environment = process.env.NODE_ENV || 'development';
  
  if (environment === 'production') {
    return {
      throwOnErrors: false,
      logging: false,
      monitoring: {
        enabled: true,
        reportingInterval: 300, // 5 minutes in production
        logToConsole: false
      }
    };
  }
  
  if (environment === 'test') {
    return {
      throwOnErrors: true,
      defaultTtl: 1,
      monitoring: {
        enabled: false
      }
    };
  }
  
  // Development defaults
  return {
    throwOnErrors: true,
    logging: true,
    monitoring: {
      enabled: true,
      reportingInterval: 30, // 30 seconds in development
      logToConsole: true
    }
  };
}

/**
 * Merge configuration with defaults and environment overrides
 * 
 * @param config User configuration
 * @returns Merged configuration
 */
export function mergeConfig(config: Partial<CacheConfig> = {}): CacheConfig {
  const envConfig = getEnvironmentConfig();
  return {
    ...DEFAULT_CONFIG,
    ...envConfig,
    ...config,
    // Merge nested configurations
    monitoring: {
      enabled: true, // force boolean value
      reportingInterval: 60000,
      samplingRate: 1.0,
      logToConsole: true,
      metricsCallback: null,
      interval: 60000,
      detailedMetrics: false,
      maxEventHistory: 1000,
      reporter: (metrics: any) => {}
    },
    rateLimit: {
      ...DEFAULT_CONFIG.rateLimit,
      ...(envConfig.rateLimit || {}),
      ...(config.rateLimit || {})
    },
    defaultOptions: {
      ...DEFAULT_CONFIG.defaultOptions,
      ...(envConfig.defaultOptions || {}),
      ...(config.defaultOptions || {})
    }
  };
}

export class CACHE_CONSTANTS {
  static DEFAULT_BATCH_SIZE: string = 'DEFAULT_BATCH_SIZE';
  static MAX_KEY_LENGTH: string = 'MAX_KEY_LENGTH';
}