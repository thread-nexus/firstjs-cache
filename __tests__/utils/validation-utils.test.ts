import {
  validateCacheKey,
  validateCacheOptions,
  validateValueSize,
  validateBatch,
  validatePattern
} from '../../src/utils/validation-utils';
import { CACHE_CONSTANTS } from '../../src/config/default-config';

describe('Validation Utils Tests', () => {
  test('should validate cache keys', () => {
    // Valid keys should not throw
    expect(() => validateCacheKey('valid-key')).not.toThrow();
    expect(() => validateCacheKey('valid:key')).not.toThrow();
    expect(() => validateCacheKey('valid_key')).not.toThrow();
    
    // Invalid keys should throw
    expect(() => validateCacheKey('')).toThrow();
    expect(() => validateCacheKey(123 as any)).toThrow();
    expect(() => validateCacheKey(null as any)).toThrow();
    expect(() => validateCacheKey(undefined as any)).toThrow();
    
    // Test key length validation
    const longKey = 'a'.repeat(CACHE_CONSTANTS.MAX_KEY_LENGTH + 1);
    expect(() => validateCacheKey(longKey)).toThrow();
  });

  test('should validate cache options', () => {
    // Valid options should not throw
    expect(() => validateCacheOptions({
      ttl: 3600,
      tags: ['tag1', 'tag2'],
      refreshThreshold: 0.5,
      compressionThreshold: 1024
    })).not.toThrow();
    
    // Empty options should not throw
    expect(() => validateCacheOptions({})).not.toThrow();
    expect(() => validateCacheOptions(undefined)).not.toThrow();
    
    // Invalid TTL
    expect(() => validateCacheOptions({ ttl: -1 })).toThrow();
    expect(() => validateCacheOptions({ ttl: 'invalid' as any })).toThrow();
    expect(() => validateCacheOptions({ ttl: CACHE_CONSTANTS.MAX_TTL + 1 })).toThrow();
    
    // Invalid tags
    expect(() => validateCacheOptions({ tags: 'not-an-array' as any })).toThrow();
    expect(() => validateCacheOptions({ tags: [123 as any] })).toThrow();
    expect(() => validateCacheOptions({ tags: [''] })).toThrow();
    
    // Invalid refresh threshold
    expect(() => validateCacheOptions({ refreshThreshold: -0.1 })).toThrow();
    expect(() => validateCacheOptions({ refreshThreshold: 1.1 })).toThrow();
    expect(() => validateCacheOptions({ refreshThreshold: 'invalid' as any })).toThrow();
    
    // Invalid compression threshold
    expect(() => validateCacheOptions({ 
      compressionThreshold: -1 
    })).toThrow();
    expect(() => validateCacheOptions({ 
      compressionThreshold: 'invalid' as any 
    })).toThrow();
  });

  test('should validate value size', () => {
    // Small values should not throw
    expect(() => validateValueSize('small string')).not.toThrow();
    expect(() => validateValueSize(123)).not.toThrow();
    expect(() => validateValueSize(true)).not.toThrow();
    expect(() => validateValueSize(null)).not.toThrow();
    expect(() => validateValueSize({ small: 'object' })).not.toThrow();
    
    // Mock a very large value that exceeds the limit
    const originalMaxSize = CACHE_CONSTANTS.MAX_VALUE_SIZE;
    CACHE_CONSTANTS.MAX_VALUE_SIZE = 10; // Very small for testing
    
    // Large object should throw (bypassing the string length check)
    const largeObject = { data: 'x'.repeat(100) };
    expect(() => validateValueSize(largeObject)).toThrow();
    
    // Restore original value
    CACHE_CONSTANTS.MAX_VALUE_SIZE = originalMaxSize;
  });

  test('should validate batch operations', () => {
    // Valid batch should not throw
    expect(() => validateBatch([1, 2, 3])).not.toThrow();
    expect(() => validateBatch([])).not.toThrow();
    
    // Invalid batch type
    expect(() => validateBatch('not-an-array' as any)).toThrow();
    
    // Batch too large
    const maxSize = 5;
    const largeBatch = [1, 2, 3, 4, 5, 6];
    expect(() => validateBatch(largeBatch, maxSize)).toThrow();
  });

  test('should validate patterns', () => {
    // Valid patterns should not throw
    expect(() => validatePattern('user:*')).not.toThrow();
    expect(() => validatePattern('user:[0-9]+')).not.toThrow();
    
    // Invalid patterns should throw
    expect(() => validatePattern('')).toThrow();
    expect(() => validatePattern(123 as any)).toThrow();
    
    // Invalid regex pattern
    expect(() => validatePattern('user:[0-9')).toThrow();
  });

  test('should handle non-serializable values', () => {
    // Create a circular reference that can't be serialized
    const circular: any = {};
    circular.self = circular;
    
    // This should not throw but should handle the error internally
    expect(() => validateValueSize(circular)).not.toThrow();
    
    // Function values are not serializable
    expect(() => validateValueSize(() => {})).not.toThrow();
  });
});