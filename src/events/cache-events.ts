/**
 * @fileoverview Cache event system for monitoring and responding to cache operations
 */
import { EventEmitter } from 'events';

// Cache event emitter instance
export const cacheEventEmitter = new EventEmitter();

// Cache event types
export enum CacheEventType {
  SET = 'set',
  GET = 'get',
  GET_HIT = 'get:hit',
  GET_MISS = 'get:miss',
  DELETE = 'delete',
  CLEAR = 'clear',
  EXPIRE = 'expire',
  ERROR = 'error',
  INVALIDATE = 'invalidate',
  STATS_UPDATE = 'stats:update',
  METADATA_UPDATE = 'metadata:update',
  METADATA_DELETE = 'metadata:delete',
  METADATA_CLEAR = 'metadata:clear',
  PROVIDER_INITIALIZED = 'provider:initialized',
  PROVIDER_REMOVED = 'provider:removed',
  PROVIDER_ERROR = 'provider:error',
  COMPUTE_START = 'compute:start',
  COMPUTE_SUCCESS = 'compute:success',
  COMPUTE_ERROR = 'compute:error',
  REFRESH_START = 'refresh:start',
  REFRESH_SUCCESS = 'refresh:success',
  REFRESH_ERROR = 'refresh:error',
}

// Event listener type
export type CacheEventListener = (eventData: any) => void;

// Event registry
const eventListeners: Map<string, Set<CacheEventListener>> = new Map();
const wildcardListeners: Set<CacheEventListener> = new Set();

/**
 * Register an event listener
 * 
 * @param eventType - Event type to listen for, or '*' for all events
 * @param listener - Event listener function
 */
export function onCacheEvent(eventType: string, listener: CacheEventListener): void {
  if (eventType === '*') {
    wildcardListeners.add(listener);
    cacheEventEmitter.on('*', listener);
    return;
  }

  if (!eventListeners.has(eventType)) {
    eventListeners.set(eventType, new Set());
  }

  eventListeners.get(eventType)!.add(listener);
  cacheEventEmitter.on(eventType, listener);
}

/**
 * Remove an event listener
 * 
 * @param eventType - Event type the listener was registered for
 * @param listener - Event listener function to remove
 * @returns True if the listener was removed, false otherwise
 */
export function offCacheEvent(eventType: string, listener: CacheEventListener): boolean {
  if (eventType === '*') {
    cacheEventEmitter.off('*', listener);
    return wildcardListeners.delete(listener);
  }

  const listeners = eventListeners.get(eventType);
  if (!listeners) return false;

  cacheEventEmitter.off(eventType, listener);
  const result = listeners.delete(listener);
  
  // Clean up empty listener sets
  if (listeners.size === 0) {
    eventListeners.delete(eventType);
  }

  return result;
}

/**
 * Emit a cache event
 * 
 * @param eventType - Type of event to emit
 * @param data - Event data
 */
export function emitCacheEvent(eventType: string, data: any): void {
  const eventData = {
    ...data,
    timestamp: Date.now() // Use numeric timestamp instead of Date object
  };

      try {
    // Emit the event through the EventEmitter
    cacheEventEmitter.emit(eventType, eventData);
    cacheEventEmitter.emit('*', eventData);
      } catch (error) {
    console.error(`Error emitting cache event ${eventType}:`, error);
      }
}

/**
 * Get the count of registered listeners
 * 
 * @returns Count of registered listeners
 */
export function getListenerCount(): Record<string, number> {
  const counts: Record<string, number> = {
    '*': wildcardListeners.size
  };

  for (const [eventType, listeners] of eventListeners.entries()) {
    counts[eventType] = listeners.size;
  }

  return counts;
}

/**
 * Clear all event listeners
 */
export function clearAllListeners(): void {
  cacheEventEmitter.removeAllListeners();
  eventListeners.clear();
  wildcardListeners.clear();
}

/**
 * Remove all listeners for a specific event
 * 
 * @param event - Event to remove listeners for
 */
export function removeAllListeners(event?: string | symbol): void {
  if (event) {
    cacheEventEmitter.removeAllListeners(event);
    if (typeof event === 'string') {
      eventListeners.delete(event);
    }
    if (event === '*') {
      wildcardListeners.clear();
    }
  } else {
    clearAllListeners();
  }
}

/**
 * Create a logger function that logs cache events at the specified level
 * 
 * @param level - Log level
 * @returns Logger function
 */
export function createCacheEventLogger(level: 'error' | 'warn' | 'info' | 'debug' = 'info'): CacheEventListener {
  return (eventData: any) => {
    const { type, timestamp, ...data } = eventData;
    // Handle timestamp validation to prevent errors
    let time;
    try {
      time = new Date(timestamp).toISOString();
    } catch (e) {
      time = new Date().toISOString();
    }
    
    switch (level) {
      case 'error':
        console.error(`[CACHE ${type}] ${time}:`, data);
        break;
      case 'warn':
        console.warn(`[CACHE ${type}] ${time}:`, data);
        break;
      case 'debug':
        console.debug(`[CACHE ${type}] ${time}:`, data);
        break;
      case 'info':
      default:
        console.info(`[CACHE ${type}] ${time}:`, data);
        break;
    }
  };
}