/**
 * @fileoverview Advanced cache statistics tracking and performance monitoring
 * with real-time metrics and historical data.
 */

import { CacheStats } from '../types/common';
import { emitCacheEvent, CacheEventType } from '../events/cache-events';
import { formatCacheSize } from './cache-manager-utils';

interface OperationMetrics {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  lastTime: number;
}

interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export class CacheStatistics {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    keyCount: 0,
    memoryUsage: 0,
    lastUpdated: new Date(),
    keys: []
  };

  // Detailed operation metrics
  private operations: Record<string, OperationMetrics> = {
    get: { count: 0, totalTime: 0, minTime: Infinity, maxTime: 0, lastTime: 0 },
    set: { count: 0, totalTime: 0, minTime: Infinity, maxTime: 0, lastTime: 0 },
    delete: { count: 0, totalTime: 0, minTime: Infinity, maxTime: 0, lastTime: 0 },
    compute: { count: 0, totalTime: 0, minTime: Infinity, maxTime: 0, lastTime: 0 }
  };

  // Time series data for trending
  private timeSeriesData: {
    hitRate: TimeSeriesPoint[];
    size: TimeSeriesPoint[];
    operations: TimeSeriesPoint[];
  } = {
    hitRate: [],
    size: [],
    operations: []
  };

  // Configuration
  private readonly maxTimeSeriesPoints = 1000;
  private readonly timeSeriesInterval = 60000; // 1 minute
  private timeSeriesTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startTimeSeriesCollection();
  }

  /**
   * Record a cache hit
   */
  recordHit(duration: number): void {
    this.stats.hits++;
    this.updateOperationMetrics('get', duration);
    this.emitStatsUpdate();
  }

  /**
   * Record a cache miss
   */
  recordMiss(duration: number): void {
    this.stats.misses++;
    this.updateOperationMetrics('get', duration);
    this.emitStatsUpdate();
  }

  /**
   * Record a set operation
   */
  recordSet(size: number, duration: number): void {
    this.stats.size += size;
    this.stats.keyCount++;
    this.updateOperationMetrics('set', duration);
    this.emitStatsUpdate();
  }

  /**
   * Record a delete operation
   */
  recordDelete(size: number, duration: number): void {
    this.stats.size -= size;
    this.stats.keyCount--;
    this.updateOperationMetrics('delete', duration);
    this.emitStatsUpdate();
  }

  /**
   * Record a compute operation
   */
  recordCompute(duration: number): void {
    this.updateOperationMetrics('compute', duration);
    this.emitStatsUpdate();
  }

  /**
   * Update operation metrics
   */
  private updateOperationMetrics(operation: string, duration: number): void {
    const metrics = this.operations[operation];
    if (!metrics) return;

    metrics.count++;
    metrics.totalTime += duration;
    metrics.minTime = Math.min(metrics.minTime, duration);
    metrics.maxTime = Math.max(metrics.maxTime, duration);
    metrics.lastTime = duration;
  }

  /**
   * Get current cache statistics
   */
  getStats(): CacheStats & {
    hitRate: number;
    missRate: number;
    averageOperationTime: Record<string, number>;
    trends: {
      hitRate: TimeSeriesPoint[];
      size: TimeSeriesPoint[];
      operations: TimeSeriesPoint[];
    };
  } {
    const totalOperations = this.stats.hits + this.stats.misses;
    const hitRate = totalOperations > 0 ? this.stats.hits / totalOperations : 0;
    const missRate = totalOperations > 0 ? this.stats.misses / totalOperations : 0;

    const averageOperationTime: Record<string, number> = {};
    Object.entries(this.operations).forEach(([op, metrics]) => {
      averageOperationTime[op] = metrics.count > 0 
        ? metrics.totalTime / metrics.count 
        : 0;
    });

    return {
      ...this.stats,
      hitRate,
      missRate,
      averageOperationTime,
      trends: this.timeSeriesData
    };
  }

  /**
   * Get detailed operation metrics
   */
  getOperationMetrics(): Record<string, {
    count: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    lastTime: number;
  }> {
    const metrics: Record<string, any> = {};

    Object.entries(this.operations).forEach(([op, data]) => {
      metrics[op] = {
        count: data.count,
        averageTime: data.count > 0 ? data.totalTime / data.count : 0,
        minTime: data.minTime === Infinity ? 0 : data.minTime,
        maxTime: data.maxTime,
        lastTime: data.lastTime
      };
    });

    return metrics;
  }

  /**
   * Start collecting time series data
   */
  private startTimeSeriesCollection(): void {
    this.timeSeriesTimer = setInterval(() => {
      const now = Date.now();
      const totalOps = this.stats.hits + this.stats.misses;
      const hitRate = totalOps > 0 ? this.stats.hits / totalOps : 0;

      // Add new data points
      this.addTimeSeriesPoint('hitRate', now, hitRate);
      this.addTimeSeriesPoint('size', now, this.stats.size);
      this.addTimeSeriesPoint('operations', now, totalOps);

    }, this.timeSeriesInterval);

    // Prevent the timer from keeping the process alive
    if (this.timeSeriesTimer.unref) {
      this.timeSeriesTimer.unref();
    }
  }

  /**
   * Add a time series data point
   */
  private addTimeSeriesPoint(
    series: keyof typeof this.timeSeriesData,
    timestamp: number,
    value: number
  ): void {
    this.timeSeriesData[series].push({ timestamp, value });

    // Maintain fixed size
    if (this.timeSeriesData[series].length > this.maxTimeSeriesPoints) {
      this.timeSeriesData[series].shift();
    }
  }

  /**
   * Emit stats update event
   */
  private emitStatsUpdate(): void {
    this.stats.lastUpdated = new Date();
    
    emitCacheEvent(CacheEventType.STATS_UPDATE, {
      stats: this.getStats(),
      formatted: {
        size: formatCacheSize(this.stats.size),
        hitRate: `${(this.getStats().hitRate * 100).toFixed(2)}%`
      }
    });
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      keyCount: 0,
      memoryUsage: 0,
      lastUpdated: new Date(),
      keys: []
    };

    Object.values(this.operations).forEach(metrics => {
      metrics.count = 0;
      metrics.totalTime = 0;
      metrics.minTime = Infinity;
      metrics.maxTime = 0;
      metrics.lastTime = 0;
    });

    this.timeSeriesData = {
      hitRate: [],
      size: [],
      operations: []
    };

    emitCacheEvent(CacheEventType.STATS_UPDATE, {
      stats: this.getStats(),
      message: 'Statistics reset'
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.timeSeriesTimer) {
      clearInterval(this.timeSeriesTimer);
      this.timeSeriesTimer = null;
    }
  }
}