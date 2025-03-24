import { CacheStats } from '../../src/types';

describe('CacheStatistics', () => {
  let stats: CacheStats;

  beforeEach(() => {
    stats = {
      size: 0,
      hits: 0,
      misses: 0,
      keyCount: 0,
      memoryUsage: 0,
      lastUpdated: new Date(),
      keys: []
    };
  });

  test('should record cache hit', () => {
    stats.hits++;
    expect(stats.hits).toBe(1);
  });

  test('should record cache miss', () => {
    stats.misses++;
    expect(stats.misses).toBe(1);
  });

  test('should track key count', () => {
    stats.keyCount = 1;
    stats.keys = ['test-key'];
    
    expect(stats.keyCount).toBe(1);
    expect(stats.keys).toHaveLength(1);
  });

  test('should update last updated timestamp', () => {
    const oldDate = stats.lastUpdated;
    const newDate = new Date();
    stats.lastUpdated = newDate;
    
    expect(stats.lastUpdated).not.toEqual(oldDate);
    expect(stats.lastUpdated).toEqual(newDate);
  });

  test('should calculate cache hit ratio', () => {
    stats.hits = 75;
    stats.misses = 25;
    
    const hitRatio = stats.hits / (stats.hits + stats.misses);
    expect(hitRatio).toBe(0.75);
  });

  test('should track memory usage', () => {
    const sampleData = { data: 'x'.repeat(1000) };
    stats.size += Buffer.byteLength(JSON.stringify(sampleData));
    stats.keyCount++;
    
    expect(stats.size).toBeGreaterThan(1000);
    expect(stats.keyCount).toBe(1);
  });

  test('should handle error states', () => {
    stats.error = 'Connection failed';
    expect(stats.error).toBeDefined();
    expect(typeof stats.error).toBe('string');
  });

  test('should maintain stats integrity after updates', () => {
    stats.hits += 5;
    stats.misses += 3;
    stats.keyCount += 2;
    
    expect(stats.hits).toBe(5);
    expect(stats.misses).toBe(3);
    expect(stats.keyCount).toBe(2);
    expect(stats.hits + stats.misses).toBe(8);
  });
});
