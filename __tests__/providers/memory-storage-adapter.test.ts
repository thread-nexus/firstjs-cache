import { MemoryStorageAdapter } from '../../src/implementations/adapters/MemoryStorageAdapter';

describe('MemoryStorageAdapter Tests', () => {
  let adapter: MemoryStorageAdapter;

  beforeEach(() => {
    adapter = new MemoryStorageAdapter({
      maxSize: 1024 * 1024, // 1MB
      defaultTtl: 3600
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
    const largeString = 'x'.repeat(1024 * 1024); // 1MB string
    await adapter.set('large-key', largeString);
    
    // This should cause the first value to be evicted
    await adapter.set('another-large-key', largeString);
    
    expect(await adapter.get('large-key')).toBeNull();
    expect(await adapter.get('another-large-key')).toBe(largeString);
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

    await adapter.invalidateByTag('tag1');

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
});