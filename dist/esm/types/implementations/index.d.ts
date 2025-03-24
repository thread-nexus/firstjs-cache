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
export { CacheManager, CacheManagerAdvanced, CacheManagerCore, CacheManagerStats };
export declare function createCacheManager(config: ICacheConfig): CacheManager;
export default function (config: ICacheConfig): CacheManager;
