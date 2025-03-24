import { EntryMetadata } from '../../src/types';
import { CacheMetadata } from '../../src/implementations/CacheMetadata';

describe('CacheMetadata', () => {
  let metadata: CacheMetadata;

  beforeEach(() => {
    metadata = new CacheMetadata();
  });

  test('should create new metadata entry', () => {
    const key = 'test-key';
    const tags = ['tag1', 'tag2'];
    
    const entry = metadata.create(key, tags);
    
    expect(entry).toBeDefined();
    expect(entry.createdAt).toBeInstanceOf(Date);
    expect(entry.updatedAt).toBeInstanceOf(Date);
    expect(entry.accessCount).toBe(0);
    expect(entry.tags).toEqual(tags);
  });

  test('should update metadata access count', () => {
    const key = 'test-key';
    metadata.create(key, []);
    
    metadata.recordAccess(key);
    const entry = metadata.get(key);
    
    expect(entry?.accessCount).toBe(1);
  });

  test('should delete metadata', () => {
    const key = 'test-key';
    metadata.create(key, []);
    
    metadata.delete(key);
    const entry = metadata.get(key);
    
    expect(entry).toBeUndefined();
  });

  test('should update metadata last accessed time', () => {
    const key = 'test-key';
    const entry = metadata.create(key, []);
    const originalAccess = entry.updatedAt;
    
    // Wait briefly
    setTimeout(() => {
      metadata.recordAccess(key);
      const updated = metadata.get(key);
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalAccess.getTime());
    }, 100);
  });

  test('should handle invalid keys gracefully', () => {
    expect(() => metadata.get('nonexistent')).not.toThrow();
    expect(() => metadata.recordAccess('nonexistent')).not.toThrow();
    expect(() => metadata.delete('nonexistent')).not.toThrow();
  });

  test('should track compute time', () => {
    const key = 'test-key';
    const computeTime = 150;
    
    const entry = metadata.create(key, [], { computeTime });
    expect(entry.computeTime).toBe(computeTime);
  });
});
