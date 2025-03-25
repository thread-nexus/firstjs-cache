/**
 * @fileoverview Event types for the cache system
 */

/**
 * Cache event types
 */
export enum CacheEventType {
  /**
   * Cache hit
   */
  GET_HIT = 'GET_HIT',
  
  /**
   * Cache miss
   */
  GET_MISS = 'GET_MISS',
  
  /**
   * Value set in cache
   */
  SET = 'SET',
  
  /**
   * Value deleted from cache
   */
  DELETE = 'DELETE',
  
  /**
   * Cache cleared
   */
  CLEAR = 'CLEAR',
  
  /**
   * Cache entries invalidated by tag
   */
  INVALIDATE_BY_TAG = 'INVALIDATE_BY_TAG',
  
  /**
   * Value computed and cached
   */
  COMPUTE = 'COMPUTE',
  
  /**
   * Value refreshed in background
   */
  BACKGROUND_REFRESH = 'BACKGROUND_REFRESH',
  
  /**
   * Error occurred
   */
  ERROR = 'ERROR',
  
  /**
   * Warning occurred
   */
  WARNING = 'WARNING',
  
  /**
   * Value promoted between cache layers
   */
  PROMOTE = 'PROMOTE',
  
  /**
   * Value evicted from cache
   */
  EVICT = 'EVICT',
  
  /**
   * Cache stats collected
   */
  STATS = 'STATS',
  
  /**
   * Cache provider initialized
   */
  PROVIDER_INIT = 'PROVIDER_INIT',
  
  /**
   * Cache provider disposed
   */
  PROVIDER_DISPOSE = 'PROVIDER_DISPOSE'
}

/**
 * Cache event payload
 */
export interface CacheEventPayload {
  /**
   * Cache key
   */
  key?: string;
  
  /**
   * Multiple keys for batch operations
   */
  keys?: string[];
  
  /**
   * Tag for invalidation events
   */
  tag?: string;
  
  /**
   * Cache layer name
   */
  layer?: string;
  
  /**
   * Time-to-live in seconds
   */
  ttl?: number;
  
  /**
   * Tags associated with the entry
   */
  tags?: string[];
  
  /**
   * Error object
   */
  error?: any;
  
  /**
   * Informational message
   */
  message?: string;
  
  /**
   * Operation duration in milliseconds
   */
  duration?: number;
  
  /**
   * Provider name
   */
  provider?: string;
  
  /**
   * Cache statistics
   */
  stats?: any;
  
  /**
   * Source layer for promotion events
   */
  fromLayer?: string;
  
  /**
   * Destination layer for promotion events
   */
  toLayer?: string;
  
  /**
   * Event timestamp
   */
  timestamp?: number;
  
  /**
   * Additional data
   */
  [key: string]: any;
}

/**
 * Cache event listener function
 */
export type CacheEventListener = (payload: CacheEventPayload) => void;

/**
 * Cache event subscription
 */
export interface CacheEventSubscription {
  /**
   * Event type
   */
  eventType: CacheEventType;
  
  /**
   * Listener function
   */
  listener: CacheEventListener;
  
  /**
   * Unsubscribe function
   */
  unsubscribe: () => void;
}