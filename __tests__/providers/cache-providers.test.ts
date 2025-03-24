import { MemoryAdapter } from '../../src/adapters/memory-adapter';
import { CacheOptions } from '../../src/types';

describe('CacheProviders', () => {
  let memoryProvider: MemoryAdapter;

  beforeEach(() => {
    memoryProvider = new MemoryAdapter();
  });

  test('should set and get value', async () => {
    const key = 'test-key';
    const value = { data: 'test' };
    const options: CacheOptions = { ttl: 60 };

    await memoryProvider.set(key, value, options);
    const result = await memoryProvider.get(key);

    expect(result).toEqual(value);
  });

  test('should handle expired items', async () => {
    const key = 'test-key';
    const value = { data: 'test' };
    const options: CacheOptions = { ttl: 0 }; // Immediate expiration

    await memoryProvider.set(key, value, options);
    const result = await memoryProvider.get(key);

    expect(result).toBeNull();
  });

  test('should delete cache entry', async () => {
    const key = 'test-key';
    const value = { data: 'test' };

    await memoryProvider.set(key, value);
    await memoryProvider.delete(key);
    const result = await memoryProvider.get(key);

    expect(result).toBeNull();
  });

  test('should handle large values with compression', async () => {
    const key = 'large-key';
    const largeValue = {
      data: 'x'.repeat(10000)  // Large string
    };
    const options: CacheOptions = {
      compression: true,
      compressionThreshold: 1000
    };

    await memoryProvider.set(key, largeValue, options);
    const result = await memoryProvider.get(key);
    expect(result).toEqual(largeValue);
  });

  test('should handle concurrent operations', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(memoryProvider.set(`key-${i}`, { count: i }));
    }
    await Promise.all(promises);
    
    const results = await Promise.all(
      Array.from({length: 10}, (_, i) => memoryProvider.get(`key-${i}`))
    );
    expect(results).toHaveLength(10);
    results.forEach((result, i) => {
      expect(result).toEqual({ count: i });
    });
  });

  test('should enforce size limits', async () => {
    const adapter = new MemoryAdapter({ maxSize: 1000 });
    const largeValue = { data: 'x'.repeat(2000) };
    
    await expect(adapter.set('key', largeValue))
      .rejects
      .toThrow(/exceeds maximum size/i);
  });
});
