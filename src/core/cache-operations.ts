import { CacheOptions } from '../types/common';
import { emitCacheEvent, CacheEventType } from '../events/cache-events';
import { ICacheProvider } from '../interfaces/ICacheProvider';
import { CacheError, CacheErrorCode, createCacheError } from '../utils/error-utils';

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
    emitCacheEvent(CacheEventType.REFRESH_START, { key });
    const value = await compute();
    await provider.set(key, value, options);
    emitCacheEvent(CacheEventType.REFRESH_SUCCESS, { key });
  } catch (error) {
    emitCacheEvent(CacheEventType.REFRESH_ERROR, { 
      key, 
      error: error instanceof Error ? error : new Error(String(error))
    });
    throw error;
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
  options: {
    batchSize?: number;
    stopOnError?: boolean;
    maxConcurrent?: number;
  } = {}
): Promise<void> {
  const {
    batchSize = 10,
    stopOnError = false,
    maxConcurrent = 3
  } = options;

  const errors: Error[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      await Promise.all(
        batch.map(item => operation(item))
          .slice(0, maxConcurrent)
      );
    } catch (error) {
      if (stopOnError) {
        throw createCacheError(
          CacheErrorCode.BATCH_ERROR,
          'Batch operation failed',
          { operation: 'batch' }
        );
      }
      errors.push(error as Error);
    }
  }

  if (errors.length > 0) {
    throw createCacheError(
      CacheErrorCode.BATCH_ERROR,
      `${errors.length} operations failed`,
      { operation: 'batch', errorCount: errors.length }
    );
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
    emitCacheEvent(CacheEventType.ERROR, {
      key,
      error: error instanceof Error ? error : new Error(String(error)),
      message: 'Failed to delete cache entry'
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
    emitCacheEvent(CacheEventType.ERROR, {
      error: error instanceof Error ? error : new Error(String(error)),
      message: 'Failed to clear cache'
    });
  }
}

/**
 * Handle cache operation errors
 */
function handleError(
  operation: string,
  error: Error,
  context: {
    operation: string;
    key?: string;
    keys?: string[];
    tag?: string;
    prefix?: string;
    entries?: Record<string, any>;
    errorCount?: number;
  }
): never {
  if (error instanceof CacheError) {
    throw error;
  }

  throw createCacheError(
    CacheErrorCode.OPERATION_ERROR,
    `Cache operation '${operation}' failed: ${error.message}`,
    context
  );
}

/**
 * Ensure a cache provider is available
 */
function ensureProvider(provider?: ICacheProvider): ICacheProvider {
  if (!provider) {
    throw createCacheError(
      CacheErrorCode.NO_PROVIDER,
      'No cache provider available'
    );
  }
  return provider;
}