/**
 * Configuration for cache monitoring
 */
export interface MonitoringConfig {
  /**
   * Whether monitoring is enabled
   */
  enabled: boolean;
  
  /**
   * How often metrics should be reported (in seconds)
   */
  reportingInterval?: number;
  
  /**
   * Sampling rate for collecting metrics (0-1)
   */
  samplingRate?: number;
  
  /**
   * Whether to log metrics to console
   */
  logToConsole?: boolean;
  
  /**
   * Custom callback for handling metrics
   */
  metricsCallback?: ((metrics: CacheMetrics) => void) | null;
  
  /**
   * Metrics collection interval
   */
  interval?: number;
  
  /**
   * Whether to collect detailed metrics
   */
  detailedMetrics?: boolean;
  
  /**
   * Maximum number of events to keep in history
   */
  maxEventHistory?: number;
  
  /**
   * Custom reporter function
   */
  reporter?: (metrics: any) => void;
}

/**
 * Statistics about cache latency
 */
export interface LatencyStats {
  /**
   * Average operation latency in ms
   */
  avg: number;
  
  /**
   * Maximum operation latency in ms
   */
  max: number;
  
  /**
   * Minimum operation latency in ms
   */
  min: number;
  
  /**
   * Number of samples collected
   */
  samples: number;
  
  /**
   * 95th percentile latency
   */
  p95?: number;
  
  /**
   * 99th percentile latency
   */
  p99?: number;
}

/**
 * Metrics collected during cache monitoring
 */
export interface CacheMetrics {
  /**
   * Cache hit rate (0-1)
   */
  hitRate: number;
  
  /**
   * Number of cache hits
   */
  hits: number;
  
  /**
   * Number of cache misses
   */
  misses: number;
  
  /**
   * Average latency for operations in ms
   */
  avgLatency?: number;
  
  /**
   * Maximum latency observed in ms
   */
  maxLatency?: number;
  
  /**
   * Error rate for operations (0-1)
   */
  errorRate?: number;
  
  /**
   * Number of errors encountered
   */
  errors: number;
  
  /**
   * Total number of operations
   */
  operations: number;
  
  /**
   * Alternative name for avgLatency
   */
  averageLatency?: number;
  
  /**
   * Memory usage in bytes
   */
  memoryUsage?: number;
  
  /**
   * Number of keys in cache
   */
  keyCount?: number;
  
  /**
   * Operation count
   */
  operationCount?: number;
  
  /**
   * Operations per second
   */
  throughput?: number;
}

/**
 * Performance metrics data
 */
export interface PerformanceMetricsData {
  /**
   * Operation duration in ms
   */
  duration: number;
  
  /**
   * Result size in bytes
   */
  size: number;
  
  /**
   * Whether compression was used
   */
  compressed: boolean;
  
  /**
   * Original size before compression
   */
  originalSize?: number;
  
  /**
   * Number of errors
   */
  errorCount: number;
  
  /**
   * CPU usage percentage
   */
  cpuUsage?: number;
  
  /**
   * Latency statistics
   */
  latency: LatencyStats;
}
