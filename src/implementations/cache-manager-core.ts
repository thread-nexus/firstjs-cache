import {DEFAULT_CONFIG} from '../config/default-config';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheOptions, CacheStats} from '../types/common';
import {MemoryStorageAdapter as MemoryAdapter} from '../adapters/memory-adapter';

/**
 * Core implementation of the cache manager
 */
export class CacheManagerCore {
  private providers: Map<string, ICacheProvider> = new Map();
  private healthStatus: Map<string, {healthy: boolean, errors: number}> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  constructor(private config: typeof DEFAULT_CONFIG = DEFAULT_CONFIG) {
    // Initialize default memory provider
    const memoryAdapter = new MemoryAdapter({
      // Only use properties that are valid for StorageAdapterConfig
      defaultTtl: config.defaultTtl
    });
    
    // We shouldn't set name property directly if it's readonly
    // Instead, make sure the MemoryAdapter constructor accepts a name parameter
    // or create a factory function that sets the name
    this.providers.set('memory', createMemoryProvider(memoryAdapter, 'memory'));

    // Initialize health status
    this.providers.forEach((_, name) => {
      this.healthStatus.set(name, {healthy: true, errors: 0});
    });
    // Start monitoring if enabled
    if (config.statsInterval) {
      this.startMonitoring();
    }
  }

  /**
   * Get a value from cache
   */
  async get(key: string): Promise<any> {
    const provider = this.getProvider();
    return provider.get(key);
  }
  
  /**
   * Set a value in cache
   */
  async set(key: string, value: any, options?: CacheOptions): Promise<void> {
    const provider = this.getProvider();
    return provider.set(key, value, options);
  }
  
  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    const provider = this.getProvider();
    return provider.delete(key);
  }

  /**
   * Clear the entire cache
   */
  async clear(): Promise<void> {
    const provider = this.getProvider();
    return provider.clear();
  }
  
  /**
   * Get multiple values from cache
   */
  async getMany(keys: string[]): Promise<Record<string, any>> {
    const provider = this.getProvider();
    return provider.getMany?.(keys) ?? {};
  }
  
  /**
   * Set multiple values in cache
   */
  async setMany(entries: Record<string, any>, options?: CacheOptions): Promise<void> {
    const provider = this.getProvider();
    return provider.setMany?.(entries, options) ?? Promise.resolve();
  }
  
  /**
   * Get or compute a value
   */
  async getOrCompute(
    key: string,
    fetcher: () => Promise<any>,
    options?: CacheOptions
  ): Promise<any> {
    const provider = this.getProvider();
    const value = await provider.get(key);

    if (value !== null) {
      return value;
    }

    const computed = await fetcher();
    await provider.set(key, computed, options);
    return computed;
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const provider = this.getProvider();
    return provider.getStats ? provider.getStats() : {
      hits: 0,
      misses: 0,
      size: 0,
      lastUpdated: Date.now(),
      keyCount: 0,
      entries: 0,
      avgTtl: 0,
      maxTtl: 0,
      memoryUsage: 0 // Add required memoryUsage property
    };
  }
  
  /**
   * Get a provider by name
   */
  getProvider(name?: string): ICacheProvider {
    const providerName = name || this.config.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider "${providerName}" not found`);
    }

    return provider;
  }

  /**
   * Get provider operations
   */
  getOperations(provider?: string): any {
    // This would be implemented to return operations specific to the provider
    return {};
  }

  /**
   * Invalidate cache entries by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    const provider = this.getProvider();
    return provider.invalidateByTag?.(tag) ?? 0;
  }

  /**
   * Invalidate cache entries by prefix
   */
  async invalidateByPrefix(prefix: string): Promise<number> {
    // This would be implemented to invalidate by prefix
    return 0;
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    // This would be implemented to get keys by pattern
    return [];
  }

  /**
   * Delete cache entries matching a pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    // This would be implemented to delete by pattern
    return 0;
  }

  /**
   * Start monitoring provider health
   */
  startMonitoring(): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(() => {
      this.checkProviderHealth();
    }, this.config.statsInterval * 1000);
  }

  /**
   * Stop monitoring provider health
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Check provider health
   */
  private async checkProviderHealth(): Promise<void> {
    for (const [name, provider] of this.providers.entries()) {
      try {
        // Handle potentially undefined healthCheck method
        if (typeof provider.healthCheck === 'function') {
          const health = await provider.healthCheck();
          // Ensure we get a boolean healthy status
          const healthy = health.status === 'healthy' || 
                       (health.healthy !== undefined ? health.healthy : false);
          
          this.healthStatus.set(name, {
            healthy,
            errors: 0
          });
        } else {
          // If no health check is available, assume healthy but note it
          this.healthStatus.set(name, {
            healthy: true,
            errors: 0
          });
        }
      } catch (error) {
        const status = this.healthStatus.get(name);
        if (status) {
          status.errors += 1;
          status.healthy = status.errors < 3; // Mark unhealthy after 3 errors
          this.healthStatus.set(name, status);
        }
      }
    }
  }

  /**
   * Get provider health status
   */
  getProviderStatus(name: string): {
    healthy: boolean, 
    errors: number,
    status: 'healthy' | 'degraded' | 'unhealthy'
  } {
    const status = this.healthStatus.get(name) || {healthy: false, errors: 0};
    return {
      ...status,
      status: status.healthy ? 'healthy' : 
              status.errors < 3 ? 'degraded' : 'unhealthy'
    };
  }

  /**
   * Wrap a function with caching
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator: ((...args: Parameters<T>) => string) | undefined,
    options?: CacheOptions
  ): T & { invalidateCache: (...args: Parameters<T>) => Promise<void> } {
    // Implementation would go here
    const originalFn = fn;
    // Fix the wrappedFn reference
    return originalFn as T & { invalidateCache: (...args: Parameters<T>) => Promise<void> };
  }

  /**
   * Get a safe copy of configuration information
   * This exposes configuration in a safe way for UI components
   */
  getConfigInfo(): Record<string, any> {
    return {
      defaultTtl: this.config.defaultTtl,
      providers: Array.from(this.providers.keys()),
      defaultProvider: this.config.defaultProvider,
      // Include other safe properties but exclude sensitive information
    };
  }
}

/**
 * Get cache value by key
 */
export function getCacheValue<T>(key: string): T | null {
  // This is a placeholder implementation that would be properly implemented
  return null;
}

/**
 * Set cache value with key
 */
export async function setCacheValue<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
  // This is a placeholder implementation that would be properly implemented
}

/**
 * Find keys by pattern
 */
export async function findKeysByPattern(pattern: string): Promise<string[]> {
  // This is a placeholder implementation that would be properly implemented
  return [];
}

// Helper function to create a memory provider with a name
function createMemoryProvider(adapter: MemoryAdapter, name: string): ICacheProvider {
  return {
    get: adapter.get.bind(adapter),
    set: adapter.set.bind(adapter),
    delete: adapter.delete.bind(adapter),
    clear: adapter.clear.bind(adapter),
    getMany: adapter.getMany?.bind(adapter),
    setMany: adapter.setMany?.bind(adapter),
    has: adapter.has?.bind(adapter),
    // Implement the keys method
    keys: async (pattern?: string) => {
      if (adapter.keys) {
        return adapter.keys(pattern);
      }
      return [];
    },
    getStats: async () => ({
      hits: 0,
      misses: 0,
      size: 0,
      lastUpdated: Date.now(),
      keyCount: 0,
      entries: 0,
      avgTtl: 0,
      maxTtl: 0,
      memoryUsage: 0
    }),
    // Add healthCheck method
    healthCheck: async () => ({
      status: 'healthy',
      healthy: true,
      timestamp: Date.now()
    }),
    name
  };
}