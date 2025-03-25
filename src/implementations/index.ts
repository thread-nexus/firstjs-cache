/**
 * Re-export all implementations
 */

import {CacheManager} from '../core/cache-manager';
import {CacheManagerCore} from './cache-manager-core';
import {CacheMetadata} from './cache-metadata';
import {CacheManagerStats} from './cache-manager-stats';
import {CacheConfig} from '../interfaces/i-cache-config';

// Export all implementations
export {
    CacheManager,
    CacheManagerCore,
    CacheMetadata,
    CacheManagerStats,
};

// Export types and constants
export * from '../types';
export * from '../constants';

// Create a new cache manager
export function createCacheManager(config: CacheConfig): CacheManager {
    return new CacheManager(config);
}

// Create a new cache manager core
export function createCacheManagerCore(config: CacheConfig): CacheManagerCore {
    return new CacheManagerCore(config);
}

// Export default cache manager
export default CacheManager;