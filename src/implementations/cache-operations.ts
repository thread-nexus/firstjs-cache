/**
 * @fileoverview Core cache operations with optimized implementations
 * for common caching patterns and batch operations.
 */

import { CacheOptions } from '../types/common';
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { emitCacheEvent, CacheEventType } from '../events/cache-events';
import { compressIfNeeded, decompressIfNeeded } from '../utils/compression-utils';
import { validateCacheKey, validateCacheOptions } from '../utils/validation-utils';
import { handleCacheError } from '../utils/error-utils';
import { CACHE_CONSTANTS } from '../config/default-config';

/**
 * Map to track in-flight operations for deduplication
 */
const inFlightOps = new Map<string, Promise<any>>();

/**
 * Optimized batch operation handler
 */
export class BatchOperationHandler {
  private batch: Map<string, any> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private maxBatchSize = CACHE_CONSTANTS.MAX_BATCH_SIZE;
  private maxWaitTime = 50; // ms

  /**
   * Add operation to batch
   */
  add(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.batch.set(key, { value, resolve, reject });
      this.scheduleBatchProcess();
    });
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcess(): void {
    if (this.timer) return;

    if (this.batch.size >= this.maxBatchSize) {
      this.processBatch().then(r => {});
    } else {
      this.timer = setTimeout(() => this.processBatch(), this.maxWaitTime);
    }
  }

  /**
   * Process current batch
   */
  private async processBatch(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const currentBatch = new Map(this.batch);
    this.batch.clear();

    try {
      // Process batch operations
      const results = await Promise.all(
        Array.from(currentBatch.entries()).map(async ([key, { value }]) => {
          try {
            return await value;
          } catch (error) {
            return { error, key };
          }
        })
      );

      // Handle results
      results.forEach((result, index) => {
        const key = Array.from(currentBatch.keys())[index];
        const { resolve, reject } = currentBatch.get(key);

        if (result?.error) {
          reject(result.error);
        } else {
          resolve(result);
        }
      });
    } catch (error) {
      // Handle batch-level errors
      for (const { reject } of currentBatch.values()) {
        reject(error);
      }
    }
  }
}

// Create singleton batch handler
const batchHandler = new BatchOperationHandler();

/**
 * Set cache value with optimizations
 * 
 * @param provider - Cache provider
 * @param key - Cache key
 * @param value - Value to cache
 * @param options - Cache options
 */
export async function setCacheValue(
  provider: ICacheProvider,
  key: string,
  value: any,
  options?: CacheOptions
): Promise<void> {
  validateCacheKey(key);
  validateCacheOptions(options);

  const startTime = performance.now();

  try {
    // Compress if needed
    const { data: processedValue, compressed } = await compressIfNeeded(
      JSON.stringify(value),
      {
        threshold: options?.compressionThreshold,
        algorithm: options?.compression ? 'gzip' : undefined,
        enabled: options?.compression
      }
    );

    // Add to batch if supported
    if (provider.setMany) {
      await batchHandler.add(key, {
        value: processedValue,
        compressed,
        options
      });
    } else {
      await provider.set(key, processedValue, {
        ...options,
        compressed
      });
    }

    const duration = performance.now() - startTime;
    emitCacheEvent(CacheEventType.SET, {
      key,
      duration,
      compressed,
      size: processedValue.length
    });
  } catch (error) {
    handleCacheError(error, {
      operation: 'set',
      key,
      provider: provider.constructor.name
    });
    throw error;
  }
}

/**
 * Get cache value with optimizations
 * 
 * @param provider - Cache provider
 * @param key - Cache key
 */
export async function getCacheValue<T = any>(
  provider: ICacheProvider,
  key: string
): Promise<T | null> {
  validateCacheKey(key);

  const startTime = performance.now();

  try {
    // Check for in-flight operations
    const inFlight = inFlightOps.get(key);
    if (inFlight) {
      return inFlight;
    }

    // Create promise for this operation
    const promise = (async () => {
      try {
        const value = await provider.get(key);
        
        if (value === null) {
          emitCacheEvent(CacheEventType.GET_MISS, { key });
          return null;
        }

        // Decompress if needed
        const metadata = await provider.getMetadata?.(key);
        const decompressed = metadata?.compressed
          ? await decompressIfNeeded(value, metadata.algorithm || 'gzip')
          : value;

        const duration = performance.now() - startTime;
        emitCacheEvent(CacheEventType.GET_HIT, {
          key,
          duration,
          size: decompressed.length
        });

        return JSON.parse(decompressed);
      } finally {
        inFlightOps.delete(key);
      }
    })();

    inFlightOps.set(key, promise);
    return promise;
  } catch (error) {
    handleCacheError(error, {
      operation: 'get',
      key,
      provider: provider.constructor.name
    });
    return null;
  }
}

/**
 * Delete cache value with optimizations
 * 
 * @param provider - Cache provider
 * @param key - Cache key
 */
export async function deleteCacheValue(
  provider: ICacheProvider,
  key: string
): Promise<boolean> {
  validateCacheKey(key);

  try {
    const deleted = await provider.delete(key);
    
    emitCacheEvent(CacheEventType.DELETE, {
      key,
      success: deleted
    });

    return deleted;
  } catch (error) {
    handleCacheError(error, {
      operation: 'delete',
      key,
      provider: provider.constructor.name
    });
    return false;
  }
}

/**
 * Clear all cache values
 * 
 * @param provider - Cache provider
 */
export async function clearCache(
  provider: ICacheProvider
): Promise<void> {
  try {
    await provider.clear();
    emitCacheEvent(CacheEventType.CLEAR, {});
  } catch (error) {
    handleCacheError(error, {
      operation: 'clear',
      provider: provider.constructor.name
    });
    throw error;
  }
}

/**
 * Get multiple cache values efficiently
 * 
 * @param provider - Cache provider
 * @param keys - Array of cache keys
 */
export async function getManyValues<T = any>(
  provider: ICacheProvider,
  keys: string[]
): Promise<Record<string, T | null>> {
  const startTime = performance.now();

  try {
    if (provider.getMany) {
      // Use native batch get if available
      const results = await provider.getMany(keys);
      const duration = performance.now() - startTime;

      emitCacheEvent(CacheEventType.GET, {
        keys,
        duration,
        batchSize: keys.length
      });

      return results;
    } else {
      // Fall back to individual gets
      const results: Record<string, T | null> = {};
      await Promise.all(
        keys.map(async key => {
          results[key] = await getCacheValue(provider, key);
        })
      );
      return results;
    }
  } catch (error) {
    handleCacheError(error, {
      operation: 'getMany',
      keys,
      provider: provider.constructor.name
    });
    return {};
  }
}

/**
 * Set multiple cache values efficiently
 * 
 * @param provider - Cache provider
 * @param entries - Record of key-value pairs
 * @param options - Cache options
 */
export async function setManyValues(
  provider: ICacheProvider,
  entries: Record<string, any>,
  options?: CacheOptions
): Promise<void> {
  const startTime = performance.now();

  try {
    if (provider.setMany) {
      // Use native batch set if available
      await provider.setMany(entries, options);
    } else {
      // Fall back to individual sets
      await Promise.all(
        Object.entries(entries).map(([key, value]) =>
          setCacheValue(provider, key, value, options)
        )
      );
    }

    const duration = performance.now() - startTime;
    emitCacheEvent(CacheEventType.SET, {
      duration,
      batchSize: Object.keys(entries).length
    });
  } catch (error) {
    handleCacheError(error, {
      operation: 'setMany',
      provider: provider.constructor.name
    });
    throw error;
  }
}