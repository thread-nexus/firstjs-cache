import { CacheManagerOperations } from '../../src/implementations/cache-manager-operations';
import { MemoryStorageAdapter } from '../../src/adapters/memory-adapter';

describe('CacheManagerOperations Extended Tests', () => {
  let cacheOperations: CacheManagerOperations;
  let provider: MemoryStorageAdapter;

  beforeEach(() => {
    provider = new MemoryStorageAdapter();
    cacheOperations = new CacheManagerOperations(provider);
  });

  test('should handle atomic operation errors', async () => {
    // Mock provider to throw errors
    const originalGet = provider.get;
    provider.get = jest.fn().mockRejectedValue(new Error('Test error'));

    await expect(cacheOperations.atomic('error-key', value => value)).rejects.toThrow('Test error');

    // Restore original method
    provider.get = originalGet;
  });

  test('should handle concurrent atomic operations with locks', async () => {
    // Mock a slow operation
    const slowOperation = jest.fn().mockImplementation(async (value: number | null) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return (value || 0) + 1;
    });

    // Start 3 concurrent operations
    const promises = [
      cacheOperations.atomic('concurrent-key', slowOperation),
      cacheOperations.atomic('concurrent-key', slowOperation),
      cacheOperations.atomic('concurrent-key', slowOperation)
    ];

    // All should complete successfully and in sequence
    const results = await Promise.all(promises);
    expect(results).toEqual([1, 2, 3]);
    expect(slowOperation).toHaveBeenCalledTimes(3);
  });

  test('should handle updateFields with null initial value', async () => {
    const result = await cacheOperations.updateFields('new-object', { name: 'Test', value: 123 });
    expect(result).toEqual({ name: 'Test', value: 123 });
  });

  test('should handle arrayAppend with maxLength', async () => {
    // Test with empty initial array
    const result1 = await cacheOperations.arrayAppend('limited-array', [1, 2, 3, 4, 5], { maxLength: 3 });
    expect(result1).toEqual([3, 4, 5]);

    // Test with existing array
    const result2 = await cacheOperations.arrayAppend('limited-array', [6, 7], { maxLength: 3 });
    expect(result2).toEqual([5, 6, 7]);
  });

  test('should handle arrayRemove with empty array', async () => {
    const result = await cacheOperations.arrayRemove('empty-array', () => true);
    expect(result).toEqual([]);
  });

  test('should handle unknown set operation', async () => {
    await provider.set('set-test', [1, 2, 3]);
    
    // @ts-ignore - Testing invalid operation
    await expect(cacheOperations.setOperations('set-test', 'unknown', [4, 5])).rejects.toThrow('Unknown set operation');
  });

  test('should handle batch operations with provider methods', async () => {
    // Test batchGet with provider.getMany
    const getManyResult = await cacheOperations.batchGet(['key1', 'key2']);
    expect(getManyResult).toEqual({ key1: null, key2: null });

    // Test batchSet with provider.setMany
    await cacheOperations.batchSet({ key1: 'value1', key2: 'value2' });
    const values = await cacheOperations.batchGet(['key1', 'key2']);
    expect(values).toEqual({ key1: 'value1', key2: 'value2' });
  });

  test('should handle batch operations without provider methods', async () => {
    // Mock provider without batch methods
    const mockProvider = {
      get: jest.fn().mockResolvedValue('mock-value'),
      set: jest.fn().mockResolvedValue(undefined),
      getMany: undefined,
      setMany: undefined
    };
    
    // @ts-ignore - Using mock provider
    const mockOperations = new CacheManagerOperations(mockProvider);

    // Test batchGet fallback
    await mockOperations.batchGet(['key1', 'key2']);
    expect(mockProvider.get).toHaveBeenCalledTimes(2);

    // Test batchSet fallback
    await mockOperations.batchSet({ key1: 'value1', key2: 'value2' });
    expect(mockProvider.set).toHaveBeenCalledTimes(2);
  });

  test('should handle batch operation errors', async () => {
    // Mock provider to throw errors
    const mockProvider = {
      get: jest.fn().mockRejectedValue(new Error('Test error')),
      set: jest.fn().mockRejectedValue(new Error('Test error')),
      getMany: jest.fn().mockRejectedValue(new Error('Test error')),
      setMany: jest.fn().mockRejectedValue(new Error('Test error'))
    };
    
    // @ts-ignore - Using mock provider
    const mockOperations = new CacheManagerOperations(mockProvider);

    // These should throw
    await expect(mockOperations.batchGet(['key1'])).rejects.toThrow('Test error');
    await expect(mockOperations.batchSet({ key1: 'value1' })).rejects.toThrow('Test error');
  });

  test('should execute transaction operations', async () => {
    const transactionOps = [
      { type: 'set' as const, key: 'tx1', value: 'value1' },
      { type: 'set' as const, key: 'tx2', value: 'value2' },
      { type: 'get' as const, key: 'tx1' },
      { type: 'has' as const, key: 'tx2' },
      { type: 'delete' as const, key: 'tx2' }
    ];

    const results = await cacheOperations.transaction(transactionOps);
    
    // Only get and has operations return values
    expect(results).toEqual(['value1', true]);
    
    // Verify final state
    expect(await provider.get('tx1')).toBe('value1');
    expect(await provider.get('tx2')).toBeNull();
  });

  test('should handle transaction errors', async () => {
    // Mock provider to throw on delete
    const originalDelete = provider.delete;
    provider.delete = jest.fn().mockRejectedValue(new Error('Delete error'));

    const ops = [
      { type: 'set' as const, key: 'tx1', value: 'value1' },
      { type: 'delete' as const, key: 'tx1' }
    ];

    await expect(cacheOperations.transaction(ops)).rejects.toThrow('Delete error');

    // Restore original method
    provider.delete = originalDelete;
  });

  test('should handle unknown operation type in transaction', async () => {
    const ops = [
      // @ts-ignore - Testing invalid operation type
      { type: 'unknown', key: 'tx1' }
    ];

    await expect(cacheOperations.transaction(ops)).rejects.toThrow('Unknown operation type');
  });

  test('should handle atomic operations with promises', async () => {
    const asyncOperation = async (value: number | null): Promise<number> => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return (value || 0) + 5;
    };

    const result = await cacheOperations.atomic('async-key', asyncOperation);
    expect(result).toBe(5);
  });

  test('should handle errors in atomic operations', async () => {
    const failingOperation = () => {
      throw new Error('Operation failed');
    };

    await expect(cacheOperations.atomic('fail-key', failingOperation)).rejects.toThrow('Operation failed');
  });
});