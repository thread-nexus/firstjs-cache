/**
 * @fileoverview Common types and interfaces used throughout the cache system
 */

/**
 * Generic key-value pair
 */
export interface KeyValuePair<K, V> {
  /**
   * Key
   */
  key: K;
  
  /**
   * Value
   */
  value: V;
}

/**
 * Result of an asynchronous operation
 */
export interface AsyncResult<T> {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Result value if successful
   */
  value?: T;
  
  /**
   * Error if operation failed
   */
  error?: Error;
  
  /**
   * Duration of the operation in milliseconds
   */
  duration?: number;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Disposable resource
 */
export interface Disposable {
  /**
   * Dispose of the resource
   */
  dispose(): Promise<void> | void;
}

/**
 * Logger interface
 */
export interface Logger {
  /**
   * Log an error message
   */
  error(message: string, context?: any): void;
  
  /**
   * Log a warning message
   */
  warn(message: string, context?: any): void;
  
  /**
   * Log an info message
   */
  info(message: string, context?: any): void;
  
  /**
   * Log a debug message
   */
  debug(message: string, context?: any): void;
}

/**
 * Log levels
 */
export enum LogLevel {
  /**
   * Error level
   */
  ERROR = 'error',
  
  /**
   * Warning level
   */
  WARN = 'warn',
  
  /**
   * Info level
   */
  INFO = 'info',
  
  /**
   * Debug level
   */
  DEBUG = 'debug'
}

/**
 * Log entry
 */
export interface LogEntry {
  /**
   * Log level
   */
  level: LogLevel;
  
  /**
   * Log message
   */
  message: string;
  
  /**
   * Timestamp
   */
  timestamp: Date;
  
  /**
   * Context data
   */
  context?: any;
  
  /**
   * Source module
   */
  source?: string;
  
  /**
   * Error object if applicable
   */
  error?: Error;
}

/**
 * Retry options
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;
  
  /**
   * Base delay between retries in milliseconds
   */
  baseDelay: number;
  
  /**
   * Maximum delay between retries in milliseconds
   */
  maxDelay?: number;
  
  /**
   * Whether to use exponential backoff
   */
  exponential?: boolean;
  
  /**
   * Jitter factor (0-1) to randomize delay
   */
  jitter?: number;
  
  /**
   * Function to determine if an error is retryable
   */
  isRetryable?: (error: Error) => boolean;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  /**
   * Page number (0-based)
   */
  page: number;
  
  /**
   * Page size
   */
  pageSize: number;
  
  /**
   * Sort field
   */
  sortBy?: string;
  
  /**
   * Sort direction
   */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  /**
   * Items in the current page
   */
  items: T[];
  
  /**
   * Total number of items
   */
  total: number;
  
  /**
   * Current page number
   */
  page: number;
  
  /**
   * Page size
   */
  pageSize: number;
  
  /**
   * Total number of pages
   */
  totalPages: number;
  
  /**
   * Whether there is a next page
   */
  hasNext: boolean;
  
  /**
   * Whether there is a previous page
   */
  hasPrevious: boolean;
}