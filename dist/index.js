"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheErrorCode = exports.ensureError = exports.handleCacheError = exports.createCacheError = exports.MemoryAdapter = exports.subscribeToCacheEvents = exports.offCacheEvent = exports.onCacheEvent = exports.emitCacheEvent = exports.CacheError = exports.CacheEventType = exports.CacheManagerCore = exports.CacheManager = void 0;
// Import core components
const cache_manager_1 = require("./implementations/cache-manager");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cache_manager_1.CacheManager; } });
const cache_manager_core_1 = require("./implementations/cache-manager-core");
Object.defineProperty(exports, "CacheManagerCore", { enumerable: true, get: function () { return cache_manager_core_1.CacheManagerCore; } });
// Import event system
const cache_events_1 = require("./events/cache-events");
Object.defineProperty(exports, "CacheEventType", { enumerable: true, get: function () { return cache_events_1.CacheEventType; } });
Object.defineProperty(exports, "emitCacheEvent", { enumerable: true, get: function () { return cache_events_1.emitCacheEvent; } });
Object.defineProperty(exports, "onCacheEvent", { enumerable: true, get: function () { return cache_events_1.onCacheEvent; } });
Object.defineProperty(exports, "offCacheEvent", { enumerable: true, get: function () { return cache_events_1.offCacheEvent; } });
Object.defineProperty(exports, "subscribeToCacheEvents", { enumerable: true, get: function () { return cache_events_1.subscribeToCacheEvents; } });
// Import error utilities
const error_utils_1 = require("./utils/error-utils");
Object.defineProperty(exports, "CacheError", { enumerable: true, get: function () { return error_utils_1.CacheError; } });
Object.defineProperty(exports, "CacheErrorCode", { enumerable: true, get: function () { return error_utils_1.CacheErrorCode; } });
Object.defineProperty(exports, "createCacheError", { enumerable: true, get: function () { return error_utils_1.createCacheError; } });
Object.defineProperty(exports, "handleCacheError", { enumerable: true, get: function () { return error_utils_1.handleCacheError; } });
Object.defineProperty(exports, "ensureError", { enumerable: true, get: function () { return error_utils_1.ensureError; } });
// Import adapters
const memory_adapter_1 = require("./adapters/memory-adapter");
Object.defineProperty(exports, "MemoryAdapter", { enumerable: true, get: function () { return memory_adapter_1.MemoryAdapter; } });
// Create a convenience object for module exports
const CacheModule = {
    CacheManager: cache_manager_1.CacheManager,
    CacheManagerCore: cache_manager_core_1.CacheManagerCore,
    CacheEventType: cache_events_1.CacheEventType,
    CacheErrorCode: error_utils_1.CacheErrorCode,
    CacheError: error_utils_1.CacheError,
    // Event system
    emitCacheEvent: cache_events_1.emitCacheEvent,
    onCacheEvent: cache_events_1.onCacheEvent,
    offCacheEvent: cache_events_1.offCacheEvent,
    // Adapters
    MemoryAdapter: memory_adapter_1.MemoryAdapter,
    // Utilities
    createCacheError: error_utils_1.createCacheError,
    handleCacheError: error_utils_1.handleCacheError,
};
// Export default module
exports.default = CacheModule;
//# sourceMappingURL=index.js.map