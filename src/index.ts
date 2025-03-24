/**
 * @fileoverview Main entry point for the cache library
 */

// Import core components
import {CacheManager} from './implementations';
import {CacheMetadata} from './implementations';

// Import event system
import {
    CacheEventType,
    emitCacheEvent,
    offCacheEvent,
    onCacheEvent,
    subscribeToCacheEvents
} from './events/cache-events';

// Import error utilities
import {CacheError, CacheErrorCode, createCacheError, ensureError, handleCacheError} from './utils/error-utils';

// Import adapters
import {MemoryAdapter} from './adapters';

// Import utilities
import {
    createCacheManager,
    deepMerge,
    generateCacheKey,
    mergeCacheOptions,
    providerHasMethod,
    safelyCallProviderMethod,
    shouldRefresh
} from './implementations/cache-manager-utils';

// Import types
import {CacheEventPayload, CacheOptions, CacheStats, EntryMetadata} from './types';
import {CacheConfig, ProviderConfig} from './interfaces/i-cache-config';
import {ICacheProvider} from './interfaces/i-cache-provider';

// Create a convenience object for module exports
const CacheModule = {
    // Core classes
    CacheManager,
    CacheMetadata,

    // Constants
    CacheEventType,
    CacheErrorCode,

    // Error handling
    CacheError,
    createCacheError,
    handleCacheError,
    ensureError,

    // Event system
    emitCacheEvent,
    onCacheEvent,
    offCacheEvent,
    subscribeToCacheEvents,

    // Adapters
    MemoryAdapter,

    // Utilities
    createCacheManager,
    mergeCacheOptions,
    providerHasMethod,
    safelyCallProviderMethod,
    generateCacheKey,
    shouldRefresh,
    deepMerge
};

// Export all components
export {
    // Core classes
    CacheManager,
    CacheMetadata,

    // Constants
    CacheEventType,
    CacheErrorCode,

    // Error handling
    CacheError,
    createCacheError,
    handleCacheError,
    ensureError,

    // Event system
    emitCacheEvent,
    onCacheEvent,
    offCacheEvent,
    subscribeToCacheEvents,

    // Adapters
    MemoryAdapter,

    // Utilities
    createCacheManager,
    mergeCacheOptions,
    providerHasMethod,
    safelyCallProviderMethod,
    generateCacheKey,
    shouldRefresh,
    deepMerge,

    // Types
    CacheOptions,
    CacheStats,
    EntryMetadata,
    CacheEventPayload,
    CacheConfig,
    ProviderConfig,
    ICacheProvider
};

// Export default module
export default CacheModule;