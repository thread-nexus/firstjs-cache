"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeToCacheEvents = exports.emitCacheEvent = exports.CacheEventType = void 0;
/**
 * @enum {string}
 * Cache event types for monitoring and tracking cache operations
 *
 * @remarks
 * These events are emitted during various cache operations and can be used
 * for monitoring, debugging, and performance tracking.
 */
var CacheEventType;
(function (CacheEventType) {
    /** Emitted when attempting to get a value */
    CacheEventType["GET"] = "cache:get";
    /** Emitted on successful cache hit */
    CacheEventType["GET_HIT"] = "cache:get:hit";
    /** Emitted on cache miss */
    CacheEventType["GET_MISS"] = "cache:get:miss";
    /** Emitted when setting a value */
    CacheEventType["SET"] = "cache:set";
    /** Emitted when deleting a value */
    CacheEventType["DELETE"] = "cache:delete";
    /** Emitted when clearing the cache */
    CacheEventType["CLEAR"] = "cache:clear";
    /** Emitted on errors */
    CacheEventType["ERROR"] = "cache:error";
    /** Emitted when an entry expires */
    CacheEventType["EXPIRE"] = "cache:expire";
    /** Emitted when invalidating entries */
    CacheEventType["INVALIDATE"] = "cache:invalidate";
    /** Emitted when starting computation */
    CacheEventType["COMPUTE_START"] = "cache:compute:start";
    /** Emitted on successful computation */
    CacheEventType["COMPUTE_SUCCESS"] = "cache:compute:success";
    /** Emitted on computation error */
    CacheEventType["COMPUTE_ERROR"] = "cache:compute:error";
    /** Emitted when starting background refresh */
    CacheEventType["REFRESH_START"] = "cache:refresh:start";
    /** Emitted on successful refresh */
    CacheEventType["REFRESH_SUCCESS"] = "cache:refresh:success";
    /** Emitted on refresh error */
    CacheEventType["REFRESH_ERROR"] = "cache:refresh:error";
    /** Emitted when stats are updated */
    CacheEventType["STATS_UPDATE"] = "cache:stats:update";
    /** Emitted when stats are reset */
    CacheEventType["STATS_RESET"] = "cache:stats:reset";
    /** Emitted when a provider is initialized */
    CacheEventType["PROVIDER_INITIALIZED"] = "cache:provider:initialized";
    /** Emitted during cache cleanup */
    CacheEventType["CLEANUP"] = "cache:cleanup";
    /** Emitted when metadata is updated */
    CacheEventType["METADATA_UPDATE"] = "cache:metadata:update";
    /** Emitted when metadata is deleted */
    CacheEventType["METADATA_DELETE"] = "cache:metadata:delete";
    /** Emitted when metadata is cleared */
    CacheEventType["METADATA_CLEAR"] = "cache:metadata:clear";
})(CacheEventType || (exports.CacheEventType = CacheEventType = {}));
class emitCacheEvent {
    constructor(STATS_UPDATE, param2) {
    }
}
exports.emitCacheEvent = emitCacheEvent;
class subscribeToCacheEvents {
}
exports.subscribeToCacheEvents = subscribeToCacheEvents;
