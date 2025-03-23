import { CacheMetadata } from '../../src/implementations/CacheMetadata';

describe('CacheMetadata Tests', () => {
  let metadata: CacheMetadata;

  beforeEach(() => {
    metadata = new CacheMetadata();
  });

  test('should store and retrieve metadata', () => {
    metadata.set('key1', { tags: ['tag1', 'tag2'] });
    const result = metadata.get('key1');
    
    expect(result).toBeDefined();
    expect(result?.tags).toEqual(['tag1', 'tag2']);
    expect(result?.createdAt).toBeInstanceOf(Date);
    expect(result?.updatedAt).toBeInstanceOf(Date);
    expect(result?.accessCount).toBe(0);
  });

  test('should track access counts', () => {
    metadata.set('key1', { tags: ['tag1'] });
    
    metadata.recordAccess('key1');
    metadata.recordAccess('key1');
    
    const result = metadata.get('key1');
    expect(result?.accessCount).toBe(2);
  });

  test('should find keys by tag', () => {
    metadata.set('key1', { tags: ['tag1', 'tag2'] });
    metadata.set('key2', { tags: ['tag1'] });
    metadata.set('key3', { tags: ['tag2'] });

    const tag1Keys = metadata.findByTag('tag1');
    const tag2Keys = metadata.findByTag('tag2');
    const tag3Keys = metadata.findByTag('tag3');

    expect(tag1Keys.sort()).toEqual(['key1', 'key2']);
    expect(tag2Keys.sort()).toEqual(['key1', 'key3']);
    expect(tag3Keys).toEqual([]);
  });

  test('should find keys by prefix', () => {
    metadata.set('user:123', { tags: [] });
    metadata.set('user:456', { tags: [] });
    metadata.set('post:789', { tags: [] });

    const userKeys = metadata.findByPrefix('user:');
    expect(userKeys.sort()).toEqual(['user:123', 'user:456']);
  });

  test('should find keys by pattern', () => {
    metadata.set('user:123:profile', { tags: [] });
    metadata.set('user:456:settings', { tags: [] });
    metadata.set('post:789', { tags: [] });

    const userProfileKeys = metadata.findByPattern('user:\\d+:profile');
    expect(userProfileKeys).toEqual(['user:123:profile']);
  });

  test('should delete metadata', () => {
    metadata.set('key1', { tags: ['tag1'] });
    expect(metadata.get('key1')).toBeDefined();

    metadata.delete('key1');
    expect(metadata.get('key1')).toBeUndefined();
  });

  test('should clear all metadata', () => {
    metadata.set('key1', { tags: ['tag1'] });
    metadata.set('key2', { tags: ['tag2'] });

    metadata.clear();
    
    expect(metadata.get('key1')).toBeUndefined();
    expect(metadata.get('key2')).toBeUndefined();
    expect(metadata.size()).toBe(0);
  });

  test('should update existing metadata', () => {
    metadata.set('key1', { tags: ['tag1'] });
    const originalCreatedAt = metadata.get('key1')?.createdAt;

    metadata.set('key1', { tags: ['tag2'] });
    const updated = metadata.get('key1');

    expect(updated?.tags).toEqual(['tag2']);
    expect(updated?.createdAt).toEqual(originalCreatedAt);
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(updated?.createdAt.getTime()!);
  });

  test('should get all keys', () => {
    metadata.set('key1', { tags: [] });
    metadata.set('key2', { tags: [] });
    metadata.set('key3', { tags: [] });

    const keys = metadata.keys();
    expect(keys.sort()).toEqual(['key1', 'key2', 'key3']);
  });

  test('should track metadata size', () => {
    expect(metadata.size()).toBe(0);

    metadata.set('key1', { tags: [] });
    metadata.set('key2', { tags: [] });
    expect(metadata.size()).toBe(2);

    metadata.delete('key1');
    expect(metadata.size()).toBe(1);

    metadata.clear();
    expect(metadata.size()).toBe(0);
  });
});