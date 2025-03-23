import {
  CacheError,
  CacheErrorCode,
  handleCacheError,
  createCacheError,
  formatErrorMessage,
  isCacheError,
  logCacheError
} from '../../src/utils/error-utils';

describe('Error Utils Tests', () => {
  // Save original console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    // Mock console methods
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  test('should create cache error with correct properties', () => {
    const error = createCacheError({
      code: CacheErrorCode.INVALID_KEY,
      message: 'Invalid key format',
      operation: 'get',
      key: 'test-key'
    });

    expect(error).toBeInstanceOf(CacheError);
    expect(error.code).toBe(CacheErrorCode.INVALID_KEY);
    expect(error.message).toBe('Invalid key format');
    expect(error.operation).toBe('get');
    expect(error.key).toBe('test-key');
    expect(error.name).toBe('CacheError');
  });

  test('should create cache error with default values', () => {
    const error = createCacheError({
      code: CacheErrorCode.UNKNOWN
    });

    expect(error.code).toBe(CacheErrorCode.UNKNOWN);
    expect(error.message).toBe('An unknown error occurred');
    expect(error.operation).toBeUndefined();
    expect(error.key).toBeUndefined();
  });

  test('should format error message with all parameters', () => {
    const message = formatErrorMessage({
      operation: 'set',
      key: 'test-key',
      provider: 'memory',
      errorMessage: 'Failed to set value'
    });

    expect(message).toContain('set');
    expect(message).toContain('test-key');
    expect(message).toContain('memory');
    expect(message).toContain('Failed to set value');
  });

  test('should format error message with minimal parameters', () => {
    const message = formatErrorMessage({
      errorMessage: 'Generic error'
    });

    expect(message).toBe('Cache error: Generic error');
  });

  test('should identify cache errors correctly', () => {
    const cacheError = new CacheError(CacheErrorCode.INVALID_KEY, 'Invalid key');
    const regularError = new Error('Regular error');

    expect(isCacheError(cacheError)).toBe(true);
    expect(isCacheError(regularError)).toBe(false);
    expect(isCacheError(null)).toBe(false);
    expect(isCacheError(undefined)).toBe(false);
    expect(isCacheError({ code: CacheErrorCode.INVALID_KEY })).toBe(false);
  });

  test('should log cache errors', () => {
    const error = createCacheError({
      code: CacheErrorCode.PROVIDER_ERROR,
      message: 'Provider failed',
      operation: 'get',
      key: 'test-key'
    });

    logCacheError(error);

    expect(console.error).toHaveBeenCalled();
    expect((console.error as jest.Mock).mock.calls[0][0]).toContain('Provider failed');
  });

  test('should log regular errors as cache errors', () => {
    const error = new Error('Regular error');

    logCacheError(error);

    expect(console.error).toHaveBeenCalled();
    expect((console.error as jest.Mock).mock.calls[0][0]).toContain('Regular error');
  });

  test('should handle cache errors with throwError option', () => {
    const originalError = new Error('Original error');

    // Should return a CacheError
    const result = handleCacheError(originalError, {
      operation: 'get',
      key: 'test-key'
    }, { throwError: false });

    expect(result).toBeInstanceOf(CacheError);
    expect(result.message).toContain('Original error');
    expect(result.operation).toBe('get');
    expect(result.key).toBe('test-key');

    // Should throw the error
    expect(() => {
      handleCacheError(originalError, {
        operation: 'set',
        key: 'test-key'
      }, { throwError: true });
    }).toThrow(CacheError);
  });

  test('should handle cache errors with different error types', () => {
    // Test with string error
    const stringError = handleCacheError('String error', { operation: 'get' });
    expect(stringError.message).toContain('String error');

    // Test with object error
    const objectError = handleCacheError({ custom: 'Object error' }, { operation: 'get' });
    expect(objectError.message).toContain('Object error');

    // Test with null/undefined error
    const nullError = handleCacheError(null, { operation: 'get' });
    expect(nullError.message).toContain('Unknown error');

    const undefinedError = handleCacheError(undefined, { operation: 'get' });
    expect(undefinedError.message).toContain('Unknown error');
  });

  test('should handle cache errors with logging options', () => {
    // Test with default logging (true)
    handleCacheError(new Error('Error 1'), { operation: 'get' });
    expect(console.error).toHaveBeenCalled();
    (console.error as jest.Mock).mockClear();

    // Test with logging disabled
    handleCacheError(new Error('Error 2'), { operation: 'get' }, { logError: false });
    expect(console.error).not.toHaveBeenCalled();

    // Test with warn level
    handleCacheError(new Error('Error 3'), { operation: 'get' }, { logLevel: 'warn' });
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  test('should handle cache errors with custom error codes', () => {
    // Test with specific error code
    const error = handleCacheError(new Error('Network error'), 
      { operation: 'get' }, 
      { errorCode: CacheErrorCode.NETWORK_ERROR }
    );
    
    expect(error.code).toBe(CacheErrorCode.NETWORK_ERROR);

    // Test with auto-detection
    const timeoutError = handleCacheError(new Error('timeout'), { operation: 'get' });
    expect(timeoutError.code).toBe(CacheErrorCode.TIMEOUT);

    const networkError = handleCacheError(new Error('network failure'), { operation: 'get' });
    expect(networkError.code).toBe(CacheErrorCode.NETWORK_ERROR);

    const invalidKeyError = handleCacheError(new Error('invalid key'), { operation: 'get' });
    expect(invalidKeyError.code).toBe(CacheErrorCode.INVALID_KEY);
  });

  test('should handle errors with cause property', () => {
    // Create an error with cause
    const cause = new Error('Root cause');
    const error = new Error('Wrapper error');
    (error as any).cause = cause;

    const result = handleCacheError(error, { operation: 'get' });
    
    expect(result.message).toContain('Wrapper error');
    expect(result.message).toContain('Root cause');
  });

  test('should handle errors with nested causes', () => {
    // Create deeply nested errors
    const rootCause = new Error('Root cause');
    const middleCause = new Error('Middle cause');
    (middleCause as any).cause = rootCause;
    const topError = new Error('Top error');
    (topError as any).cause = middleCause;

    const result = handleCacheError(topError, { operation: 'get' });
    
    expect(result.message).toContain('Top error');
    expect(result.message).toContain('Middle cause');
    expect(result.message).toContain('Root cause');
  });
});