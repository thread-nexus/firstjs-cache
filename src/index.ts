/**
 * @fileoverview Main entry point for the cache library
 */

// Import core components
import { CacheManager } from './implementations/cache-manager';
import { CacheMetadata } from './implementations/cache-metadata';

// Import event system
import { 
  CacheEventType, 
  emitCacheEvent, 
  onCacheEvent, 
  offCacheEvent, 
  subscribeToCacheEvents 
} from './events/cache-events';

// Import error utilities
import { 
  CacheError, 
  CacheErrorCode, 
  createCacheError, 
  handleCacheError, 
  ensureError 
} from './utils/error-utils';

// Import adapters
import { MemoryAdapter } from './adapters/memory-adapter';

// Import utilities
import { 
  mergeCacheOptions, 
  createCacheManager, 
  providerHasMethod,
  safelyCallProviderMethod,
  generateCacheKey,
  shouldRefresh,
  deepMerge
} from './implementations/cache-manager-utils';

// Import types
import { CacheOptions, CacheStats, EntryMetadata, CacheEventPayload } from './types/common';
import { CacheConfig, ProviderConfig } from './interfaces/i-cache-config';
import { ICacheProvider } from './interfaces/i-cache-provider';

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