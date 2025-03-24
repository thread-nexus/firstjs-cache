// Import core components
import { CacheManager } from './implementations/cache-manager';
import { CacheManagerCore } from './implementations/cache-manager-core';

// Import event system
import { CacheEventType, emitCacheEvent, onCacheEvent, offCacheEvent } from './events/cache-events';

// Import error utilities
import { CacheError, CacheErrorCode, createCacheError, handleCacheError } from './utils/error-utils';

// Import adapters
import { MemoryAdapter } from './adapters/memory-adapter';

// Import types
import { CacheOptions, CacheStats } from './types/common';
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
export {
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
  
  // Types
  CacheOptions,
  CacheStats,
};
// Export default module
export default CacheModule;
