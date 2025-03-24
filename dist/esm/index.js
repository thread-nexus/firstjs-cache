// Import core components
import { CacheManager } from './implementations/cache-manager';
import { CacheManagerCore } from './implementations/cache-manager-core';
// Import event system
import { CacheEventType, emitCacheEvent, onCacheEvent, offCacheEvent, subscribeToCacheEvents } from './events/cache-events';
// Import error utilities
import { CacheError, CacheErrorCode, createCacheError, handleCacheError, ensureError } from './utils/error-utils';
// Import adapters
import { MemoryAdapter } from './adapters/memory-adapter';
// Create a convenience object for module exports
const CacheModule = {
    CacheManager,
    CacheManagerCore,
    CacheEventType,
    CacheErrorCode,
    CacheError,
    // Event system
    emitCacheEvent,
    onCacheEvent,
    offCacheEvent,
    // Adapters
    MemoryAdapter,
    // Utilities
    createCacheError,
    handleCacheError,
};
// Export all components
export { CacheManager, CacheManagerCore, CacheEventType, CacheError, 
// Event system
emitCacheEvent, onCacheEvent, offCacheEvent, subscribeToCacheEvents, // Include the explicit import
// Adapters
MemoryAdapter, 
// Utilities
createCacheError, handleCacheError, ensureError, // Include the renamed export
CacheErrorCode, };
// Export default module
export default CacheModule;
//# sourceMappingURL=index.js.map