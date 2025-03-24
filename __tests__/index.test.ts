import * as CacheModule from '../src/index';

describe('Cache Module Exports', () => {
  test('should export core components', () => {
    expect(CacheModule.CacheManager).toBeDefined();
    expect(CacheModule.CacheManagerOperations).toBeDefined();
    expect(CacheModule.CacheMetadata).toBeDefined();
  });

  test('should export adapters', () => {
    expect(CacheModule.MemoryStorageAdapter).toBeDefined();
    expect(CacheModule.MemoryAdapter).toBeDefined();
  });

  test('should export utility functions', () => {
    expect(CacheModule.createCacheKey).toBeDefined();
    expect(CacheModule.mergeCacheOptions).toBeDefined();
    expect(CacheModule.calculateExpiration).toBeDefined();
    expect(CacheModule.isExpired).toBeDefined();
  });

  test('should export configuration', () => {
    expect(CacheModule.DEFAULT_CONFIG).toBeDefined();
    expect(CacheModule.CACHE_CONSTANTS).toBeDefined();
  });

  test('should export error handling utilities', () => {
    expect(CacheModule.handleCacheError).toBeDefined();
    expect(CacheModule.CacheError).toBeDefined();
    expect(CacheModule.CacheProviderError).toBeDefined();
    expect(CacheModule.CacheOperationError).toBeDefined();
  });

  test('should export validation utilities', () => {
    expect(CacheModule.validateCacheKey).toBeDefined();
    expect(CacheModule.validateCacheOptions).toBeDefined();
  });

  test('should export serialization utilities', () => {
    expect(CacheModule.serialize).toBeDefined();
    expect(CacheModule.deserialize).toBeDefined();
    expect(CacheModule.compressData).toBeDefined();
    expect(CacheModule.decompressData).toBeDefined();
  });
});
