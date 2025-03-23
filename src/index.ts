/**
 * @fileoverview Main entry point for the cache module
 */

// Core exports
export { CacheManager } from './implementations/cache-manager';
export { CacheManagerOperations } from './implementations/cache-manager-operations';
export { CacheMetadata } from './implementations/CacheMetadata';

// Adapters
export { MemoryStorageAdapter } from './implementations/adapters/MemoryStorageAdapter';
export { MemoryAdapter } from './adapters/memory-adapter';

// Interfaces
export { ICacheProvider } from './interfaces/i-cache-provider';
export { IStorageAdapter, StorageAdapterOptions } from './interfaces/storage-adapter';

// Types
export { CacheOptions, CacheStats, CacheComputeResult, CacheOperationResult } from './types/common';
export { CacheConfig, CacheOperationType, StorageAdapterConfig } from './types/cache-types';

// Events
export { CacheEventType, emitCacheEvent, subscribeToCacheEvents, createCacheEventLogger } from './events/cache-events';

// Utilities
export { handleCacheError, CacheError, CacheProviderError, CacheOperationError } from './utils/error-utils';
export { validateCacheKey, validateCacheOptions } from './utils/validation-utils';
export { serialize, deserialize } from './utils/serialization-utils';
export { compressData, decompressData } from './utils/compression-utils';
export { 
  createCacheKey, 
  mergeCacheOptions, 
  calculateExpiration, 
  isExpired, 
  formatCacheSize, 
  parseDuration, 
  createKeyPattern,
  batchOperations,
  debounce,
  throttle
} from './implementations/cache-manager-utils';

// Configuration
export { DEFAULT_CONFIG, CACHE_CONSTANTS } from './config/default-config';