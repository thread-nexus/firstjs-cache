/**
 * @fileoverview Re-export all types from the types module
 */

// Export all types explicitly from common to avoid conflicts
export { 
  PerformanceMetrics,
  CacheStats, 
  CacheOperationContext,
  CacheOptions, 
  CacheEventPayload,
  EntryMetadata,
  CacheProvider,
  UseCacheQueryOptions,
  CompressionResult,
  HealthStatus, 
  CompressionAlgorithm,
  CompressionOptions,
  // Add any other types needed
  MonitoringConfig,
  SecurityOptions,
  LatencyStats,
  CacheMetrics,
  CacheErrorInfo,
  CacheKeyGenerator,
  CacheFunctionWrapper,
  RateLimitConfig
} from './common';

// Remove these conflicting exports
// export { CompressionAlgorithm, CompressionOptions } from './performance-metrics';
// export { CacheStats, CacheOperationContext } from './common';