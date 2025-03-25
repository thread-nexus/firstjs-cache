/**
 * @fileoverview Common cache operations with error handling and metrics
 */

import { CacheOptions } from '../types';
import { CacheEventType } from '../events/cache-events';
import { eventManager, emitMetricEvent } from '../events/event-manager';
import { handleCacheError } from './error-utils';
import { validateCacheKey, validateCacheOptions, validateCacheValue } from './validation-utils';
import { ICacheProvider } from '../interfaces/i-cache-provider';

/**
 * Deduplication map for in-flight requests
 */
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Execute with deduplication
 */
export async function executeWithDeduplication<T>(
    key: string,
    operation: () => Promise<T>
): Promise<T> {
    const existing = inFlightRequests.get(key);
    if (existing) {
        return existing;
    }

    const promise = operation().finally(() => {
        inFlightRequests.delete(key);
    });

    inFlightRequests.set(key, promise);
    return promise;
}

/**
 * Retry operation with backoff
 */
export async function retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            // Convert unknown error to Error type
            // Update error fields
            lastError = error instanceof Error ? error : new Error(String(error));
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Check if value should be refreshed
 */
export function shouldRefresh(
    timestamp: Date,
    ttl: number,
    refreshThreshold: number
): boolean {
    const age = Date.now() - timestamp.getTime();
    const threshold = ttl * refreshThreshold;
    return age > threshold;
}

/**
 * Background refresh handler
 */
export async function handleBackgroundRefresh<T>(
    key: string,
    provider: ICacheProvider,
    compute: () => Promise<T>,
    options?: CacheOptions
): Promise<void> {
    try {
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.REFRESH_START, {
            key,
            type: 'refresh:start', // Use string literal since enum may not have this value
            timestamp: Date.now()
        });

        // Compute new value
        const value = await compute();
        await provider.set(key, value, options);

        // Add required properties to event payload
        emitCacheEvent(CacheEventType.REFRESH_SUCCESS, {
            key,
            type: 'refresh:success', // Use string literal since enum may not have this value
            timestamp: Date.now()
        });
    } catch (error) {
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.REFRESH_ERROR, {
            key,
            error: error instanceof Error ? error : new Error(String(error)),
            type: 'refresh:error', // Use string literal since enum may not have this value
            timestamp: Date.now()
        });

        // Log error but don't throw since this is background
        console.error(`Background refresh failed for key ${key}:`, error);
    }
}

/**
 * Generate cache key from function arguments
 */
export function generateCacheKey(prefix: string, args: any[]): string {
    const argsHash = JSON.stringify(args);
    return `${prefix}:${argsHash}`;
}

/**
 * Batch operations helper
 */
export async function batchOperations<T>(
    items: T[],
    operation: (item: T) => Promise<void>,
    batchSize: number = 10
): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(operation));
    }
}

/**
 * Safe delete operation
 */
export async function safeDelete(
    key: string,
    provider: ICacheProvider
): Promise<boolean> {
    try {
        return await provider.delete(key);
    } catch (error) {
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.ERROR, {
            key,
            error: error instanceof Error ? error : new Error(String(error)),
            message: 'Failed to delete cache entry',
            type: CacheEventType.ERROR.toString(),
            timestamp: Date.now()
        });
        return false;
    }
}

/**
 * Safe clear operation
 */
export async function safeClear(
    provider: ICacheProvider
): Promise<void> {
    try {
        await provider.clear();
    } catch (error) {
        // Add required properties to event payload
        emitCacheEvent(CacheEventType.ERROR, {
            error: error instanceof Error ? error : new Error(String(error)),
            message: 'Failed to clear cache',
            type: CacheEventType.ERROR.toString(),
            timestamp: Date.now()
        });
    }
}

/**
 * Options for cache operations
 */
export interface OperationOptions {
  /**
   * Whether to enable metrics
   */
  metrics?: boolean;
  
  /**
   * Whether to validate inputs
   */
  validation?: boolean;
  
  /**
   * Whether to emit events
   */
  events?: boolean;
  
  /**
   * Default TTL for cache values
   */
  defaultTtl?: number;
}

/**
 * Default operation options
 */
const DEFAULT_OPTIONS: OperationOptions = {
  metrics: true,
  validation: true,
  events: true,
  defaultTtl: 3600 // 1 hour
};

/**
 * Execute a cache operation with consistent error handling and metrics
 *
 * @param provider Cache provider
 * @param operation Operation name
 * @param fn Operation function
 * @param context Operation context for error handling
 * @param defaultValue
 * @param options Operation options
 * @returns Operation result
 */
export async function executeOperation<T>(
  provider: ICacheProvider,
  operation: string,
  fn: () => Promise<T>,
  context: Record<string, any>,
  defaultValue?: T,
  options: OperationOptions = DEFAULT_OPTIONS
): Promise<T> {
  if (!provider) {
    throw createCacheError('Provider is required for cache operations', CacheErrorCode.INTERNAL_ERROR);
  }

  const startTime = performance.now();
  const providerName = provider.name || 'unknown';
  
  try {
    const result = await fn();
    
    // Record metrics if enabled
    if (options.metrics) {
      const duration = performance.now() - startTime;
      
      if (operation === 'get') {
        if (result === null || result === undefined) {
          emitMetricEvent('miss', operation, duration, context);
        } else {
          emitMetricEvent('hit', operation, duration, context);
        }
      } else {
        emitMetricEvent('success', operation, duration, context);
      }
    }
    
    return result;
  } catch (error) {
    // Record error metrics if enabled
    if (options.metrics) {
      const duration = performance.now() - startTime;
      emitMetricEvent('error', operation, duration, { ...context, error });
    }
    
    // Use enhanced error handling
    const enhancedContext = { 
      operation, 
      provider: providerName,
      ...context
    };
    
    const handledError = handleCacheError(error, enhancedContext);
    
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    throw handledError;
  }
}

/**
 * Execute a cache get operation with consistent error handling
 *
 * @param provider Cache provider
 * @param key Cache key
 * @param options Operation options
 * @returns Cached value or null
 */
export async function get<T>(
  provider: ICacheProvider,
  key: string,
  options: OperationOptions = DEFAULT_OPTIONS
): Promise<T | null> {
  // Validate inputs if enabled
  if (options.validation) {
    validateCacheKey(key);
  }
  
  return executeOperation<T | null>(
    provider,
    'get',
    async () => {
      const value = await provider.get<T>(key);
      
      // Emit cache event if enabled
      if (options.events) {
        emitCacheEvent(
          value === null ? CacheEventType.GET_MISS : CacheEventType.GET_HIT,
          { key, provider: provider.name }
        );
      }
      
      return value;
    },
    { key },
    null,
    options
  );
}

/**
 * Execute a cache set operation with consistent error handling
 *
 * @param provider Cache provider
 * @param key Cache key
 * @param value Value to cache
 * @param cacheOptions Cache options
 * @param operationOptions Operation options
 */
export async function set<T>(
  provider: ICacheProvider,
  key: string,
  value: T,
  cacheOptions: CacheOptions = {},
  operationOptions: OperationOptions = DEFAULT_OPTIONS
): Promise<void> {
  // Validate inputs if enabled
  if (operationOptions.validation) {
    validateCacheKey(key);
    validateCacheValue(value);
    validateCacheOptions(cacheOptions);
  }
  
  // Apply default TTL if not specified
  const options = {
    ...cacheOptions,
    ttl: cacheOptions.ttl ?? operationOptions.defaultTtl
  };
  
  return executeOperation<void>(
    provider,
    'set',
    async () => {
      await provider.set(key, value, options);
      
      // Emit cache event if enabled
      if (operationOptions.events) {
        emitCacheEvent(CacheEventType.SET, { 
          key, 
          provider: provider.name,
          ttl: options.ttl,
          size: calculateSize(value)
        });
      }
    },
    { key, options },
    undefined,
    operationOptions
  );
}

/**
 * Execute a cache delete operation with consistent error handling
 *
 * @param provider Cache provider
 * @param key Cache key
 * @param options Operation options
 * @returns Whether the key was deleted
 */
export async function del(
  provider: ICacheProvider,
  key: string,
  options: OperationOptions = DEFAULT_OPTIONS
): Promise<boolean> {
  // Validate inputs if enabled
  if (options.validation) {
    validateCacheKey(key);
  }
  
  return executeOperation<boolean>(
    provider,
    'delete',
    async () => {
      const result = await provider.delete(key);
      
      // Emit cache event if enabled
      if (options.events && result) {
        emitCacheEvent(CacheEventType.DELETE, { 
          key, 
          provider: provider.name 
        });
      }
      
      return result;
    },
    { key },
    false,
    options
  );
}

/**
 * Execute a cache clear operation with consistent error handling
 *
 * @param provider Cache provider
 * @param options Operation options
 */
export async function clear(
  provider: ICacheProvider,
  options: OperationOptions = DEFAULT_OPTIONS
): Promise<void> {
  return executeOperation<void>(
    provider,
    'clear',
    async () => {
      await provider.clear();
      
      // Emit cache event if enabled
      if (options.events) {
        emitCacheEvent(CacheEventType.CLEAR, { 
          provider: provider.name 
        });
      }
    },
    {},
    undefined,
    options
  );
}

/**
 * Emit a metric event with consistent structure
 *
 * @param type Metric type
 * @param operation Operation name
 * @param duration Operation duration
 * @param context Operation context
 */
function emitMetricEvent(
  type: 'hit' | 'miss' | 'success' | 'error',
  operation: string,
  duration: number,
  context: Record<string, any>
): void {
  try {
    eventManager.emit(CacheEventType.METRICS, {
      type,
      duration,
      metadata: { 
        message: `${operation} ${type}`,
        operation, 
        ...context 
      },
      timestamp: Date.now()
    });
  } catch (error) {
    // Suppress errors from metric reporting
    console.debug('Error emitting metrics event:', error);
  }
}

/**
 * Calculate approximate size of a value in bytes
 * 
 * @param value Value to measure
 * @returns Size in bytes
 */
function calculateSize(value: any): number {
  try {
    if (value === null || value === undefined) {
      return 0;
    }
    
    if (typeof value === 'string') {
      return new Blob([value]).size;
    }
    
    if (typeof value === 'object') {
      return new Blob([JSON.stringify(value)]).size;
    }
    
    // Primitive values
    return 8;
  } catch (error) {
    return 0;
  }
}