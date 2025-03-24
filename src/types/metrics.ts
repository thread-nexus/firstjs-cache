export interface PerformanceMetrics {
  /** Duration in ms */
  duration: number;
  /** Operation latency */
  latency: number;
  /** Memory usage */
  memoryUsage: number;
  /** Cache hits */
  hits: number;
  /** Cache misses */ 
  misses: number;
  /** Whether operation errored */
  error?: boolean;
  /** Size in bytes */
  size?: number;
}
