"use strict";
/**
 * @fileoverview Types for cache configuration and operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheOperationType = void 0;
exports.CacheStats = CacheStats;
/**
 * Cache statistics for performance monitoring
 * @deprecated Use CacheStats from common.ts
 */
function CacheStats() {
}
/**
 * Cache operation types
 */
var CacheOperationType;
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
})(CacheOperationType || (exports.CacheOperationType = CacheOperationType = {}));
//# sourceMappingURL=cache-types.js.map