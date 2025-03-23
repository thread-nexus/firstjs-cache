/**
 * Interface for low-level storage adapters
 */
export interface IStorageAdapter {
  /**
   * Get raw data by key
   * 
   * @param key The storage key
   * @returns The stored value as string or null if not found
   */
  get(key: string): Promise<string | null>;
  
  /**
   * Set raw data with key
   * 
   * @param key The storage key
   * @param value The value to store as string
   * @param ttl Optional TTL in seconds
   */
  set(key: string, value: string, ttl?: number): Promise<void>;
  
  /**
   * Check if key exists
   * 
   * @param key The storage key
   * @returns True if the key exists
   */
  has(key: string): Promise<boolean>;
  
  /**
   * Delete item by key
   * 
   * @param key The storage key
   * @returns True if the item was deleted
   */
  delete(key: string): Promise<boolean>;
  
  /**
   * Clear all data
   */
  clear(): Promise<void>;
  
  /**
   * Get keys matching pattern
   * 
   * @param pattern Optional pattern to match keys against
   * @returns Array of matching keys
   */
  keys(pattern?: string): Promise<string[]>;
  
  /**
   * Get multiple items at once
   * 
   * @param keys Array of keys to retrieve
   * @returns Record of key-value pairs
   */
  getMany(keys: string[]): Promise<Record<string, string | null>>;
  
  /**
   * Set multiple items at once
   * 
   * @param entries Record of key-value pairs to store
   * @param ttl Optional TTL in seconds
   */
  setMany(entries: Record<string, string>, ttl?: number): Promise<void>;
}

/**
 * Configuration for storage adapters
 */
export interface IStorageAdapterConfig {
  /** Optional key prefix */
  prefix?: string;
  
  /** Default TTL in seconds */
  defaultTtl?: number;
  
  /** Custom serializer */
  serializer?: {
    serialize: (data: any) => string;
    deserialize: (data: string) => any;
  };
  
  /** Maximum size in bytes (if applicable) */
  maxSize?: number;
  
  /** Whether to compress values (if supported) */
  compression?: boolean;
  
  /** Minimum size in bytes for compression */
  compressionThreshold?: number;
}