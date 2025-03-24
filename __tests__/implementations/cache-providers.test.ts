import { CacheProviderManager } from '../../src/implementations/cache-providers';
import { ICacheProvider } from '../../src/interfaces/i-cache-provider';

describe('CacheProviderManager', () => {
  let manager: CacheProviderManager;
  let mockProvider: ICacheProvider;

  beforeEach(() => {
    mockProvider = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    };
    manager = new CacheProviderManager();
  });

  test('should manage provider lifecycle', () => {
    manager.registerProvider('test', mockProvider);
    expect(manager.getProvider('test')).toBe(mockProvider);
    
    manager.removeProvider('test');
    expect(manager.getProvider('test')).toBeUndefined();
  });

  test('should handle provider priorities', async () => {
    const primary = { ...mockProvider, get: jest.fn().mockResolvedValue('primary') };
    const secondary = { ...mockProvider, get: jest.fn().mockResolvedValue('secondary') };
    
    manager.registerProvider('primary', primary, 1);
    manager.registerProvider('secondary', secondary, 2);
    
    const result = await manager.get('test-key');
    expect(result).toBe('primary');
    expect(secondary.get).not.toHaveBeenCalled();
  });

  test('should synchronize providers', async () => {
    const provider1 = { ...mockProvider };
    const provider2 = { ...mockProvider };
    
    manager.registerProvider('p1', provider1);
    manager.registerProvider('p2', provider2);
    
    await manager.set('test-key', 'value');
    
    expect(provider1.set).toHaveBeenCalled();
    expect(provider2.set).toHaveBeenCalled();
  });

  test('should handle provider errors', async () => {
    const failingProvider = {
      ...mockProvider,
      get: jest.fn().mockRejectedValue(new Error('Failed'))
    };
    manager.registerProvider('failing', failingProvider);
    
    await expect(manager.get('test-key')).rejects.toThrow('Failed');
  });
});
