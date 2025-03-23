import { EventEmitter } from 'events';

/**
 * @enum {string}
 * Cache event types for monitoring and tracking cache operations
 * 
 * @remarks
 * These events are emitted during various cache operations and can be used
 * for monitoring, debugging, and performance tracking.
 */
export enum CacheEventType {
  /** Emitted when attempting to get a value */
  GET = 'cache:get',
  /** Emitted on successful cache hit */
  GET_HIT = 'cache:get:hit',
  /** Emitted on cache miss */
  GET_MISS = 'cache:get:miss',
  /** Emitted when getting stale data while computing fresh data */
  GET_STALE = 'cache:get:stale',
  /** Emitted when setting a value */
  SET = 'cache:set',
  /** Emitted when deleting a value */
  DELETE = 'cache:delete',
  /** Emitted when clearing the cache */
  CLEAR = 'cache:clear',
  /** Emitted on errors */
  ERROR = 'cache:error',
  /** Emitted when an entry expires */
  EXPIRE = 'cache:expire',
  /** Emitted when invalidating entries */
  INVALIDATE = 'cache:invalidate',
  /** Emitted when starting computation */
  COMPUTE_START = 'cache:compute:start',
  /** Emitted on successful computation */
  COMPUTE_SUCCESS = 'cache:compute:success',
  /** Emitted on computation error */
  COMPUTE_ERROR = 'cache:compute:error',
  /** Emitted when starting background refresh */
  REFRESH_START = 'cache:refresh:start',
  /** Emitted on successful refresh */
  REFRESH_SUCCESS = 'cache:refresh:success',
  /** Emitted on refresh error */
  REFRESH_ERROR = 'cache:refresh:error',
  /** Emitted when stats are updated */
  STATS_UPDATE = 'cache:stats:update',
  /** Emitted when stats are reset */
  STATS_RESET = 'cache:stats:reset',
  /** Emitted when a provider is initialized */
  PROVIDER_INITIALIZED = 'cache:provider:initialized',
  /** Emitted during cache cleanup */
  CLEANUP = 'cache:cleanup',
  /** Emitted when metadata is updated */
  METADATA_UPDATE = 'cache:metadata:update',
  /** Emitted when metadata is deleted */
  METADATA_DELETE = 'cache:metadata:delete',
  /** Emitted when metadata is cleared */
  METADATA_CLEAR = 'cache:metadata:clear'
}

/**
 * Cache event payload interface
 */
export interface CacheEventPayload {
  key?: string;
  keys?: string[];
  pattern?: string;
  prefix?: string;
  tag?: string;
  tags?: string[];
  value?: any;
  size?: number;
  duration?: number;
  ttl?: number;
  error?: Error;
  message?: string;
  success?: boolean;
  stats?: Record<string, any>;
  metadata?: Record<string, any>;
  provider?: string;
  batchSize?: number;
  entriesRemoved?: number;
  computeTime?: number;
  timestamp?: number;
  [key: string]: any;
}

// Singleton event emitter instance with wildcard support
class CacheEventEmitter extends EventEmitter {
  constructor() {
    super();
    // Set higher limit for event listeners to avoid memory leak warnings
    this.setMaxListeners(100);
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    // Add timestamp to event payload if not present
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
      if (!args[0].timestamp) {
        args[0].timestamp = Date.now();
      }
    }
    
    // Emit to specific event listeners
    const result = super.emit(event, ...args);
    
    // Also emit to wildcard listeners
    if (event !== '*') {
      super.emit('*', ...args);
    }
    
    return result;
  }
  
  // Add removeAllListeners method that the tests expect
  removeAllListeners(event?: string | symbol): this {
    return super.removeAllListeners(event);
  }
}

// Create singleton instance
export const cacheEventEmitter = new CacheEventEmitter();

/**
 * Emit a cache event
 * 
 * @param eventType - Type of event to emit
 * @param payload - Event payload data
 */
export function emitCacheEvent(eventType: CacheEventType | string, payload: CacheEventPayload = {}): void {
  cacheEventEmitter.emit(eventType, payload);
}

/**
 * Subscribe to cache events
 * 
 * @param eventType - Type of event to listen for, or '*' for all events
 * @param listener - Event listener callback
 * @returns Unsubscribe function
 */
export function subscribeToCacheEvents(
  eventType: CacheEventType | string,
  listener: (payload: CacheEventPayload) => void
): () => void {
  cacheEventEmitter.on(eventType, listener);
  
  // Return unsubscribe function
  return () => {
    cacheEventEmitter.off(eventType, listener);
  };
}

/**
 * Get the event emitter instance
 * @returns The event emitter
 */
export function getCacheEventEmitter(): EventEmitter {
  return cacheEventEmitter;
}

/**
 * Create a cache event logger
 * 
 * @param level - Log level (error, warn, info, debug)
 * @returns Event listener function
 */
export function createCacheEventLogger(level: 'error' | 'warn' | 'info' | 'debug' = 'info'): (payload: CacheEventPayload) => void {
  return (payload: CacheEventPayload) => {
    const { timestamp, ...rest } = payload;
    const time = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
    const message = `[${time}] Cache Event: ${JSON.stringify(rest)}`;
    
    switch (level) {
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'debug':
        console.debug(message);
        break;
      case 'info':
      default:
        console.info(message);
        break;
    }
  };
}