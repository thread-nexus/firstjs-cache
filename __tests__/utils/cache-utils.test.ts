import {
  createCacheKey,
  mergeCacheOptions,
  calculateExpiration,
  isExpired,
  formatCacheSize,
  parseDuration,
  createKeyPattern,
  batchOperations,
  debounce,
  throttle
} from '../../src/implementations/cache-manager-utils';

describe('Cache Utilities Tests', () => {
  test('should create cache keys with proper prefixes', () => {
    expect(createCacheKey('USER', '123')).toBe('user:123');
    expect(createCacheKey('SESSION', 'abc', 'data')).toBe('session:abc:data');
    expect(createCacheKey('QUERY', { id: 123 })).toBe('query:{"id":123}');
  });

  test('should merge cache options correctly', () => {
    const defaults = {
      ttl: 3600,
      tags: ['default'],
      compression: false
    };

    const options = {
      ttl: 7200,
      tags: ['custom'],
      backgroundRefresh: true
    };

    const merged = mergeCacheOptions(options, defaults);
    expect(merged).toEqual({
      ttl: 7200,
      tags: ['default', 'custom'],
      compression: false,
      backgroundRefresh: true
    });
  });

  test('should calculate expiration timestamps', () => {
    const now = Date.now();
    const expiration = calculateExpiration(60);
    expect(expiration).toBeGreaterThan(now);
    expect(expiration).toBeLessThan(now + 61000);
    
    expect(calculateExpiration(0)).toBeNull();
    expect(calculateExpiration()).toBeNull();
  });

  test('should check expiration correctly', () => {
    const futureTimestamp = Date.now() + 1000;
    const pastTimestamp = Date.now() - 1000;
    
    expect(isExpired(futureTimestamp)).toBe(false);
    expect(isExpired(pastTimestamp)).toBe(true);
    expect(isExpired(null)).toBe(false);
  });

  test('should format cache sizes', () => {
    expect(formatCacheSize(512)).toBe('512.00 B');
    expect(formatCacheSize(1024)).toBe('1.00 KB');
    expect(formatCacheSize(1024 * 1024)).toBe('1.00 MB');
    expect(formatCacheSize(1024 * 1024 * 1024)).toBe('1.00 GB');
  });

  test('should parse duration strings', () => {
    expect(parseDuration('30s')).toBe(30);
    expect(parseDuration('5m')).toBe(300);
    expect(parseDuration('2h')).toBe(7200);
    expect(parseDuration('1d')).toBe(86400);
    
    expect(() => parseDuration('invalid')).toThrow();
  });

  test('should create key patterns', () => {
    expect(createKeyPattern('USER', '*')).toBe('user:*');
    expect(createKeyPattern('SESSION', '123:*')).toBe('session:123:*');
  });

  test('should handle batch operations', async () => {
    const items = [1, 2, 3, 4, 5];
    const operation = jest.fn().mockImplementation(x => Promise.resolve(x * 2));
    const progress = jest.fn();

    const results = await batchOperations(items, operation, {
      batchSize: 2,
      onProgress: progress
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(operation).toHaveBeenCalledTimes(5);
    expect(progress).toHaveBeenCalledTimes(5);
    expect(progress).toHaveBeenLastCalledWith(5, 5);
  });

  test('should debounce function calls', async () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const debouncedFn = debounce(fn, 100);

    // Call multiple times
    debouncedFn();
    debouncedFn();
    debouncedFn();

    expect(fn).not.toHaveBeenCalled();

    jest.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should throttle function calls', async () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const throttledFn = throttle(fn, 100);

    // Call multiple times
    throttledFn();
    throttledFn();
    throttledFn();

    expect(fn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});