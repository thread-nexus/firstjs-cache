/**
 * @fileoverview Core documentation types and interfaces for the cache module.
 * These types are used throughout the codebase to ensure consistent documentation.
 */
/**
 * Cache operation result status
 * @enum {string}
 */
export var CacheOperationStatus;
(function (CacheOperationStatus) {
    /** Operation completed successfully */
    CacheOperationStatus["SUCCESS"] = "success";
    /** Operation failed */
    CacheOperationStatus["ERROR"] = "error";
    /** Operation is pending or in progress */
    CacheOperationStatus["PENDING"] = "pending";
    /** Operation resulted in a cache miss */
    CacheOperationStatus["MISS"] = "miss";
    /** Operation resulted in a cache hit */
    CacheOperationStatus["HIT"] = "hit";
})(CacheOperationStatus || (CacheOperationStatus = {}));
//# sourceMappingURL=types.js.map