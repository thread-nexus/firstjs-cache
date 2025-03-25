/**
 * @fileoverview Cache event system
 */

import {EventEmitter} from 'events';
import {CacheEventPayload} from '../types';

// Create global event emitter
const eventEmitter = new EventEmitter();

/**
 * Cache event types
 */
export enum CacheEventType {
  HIT = 'hit',
  MISS = 'miss',
  GET_HIT = 'get_hit',
  GET_MISS = 'get_miss',
  SET = 'set',
  DELETE = 'delete',
  CLEAR = 'clear',
  ERROR = 'error',
  EXPIRED = 'expired',
  EXPIRE = 'expire',
  STATS_UPDATE = 'stats_update',
  PROVIDER_INITIALIZED = 'provider_initialized',
  PROVIDER_ERROR = 'provider_error',
  PROVIDER_REMOVED = 'provider_removed',
  RATE_LIMITED = 'rate_limited',
  HEALTH_CHECK = 'health_check',
  METADATA_UPDATE = 'metadata_update',
  METADATA_DELETE = 'metadata_delete',
  METADATA_CLEAR = 'metadata_clear',
  GET_STALE = 'get_stale',
  REFRESH_SUCCESS = 'refresh_success',
  REFRESH_ERROR = 'refresh_error',
  REFRESH_START = 'refresh_start',
  GET_MANY = 'get_many',
  SET_MANY = 'set_many',
  COMPUTE_START = 'compute_start',
  COMPUTE_SUCCESS = 'compute_success',
  COMPUTE_ERROR = 'compute_error',
  INVALIDATE = 'invalidate',
  METRICS = "METRICS",
  METRICS_SUMMARY = "METRICS_SUMMARY",
  LOG = "LOG",
  CONNECTION = "CONNECTION",
  BATCH = "BATCH"
}

/**
 * Emit a cache event
 * 
 * @param type The event type
 * @param payload The event payload
 */
export function emitCacheEvent(
  type: CacheEventType,
  payload: Partial<CacheEventPayload> = {}
): void {
  const event = {
    type: type.toString(),
    timestamp: Date.now(),
    ...payload
  };
  
  eventEmitter.emit(type.toString(), event);
  eventEmitter.emit('*', event);
}

/**
 * Subscribe to cache events
 * 
 * @param type The event type or '*' for all events
 * @param handler The event handler
 * @returns A function to unsubscribe
 */
export function subscribeToCacheEvents(
  type: CacheEventType | '*',
  handler: (event: any) => void
): () => void {
  const eventType = type === '*' ? '*' : type.toString();
  eventEmitter.on(eventType, handler);
  
  return () => {
    eventEmitter.off(eventType, handler);
  };
}

/**
 * Alias for subscribeToCacheEvents for backward compatibility
 */
export const onCacheEvent = subscribeToCacheEvents;

/**
 * Unsubscribe from a cache event
 * 
 * @param type The event type or '*' for all events
 * @param handler The event handler
 */
export function offCacheEvent(
  type: CacheEventType | '*',
  handler: (event: any) => void
): void {
  const eventType = type === '*' ? '*' : type.toString();
  eventEmitter.off(eventType, handler);
}

/**
 * Get the event emitter
 * 
 * @returns The event emitter
 */
export function getEventEmitter(): EventEmitter {
  return eventEmitter;
}
