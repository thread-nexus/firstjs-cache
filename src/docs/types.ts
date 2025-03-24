/**
 * @fileoverview Core documentation types and interfaces for the cache module.
 * These types are used throughout the codebase to ensure consistent documentation.
 */

/**
 * Cache operation result status
 * @enum {string}
 */
export enum CacheOperationStatus {
  /** Operation completed successfully */
  SUCCESS = 'success',
  /** Operation failed */
  ERROR = 'error',
  /** Operation is pending or in progress */
  PENDING = 'pending',
  /** Operation resulted in a cache miss */
  MISS = 'miss',
  /** Operation resulted in a cache hit */
  HIT = 'hit'
}

/**
 * Performance metrics for cache operations
 */
export interface PerformanceMetrics {
  /** Time taken to complete the operation in milliseconds */
  duration: number;
  /** Size of the data in bytes */
  size: number;
  /** Whether compression was used */
  compressed: boolean;
  /** Original size before compression (if applicable) */
  originalSize?: number;
  /** Time spent on serialization */
  serializationTime?: number;
  /** Time spent on compression */
  compressionTime?: number;
  /** Network latency (for remote providers) */
  networkLatency?: number;
}

/**
 * Cache operation result with detailed information
 */
export interface CacheOperationResult<T = any> {
  /** Operation status */
  status: CacheOperationStatus;
  /** Operation data (if successful) */
  data?: T;
  /** Error information (if failed) */
  error?: Error;
  /** Performance metrics */
  metrics?: PerformanceMetrics;
  /** Cache key used in the operation */
  key: string;
  /** Timestamp of the operation */
  timestamp: number;
  /** Provider that handled the operation */
  provider: string;
}

/**
 * Documentation category tags for grouping related functionality
 */
export const enum DocCategory {
  CORE = 'Core',
  UTILS = 'Utilities',
  HOOKS = 'React Hooks',
  EVENTS = 'Events',
  PROVIDERS = 'Cache Providers',
  SERIALIZATION = 'Serialization',
  COMPRESSION = 'Compression',
  MONITORING = 'Monitoring',
  RESOURCE_USAGE = 'Resource Usage', // Add this category
  HEALTH_METRICS = 'Health Metrics', // Add this category
  BACKGROUND = 'Background Tasks'
}

/**
 * Documentation priority levels for importance
 */
export const enum DocPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4
}

/**
 * Resource impact levels
 */
export const enum ResourceImpact {
  /** Minimal resource usage */
  MINIMAL = 'minimal',
  /** Moderate resource usage */
  MODERATE = 'moderate',
  /** High resource usage */
  HIGH = 'high',
  /** Critical resource usage that could affect system stability */
  CRITICAL = 'critical'
}

/**
 * Example usage template
 */
export interface CodeExample {
  /** Title of the example */
  title: string;
  /** Code snippet */
  code: string;
  /** Description of what the example demonstrates */
  description: string;
  /** Output or expected result */
  output?: string;
}

/**
 * Performance impact levels for operations
 */
export const enum PerformanceImpact {
  /** Minimal impact, can be used frequently */
  MINIMAL = 'minimal',
  /** Moderate impact, use with consideration */
  MODERATE = 'moderate',
  /** High impact, use sparingly */
  HIGH = 'high',
  /** Critical impact, use with caution */
  CRITICAL = 'critical'
}

/**
 * Resource usage information for documentation
 */
export interface ResourceUsageInfo {
  /** Memory impact */
  memory: ResourceImpact;
  /** CPU impact */
  cpu: ResourceImpact;
  /** Network impact */
  network?: ResourceImpact;
  /** Storage impact */
  storage?: ResourceImpact;
  /** Notes about resource usage */
  notes?: string;
}

/**
 * Cache operation complexity information
 */
export interface OperationComplexity {
  /** Time complexity in Big O notation */
  time: string;
  /** Space complexity in Big O notation */
  space: string;
  /** Performance impact level */
  impact: PerformanceImpact;
  /** Additional notes about performance */
  notes?: string;
  /** Resource usage information */
  resourceUsage?: ResourceUsageInfo;
}

/**
 * Documentation metadata for cache operations
 */
export interface OperationMetadata {
  /** Operation category */
  category: DocCategory;
  /** Priority level */
  priority: DocPriority;
  /** Performance complexity */
  complexity: OperationComplexity;
  /** Code examples */
  examples: CodeExample[];
  /** Related operations */
  related?: string[];
  /** Since version */
  since: string;
  /** Deprecation information */
  deprecated?: {
    version: string;
    replacement: string;
    reason: string;
  };
}