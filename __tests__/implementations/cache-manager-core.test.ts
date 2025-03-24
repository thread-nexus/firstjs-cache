import { CacheManagerCore } from '../../src/implementations/cache-manager-core';
import { ICacheProvider } from '../../src/interfaces/i-cache-provider';

describe('CacheManagerCore', () => {
  let manager: CacheManagerCore;
  let mockProvider: ICacheProvider;

  beforeEach(() => {
    mockProvider = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    };
    manager = new CacheManagerCore({
      providers: [{
        name: 'primary',
        instance: mockProvider
      }]
    });
  });

  test('should register providers', () => {
    const secondaryProvider = { ...mockProvider };
    manager.registerProvider('secondary', secondaryProvider, 1);
    
    expect(manager.getProvider('secondary')).toBe(secondaryProvider);
  });

  test('should handle provider failover', async () => {
    const backupProvider = {
      ...mockProvider,
      get: jest.fn().mockResolvedValue({ data: 'backup' })
    };
    manager.registerProvider('backup', backupProvider, 2);
    
    mockProvider.get.mockRejectedValue(new Error('Primary failed'));
    
    const result = await manager.get('test-key');
    expect(result).toEqual({ data: 'backup' });
  });

  test('should monitor provider health', async () => {
    manager.startMonitoring();
    
    mockProvider.get.mockRejectedValue(new Error('Health check failed'));
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(manager.getProviderStatus('primary').healthy).toBe(false);
    manager.stopMonitoring();
  });

  test('should handle compute operations', async () => {
    const computeFn = jest.fn().mockResolvedValue({ data: 'computed' });
    const result = await manager.getOrCompute('test-key', computeFn);
    
    expect(result).toEqual({ data: 'computed' });
    expect(computeFn).toHaveBeenCalled();
  });
});
