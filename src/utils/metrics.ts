/**
 * @fileoverview Metrics collection and reporting utilities 
 * 
 * Provides a centralized API for recording and reporting metrics
 * with support for various metric types (counters, gauges, histograms)
 * and integration with the event system.
 */

import { eventManager } from '../events/event-manager';
import { CacheEventType } from '../events/cache-events';

/**
 * Supported metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer'
}

/**
 * Metric value with metadata
 */
export interface MetricValue {
  name: string;
  type: MetricType;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

/**
 * Metrics storage and aggregation
 */
class MetricsRegistry {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private timers: Map<string, { start: number, tags: Record<string, string> }> = new Map();
  private timerIdCounter: number = 0;
  
  /**
   * Get a key with tags for a metric
   */
  private getKey(name: string, tags: Record<string, string> = {}): string {
    const tagStr = Object.entries(tags)
      .sort(([ka], [kb]) => ka.localeCompare(kb))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    
    return tagStr ? `${name}{${tagStr}}` : name;
  }
  
  /**
   * Increment a counter
   */
  public increment(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    const key = this.getKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    this.emitMetric({
      name,
      type: MetricType.COUNTER,
      value: current + value,
      tags,
      timestamp: Date.now()
    });
  }
  
  /**
   * Set a gauge value
   */
  public gauge(name: string, value: number, tags: Record<string, string> = {}): void {
    const key = this.getKey(name, tags);
    this.gauges.set(key, value);
    
    this.emitMetric({
      name,
      type: MetricType.GAUGE,
      value,
      tags,
      timestamp: Date.now()
    });
  }
  
  /**
   * Record a histogram value
   */
  public histogram(name: string, value: number, tags: Record<string, string> = {}): void {
    const key = this.getKey(name, tags);
    
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    
    const values = this.histograms.get(key)!;
    values.push(value);
    
    // Limit the number of stored values to prevent memory issues
    if (values.length > 1000) {
      values.shift();
    }
    
    this.emitMetric({
      name,
      type: MetricType.HISTOGRAM,
      value,
      tags,
      timestamp: Date.now()
    });
  }
  
  /**
   * Start a timer and return a timer ID
   */
  public startTimer(name: string, tags: Record<string, string> = {}): string {
    const timerId = `${name}-${++this.timerIdCounter}`;
    this.timers.set(timerId, {
      start: performance.now(),
      tags
    });
    return timerId;
  }
  
  /**
   * Stop a timer and record its duration
   */
  public stopTimer(timerId: string, extraTags: Record<string, string> = {}): number {
    const timer = this.timers.get(timerId);
    if (!timer) {
      throw new Error(`Timer with ID ${timerId} not found`);
    }
    
    const duration = performance.now() - timer.start;
    const name = timerId.split('-')[0];
    
    // Combine original tags with extra tags
    const tags = {
      ...timer.tags,
      ...extraTags
    };
    
    // Record as histogram
    this.histogram(name, duration, tags);
    
    // Clean up timer
    this.timers.delete(timerId);
    
    return duration;
  }
  
  /**
   * Get all current metric values
   */
  public getMetrics(): MetricValue[] {
    const metrics: MetricValue[] = [];
    const now = Date.now();
    
    // Counters
    for (const [key, value] of this.counters.entries()) {
      const { name, tags } = this.parseKey(key);
      metrics.push({
        name,
        type: MetricType.COUNTER,
        value,
        tags,
        timestamp: now
      });
    }
    
    // Gauges
    for (const [key, value] of this.gauges.entries()) {
      const { name, tags } = this.parseKey(key);
      metrics.push({
        name,
        type: MetricType.GAUGE,
        value,
        tags,
        timestamp: now
      });
    }
    
    // Histograms (just report count for now)
    for (const [key, values] of this.histograms.entries()) {
      const { name, tags } = this.parseKey(key);
      
      // Calculate statistics
      const count = values.length;
      if (count === 0) continue;
      
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / count;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(count / 2)];
      const min = sorted[0];
      const max = sorted[count - 1];
      const p95 = sorted[Math.floor(count * 0.95)];
      
      // Report each statistic as a separate gauge
      metrics.push({
        name: `${name}_count`,
        type: MetricType.GAUGE,
        value: count,
        tags,
        timestamp: now
      });
      
      metrics.push({
        name: `${name}_avg`,
        type: MetricType.GAUGE,
        value: avg,
        tags,
        timestamp: now
      });
      
      metrics.push({
        name: `${name}_median`,
        type: MetricType.GAUGE,
        value: median,
        tags,
        timestamp: now
      });
      
      metrics.push({
        name: `${name}_min`,
        type: MetricType.GAUGE,
        value: min,
        tags,
        timestamp: now
      });
      
      metrics.push({
        name: `${name}_max`,
        type: MetricType.GAUGE,
        value: max,
        tags,
        timestamp: now
      });
      
      metrics.push({
        name: `${name}_p95`,
        type: MetricType.GAUGE,
        value: p95,
        tags,
        timestamp: now
      });
    }
    
    return metrics;
  }
  
  /**
   * Parse a metric key into name and tags
   */
  private parseKey(key: string): { name: string, tags: Record<string, string> } {
    const match = key.match(/^(.+?)(?:{(.+)})?$/);
    if (!match) {
      return { name: key, tags: {} };
    }
    
    const [, name, tagStr] = match;
    const tags: Record<string, string> = {};
    
    if (tagStr) {
      tagStr.split(',').forEach(pair => {
        const [k, v] = pair.split('=');
        tags[k] = v;
      });
    }
    
    return { name, tags };
  }
  
  /**
   * Reset all metrics (mainly for testing)
   */
  public reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timers.clear();
  }
  
  /**
   * Emit a metric as an event
   */
  private emitMetric(metric: MetricValue): void {
    // Skip event emission in certain cases to avoid infinite loops
    if (metric.name.startsWith('cache.events')) {
      return;
    }
    
    // Emit the metric as an event with low sampling rate
    eventManager.emit(
      CacheEventType.METRICS,
      {
        metadata: {
          metric
        }
      },
      {
        samplingRate: 0.01, // Very low sampling to avoid too many events
        batchable: true,
        reportMetrics: false // Avoid recursive metric reporting
      }
    );
  }

    timer(param: string, duration: number, param3: {hit: string; provider: string}) {

    }
}

/**
 * Export metrics singleton
 */
export const metrics = new MetricsRegistry();

/**
 * Check if performance timing is available
 */
export function isPerformanceAvailable(): boolean {
  return typeof performance !== 'undefined' && typeof performance.now === 'function';
}

/**
 * Get current timestamp in milliseconds
 */
export function now(): number {
  return isPerformanceAvailable() ? performance.now() : Date.now();
}

/**
 * Timing decorator for methods
 */
export function timed(metricName?: string, tags?: Record<string, string>) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const timerName = metricName || `method.${propertyKey}`;
    
    descriptor.value = function(...args: any[]) {
      const timerId = metrics.startTimer(timerName, tags);
      
      try {
        const result = originalMethod.apply(this, args);
        
        // Handle promises
        if (result instanceof Promise) {
          return result.finally(() => {
            metrics.stopTimer(timerId);
          });
        }
        
        metrics.stopTimer(timerId);
        return result;
      } catch (error) {
        metrics.stopTimer(timerId, { error: 'true' });
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * Report all metrics periodically (for monitoring systems)
 * 
 * @param intervalMs Reporting interval in milliseconds
 * @param reporter Function to report metrics
 * @returns Cleanup function
 */
export function startPeriodicMetricsReporting(
  intervalMs: number = 10000,
  reporter?: (metrics: MetricValue[]) => void
): () => void {
  const interval = setInterval(() => {
    const allMetrics = metrics.getMetrics();
    
    // Use custom reporter if provided
    if (reporter) {
      reporter(allMetrics);
      return;
    }
    
    // Otherwise emit metrics summary event
    eventManager.emit(
      CacheEventType.METRICS_SUMMARY,
      {
        metadata: {
          metrics: allMetrics,
          count: allMetrics.length,
          timestamp: Date.now()
        }
      }
    );
  }, intervalMs);
  
  return () => clearInterval(interval);
}
