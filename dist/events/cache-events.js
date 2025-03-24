"use strict";
/**
 * @fileoverview Cache events system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.offCacheEvent = exports.subscribeToCacheEvents = exports.CacheEventType = void 0;
exports.emitCacheEvent = emitCacheEvent;
exports.onCacheEvent = onCacheEvent;
/**
 * Types of cache events
 */
var CacheEventType;
(function (CacheEventType) {
    CacheEventType["GET"] = "get";
    CacheEventType["SET"] = "set";
    CacheEventType["DELETE"] = "delete";
    CacheEventType["CLEAR"] = "clear";
    CacheEventType["ERROR"] = "error";
    CacheEventType["EXPIRE"] = "expire";
    // Add missing event types
    CacheEventType["GET_HIT"] = "get_hit";
    CacheEventType["GET_MISS"] = "get_miss";
    CacheEventType["GET_STALE"] = "get_stale";
    CacheEventType["COMPUTE_START"] = "compute_start";
    CacheEventType["COMPUTE_SUCCESS"] = "compute_success";
    CacheEventType["COMPUTE_ERROR"] = "compute_error";
    CacheEventType["METADATA_UPDATE"] = "metadata_update";
    CacheEventType["METADATA_DELETE"] = "metadata_delete";
    CacheEventType["METADATA_CLEAR"] = "metadata_clear";
    CacheEventType["PROVIDER_INITIALIZED"] = "provider_initialized";
    CacheEventType["PROVIDER_REMOVED"] = "provider_removed";
    CacheEventType["PROVIDER_ERROR"] = "provider_error";
    CacheEventType["PERFORMANCE"] = "performance";
    CacheEventType["STATS_UPDATE"] = "stats_update";
    CacheEventType["INVALIDATE"] = "invalidate";
    CacheEventType["REFRESH_START"] = "refresh:start";
    CacheEventType["REFRESH_SUCCESS"] = "refresh:success";
    CacheEventType["REFRESH_ERROR"] = "refresh:error";
})(CacheEventType || (exports.CacheEventType = CacheEventType = {}));
/**
 * Cache event bus
 */
class CacheEventBus {
    constructor() {
        this.listeners = new Map();
    }
    /**
     * Subscribe to cache events
     *
     * @param eventType - Type of event or 'all' for all events
     * @param listener - Event listener function
     * @returns Unsubscribe function
     */
    on(eventType, listener) {
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
        }
        else {
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
    addListener(eventType, listener) {
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
    removeListener(eventType, listener) {
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
    emit(eventType, payload) {
        const listeners = this.listeners.get(eventType);
        if (listeners) {
            const event = { ...payload, type: eventType };
            for (const listener of listeners) {
                try {
                    listener(event);
                }
                catch (error) {
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
function emitCacheEvent(type, payload) {
    const eventPayload = {
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
function onCacheEvent(eventType, listener) {
    return eventBus.on(eventType, listener);
}
/**
 * Alias for onCacheEvent for more descriptive usage
 */
exports.subscribeToCacheEvents = onCacheEvent;
/**
 * Unsubscribe from cache events (alias for the function returned by onCacheEvent)
 */
const offCacheEvent = (unsubscribeFn) => {
    unsubscribeFn();
};
exports.offCacheEvent = offCacheEvent;
//# sourceMappingURL=cache-events.js.map