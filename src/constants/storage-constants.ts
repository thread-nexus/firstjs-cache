/**
 * @fileoverview Storage constants for the cache system
 */

/**
 * Storage provider types
 */
export const STORAGE_PROVIDER = {
  /**
   * In-memory storage
   */
  MEMORY: 'memory',
  
  /**
   * Local storage (browser)
   */
  LOCAL_STORAGE: 'localStorage',
  
  /**
   * Session storage (browser)
   */
  SESSION_STORAGE: 'sessionStorage',
  
  /**
   * IndexedDB (browser)
   */
  INDEXED_DB: 'indexedDB',
  
  /**
   * Redis storage
   */
  REDIS: 'redis',
  
  /**
   * File system storage
   */
  FILE_SYSTEM: 'fileSystem',
  
  /**
   * Database storage
   */
  DATABASE: 'database',
  
  /**
   * Remote API storage
   */
  REMOTE_API: 'remoteApi',
};

/**
 * Storage size limits in bytes
 */
export const STORAGE_SIZE = {
  /**
   * Kilobyte
   */
  KB: 1024,
  
  /**
   * Megabyte
   */
  MB: 1024 * 1024,
  
  /**
   * Gigabyte
   */
  GB: 1024 * 1024 * 1024,
  
  /**
   * Default memory cache size (100MB)
   */
  DEFAULT_MEMORY_CACHE: 100 * 1024 * 1024,
  
  /**
   * Default local storage size (5MB)
   */
  DEFAULT_LOCAL_STORAGE: 5 * 1024 * 1024,
  
  /**
   * Default maximum item size (1MB)
   */
  DEFAULT_MAX_ITEM_SIZE: 1024 * 1024,
  
  /**
   * Default compression threshold (1KB)
   */
  DEFAULT_COMPRESSION_THRESHOLD: 1024,
};

/**
 * Storage key prefixes
 */
export const STORAGE_PREFIX = {
  /**
   * Default cache key prefix
   */
  CACHE_KEY: 'cache:',
  
  /**
   * Tag index prefix
   */
  TAG_INDEX: 'tag:',
  
  /**
   * Metadata prefix
   */
  METADATA: 'meta:',
  
  /**
   * Stats prefix
   */
  STATS: 'stats:',
  
  /**
   * Lock prefix
   */
  LOCK: 'lock:',
  
  /**
   * Config prefix
   */
  CONFIG: 'config:',
};

/**
 * Storage serialization formats
 */
export const SERIALIZATION_FORMAT = {
  /**
   * JSON format
   */
  JSON: 'json',
  
  /**
   * MessagePack format
   */
  MSGPACK: 'msgpack',
  
  /**
   * BSON format
   */
  BSON: 'bson',
  
  /**
   * CBOR format
   */
  CBOR: 'cbor',
  
  /**
   * Protocol Buffers format
   */
  PROTOBUF: 'protobuf',
};

/**
 * Compression algorithms
 */
export const COMPRESSION_ALGORITHM = {
  /**
   * Gzip compression
   */
  GZIP: 'gzip',
  
  /**
   * Deflate compression
   */
  DEFLATE: 'deflate',
  
  /**
   * Brotli compression
   */
  BROTLI: 'brotli',
  
  /**
   * LZ4 compression
   */
  LZ4: 'lz4',
  
  /**
   * Zstandard compression
   */
  ZSTD: 'zstd',
};