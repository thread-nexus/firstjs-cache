/**
 * @fileoverview Types for cache configuration and operations
 */
/**
 * Cache statistics for performance monitoring
 * @deprecated Use CacheStats from common.ts
 */
export function CacheStats() {
}
/**
 * Cache operation types
 */
export var CacheOperationType;
(function (CacheOperationType) {
    CacheOperationType["GET"] = "get";
    CacheOperationType["SET"] = "set";
    CacheOperationType["DELETE"] = "delete";
    CacheOperationType["CLEAR"] = "clear";
    CacheOperationType["HAS"] = "has";
    CacheOperationType["COMPUTE"] = "compute";
    CacheOperationType["REFRESH"] = "refresh";
    CacheOperationType["INVALIDATE"] = "invalidate";
    CacheOperationType["BATCH"] = "batch";
    CacheOperationType["TRANSACTION"] = "transaction";
})(CacheOperationType || (CacheOperationType = {}));
//# sourceMappingURL=cache-types.js.map