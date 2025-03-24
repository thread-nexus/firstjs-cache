"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManagerStats = exports.CacheManagerCore = exports.CacheManagerAdvanced = exports.CacheManager = void 0;
exports.createCacheManager = createCacheManager;
exports.default = default_1;
const cache_manager_1 = require("./cache-manager");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cache_manager_1.CacheManager; } });
const cache_manager_advanced_1 = require("./cache-manager-advanced");
Object.defineProperty(exports, "CacheManagerAdvanced", { enumerable: true, get: function () { return cache_manager_advanced_1.CacheManagerAdvanced; } });
const cache_manager_core_1 = require("./cache-manager-core");
Object.defineProperty(exports, "CacheManagerCore", { enumerable: true, get: function () { return cache_manager_core_1.CacheManagerCore; } });
const cache_manager_stats_1 = require("./cache-manager-stats");
Object.defineProperty(exports, "CacheManagerStats", { enumerable: true, get: function () { return cache_manager_stats_1.CacheManagerStats; } });
// Helper function to create a cache manager instance
function createCacheManager(config) {
    return new cache_manager_1.CacheManager(config);
}
// Export a default factory function
function default_1(config) {
    return createCacheManager(config);
}
//# sourceMappingURL=index.js.map