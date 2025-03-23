/**
 * @fileoverview Provider management and orchestration for multi-layer caching
 */

import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions, CacheStats } from '../types/common';
import { emitCacheEvent, CacheEventType } from '../events/cache-events';
import { handleCacheError } from '../utils/error-utils';

/**
 * Provider configuration with priority and metadata
 */
interface ProviderEntry {
  name: string;
  instance: ICacheProvider;
  priority: number;
  stats: CacheStats;
  lastError?: Error;
  errorCount: number;
}

export class CacheProviderManager {
  private providers: Map<string, ProviderEntry> = new Map();
  private sortedProviders: ProviderEntry[] = [];

  /**
   * Register a new cache provider
   */
  registerProvider(
    name: string,
    provider: ICacheProvider,
    priority: number = 0
  ): void {
    const entry: ProviderEntry = {
      name,
      instance: provider,
      priority,
      stats: {
        hits: 0,
        misses: 0,
        size: 0,
        keyCount: 0,
        memoryUsage: 0,
        lastUpdated: new Date(),
        keys: []
      },
      errorCount: 0
    };

    this.providers.set(name, entry);
    this.updateProviderOrder();

    emitCacheEvent(CacheEventType.PROVIDER_INITIALIZED, { provider: name });
  }

  /**
   * Update provider ordering based on priority
   * @private
   */
  private updateProviderOrder(): void {
    this.sortedProviders = Array.from(this.providers.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get a value from cache providers in priority order
   */
  async get<T>(key: string): Promise<T | null> {
    for (const provider of this.sortedProviders) {
      try {
        const value = await provider.instance.get(key);
        if (value !== null) {
          provider.stats.hits++;
          return value;
        }
        provider.stats.misses++;
      } catch (error) {
        this.handleProviderError(provider, error);
      }
    }
    return null;
  }

  /**
   * Set a value across all cache providers
   */
  async set(key: string, value: any, options?: CacheOptions): Promise<void> {
    const promises = this.sortedProviders.map(async provider => {
      try {
        await provider.instance.set(key, value, options);
      } catch (error) {
        this.handleProviderError(provider, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Delete a value from all cache providers
   */
  async delete(key: string): Promise<boolean> {
    let deleted = false;
    const promises = this.sortedProviders.map(async provider => {
      try {
        const result = await provider.instance.delete(key);
        deleted = deleted || result;
      } catch (error) {
        this.handleProviderError(provider, error);
      }
    });

    await Promise.allSettled(promises);
    return deleted;
  }

  /**
   * Clear all cache providers
   */
  async clear(): Promise<void> {
    const promises = this.sortedProviders.map(async provider => {
      try {
        await provider.instance.clear();
      } catch (error) {
        this.handleProviderError(provider, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get stats from all providers
   */
  async getStats(): Promise<Record<string, CacheStats>> {
    const stats: Record<string, CacheStats> = {};
    
    for (const provider of this.sortedProviders) {
      try {
        const providerStats = await provider.instance.getStats();
        stats[provider.name] = {
          ...providerStats,
          hits: provider.stats.hits,
          misses: provider.stats.misses
        };
      } catch (error) {
        this.handleProviderError(provider, error);
        stats[provider.name] = provider.stats;
      }
    }

    return stats;
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name: string): ICacheProvider | null {
    return this.providers.get(name)?.instance || null;
  }

  /**
   * Handle provider errors with circuit breaking
   * @private
   */
  private handleProviderError(provider: ProviderEntry, error: Error): void {
    provider.lastError = error;
    provider.errorCount++;

    handleCacheError(error, {
      provider: provider.name,
      errorCount: provider.errorCount
    });

    // If provider has too many errors, move it to lowest priority
    if (provider.errorCount > 5) {
      provider.priority = Math.max(
        ...this.sortedProviders.map(p => p.priority)
      ) + 1;
      this.updateProviderOrder();
    }
  }

  /**
   * Reset error counts for providers
   */
  resetErrorCounts(): void {
    for (const provider of this.providers.values()) {
      provider.errorCount = 0;
      provider.lastError = undefined;
    }
  }

  /**
   * Get provider health status
   */
  getProviderHealth(): Record<string, {
    status: 'healthy' | 'degraded' | 'failing';
    errorCount: number;
    lastError?: Error;
  }> {
    const health: Record<string, any> = {};

    for (const provider of this.providers.values()) {
      health[provider.name] = {
        status: provider.errorCount === 0 ? 'healthy' :
                provider.errorCount < 5 ? 'degraded' : 'failing',
        errorCount: provider.errorCount,
        lastError: provider.lastError
      };
    }

    return health;
  }
}