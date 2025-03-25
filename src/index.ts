/**
 * @fileoverview Main export file for the cache module
 */

// Main exports
import {createCache} from './easy-cache';

// Named exports
export {
    createCache,
    // Aliases for backward compatibility
    createCache as createEasyCache
};

// Event system
export {
    subscribeToCacheEvents,
    emitCacheEvent,
    CacheEventType,
    subscribeToCacheEvents as onCacheEvent,
    getEventEmitter
} from './events/cache-events';

// Core implementations
export {
    CacheManagerCore,
} from './implementations/cache-manager-core';

// Providers
export {
    MemoryProvider
} from './providers/memory-provider';

// Types
export * from './types';

// Constants
export * from './constants';

// Monitoring exports
export { CacheMonitoring } from './utils/monitoring-utils';
export { monitor } from './decorators/monitor';
export * from './types';

// Easy setup function
// export function setupCacheMonitoring(config?: Partial<MonitoringConfig>) {
//   return CacheMonitoringAPI.getInstance(config);
// }
// After: Comment it out until proper types are provided:
export function setupCacheMonitoring(config?: any) {
  // CacheMonitoringAPI not available
  return;
}

// Default export
export default createCache;