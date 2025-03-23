import { CacheManagerOperations } from '../../src/implementations/cache-manager-operations';
import { MemoryStorageAdapter } from '../../src/adapters/memory-adapter';

describe('CacheManagerOperations Tests', () => {
  let operations: CacheManagerOperations;
  let provider: MemoryStorageAdapter;

  beforeEach(() => {
    provider = new MemoryStorageAdapter();
    operations = new CacheManagerOperations(provider);
  });

  test('should perform atomic increment operations', async () => {
    const result1 = await operations.increment('counter');
    expect(result1).toBe(1);

    const result2 = await operations.increment('counter', 5);
    expect(result2).toBe(6);
  });

  test('should perform atomic decrement operations', async () => {
    await operations.increment('counter', 10);
    
    const result1 = await operations.decrement('counter');
    expect(result1).toBe(9);

    const result2 = await operations.decrement('counter', 5);
    expect(result2).toBe(4);
  });

  test('should update object fields atomically', async () => {
    await provider.set('user', { name: 'John', age: 30 });

    const result = await operations.updateFields('user', {
      age: 31,
      city: 'New York'
    });

    expect(result).toEqual({
      name: 'John',
      age: 31,
      city: 'New York'
    });
  });

  test('should handle array operations', async () => {
    const result1 = await operations.arrayAppend('list', [1, 2, 3]);
    expect(result1).toEqual([1, 2, 3]);

    const result2 = await operations.arrayAppend('list', [4, 5]);
    expect(result2).toEqual([1, 2, 3, 4, 5]);

    const result3 = await operations.arrayRemove('list', 
      (item: number) => item % 2 === 0
    );
    expect(result3).toEqual([1, 3, 5]);
  });

  test('should handle array length limits', async () => {
    const result = await operations.arrayAppend('limited-list', 
      [1, 2, 3, 4, 5],
      { maxLength: 3 }
    );
    expect(result).toEqual([3, 4, 5]);
  });

  test('should perform set operations', async () => {
    await provider.set('set', [1, 2, 3]);

    const union = await operations.setOperations('set', 'union', [3, 4, 5]);
    expect(union.sort()).toEqual([1, 2, 3, 4, 5]);

    const intersection = await operations.setOperations('set', 'intersection', [3, 4, 5]);
    expect(intersection).toEqual([3]);

    const difference = await operations.setOperations('set', 'difference', [3, 4, 5]);
    expect(difference.sort()).toEqual([1, 2]);
  });

  test('should handle batch operations', async () => {
    const entries = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3'
    };

    await operations.batchSet(entries);
    const results = await operations.batchGet(['key1', 'key2', 'key3', 'non-existent']);

    expect(results).toEqual({
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
      'non-existent': null
    });
  });

  test('should handle transaction operations', async () => {
    const transactionOps = [
      { type: 'set' as const, key: 'tx1', value: 'value1' },
      { type: 'set' as const, key: 'tx2', value: 'value2' },
      { type: 'get' as const, key: 'tx1' },
      { type: 'delete' as const, key: 'tx2' }
    ];

    const results = await operations.transaction(transactionOps);
    expect(results).toEqual(['value1']);
    expect(await provider.get('tx1')).toBe('value1');
    expect(await provider.get('tx2')).toBeNull();
  });

  test('should handle atomic transactions', async () => {
    const transactionOps = [
      { type: 'set' as const, key: 'atomic1', value: 'value1' },
      { type: 'set' as const, key: 'atomic2', value: 'value2' }
    ];

    await operations.transaction(transactionOps, { atomic: true });
    expect(await provider.get('atomic1')).toBe('value1');
    expect(await provider.get('atomic2')).toBe('value2');
  });

  test('should handle concurrent atomic operations', async () => {
    const increment = () => operations.increment('concurrent-counter');
    const promises = Array(10).fill(null).map(() => increment());
    
    const results = await Promise.all(promises);
    const finalValue = await provider.get('concurrent-counter');
    
    expect(finalValue).toBe(10);
    expect(results).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});