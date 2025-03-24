/**
 * Cache operations utility functions
 */

import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions } from '../types/common';
import { CacheErrorCode, createCacheError } from '../utils/error-utils';
import { CACHE_CONSTANTS } from '../config/default-config';

/**
 * Cache operations helper class
 */
export class CacheOperations {
  /**
   * In-flight requests for deduplication
   */
  private static inFlightRequests = new Map<string, Promise<any>>();
  
  /**
   * Default batch size
   */
  private static maxBatchSize = CACHE_CONSTANTS.DEFAULT_BATCH_SIZE;
  
  /**
   * Batch operation with concurrency control
   * 
   * @param items - Items to process
   * @param operation - Operation to perform on each item
   * @param options - Batch options
   * @returns Promise that resolves when all operations are complete
   */
  static async batchOperations<T>(
    items: T[],
    operation: (item: T) => Promise<void>,
    options: {
      batchSize?: number;
      stopOnError?: boolean;
      maxConcurrent?: number;
    } = {}
  ): Promise<{ success: boolean; errors: Error[] }> {
    const batchSize = options.batchSize || this.maxBatchSize;
    const stopOnError = options.stopOnError || false;
    const maxConcurrent = options.maxConcurrent || 5;
    
    const errors: Error[] = [];
    
    // Split items into batches
    const batches = this.splitIntoBatches(items, batchSize);
    
    // Process batches with concurrency control
    for (const batch of batches) {
      // Create a promise for each item in the batch
      const promises = batch.map(item => async () => {
        try {
          await operation(item);
          return null;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push(err);
          return err;
        }
      });
      
      // Process promises with concurrency limit
      const results = await this.processWithConcurrency(promises, maxConcurrent);
      
      // Check if we should stop on error
      if (stopOnError && results.some(r => r !== null)) {
        break;
      }
    }
    
    // If any operations failed, throw an error with details
    if (errors.length > 0) {
      // Create a batch error
      const batchError = createCacheError(
        `Batch operation failed: ${errors.length} of ${items.length} operations failed`,
        CacheErrorCode.BATCH_ERROR,
        errors[0],
        { errors, failedCount: errors.length, totalCount: items.length }
      );
      
      if (stopOnError) {
        throw batchError;
      }
    }
    
    return {
      success: errors.length === 0,
      errors
    };
  }
  
  /**
   * Split items into batches
   * 
   * @param items - Items to split
   * @param batchSize - Maximum batch size
   * @returns Array of batches
   */
  private static splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }
  
  /**
   * Process functions with concurrency control
   * 
   * @param fns - Functions to process
   * @param concurrency - Maximum concurrency
   * @returns Results of the functions
   */
  private static async processWithConcurrency<T>(
    fns: (() => Promise<T>)[],
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];
    
    for (const fn of fns) {
      const p = fn().then(result => {
        results.push(result);
        executing.splice(executing.indexOf(p), 1);
      });
      
      executing.push(p);
      
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
    
    await Promise.all(executing);
    
    return results;
  }
  
  /**
   * Execute with deduplication to prevent duplicate in-flight requests
   * 
   * @param key - Cache key
   * @param operation - Operation to perform
   * @returns Result of the operation
   */
  static async executeWithDeduplication<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Check if there's already an in-flight request for this key
    const dedupKey = `dedup:${key}`;
    
    if (this.inFlightRequests.has(dedupKey)) {
      // Return the existing promise
      return this.inFlightRequests.get(dedupKey) as Promise<T>;
    }
    
    // Create a new promise for this operation
    const promise = (async () => {
      try {
        return await operation();
      } finally {
        // Remove from in-flight requests
        this.inFlightRequests.delete(dedupKey);
      }
    })();
    
    // Store the promise
    this.inFlightRequests.set(dedupKey, promise);
    
    return promise;
  }
  
  /**
   * Handle background refresh for a cache entry
   * 
   * @param key - Cache key
   * @param provider - Cache provider
   * @param compute - Function to compute the value
   * @param options - Cache options
   * @returns Promise that resolves when the refresh is complete
   */
  static async handleBackgroundRefresh<T>(
    key: string,
    provider: ICacheProvider,
    compute: () => Promise<T>,
    options?: CacheOptions
  ): Promise<void> {
    try {
      // Get metadata if available
      const getMetadata = provider.getMetadata as ((key: string) => Promise<any>) | undefined;
      const metadata = await getMetadata?.(key);
      
      // Check if we need to refresh
      if (metadata && options?.refreshThreshold && options.ttl) {
        const now = Date.now();
        const createdAt = metadata.createdAt instanceof Date 
          ? metadata.createdAt.getTime() 
          : metadata.createdAt as number;
        
        const ttlMs = options.ttl * 1000;
        const refreshThresholdMs = ttlMs * options.refreshThreshold;
        const refreshAt = createdAt + refreshThresholdMs;
        
        // If we've passed the refresh threshold but not expired
        if (now >= refreshAt && now < createdAt + ttlMs) {
          // Refresh in background
          this.executeWithDeduplication(`refresh:${key}`, async () => {
            try {
              const value = await compute();
              await provider.set(key, value, options);
            } catch (error) {
              console.error(`Background refresh failed for key ${key}:`, error);
            }
          });
        }
      }
    } catch (error) {
      // Don't let background refresh failures affect the main flow
      console.error(`Error in background refresh for key ${key}:`, error);
    }
  }
  
  /**
   * Retry an operation with exponential backoff
   * 
   * @param operation - Operation to retry
   * @param maxRetries - Maximum number of retries
   * @param baseDelay - Base delay in milliseconds
   * @returns Result of the operation
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If this was the last attempt, don't delay
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we get here, all attempts failed
    throw createCacheError(
      `Operation failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
      CacheErrorCode.OPERATION_ERROR,
      lastError || undefined
    );
  }
  
  /**
   * Safely clear a cache provider
   * 
   * @param provider - Cache provider
   * @returns Whether the operation was successful
   */
  static async safeClear(
    provider: ICacheProvider
  ): Promise<boolean> {
    try {
      await provider.clear();
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }
  
  /**
   * Safely delete a key from a cache provider
   * 
   * @param key - Cache key
   * @param provider - Cache provider
   * @returns Whether the operation was successful
   */
  static async safeDelete(
    key: string,
    provider: ICacheProvider
  ): Promise<boolean> {
    try {
      return await provider.delete(key);
    } catch (error) {
      console.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Ensure a cache provider is available
   * 
   * @param provider - Cache provider
   * @returns The provider if available
   */
  static ensureProvider(provider?: ICacheProvider): ICacheProvider {
    if (!provider) {
      throw createCacheError(
        'No cache provider available',
        CacheErrorCode.NO_PROVIDER
      );
    }
    
    return provider;
  }
  
  /**
   * Generate a cache key from arguments
   * 
   * @param prefix - Key prefix
   * @param args - Arguments to include in key
   * @returns Generated cache key
   */
  static generateCacheKey(prefix: string, args: any[]): string {
    const argString = args.map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'function') return 'function';
      if (typeof arg === 'object') return JSON.stringify(arg);
      return String(arg);
    }).join(':');
    
    return `${prefix}:${argString}`;
  }
  
  /**
   * Handle cache operation errors
   * 
   * @param operation - Operation name
   * @param error - Error object
   * @param context - Error context
   * @returns Normalized error
   */
  static handleError(
    operation: string,
    error: Error,
    context: Record<string, any> = {}
  ): Error {
    // Log the error
    console.error(`Cache operation '${operation}' failed:`, error, context);
    
    // Return a normalized error
    return createCacheError(
      `Cache operation '${operation}' failed: ${error.message}`,
      CacheErrorCode.OPERATION_ERROR,
      error,
      context
    );
  }
  
  /**
   * Check if a value should be refreshed based on TTL and threshold
   * 
   * @param timestamp - When the value was created
   * @param ttl - Time-to-live in seconds
   * @param refreshThreshold - Refresh threshold (0-1)
   * @returns Whether the value should be refreshed
   */
  static shouldRefresh(
    timestamp: Date,
    ttl: number,
    refreshThreshold: number
  ): boolean {
    if (!ttl || !refreshThreshold || refreshThreshold <= 0 || refreshThreshold > 1) {
      return false;
    }
    
    const now = Date.now();
    const createdAt = timestamp.getTime();
    const expiresAt = createdAt + (ttl * 1000);
    const refreshAt = createdAt + (ttl * refreshThreshold * 1000);
    
    return now >= refreshAt && now < expiresAt;
  }
}