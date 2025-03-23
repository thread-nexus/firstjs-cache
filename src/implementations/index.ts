/**
 * index.ts
 * 
 * Main export file for the cache manager implementation
 */
import { ICacheConfig } from '../interfaces/i-cache-config';
import { CacheManager } from './cache-manager';
import { CacheManagerAdvanced } from './cache-manager-advanced';
import { CacheManagerCore } from './cache-manager-core';
import { CacheManagerStats } from './cache-manager-stats';

// Export the main classes
export { 
  CacheManager,
  CacheManagerAdvanced,
  CacheManagerCore,
  CacheManagerStats
};

// Helper function to create a cache manager instance
export function createCacheManager(config: ICacheConfig): CacheManager {
  return new CacheManager(config);
}

// Export a default factory function
export default function(config: ICacheConfig): CacheManager {
  return createCacheManager(config);
}