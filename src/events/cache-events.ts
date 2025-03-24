/**
 * @fileoverview Cache events system
 */

// Rename the import to avoid conflict
import { CacheEventPayload as ImportedCacheEventPayload } from '../types/common';

/**
 * Types of cache events
 */
export enum CacheEventType {
  GET = 'get',
  SET = 'set',
  DELETE = 'delete',
  CLEAR = 'clear',
  ERROR = 'error',
  EXPIRE = 'expire',
  
  // Add missing event types
  GET_HIT = 'get_hit',
  GET_MISS = 'get_miss',
  GET_STALE = 'get_stale',
  
  COMPUTE_START = 'compute_start',
  COMPUTE_SUCCESS = 'compute_success',
  COMPUTE_ERROR = 'compute_error',
  
  METADATA_UPDATE = 'metadata_update',
  METADATA_DELETE = 'metadata_delete',
  METADATA_CLEAR = 'metadata_clear',
  
  PROVIDER_INITIALIZED = 'provider_initialized',
  PROVIDER_REMOVED = 'provider_removed',
  PROVIDER_ERROR = 'provider_error',
  
  PERFORMANCE = 'performance',
  STATS_UPDATE = 'stats_update',
  INVALIDATE = 'invalidate',
  
  REFRESH_START = 'refresh:start',
  REFRESH_SUCCESS = 'refresh:success',
  REFRESH_ERROR = 'refresh:error'
}

/**
 * Cache event payload
 */
// Define local interface that extends the imported one
export interface CacheEventPayload extends ImportedCacheEventPayload {
  // Additional properties specific to this module can be added here
}

/**
 * Cache event listener
 */
export type CacheEventListener = (payload: CacheEventPayload & { type: CacheEventType | string }) => void;

/**
 * Cache event bus
 */
class CacheEventBus {
  private listeners = new Map<CacheEventType | string, Set<CacheEventListener>>();

  /**
   * Subscribe to cache events
   * 
   * @param eventType - Type of event or 'all' for all events
   * @param listener - Event listener function
   * @returns Unsubscribe function
   */
  on(eventType: CacheEventType | 'all', listener: CacheEventListener): () => void {
    if (eventType === 'all') {
      // Subscribe to all event types
      for (const type of Object.values(CacheEventType)) {
        this.addListener(type, listener);
      }
      
      return () => {
        for (const type of Object.values(CacheEventType)) {
          this.removeListener(type, listener);
        }
      };
    } else {
      this.addListener(eventType, listener);
      
      return () => {
        this.removeListener(eventType, listener);
      };
    }
  }

  /**
   * Add event listener
   * 
   * @param eventType - Type of event
   * @param listener - Event listener function
   */
  private addListener(eventType: CacheEventType | string, listener: CacheEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)?.add(listener);
  }

  /**
   * Remove event listener
   * 
   * @param eventType - Type of event
   * @param listener - Event listener function
   */
  private removeListener(eventType: CacheEventType | string, listener: CacheEventListener): void {
    const listeners = this.listeners.get(eventType);
    
    if (listeners) {
      listeners.delete(listener);
      
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Emit a cache event
   * 
   * @param eventType - Type of event
   * @param payload - Event payload
   */
  emit(eventType: CacheEventType | string, payload: CacheEventPayload): void {
    const listeners = this.listeners.get(eventType);
    
    if (listeners) {
      const event = { ...payload, type: eventType };
      
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in cache event listener for ${eventType}:`, error);
        }
      }
    }
  }
}

// Singleton event bus
const eventBus = new CacheEventBus();

/**
 * Emit a cache event
 */
export function emitCacheEvent(type: CacheEventType, payload: Partial<CacheEventPayload>): void {
  const eventPayload: CacheEventPayload = {
    type: type.toString(),
    timestamp: Date.now(),
    ...payload
  };

  eventBus.emit(type, eventPayload);
}

/**
 * Subscribe to cache events
 * 
 * @param eventType - Type of event or 'all' for all events
 * @param listener - Event listener function
 * @returns Unsubscribe function
 */
export function onCacheEvent(eventType: CacheEventType | 'all', listener: CacheEventListener): () => void {
  return eventBus.on(eventType, listener);
}

/**
 * Alias for onCacheEvent for more descriptive usage
 */
export const subscribeToCacheEvents = onCacheEvent;

/**
 * Unsubscribe from cache events (alias for the function returned by onCacheEvent)
 */
export const offCacheEvent = (unsubscribeFn: () => void): void => {
  unsubscribeFn();
};
