/**
 * @fileoverview File system storage adapter for cache persistence
 * 
 * This adapter implements disk-based storage for cache data with features like:
 * - Automatic key hashing to create safe filenames
 * - Directory sharding to prevent file system limits
 * - TTL enforcement through metadata
 * - Atomic file operations to prevent corruption
 * - Automatic cleanup of expired entries
 * 
 * @module adapters/file-system-adapter
 */

import {IStorageAdapter} from '../interfaces/i-storage-adapter';
import {CacheOptions, CacheStats, HealthStatus} from '../types';
import {CacheErrorCode, createCacheError, handleCacheError} from '../utils/error-utils';
import {logger} from '../utils/logger';
import {metrics} from '../utils/metrics';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Metadata structure stored with each cache entry
 * 
 * @interface EntryMetadata
 */
interface EntryMetadata {
  /**
   * Unix timestamp when the entry expires (if TTL set)
   */
  expiresAt?: number;
  
  /**
   * Unix timestamp when the entry was created
   */
  createdAt: number;
  
  /**
   * Unix timestamp when the entry was last accessed
   */
  lastAccessed: number;
  
  /**
   * Number of times the entry has been accessed
   */
  accessCount: number;
  
  /**
   * Size of the entry value in bytes
   */
  size: number;
  
  /**
   * Optional tags associated with this entry
   */
  tags?: string[];
}

/**
 * Cached file format with value and metadata
 */
interface CacheEntry<T = any> {
  /**
   * The cached value
   */
  value: T;
  
  /**
   * Entry metadata
   */
  metadata: EntryMetadata;
}

/**
 * Configuration options for the file system adapter
 */
export interface FileSystemAdapterOptions {
  /**
   * Directory path where cache files will be stored
   */
  directory: string;
  
  /**
   * Number of subdirectory shards to use (prevents too many files in one directory)
   */
  shardingLevel?: number;
  
  /**
   * Default TTL in seconds for cache entries
   */
  defaultTtl?: number;
  
  /**
   * Interval in seconds to check for and remove expired entries
   */
  cleanupInterval?: number;
  
  /**
   * Maximum size of the cache in bytes (0 for unlimited)
   */
  maxSize?: number;
  
  /**
   * Whether to use synchronous file operations (safer but slower)
   */
  syncOperations?: boolean;
  
  /**
   * Custom name for this adapter instance
   */
  name?: string;
}

/**
 * File system adapter for persistent cache storage
 * 
 * @class FileSystemAdapter
 * @implements {IStorageAdapter}
 */
export class FileSystemAdapter implements IStorageAdapter {
  /**
   * Name of this adapter instance
   */
  readonly name: string;
  
  /**
   * Base directory where cache files are stored
   * @private
   */
  private readonly directory: string;
  
  /**
   * Number of subdirectory shards to use
   * @private
   */
  private readonly shardingLevel: number;
  
  /**
   * Default TTL for entries (seconds)
   * @private
   */
  private readonly defaultTtl?: number;
  
  /**
   * Timer reference for periodic cleanup
   * @private
   */
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  /**
   * Current size of the cache in bytes
   * @private
   */
  private currentSize = 0;
  
  /**
   * Maximum size of the cache in bytes
   * @private
   */
  private readonly maxSize: number;
  
  /**
   * Whether to use synchronous file operations
   * @private
   */
  private readonly syncOperations: boolean;
  
  /**
   * Statistics for cache operations
   * @private
   */
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    keyCount: 0,
    memoryUsage: 0,
    lastUpdated: Date.now()
  };
  
  /**
   * Creates a new file system adapter
   * 
   * @param {FileSystemAdapterOptions} options - Configuration options
   */
  constructor(options: FileSystemAdapterOptions) {
    this.name = options.name || 'filesystem';
    this.directory = options.directory;
    this.shardingLevel = options.shardingLevel || 2;
    this.defaultTtl = options.defaultTtl;
    this.maxSize = options.maxSize || 0;
    this.syncOperations = options.syncOperations || false;
    
    // Initialize cache directory and start cleanup timer
    this.initialize(options.cleanupInterval).then(r => {});
  }
    getMany<T = any>(keys: string[]): Promise<Record<string, T | null>> {
        throw new Error('Method not implemented.');
    }
    setMany<T = any>(entries: Record<string, T>, options?: { ttl?: number; }): Promise<void> {
        throw new Error('Method not implemented.');
    }
    setMetadata?(key: string, metadata: any): Promise<void> {
        throw new Error('Method not implemented.');
    }
    getMetadata?(key: string): Promise<any> {
        throw new Error('Method not implemented.');
    }
  
  /**
   * Get a value from the cache
   * 
   * @template T - Type of the cached value
   * @param {string} key - Cache key to retrieve
   * @returns {Promise<T | null>} - Cached value or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    const filePath = this.getFilePath(key);
    let hit = false;
    
    try {
      const entryData = await this.readFile(filePath);
      if (!entryData) {
        this.stats.misses++;
        metrics.increment('filesystem.misses', 1, { provider: this.name });
        return null;
      }
      
      const entry = JSON.parse(entryData) as CacheEntry<T>;
      
      // Check if entry has expired
      if (entry.metadata.expiresAt && entry.metadata.expiresAt < Date.now()) {
        // Remove expired entry
        await this.delete(key);
        this.stats.misses++;
        metrics.increment('filesystem.misses', 1, { provider: this.name });
        return null;
      }
      
      // Update access time and count
      entry.metadata.lastAccessed = Date.now();
      entry.metadata.accessCount++;
      
      // Write back updated metadata (don't await to avoid blocking)
      this.writeFile(filePath, JSON.stringify(entry))
        .catch(err => logger.error(`Failed to update metadata for ${key}`, { error: err }));
      
      this.stats.hits++;
      hit = true;
      metrics.increment('filesystem.hits', 1, { provider: this.name });
      
      return entry.value;
    } catch (error) {
      logger.debug(`Cache miss for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      this.stats.misses++;
      metrics.increment('filesystem.misses', 1, { provider: this.name });
      return null;
    } finally {
      const duration = performance.now() - startTime;
      metrics.timer('filesystem.get', duration, { 
        hit: hit ? 'true' : 'false',
        provider: this.name
      });
      
      emitCacheEvent(hit ? CacheEventType.GET_HIT : CacheEventType.GET_MISS, {
        key,
        provider: this.name,
        duration,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Store a value in the cache
   * 
   * @template T - Type of value to cache
   * @param {string} key - Cache key
   * @param {T} value - Value to store
   * @param {CacheOptions} [options] - Cache options
   * @returns {Promise<void>}
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const startTime = performance.now();
    const filePath = this.getFilePath(key);
    const directoryPath = path.dirname(filePath);
    
    try {
      // Create directory structure if it doesn't exist
      await fs.mkdir(directoryPath, { recursive: true });
      
      // Calculate value size (approximate)
      const serializedValue = JSON.stringify(value);
      const valueSize = Buffer.from(serializedValue).length;
      
      // Calculate expiration time
      const ttl = options?.ttl || this.defaultTtl;
      const expiresAt = ttl ? Date.now() + (ttl * 1000) : undefined;
      
      // Create entry with metadata
      const entry: CacheEntry<T> = {
        value,
        metadata: {
          expiresAt,
          createdAt: Date.now(),
          lastAccessed: Date.now(),
          accessCount: 0,
          size: valueSize,
          tags: options?.tags
        }
      };
      
      // Write to disk
      await this.writeFile(filePath, JSON.stringify(entry));
      
      // Update cache size tracking
      await this.updateCacheSize(valueSize);
      
      metrics.increment('filesystem.sets', 1, { provider: this.name });
      
      emitCacheEvent(CacheEventType.SET, {
        key,
        provider: this.name,
        size: valueSize,
        ttl,
        timestamp: Date.now(),
        duration: performance.now() - startTime
      });
    } catch (error) {
      metrics.increment('filesystem.errors', 1, { 
        operation: 'set',
        provider: this.name
      });
      
      handleCacheError(error, {
        operation: 'set',
        key,
        provider: this.name
      }, true);
      
      throw error;
    }
  }
  
  /**
   * Check if a key exists in the cache
   * 
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Whether the key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      const entryData = await this.readFile(filePath);
      
      if (!entryData) {
        return false;
      }
      
      const entry = JSON.parse(entryData) as CacheEntry;
      
      // Check if expired
      if (entry.metadata.expiresAt && entry.metadata.expiresAt < Date.now()) {
        // Remove expired entry (don't await)
        this.delete(key).catch(() => {});
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Delete a key from the cache
   * 
   * @param {string} key - Cache key to delete
   * @returns {Promise<boolean>} - Whether the key was found and deleted
   */
  async delete(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    
    try {
      await fs.unlink(filePath);
      
      metrics.increment('filesystem.deletes', 1, { provider: this.name });
      
      emitCacheEvent(CacheEventType.DELETE, {
        key,
        provider: this.name,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      // File not found is not an error for delete operation
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      
      metrics.increment('filesystem.errors', 1, { 
        operation: 'delete',
        provider: this.name
      });
      
      logger.debug(`Error deleting key ${key}`, { error });
      return false;
    }
  }
  
  /**
   * Clear all cache data for this provider
   * 
   * @returns {Promise<void>}
   */
  async clear(): Promise<void> {
    try {
      // Delete and recreate the directory
      await fs.rm(this.directory, { recursive: true, force: true });
      await fs.mkdir(this.directory, { recursive: true });
      
      this.currentSize = 0;
      this.stats = {
        hits: 0,
        misses: 0,
        size: 0,
        keyCount: 0,
        memoryUsage: 0,
        lastUpdated: Date.now()
      };
      
      metrics.increment('filesystem.clears', 1, { provider: this.name });
      
      emitCacheEvent(CacheEventType.CLEAR, {
        provider: this.name,
        timestamp: Date.now()
      });
    } catch (error) {
      metrics.increment('filesystem.errors', 1, { 
        operation: 'clear',
        provider: this.name
      });
      
      handleCacheError(error, {
        operation: 'clear',
        provider: this.name
      }, true);
      
      throw error;
    }
  }
  
  /**
   * Get all cache keys matching a pattern
   * 
   * @param {string} [pattern] - Glob pattern to match keys
   * @returns {Promise<string[]>} - Array of matching keys
   */
  async keys(pattern?: string): Promise<string[]> {
    try {
      const keys: string[] = [];
      
      // Recursive function to traverse directory structure
      const scanDirectory = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.json')) {
            // Convert file path back to key
            const key = this.filePathToKey(fullPath);
            
            // Check if key matches pattern
            if (!pattern || key.includes(pattern)) {
              // Verify not expired before adding
              const isValid = await this.has(key);
              if (isValid) {
                keys.push(key);
              }
            }
          }
        }
      };
      
      await scanDirectory(this.directory);
      return keys;
    } catch (error) {
      metrics.increment('filesystem.errors', 1, { 
        operation: 'keys',
        provider: this.name
      });
      
      logger.error('Error retrieving keys', { error });
      return [];
    }
  }
  
  /**
   * Get cache statistics
   * 
   * @returns {Promise<CacheStats>} - Cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      // Count files and get total size
      let keyCount = 0;
      let size = 0;
      
      // Recursive function to traverse directory structure
      const scanDirectory = async (dir: string): Promise<void> => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
              await scanDirectory(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.json')) {
              keyCount++;
              const stats = await fs.stat(fullPath);
              size += stats.size;
            }
          }
        } catch (error) {
          // Skip directories that can't be read
          logger.debug(`Error scanning directory ${dir}`, { error });
        }
      };
      
      await scanDirectory(this.directory);
      
      this.stats.keyCount = keyCount;
      this.stats.size = size;
      this.stats.lastUpdated = Date.now();
      
      return { ...this.stats };
    } catch (error) {
      logger.error('Error getting cache stats', { error });
      return { ...this.stats };
    }
  }
  
  /**
   * Get cache health status
   * 
   * @returns {Promise<HealthStatus>} - Health status
   */
  async healthCheck(): Promise<HealthStatus> {
    try {
      // Check if directory is accessible
      await fs.access(this.directory, fs.constants.R_OK | fs.constants.W_OK);
      
      // Check if we can write a test file
      const testPath = path.join(this.directory, '.health-check');
      await fs.writeFile(testPath, 'ok');
      await fs.unlink(testPath);
      
      return {
        status: 'healthy',
        healthy: true,
        timestamp: Date.now(),
        lastCheck: Date.now(),
        details: {
          directory: this.directory,
          writable: true
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        healthy: false,
        timestamp: Date.now(),
        lastCheck: Date.now(),
        error: error instanceof Error ? error.message : String(error),
        details: {
          directory: this.directory,
          writable: false
        }
      };
    }
  }
  
  /**
   * Release resources and stop background tasks
   * 
   * @returns {Promise<void>}
   */
  async dispose(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * Initialize the cache directory and start cleanup timer
   * 
   * @private
   * @param {number} [cleanupInterval] - Interval in seconds for cleanup
   */
  private async initialize(cleanupInterval?: number): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      await fs.mkdir(this.directory, { recursive: true });
      
      // Start cleanup timer if interval provided
      if (cleanupInterval) {
        this.startCleanupTimer(cleanupInterval);
      }
    } catch (error) {
      throw createCacheError(
        `Failed to initialize file system cache: ${error instanceof Error ? error.message : String(error)}`,
        CacheErrorCode.INITIALIZATION_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Start a timer to periodically clean up expired entries
   * 
   * @private
   * @param {number} intervalSeconds - Cleanup interval in seconds
   */
  private startCleanupTimer(intervalSeconds: number): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries()
        .catch(error => logger.error('Error during cleanup', { error }));
    }, intervalSeconds * 1000);
  }
  
  /**
   * Clean up expired cache entries
   * 
   * @private
   */
  private async cleanupExpiredEntries(): Promise<void> {
    try {
      logger.debug('Starting cleanup of expired cache entries');
      const now = Date.now();
      let expiredCount = 0;
      
      // Recursive function to traverse directory structure
      const scanDirectory = async (dir: string): Promise<void> => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
              await scanDirectory(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.json')) {
              try {
                const entryData = await this.readFile(fullPath);
                if (!entryData) continue;
                
                const cacheEntry = JSON.parse(entryData) as CacheEntry;
                
                // Check if entry has expired
                if (cacheEntry.metadata.expiresAt && cacheEntry.metadata.expiresAt < now) {
                  await fs.unlink(fullPath);
                  expiredCount++;
                }
              } catch (error) {
                // Skip files that can't be read or parsed
                logger.debug(`Error processing file ${fullPath}`, { error });
              }
            }
          }
        } catch (error) {
          // Skip directories that can't be read
          logger.debug(`Error scanning directory ${dir}`, { error });
        }
      };
      
      await scanDirectory(this.directory);
      
      logger.debug(`Cleanup complete, removed ${expiredCount} expired entries`);
      metrics.gauge('filesystem.expired_removed', expiredCount, { provider: this.name });
    } catch (error) {
      logger.error('Error cleaning up expired entries', { error });
    }
  }
  
  /**
   * Update cache size tracking and evict if needed
   * 
   * @private
   * @param {number} newBytes - Size of new entry in bytes
   */
  private async updateCacheSize(newBytes: number): Promise<void> {
    this.currentSize += newBytes;
    this.stats.size = this.currentSize;
    
    // If maxSize is set and exceeded, evict oldest entries
    if (this.maxSize > 0 && this.currentSize > this.maxSize) {
      this.evictEntries().catch(err => {
        logger.error('Error during entry eviction', { error: err });
      });
    }
  }
  
  /**
   * Evict entries to bring cache size below maximum
   * 
   * @private
   */
  private async evictEntries(): Promise<void> {
    try {
      if (this.maxSize <= 0 || this.currentSize <= this.maxSize) {
        return;
      }
      
      logger.debug('Starting entry eviction to reduce cache size');
      
      // Get all entry file paths with their last modified time
      const entries: Array<{ path: string; mtime: Date }> = [];
      
      // Recursive function to gather file information
      const scanDirectory = async (dir: string): Promise<void> => {
        try {
          const dirEntries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of dirEntries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
              await scanDirectory(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.json')) {
              const stats = await fs.stat(fullPath);
              entries.push({ path: fullPath, mtime: stats.mtime });
            }
          }
        } catch (error) {
          // Skip directories that can't be read
          logger.debug(`Error scanning directory ${dir}`, { error });
        }
      };
      
      await scanDirectory(this.directory);
      
      // Sort by last modified time (oldest first)
      entries.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
      
      // Remove entries until we're under the size limit or run out of entries
      let removedCount = 0;
      let removedBytes = 0;
      const targetSize = this.maxSize * 0.8; // Remove enough to get to 80% of max
      
      while (entries.length > 0 && this.currentSize - removedBytes > targetSize) {
        const entry = entries.shift();
        if (!entry) break;
        
        try {
          const stats = await fs.stat(entry.path);
          await fs.unlink(entry.path);
          
          removedCount++;
          removedBytes += stats.size;
        } catch (error) {
          logger.debug(`Error removing file ${entry.path}`, { error });
        }
      }
      
      // Update current size
      this.currentSize -= removedBytes;
      this.stats.size = this.currentSize;
      
      logger.debug(`Eviction complete, removed ${removedCount} entries (${removedBytes} bytes)`);
      metrics.gauge('filesystem.evicted', removedCount, { provider: this.name });
      metrics.gauge('filesystem.evicted_bytes', removedBytes, { provider: this.name });
    } catch (error) {
      logger.error('Error during entry eviction', { error });
    }
  }
  
  /**
   * Get file path for a cache key
   * 
   * @private
   * @param {string} key - Cache key
   * @returns {string} - File path
   */
  private getFilePath(key: string): string {
    // Hash the key to create a safe filename
    const hash = crypto.createHash('md5').update(key).digest('hex');
    
    // Create sharded path based on hash prefix
    const shardPath = this.createShardPath(hash);
    
    // Final path includes the full hash
    return path.join(this.directory, shardPath, `${hash}.json`);
  }
  
  /**
   * Create a sharded directory path from hash
   * 
   * @private
   * @param {string} hash - MD5 hash
   * @returns {string} - Sharded path
   */
  private createShardPath(hash: string): string {
    // Extract prefix for sharding
    const shardParts = [];
    
    for (let i = 0; i < this.shardingLevel; i++) {
      shardParts.push(hash.substring(i * 2, i * 2 + 2));
    }
    
    return shardParts.join(path.sep);
  }
  
  /**
   * Convert a file path back to a cache key
   * 
   * @private
   * @param {string} filePath - File path
   * @returns {string} - Cache key
   */
  private filePathToKey(filePath: string): string {
    // Extract filename without extension
    // This is just an approximation since we can't reverse the hash
    return path.basename(filePath, '.json');
  }
  
  /**
   * Read a file with error handling
   * 
   * @private
   * @param {string} filePath - Path to read
   * @returns {Promise<string | null>} - File contents or null
   */
  private async readFile(filePath: string): Promise<string | null> {
    try {
      if (this.syncOperations) {
        return await fs.readFile(filePath, 'utf8');
      } else {
        return await fs.readFile(filePath, 'utf8');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Write a file with error handling
   * 
   * @private
   * @param {string} filePath - Path to write
   * @param {string} data - Data to write
   * @returns {Promise<void>}
   */
  private async writeFile(filePath: string, data: string): Promise<void> {
    // Create parent directory if it doesn't exist
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    if (this.syncOperations) {
      // To ensure atomic writes, first write to temp file, then rename
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, data, 'utf8');
      await fs.rename(tempPath, filePath);
    } else {
      await fs.writeFile(filePath, data, 'utf8');
    }
  }
}
