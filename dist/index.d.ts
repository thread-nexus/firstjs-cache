import { CacheManager } from './implementations/cache-manager';
import { CacheManagerCore } from './implementations/cache-manager-core';
import { CacheEventType, emitCacheEvent, onCacheEvent, offCacheEvent, subscribeToCacheEvents } from './events/cache-events';
import { CacheError, CacheErrorCode, createCacheError, handleCacheError, ensureError } from './utils/error-utils';
import { MemoryAdapter } from './adapters/memory-adapter';
import { CacheOptions, CacheStats } from './types/common';
declare const CacheModule: {
    CacheManager: typeof CacheManager;
    CacheManagerCore: typeof CacheManagerCore;
    CacheEventType: typeof CacheEventType;
    CacheErrorCode: typeof CacheErrorCode;
    CacheError: typeof CacheError;
    emitCacheEvent: typeof emitCacheEvent;
    onCacheEvent: typeof onCacheEvent;
    offCacheEvent: (unsubscribeFn: () => void) => void;
    MemoryAdapter: typeof import("./adapters/memory-adapter").MemoryStorageAdapter;
    createCacheError: typeof createCacheError;
    handleCacheError: typeof handleCacheError;
};
export { CacheManager, CacheManagerCore, CacheEventType, CacheError, emitCacheEvent, onCacheEvent, offCacheEvent, subscribeToCacheEvents, // Include the explicit import
MemoryAdapter, createCacheError, handleCacheError, ensureError, // Include the renamed export
CacheErrorCode, CacheOptions, CacheStats, };
export default CacheModule;
