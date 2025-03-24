/**
 * Default cache configuration
 */
export const DEFAULT_CONFIG = {
  defaultTtl: 3600, // 1 hour
  maxSize: 100 * 1024 * 1024, // 100MB
  maxItems: 10000,
  compressionThreshold: 1024, // 1KB
  compressionLevel: 1, // Fast compression
  refreshThreshold: 0.75, // Refresh when 75% of TTL has elapsed
  backgroundRefresh: true,
  statsInterval: 60, // 1 minute
  providers: ['memory'],
  defaultProvider: 'memory',
};

/**
 * Cache constants
 */
export const CACHE_CONSTANTS = {
  MAX_KEY_LENGTH: 1024,
  MAX_VALUE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_BATCH_SIZE: 100,
  MAX_TTL: 60 * 60 * 24 * 365, // 1 year in seconds
  DEFAULT_STATS_INTERVAL: 60,
};
