/**
 * @fileoverview Cache events system
 */
import { CacheEventPayload as ImportedCacheEventPayload } from '../types/common';
/**
 * Types of cache events
 */
export declare enum CacheEventType {
    GET = "get",
    SET = "set",
    DELETE = "delete",
    CLEAR = "clear",
    ERROR = "error",
    EXPIRE = "expire",
    GET_HIT = "get_hit",
    GET_MISS = "get_miss",
    GET_STALE = "get_stale",
    COMPUTE_START = "compute_start",
    COMPUTE_SUCCESS = "compute_success",
    COMPUTE_ERROR = "compute_error",
    METADATA_UPDATE = "metadata_update",
    METADATA_DELETE = "metadata_delete",
    METADATA_CLEAR = "metadata_clear",
    PROVIDER_INITIALIZED = "provider_initialized",
    PROVIDER_REMOVED = "provider_removed",
    PROVIDER_ERROR = "provider_error",
    PERFORMANCE = "performance",
    STATS_UPDATE = "stats_update",
    INVALIDATE = "invalidate",
    REFRESH_START = "refresh:start",
    REFRESH_SUCCESS = "refresh:success",
    REFRESH_ERROR = "refresh:error"
}
/**
 * Cache event payload
 */
export interface CacheEventPayload extends ImportedCacheEventPayload {
}
/**
 * Cache event listener
 */
export type CacheEventListener = (payload: CacheEventPayload & {
    type: CacheEventType | string;
}) => void;
/**
 * Emit a cache event
 */
export declare function emitCacheEvent(type: CacheEventType, payload: Partial<CacheEventPayload>): void;
/**
 * Subscribe to cache events
 *
 * @param eventType - Type of event or 'all' for all events
 * @param listener - Event listener function
 * @returns Unsubscribe function
 */
export declare function onCacheEvent(eventType: CacheEventType | 'all', listener: CacheEventListener): () => void;
/**
 * Alias for onCacheEvent for more descriptive usage
 */
export declare const subscribeToCacheEvents: typeof onCacheEvent;
/**
 * Unsubscribe from cache events (alias for the function returned by onCacheEvent)
 */
export declare const offCacheEvent: (unsubscribeFn: () => void) => void;
