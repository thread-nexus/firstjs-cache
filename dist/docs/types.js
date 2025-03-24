"use strict";
/**
 * @fileoverview Core documentation types and interfaces for the cache module.
 * These types are used throughout the codebase to ensure consistent documentation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheOperationStatus = void 0;
/**
 * Cache operation result status
 * @enum {string}
 */
var CacheOperationStatus;
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
})(CacheOperationStatus || (exports.CacheOperationStatus = CacheOperationStatus = {}));
//# sourceMappingURL=types.js.map