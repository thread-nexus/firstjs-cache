import { CacheOptions } from '../types/common';
import { ICacheProvider } from '../interfaces/ICacheProvider';
/**
 * Execute with deduplication
 */
export declare function executeWithDeduplication<T>(key: string, operation: () => Promise<T>): Promise<T>;
/**
 * Retry operation with backoff
 */
export declare function retryOperation<T>(operation: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
/**
 * Check if value should be refreshed
 */
export declare function shouldRefresh(timestamp: Date, ttl: number, refreshThreshold: number): boolean;
/**
 * Background refresh handler
 */
export declare function handleBackgroundRefresh<T>(key: string, provider: ICacheProvider, compute: () => Promise<T>, options?: CacheOptions): Promise<void>;
/**
 * Generate cache key from function arguments
 */
export declare function generateCacheKey(prefix: string, args: any[]): string;
/**
 * Batch operations helper
 */
export declare function batchOperations<T>(items: T[], operation: (item: T) => Promise<void>, batchSize?: number): Promise<void>;
/**
 * Safe delete operation
 */
export declare function safeDelete(key: string, provider: ICacheProvider): Promise<boolean>;
/**
 * Safe clear operation
 */
export declare function safeClear(provider: ICacheProvider): Promise<void>;
