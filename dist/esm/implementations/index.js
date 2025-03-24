import { CacheManager } from './cache-manager';
import { CacheManagerAdvanced } from './cache-manager-advanced';
import { CacheManagerCore } from './cache-manager-core';
import { CacheManagerStats } from './cache-manager-stats';
// Export the main classes
export { CacheManager, CacheManagerAdvanced, CacheManagerCore, CacheManagerStats };
// Helper function to create a cache manager instance
export function createCacheManager(config) {
    return new CacheManager(config);
}
// Export a default factory function
export default function (config) {
    return createCacheManager(config);
}
//# sourceMappingURL=index.js.map