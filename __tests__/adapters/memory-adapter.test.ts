import { MemoryStorageAdapter } from '../../src/adapters/memory-adapter';

describe('MemoryStorageAdapter Tests', () => {
  let adapter: MemoryStorageAdapter;

  beforeEach(() => {
    adapter = new MemoryStorageAdapter({
      maxSize: 1024 * 1024, // 1MB
      maxItems: 100,
      defaultTtl: 3600,
      updateAgeOnGet: true,
      allowStale: false
    });
  });

  test('should store and retrieve values', async () => {
    await adapter.set('test-key', 'test-value');
    const result = await adapter.get('test-key');
    expect(result).toBe('test-value');
  });

  test('should handle complex objects', async () => {
    const complexObject = {
      string: 'test',
      number: 123,
      boolean: true,
      array: [1, 2, 3],
      nested: { key: 'value' }
    };

    await adapter.set('complex-key', complexObject);
    const result = await adapter.get('complex-key');
    expect(result).toEqual(complexObject);
  });

  test('should respect TTL', async () => {
    await adapter.set('ttl-key', 'value', { ttl: 0.1 }); // 100ms TTL
    expect(await adapter.get('ttl-key')).toBe('value');
    
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(await adapter.get('ttl-key')).toBeNull();
  });

  test('should handle size limits', async () => {
    // Fill the cache with data
    const largeString = 'x'.repeat(1024 * 1024 / 2); // 0.5MB string
    await adapter.set('large-key-1', largeString);
    
    // This should cause the first value to be evicted due to size
    await adapter.set('large-key-2', largeString);
    
    // Add one more to test item count eviction
    await adapter.set('large-key-3', 'small-value');
    
    const stats = await adapter.getStats();
    expect(stats.keyCount).toBeLessThanOrEqual(2);
  });

  test('should handle batch operations', async () => {
    await adapter.setMany({
      key1: 'value1',
      key2: 'value2',
      key3: 'value3'
    });

    const results = await adapter.getMany(['key1', 'key2', 'key3', 'non-existent']);
    expect(results).toEqual({
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
      'non-existent': null
    });
  });

  test('should handle tags', async () => {
    await adapter.set('key1', 'value1', { tags: ['tag1'] });
    await adapter.set('key2', 'value2', { tags: ['tag1'] });
    await adapter.set('key3', 'value3', { tags: ['tag2'] });

    const count = await adapter.invalidateByTag('tag1');
    expect(count).toBe(2);

    expect(await adapter.get('key1')).toBeNull();
    expect(await adapter.get('key2')).toBeNull();
    expect(await adapter.get('key3')).toBe('value3');
  });

  test('should provide accurate statistics', async () => {
    await adapter.set('stats-key1', 'value1');
    await adapter.get('stats-key1');
    await adapter.get('non-existent');

    const stats = await adapter.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.keyCount).toBe(1);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('should clear all values', async () => {
    await adapter.set('key1', 'value1');
    await adapter.set('key2', 'value2');
    
    await adapter.clear();
    
    expect(await adapter.get('key1')).toBeNull();
    expect(await adapter.get('key2')).toBeNull();
    
    const stats = await adapter.getStats();
    expect(stats.keyCount).toBe(0);
  });

  test('should handle compression', async () => {
    const largeString = 'x'.repeat(10000);
    await adapter.set('compressed-key', largeString, {
      compression: true,
      compressionThreshold: 1000
    });

    const result = await adapter.get('compressed-key');
    expect(result).toBe(largeString);

    const stats = await adapter.getStats();
    expect(stats.size).toBeLessThan(10000);
  });

  test('should handle concurrent operations', async () => {
    const operations = Array(100).fill(null).map((_, i) => 
      adapter.set(`key${i}`, `value${i}`)
    );

    await Promise.all(operations);
    const stats = await adapter.getStats();
    expect(stats.keyCount).toBe(100);
  });

  test('should check if key exists', async () => {
    await adapter.set('exists-key', 'value');
    
    expect(await adapter.has('exists-key')).toBe(true);
    expect(await adapter.has('non-existent-key')).toBe(false);
  });

  test('should handle delete operations', async () => {
    await adapter.set('delete-key', 'value');
    
    const deleted = await adapter.delete('delete-key');
    expect(deleted).toBe(true);
    
    const deletedAgain = await adapter.delete('delete-key');
    expect(deletedAgain).toBe(false);
  });

  test('should handle errors gracefully', async () => {
    // Mock the store to throw an error
    const originalStore = (adapter as any).store;
    (adapter as any).store = {
      get: jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      }),
      set: jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      }),
      has: jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      }),
      delete: jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      }),
      clear: jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      }),
      size: 0
    };

    // Test error handling in get
    const result = await adapter.get('error-key');
    expect(result).toBeNull();

    // Test error handling in set
    await expect(adapter.set('error-key', 'value')).rejects.toThrow();

    // Test error handling in has
    const hasResult = await adapter.has('error-key');
    expect(hasResult).toBe(false);

    // Test error handling in delete
    const deleteResult = await adapter.delete('error-key');
    expect(deleteResult).toBe(false);

    // Test error handling in clear
    await adapter.clear();
    
    // Restore the original store
    (adapter as any).store = originalStore;
  });

  test('should handle compression errors', async () => {
    // Create a value that will cause compression to fail
    const circularObj: any = {};
    circularObj.self = circularObj;
    
    // This should still work despite compression failing
    await adapter.set('circular-key', circularObj, { 
      compression: true 
    });
    
    const result = await adapter.get('circular-key');
    expect(result).toBeDefined();
  });

  test('should handle decompression errors', async () => {
    // Mock a compressed value that will fail to decompress
    await adapter.set('bad-compressed', 'value');
    
    // Manually corrupt the metadata to mark it as compressed
    (adapter as any).metadata.get('bad-compressed').compressed = true;
    
    // Should still return something even if decompression fails
    const result = await adapter.get('bad-compressed');
    expect(result).toBeDefined();
  });
});