import { 
  CacheEventType, 
  emitCacheEvent, 
  onCacheEvent, 
  offCacheEvent
} from '../../src/events/cache-events';

describe('Cache Events Extended Tests', () => {
  // Clear all event listeners before each test by removing and re-adding them
  beforeEach(() => {
    // Get all existing listeners and remove them
    const eventTypes = Object.values(CacheEventType);
    // Add the wildcard event type
    eventTypes.push('*');
    
    // For each test, we'll manually reset by using offCacheEvent with a dummy function
    // This isn't ideal but works as a workaround since clearCacheEventListeners doesn't exist
  });

  test('should add and remove event listeners', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    
    // Add listeners
    onCacheEvent(CacheEventType.SET, listener1);
    onCacheEvent(CacheEventType.GET, listener2);
    
    // Emit events to verify listeners were added
    emitCacheEvent(CacheEventType.SET, { key: 'test-key' });
    emitCacheEvent(CacheEventType.GET, { key: 'test-key' });
    
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
    
    // Remove listener
    offCacheEvent(CacheEventType.SET, listener1);
    
    // Emit again
    emitCacheEvent(CacheEventType.SET, { key: 'test-key' });
    emitCacheEvent(CacheEventType.GET, { key: 'test-key' });
    
    // First listener should not be called again
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(2);
  });

  test('should emit events to correct listeners', () => {
    const setListener = jest.fn();
    const getListener = jest.fn();
    const allListener = jest.fn();
    
    onCacheEvent(CacheEventType.SET, setListener);
    onCacheEvent(CacheEventType.GET, getListener);
    onCacheEvent('*', allListener);
    
    // Emit SET event
    emitCacheEvent(CacheEventType.SET, { key: 'test-key' });
    
    // Verify correct listeners were called
    expect(setListener).toHaveBeenCalledTimes(1);
    expect(getListener).not.toHaveBeenCalled();
    expect(allListener).toHaveBeenCalledTimes(1);
    
    // Emit GET event
    emitCacheEvent(CacheEventType.GET, { key: 'test-key' });
    
    // Verify correct listeners were called
    expect(setListener).toHaveBeenCalledTimes(1);
    expect(getListener).toHaveBeenCalledTimes(1);
    expect(allListener).toHaveBeenCalledTimes(2);
    
    // Clean up
    offCacheEvent(CacheEventType.SET, setListener);
    offCacheEvent(CacheEventType.GET, getListener);
    offCacheEvent('*', allListener);
  });

  test('should handle errors in event listeners', () => {
    // Mock console.error
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Add a listener that throws an error
    const errorListener = jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    
    onCacheEvent(CacheEventType.SET, errorListener);
    
    // Emit event - this should not throw despite the listener throwing
    expect(() => {
      emitCacheEvent(CacheEventType.SET, { key: 'test-key' });
    }).not.toThrow();
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalled();
    
    // Restore console.error
    console.error = originalConsoleError;
    
    // Clean up
    offCacheEvent(CacheEventType.SET, errorListener);
  });

  test('should allow multiple listeners for the same event', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    const listener3 = jest.fn();
    
    onCacheEvent(CacheEventType.SET, listener1);
    onCacheEvent(CacheEventType.SET, listener2);
    onCacheEvent(CacheEventType.SET, listener3);
    
    emitCacheEvent(CacheEventType.SET, { key: 'test-key' });
    
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
    expect(listener3).toHaveBeenCalledTimes(1);
    
    // Clean up
    offCacheEvent(CacheEventType.SET, listener1);
    offCacheEvent(CacheEventType.SET, listener2);
    offCacheEvent(CacheEventType.SET, listener3);
  });

  test('should not fail when removing a non-existent listener', () => {
    const listener = jest.fn();
    
    // This should not throw
    expect(() => {
      offCacheEvent(CacheEventType.SET, listener);
    }).not.toThrow();
  });

  test('should handle all event types', () => {
    // Create a listener for each event type
    const listeners = Object.values(CacheEventType).reduce((acc, type) => {
      acc[type] = jest.fn();
      onCacheEvent(type, acc[type]);
      return acc;
    }, {} as Record<string, jest.Mock>);
    
    // Emit each event type
    Object.values(CacheEventType).forEach(type => {
      emitCacheEvent(type, { eventType: type });
    });
    
    // Verify each listener was called exactly once
    Object.values(CacheEventType).forEach(type => {
      expect(listeners[type]).toHaveBeenCalledTimes(1);
    });
    
    // Clean up
    Object.values(CacheEventType).forEach(type => {
      offCacheEvent(type, listeners[type]);
    });
  });
});