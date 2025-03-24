import { CacheMetadata } from '../../src/implementations/CacheMetadata';

describe('CacheMetadata', () => {
  let metadata: CacheMetadata;

  beforeEach(() => {
    metadata = new CacheMetadata();
  });

  test('should clear metadata entries', () => {
    // Set up test data
    metadata.create('key1', ['tag1']);
    metadata.create('key2', ['tag2']);

    // Clear metadata
    metadata.clear();

    // Verify clearing
    expect(metadata.get('key1')).toBeUndefined();
    expect(metadata.get('key2')).toBeUndefined();
  });

  test('should get metadata by tag', () => {
    // Create entries with tags
    metadata.create('key1', ['tag1', 'shared']);
    metadata.create('key2', ['tag2', 'shared']);

    // Get entries by tag
    const sharedEntries = metadata.getByTag('shared');
    const tag1Entries = metadata.getByTag('tag1');

    expect(sharedEntries).toHaveLength(2);
    expect(tag1Entries).toHaveLength(1);
  });

  test('should handle metadata expiration', () => {
    // Create entry with TTL
    metadata.create('key1', [], { ttl: 1 }); // 1 second TTL

    // Wait for expiration
    return new Promise(resolve => {
      setTimeout(() => {
        expect(metadata.isExpired('key1')).toBe(true);
        resolve(true);
      }, 1100);
    });
  });

  test('should handle bulk operations', () => {
    const entries = {
      'key1': { tags: ['tag1'], ttl: 60 },
      'key2': { tags: ['tag2'], ttl: 120 }
    };
    
    metadata.bulkCreate(entries);
    expect(metadata.get('key1')).toBeDefined();
    expect(metadata.get('key2')).toBeDefined();
  });

  test('should handle metadata updates', () => {
    const entry = metadata.create('key1', ['tag1']);
    metadata.update('key1', { accessCount: 5 });
    
    const updated = metadata.get('key1');
    expect(updated?.accessCount).toBe(5);
  });

  test('should validate metadata operations', () => {
    expect(() => metadata.create('', [])).toThrow();
    expect(() => metadata.update('invalid-key', {})).toThrow();
  });

  test('should track metadata history', () => {
    const entry = metadata.create('key1', ['tag1']);
    metadata.recordAccess('key1');
    metadata.recordAccess('key1');
    
    const history = metadata.getAccessHistory('key1');
    expect(history).toHaveLength(2);
  });
});
