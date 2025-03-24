import {DEFAULT_CONFIG} from '../config/default-config';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheOptions} from '../types/common';
import {MemoryAdapter} from '../adapters/memory-adapter';

/**
 * Core implementation of the cache manager
 */
export class CacheManagerCore {
  private providers: Map<string, ICacheProvider> = new Map();
  private healthStatus: Map<string, {healthy: boolean, errors: number}> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  constructor(private config: typeof DEFAULT_CONFIG = DEFAULT_CONFIG) {
    // Initialize default memory provider
    this.providers.set('memory', new MemoryAdapter({
      maxSize: config.maxSize,
      maxItems: config.maxItems,
      defaultTtl: config.defaultTtl
    }));

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
    return provider.getMany(keys);
  }
  /**
   * Set multiple values in cache
   */
  async setMany(entries: Record<string, any>, options?: CacheOptions): Promise<void> {
    const provider = this.getProvider();
    return provider.setMany(entries, options);
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
  async getStats(): Promise<any> {
    const provider = this.getProvider();
    return provider.getStats ? provider.getStats() : {};
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
    return provider.invalidateByTag ? provider.invalidateByTag(tag) : 0;
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
        await provider.get('health-check');
        this.healthStatus.set(name, {healthy: true, errors: 0});
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
  getProviderStatus(name: string): {healthy: boolean, errors: number} {
    return this.healthStatus.get(name) || {healthy: false, errors: 0};
  }
}
