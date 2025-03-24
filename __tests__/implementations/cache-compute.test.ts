import { CacheCompute } from '../../src/implementations/cache-compute';
import { ICacheProvider } from '../../src/interfaces/i-cache-provider';

describe('CacheCompute', () => {
  let mockProvider: ICacheProvider;
  let compute: CacheCompute;

  beforeEach(() => {
    mockProvider = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    };
    compute = new CacheCompute(mockProvider, {
      defaultTtl: 3600,
      backgroundRefresh: true,
      refreshThreshold: 0.75
    });
  });

  test('should compute and cache new value', async () => {
    const key = 'test-key';
    const value = { data: 'test' };
    const computeFn = jest.fn().mockResolvedValue(value);

    mockProvider.get.mockResolvedValue(null);
    mockProvider.set.mockResolvedValue(undefined);

    const result = await compute.getOrCompute(key, computeFn);

    expect(result.value).toEqual(value);
    expect(result.stale).toBe(false);
    expect(computeFn).toHaveBeenCalled();
    expect(mockProvider.set).toHaveBeenCalled();
  });

  test('should handle compute errors with retry', async () => {
    const key = 'test-key';
    const error = new Error('Compute failed');
    const computeFn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ data: 'test' });

    mockProvider.get.mockResolvedValue(null);

    const result = await compute.getOrCompute(key, computeFn, {
      maxRetries: 2,
      retryDelay: 100
    });

    expect(result.value).toBeDefined();
    expect(computeFn).toHaveBeenCalledTimes(2);
  });

  test('should handle background refresh', async () => {
    const key = 'test-key';
    const oldValue = { data: 'old' };
    const newValue = { data: 'new' };
    
    mockProvider.get.mockResolvedValueOnce(oldValue);
    mockProvider.getMetadata.mockResolvedValueOnce({ 
      refreshedAt: new Date(Date.now() - 3600000) 
    });
    
    const computeFn = jest.fn().mockResolvedValue(newValue);
    const result = await compute.getOrCompute(key, computeFn);
    
    expect(result.value).toEqual(oldValue);
    expect(result.stale).toBe(true);
    
    // Wait for background refresh
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(mockProvider.set).toHaveBeenCalledWith(key, newValue, expect.any(Object));
  });

  test('should cancel background refresh', async () => {
    const key = 'test-key';
    compute.scheduleRefresh(key, () => Promise.resolve({ data: 'test' }));
    compute.cancelRefresh(key);
    
    expect(compute.getRefreshStatus().activeRefreshes).toBe(0);
  });

  test('should handle retry exhaustion', async () => {
    const computeFn = jest.fn().mockRejectedValue(new Error('Always fails'));
    
    await expect(compute.getOrCompute('key', computeFn, {
      maxRetries: 2,
      retryDelay: 10
    })).rejects.toThrow('Always fails');
    
    expect(computeFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});
