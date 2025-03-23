import { 
  CacheEventType,
  cacheEventEmitter,
  createCacheEventLogger,
  emitCacheEvent
} from '../../src/events/cache-events';

describe('Cache Events Tests', () => {
  beforeEach(() => {
    // Clear all event listeners before each test
    cacheEventEmitter.removeAllListeners();
  });

  test('should emit and receive cache events', () => {
    const listener = jest.fn();
    cacheEventEmitter.on(CacheEventType.GET_HIT, listener);

    emitCacheEvent(CacheEventType.GET_HIT, { key: 'test-key' });
    
    expect(listener).toHaveBeenCalledWith({
      key: 'test-key',
      timestamp: expect.any(Number)
    });
  });

  test('should handle multiple event listeners', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    cacheEventEmitter.on(CacheEventType.SET, listener1);
    cacheEventEmitter.on(CacheEventType.SET, listener2);

    emitCacheEvent(CacheEventType.SET, { key: 'test-key', value: 'test-value' });

    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  test('should remove event listeners', () => {
    const listener = jest.fn();
    cacheEventEmitter.on(CacheEventType.DELETE, listener);
    
    emitCacheEvent(CacheEventType.DELETE, { key: 'test-key' });
    expect(listener).toHaveBeenCalledTimes(1);

    cacheEventEmitter.off(CacheEventType.DELETE, listener);
    emitCacheEvent(CacheEventType.DELETE, { key: 'test-key' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('should create event logger with different levels', () => {
    const originalConsole = { ...console };
    const mockConsole = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };

    // Mock console methods
    Object.assign(console, mockConsole);

    const errorLogger = createCacheEventLogger('error');
    const warnLogger = createCacheEventLogger('warn');
    const infoLogger = createCacheEventLogger('info');
    const debugLogger = createCacheEventLogger('debug');

    const payload = { key: 'test-key', message: 'test message' };

    errorLogger(payload);
    expect(console.error).toHaveBeenCalled();

    warnLogger(payload);
    expect(console.warn).toHaveBeenCalled();

    infoLogger(payload);
    expect(console.info).toHaveBeenCalled();

    debugLogger(payload);
    expect(console.debug).toHaveBeenCalled();

    // Restore original console
    Object.assign(console, originalConsole);
  });

  test('should handle wildcard event listeners', () => {
    const listener = jest.fn();
    cacheEventEmitter.on('*', listener);

    emitCacheEvent(CacheEventType.GET_HIT, { key: 'key1' });
    emitCacheEvent(CacheEventType.SET, { key: 'key2' });
    emitCacheEvent(CacheEventType.DELETE, { key: 'key3' });

    expect(listener).toHaveBeenCalledTimes(3);
  });

  test('should include timestamps in events', () => {
    const listener = jest.fn();
    cacheEventEmitter.on(CacheEventType.GET_HIT, listener);

    const beforeEmit = Date.now();
    emitCacheEvent(CacheEventType.GET_HIT, { key: 'test-key' });
    const afterEmit = Date.now();

    const timestamp = listener.mock.calls[0][0].timestamp;
    expect(timestamp).toBeGreaterThanOrEqual(beforeEmit);
    expect(timestamp).toBeLessThanOrEqual(afterEmit);
  });

  test('should handle error events', () => {
    const listener = jest.fn();
    cacheEventEmitter.on(CacheEventType.ERROR, listener);

    const error = new Error('Test error');
    emitCacheEvent(CacheEventType.ERROR, {
      error,
      operation: 'get',
      key: 'test-key'
    });

    expect(listener).toHaveBeenCalledWith({
      error,
      operation: 'get',
      key: 'test-key',
      timestamp: expect.any(Number)
    });
  });

  test('should handle stats update events', () => {
    const listener = jest.fn();
    cacheEventEmitter.on(CacheEventType.STATS_UPDATE, listener);

    const stats = {
      hits: 10,
      misses: 5,
      size: 1000
    };

    emitCacheEvent(CacheEventType.STATS_UPDATE, { stats });

    expect(listener).toHaveBeenCalledWith({
      stats,
      timestamp: expect.any(Number)
    });
  });

  test('should handle provider events', () => {
    const listener = jest.fn();
    cacheEventEmitter.on(CacheEventType.PROVIDER_INITIALIZED, listener);

    emitCacheEvent(CacheEventType.PROVIDER_INITIALIZED, {
      provider: 'memory',
      config: { maxSize: 1000 }
    });

    expect(listener).toHaveBeenCalledWith({
      provider: 'memory',
      config: { maxSize: 1000 },
      timestamp: expect.any(Number)
    });
  });

  test('should handle cleanup events', () => {
    const listener = jest.fn();
    cacheEventEmitter.on(CacheEventType.CLEANUP, listener);

    emitCacheEvent(CacheEventType.CLEANUP, {
      entriesRemoved: 5,
      duration: 100
    });

    expect(listener).toHaveBeenCalledWith({
      entriesRemoved: 5,
      duration: 100,
      timestamp: expect.any(Number)
    });
  });
});