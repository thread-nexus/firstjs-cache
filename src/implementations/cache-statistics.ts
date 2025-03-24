/**
 * @fileoverview Cache statistics tracking implementation
 */

/**
 * Statistics for a specific operation
 */
interface OperationMetrics {
    count: number;
  totalTime: number;
    minTime: number;
    maxTime: number;
    lastTime: number;
}
  /**
 * Cache statistics implementation
   */
export class CacheStatistics {
  private hits: number = 0;
  private misses: number = 0;
  private sets: number = 0;
  private deletes: number = 0;
  private size: number = 0;
  private operationMetrics: Map<string, OperationMetrics> = new Map();
  private lastUpdated: Date = new Date();
  /**
   * Record a cache hit
   * 
   * @param time - Operation time in ms
   */
  recordHit(time: number): void {
    this.hits++;
    this.recordOperation('hit', time);
    this.lastUpdated = new Date();
  }
  /**
   * Record a cache miss
   * 
   * @param time - Operation time in ms
   */
  recordMiss(time: number): void {
    this.misses++;
    this.recordOperation('miss', time);
    this.lastUpdated = new Date();
  }
    
  /**
   * Record a cache set operation
   * 
   * @param size - Size of the value in bytes
   * @param time - Operation time in ms
   */
  recordSet(size: number, time: number): void {
    this.sets++;
    this.size += size;
    this.recordOperation('set', time);
    this.lastUpdated = new Date();
  }
  /**
   * Record a cache delete operation
   * 
   * @param size - Size of the deleted value in bytes
   * @param time - Operation time in ms
   */
  recordDelete(size: number, time: number): void {
    this.deletes++;
    this.size -= size;
    if (this.size < 0) this.size = 0;
    this.recordOperation('delete', time);
    this.lastUpdated = new Date();
    }

  /**
   * Record an operation
   * 
   * @param operation - Operation name
   * @param time - Operation time in ms
   */
  recordOperation(operation: string, time: number): void {
    let metrics = this.operationMetrics.get(operation);
    
    if (!metrics) {
      metrics = {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        lastTime: 0
      };
      this.operationMetrics.set(operation, metrics);
  }
    
    metrics.count++;
    metrics.totalTime += time;
    metrics.minTime = Math.min(metrics.minTime, time);
    metrics.maxTime = Math.max(metrics.maxTime, time);
    metrics.lastTime = time;
    
    this.lastUpdated = new Date();
}

  /**
   * Get operation metrics
   * 
   * @param operation - Operation name
   * @returns Operation metrics or undefined if not found
   */
  getOperationMetrics(operation: string): OperationMetrics | undefined {
    return this.operationMetrics.get(operation);
  }

  /**
   * Get average operation time
   * 
   * @param operation - Operation name
   * @returns Average time in ms or 0 if no operations recorded
   */
  getAverageOperationTime(operation: string): number {
    const metrics = this.operationMetrics.get(operation);
    
    if (!metrics || metrics.count === 0) {
      return 0;
    }
    
    return metrics.totalTime / metrics.count;
  }

  /**
   * Get cache hit ratio
   * 
   * @returns Hit ratio between 0 and 1
   */
  getHitRatio(): number {
    const total = this.hits + this.misses;
    
    if (total === 0) {
      return 0;
    }
    
    return this.hits / total;
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
    this.size = 0;
    this.operationMetrics.clear();
    this.lastUpdated = new Date();
  }

  /**
   * Get all statistics
   * 
   * @returns Cache statistics
   */
  getStats(): {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    size: number;
    hitRatio: number;
    operations: Record<string, {
      count: number;
      avgTime: number;
      minTime: number;
      maxTime: number;
      lastTime: number;
    }>;
    lastUpdated: Date;
  } {
    const operations: Record<string, any> = {};
    
    for (const [op, metrics] of this.operationMetrics.entries()) {
      operations[op] = {
        count: metrics.count,
        avgTime: metrics.count > 0 ? metrics.totalTime / metrics.count : 0,
        minTime: metrics.minTime === Infinity ? 0 : metrics.minTime,
        maxTime: metrics.maxTime,
        lastTime: metrics.lastTime
      };
    }
    
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      size: this.size,
      hitRatio: this.getHitRatio(),
      operations,
      lastUpdated: this.lastUpdated
    };
  }
}