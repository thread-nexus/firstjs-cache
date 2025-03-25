/**
 * @fileoverview Operation types for the cache system
 */

import {CacheOptions} from './cache-types';

/**
 * Cache operation types
 */
export enum CacheOperationType {
  /**
   * Get operation
   */
  GET = 'GET',
  
  /**
   * Set operation
   */
  SET = 'SET',
  
  /**
   * Delete operation
   */
  DELETE = 'DELETE',
  
  /**
   * Clear operation
   */
  CLEAR = 'CLEAR',
  
  /**
   * Has operation
   */
  HAS = 'HAS',
  
  /**
   * Get many operation
   */
  GET_MANY = 'GET_MANY',
  
  /**
   * Set many operation
   */
  SET_MANY = 'SET_MANY',
  
  /**
   * Delete many operation
   */
  DELETE_MANY = 'DELETE_MANY',
  
  /**
   * Compute operation
   */
  COMPUTE = 'COMPUTE',
  
  /**
   * Invalidate by tag operation
   */
  INVALIDATE_BY_TAG = 'INVALIDATE_BY_TAG',
  
  /**
   * Invalidate by prefix operation
   */
  INVALIDATE_BY_PREFIX = 'INVALIDATE_BY_PREFIX',
  
  /**
   * Get stats operation
   */
  GET_STATS = 'GET_STATS',
  
  /**
   * Health check operation
   */
  HEALTH_CHECK = 'HEALTH_CHECK'
}

/**
 * Base interface for cache operations
 */
export interface CacheOperation {
  /**
   * Operation type
   */
  type: CacheOperationType;
  
  /**
   * Operation ID
   */
  id: string;
  
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
 * Get operation
 */
export interface GetOperation extends CacheOperation {
  type: CacheOperationType.GET;
  key: string;
  defaultValue?: any;
}

/**
 * Set operation
 */
export interface SetOperation extends CacheOperation {
  type: CacheOperationType.SET;
  key: string;
  value: any;
  options?: CacheOptions;
}

/**
 * Delete operation
 */
export interface DeleteOperation extends CacheOperation {
  type: CacheOperationType.DELETE;
  key: string;
}

/**
 * Clear operation
 */
export interface ClearOperation extends CacheOperation {
  type: CacheOperationType.CLEAR;
}

/**
 * Has operation
 */
export interface HasOperation extends CacheOperation {
  type: CacheOperationType.HAS;
  key: string;
}

/**
 * Get many operation
 */
export interface GetManyOperation extends CacheOperation {
  type: CacheOperationType.GET_MANY;
  keys: string[];
}

/**
 * Set many operation
 */
export interface SetManyOperation extends CacheOperation {
  type: CacheOperationType.SET_MANY;
  entries: Record<string, any>;
  options?: CacheOptions;
}

/**
 * Delete many operation
 */
export interface DeleteManyOperation extends CacheOperation {
  type: CacheOperationType.DELETE_MANY;
  keys: string[];
}

/**
 * Compute operation
 */
export interface ComputeOperation extends CacheOperation {
  type: CacheOperationType.COMPUTE;
  key: string;
  fn: () => Promise<any>;
  options?: CacheOptions;
}

/**
 * Invalidate by tag operation
 */
export interface InvalidateByTagOperation extends CacheOperation {
  type: CacheOperationType.INVALIDATE_BY_TAG;
  tag: string;
}

/**
 * Invalidate by prefix operation
 */
export interface InvalidateByPrefixOperation extends CacheOperation {
  type: CacheOperationType.INVALIDATE_BY_PREFIX;
  prefix: string;
}

/**
 * Get stats operation
 */
export interface GetStatsOperation extends CacheOperation {
  type: CacheOperationType.GET_STATS;
}

/**
 * Health check operation
 */
export interface HealthCheckOperation extends CacheOperation {
  type: CacheOperationType.HEALTH_CHECK;
}

/**
 * Union type for all cache operations
 */
export type AnyCacheOperation =
  | GetOperation
  | SetOperation
  | DeleteOperation
  | ClearOperation
  | HasOperation
  | GetManyOperation
  | SetManyOperation
  | DeleteManyOperation
  | ComputeOperation
  | InvalidateByTagOperation
  | InvalidateByPrefixOperation
  | GetStatsOperation
  | HealthCheckOperation;

/**
 * Batch operation options
 */
export interface BatchOptions {
  /**
   * Maximum batch size
   */
  maxBatchSize?: number;
  
  /**
   * Provider to use
   */
  provider?: string;
  
  /**
   * Whether to throw on error
   */
  throwOnError?: boolean;
  
  /**
   * Whether to continue on error
   */
  continueOnError?: boolean;
}

/**
 * Batch operation result
 */
export interface BatchResult {
  /**
   * Results for each operation
   */
  results: Array<{
    /**
     * Operation index
     */
    index: number;
    
    /**
     * Whether the operation was successful
     */
    success: boolean;
    
    /**
     * Operation result
     */
    result?: any;
    
    /**
     * Error if operation failed
     */
    error?: Error;
  }>;
  
  /**
   * Whether all operations were successful
   */
  success: boolean;
  
  /**
   * Number of successful operations
   */
  successCount: number;
  
  /**
   * Number of failed operations
   */
  failureCount: number;
  
  /**
   * Duration in milliseconds
   */
  duration: number;
}