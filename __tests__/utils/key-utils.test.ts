import {
  generateKey,
  generateFunctionKey,
  generateQueryKey,
  parseKey,
  createKeyPrefix,
  createKeyPattern,
  keyMatchesPattern,
  normalizeKey,
  generateUniqueKey,
  extractTimestamp
} from '../../src/utils/key-utils';

describe('Key Utils Tests', () => {
  test('should generate key with namespace and parts', () => {
    const key = generateKey('user', 123, 'profile');
    expect(key).toBe('user:123:profile');
  });

  test('should throw error for empty namespace', () => {
    expect(() => generateKey('', 123)).toThrow('Namespace is required');
  });

  test('should generate function cache key', () => {
    const key = generateFunctionKey('getUser', [123, 'admin']);
    expect(key).toContain('fn:getuser');
    expect(key).toContain('123');
    expect(key).toContain('admin');
  });

  test('should generate function key with options', () => {
    const key = generateFunctionKey('getUser', [123], { fresh: true });
    expect(key).toContain('fn:getuser');
    expect(key).toContain('fresh');
    expect(key).toContain('true');
  });

  test('should generate query key', () => {
    const key = generateQueryKey('getUserList', { role: 'admin' });
    expect(key).toContain('query:getuserlist');
    expect(key).toContain('role');
    expect(key).toContain('admin');
  });

  test('should generate query key without params', () => {
    const key = generateQueryKey('getAllUsers');
    expect(key).toBe('query:allusers');
  });

  test('should parse key into components', () => {
    const result = parseKey('user:123:profile');
    expect(result).toEqual({
      namespace: 'user',
      parts: ['123', 'profile']
    });
  });

  test('should throw error for invalid key format', () => {
    expect(() => parseKey('invalid-key-format')).toThrow('Invalid key format');
  });

  test('should create key prefix pattern', () => {
    const prefix = createKeyPrefix('user', '123');
    expect(prefix).toBe('user:123:*');
  });

  test('should create key pattern for regex matching', () => {
    const pattern = createKeyPattern('user:*:profile');
    expect(pattern).toBeInstanceOf(RegExp);
    expect(pattern.test('user:123:profile')).toBe(true);
    expect(pattern.test('user:456:settings')).toBe(false);
  });

  test('should cache key patterns', () => {
    // Call twice to test caching
    const pattern1 = createKeyPattern('user:*:profile');
    const pattern2 = createKeyPattern('user:*:profile');
    
    // Should be the same object (from cache)
    expect(pattern1).toBe(pattern2);
  });

  test('should check if key matches pattern', () => {
    expect(keyMatchesPattern('user:123:profile', 'user:*:profile')).toBe(true);
    expect(keyMatchesPattern('user:123:settings', 'user:*:profile')).toBe(false);
    expect(keyMatchesPattern('admin:123:profile', 'user:*:profile')).toBe(false);
    expect(keyMatchesPattern('anything', '*')).toBe(true);
  });

  test('should normalize keys', () => {
    expect(normalizeKey('USER:123')).toBe('user:123');
    expect(normalizeKey('user::123')).toBe('user:123');
    expect(normalizeKey('user@123')).toBe('user123');
    expect(normalizeKey('user 123')).toBe('user123');
  });

  test('should generate unique keys', () => {
    const key1 = generateUniqueKey('session');
    const key2 = generateUniqueKey('session');
    
    expect(key1).toContain('session:');
    expect(key2).toContain('session:');
    expect(key1).not.toBe(key2);
  });

  test('should extract timestamp from unique key', () => {
    const now = Date.now();
    const key = `session:${now}:random`;
    
    const timestamp = extractTimestamp(key);
    expect(timestamp).toBe(now);
  });

  test('should return null for invalid timestamp', () => {
    expect(extractTimestamp('session:invalid:random')).toBeNull();
    expect(extractTimestamp('session')).toBeNull();
  });

  test('should handle complex objects in key generation', () => {
    const obj = { id: 123, roles: ['admin', 'user'] };
    const key = generateKey('user', obj);
    
    expect(key).toContain('user');
    expect(key).toContain('123');
    expect(key).toContain('admin');
    expect(key).toContain('user');
  });
});