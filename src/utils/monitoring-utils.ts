/**
 * @fileoverview Monitoring utilities for cache operations
 */

import { CacheEventType } from '../events/cache-events';
import { eventManager, emitMetricEvent } from '../events/event-manager';

/**
 * Operation metrics data
 */
interface OperationMetrics {
    hits: number;
    misses: number;
    errors: number;
    totalTime: number;
    count: number;
}

/**
 * Monitoring configuration
 */
export interface MonitoringOptions {
    /**
     * Whether monitoring is enabled
     */
    enabled?: boolean;
    
    /**
     * Whether to emit events for metrics
     */
    emitEvents?: boolean;
    
    /**
     * How often to emit summary events in milliseconds
     */
    summaryInterval?: number;
    
    /**
     * Sample rate for metrics (0-1)
     */
    sampleRate?: number;
    
    /**
     * Custom metrics collector
     */
    metricsCollector?: (metric: Record<string, any>) => void;
}

/**
 * Cache monitoring service
 */
export class CacheMonitoring {
    private metrics: Map<string, OperationMetrics> = new Map();
    private readonly enabled: boolean;
    private readonly emitEvents: boolean;
    private readonly sampleRate: number;
    private readonly metricsCollector?: (metric: Record<string, any>) => void;
    private summaryInterval: NodeJS.Timeout | null = null;
    
    /**
     * Create a new monitoring service
     * 
     * @param options Monitoring options
     */
    constructor(options: MonitoringOptions = {}) {
        this.enabled = options.enabled ?? true;
        this.emitEvents = options.emitEvents ?? true;
        this.sampleRate = options.sampleRate ?? 1.0;
        this.metricsCollector = options.metricsCollector;
        
        if (options.summaryInterval && options.summaryInterval > 0) {
            this.startSummaryEmitter(options.summaryInterval);
        }
    }
    
    /**
     * Record a cache hit
     * 
     * @param duration Operation duration in ms
     * @param operation Operation name
     */
    recordHit(duration: number, operation: string = 'get'): void {
        if (!this.enabled || !this.shouldSample()) return;
        
        this.getOrCreateMetrics(operation).hits++;
        this.recordOperation(operation, duration);
        
        if (this.emitEvents) {
            emitMetricEvent('hit', operation, duration, {
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Record a cache miss
     * 
     * @param duration Operation duration in ms
     * @param operation Operation name
     */
    recordMiss(duration: number, operation: string = 'get'): void {
        if (!this.enabled || !this.shouldSample()) return;
        
        this.getOrCreateMetrics(operation).misses++;
        this.recordOperation(operation, duration);
        
        if (this.emitEvents) {
            emitMetricEvent('miss', operation, duration, {
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Record an error
     * 
     * @param error Error object
     * @param operation Operation name
     */
    recordError(error: Error, operation: string = 'unknown'): void {
        if (!this.enabled) return;
        
        this.getOrCreateMetrics(operation).errors++;
        
        if (this.emitEvents) {
            emitMetricEvent('error', operation, 0, {
                error: error.message,
                timestamp: Date.now()
            });
        }
        
        if (this.metricsCollector) {
            this.metricsCollector({
                type: 'error',
                operation,
                error: error.message,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Get current metrics
     * 
     * @returns All metrics
     */
    getMetrics(): Record<string, any> {
        const result: Record<string, any> = {};
        
        for (const [operation, metrics] of this.metrics.entries()) {
            result[operation] = {
                hits: metrics.hits,
                misses: metrics.misses,
                errors: metrics.errors,
                count: metrics.count,
                avgTime: metrics.count > 0 ? metrics.totalTime / metrics.count : 0,
                hitRate: metrics.hits + metrics.misses > 0 
                    ? metrics.hits / (metrics.hits + metrics.misses) 
                    : 0
            };
        }
        
        return result;
    }
    
    /**
     * Reset all metrics
     */
    resetMetrics(): void {
        this.metrics.clear();
    }
    
    /**
     * Dispose of resources
     */
    dispose(): void {
        if (this.summaryInterval) {
            clearInterval(this.summaryInterval);
            this.summaryInterval = null;
        }
    }
    
    /**
     * Get or create metrics for an operation
     * 
     * @param operation Operation name
     * @returns Metrics object
     */
    private getOrCreateMetrics(operation: string): OperationMetrics {
        if (!this.metrics.has(operation)) {
            this.metrics.set(operation, {
                hits: 0,
                misses: 0,
                errors: 0,
                totalTime: 0,
                count: 0
            });
        }
        
        return this.metrics.get(operation)!;
    }
    
    /**
     * Record an operation
     * 
     * @param operation Operation name
     * @param duration Operation duration
     */
    private recordOperation(operation: string, duration: number): void {
        const metrics = this.getOrCreateMetrics(operation);
        metrics.totalTime += duration;
        metrics.count++;
        
        if (this.metricsCollector) {
            this.metricsCollector({
                operation,
                duration,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Start emitting summary events
     * 
     * @param interval Interval in milliseconds
     */
    private startSummaryEmitter(interval: number): void {
        this.summaryInterval = setInterval(() => {
            if (this.emitEvents) {
                const metrics = this.getMetrics();
                
                eventManager.emit(CacheEventType.METRICS_SUMMARY, {
                    metadata: {
                        metrics,
                        providers: Object.keys(metrics),
                        totalHits: Object.values(metrics).reduce((sum, m) => sum + m.hits, 0),
                        totalMisses: Object.values(metrics).reduce((sum, m) => sum + m.misses, 0),
                        timestamp: Date.now()
                    }
                }, {
                    reportMetrics: true,
                    logging: true,
                    batchable: false // Don't batch summary events
                });
            }
        }, interval);
    }
    
    /**
     * Determine if this operation should be sampled
     * 
     * @returns Whether to sample this operation
     */
    private shouldSample(): boolean {
        return Math.random() < this.sampleRate;
    }
}

/**
 * Create a monitoring instance with the given options
 * 
 * @param options Monitoring options
 * @returns Monitoring instance
 */
export function createMonitoring(options?: MonitoringOptions): CacheMonitoring {
    return new CacheMonitoring(options);
}

/**
 * Create a monitoring middleware for a cache provider
 * 
 * @param provider Cache provider
 * @param monitoring Monitoring instance
 * @returns Monitored cache provider
 */
export function createMonitoringMiddleware(
    provider: any,
    monitoring: CacheMonitoring
): any {
    return new Proxy(provider, {
        get(target, prop) {
            const original = target[prop];
            
            if (typeof original !== 'function') {
                return original;
            }
            
            return async function(...args: any[]) {
                const startTime = performance.now();
                try {
                    const result = await original.apply(target, args);
                    const duration = performance.now() - startTime;
                    
                    // Record hit or miss
                    if (prop === 'get') {
                        if (result === null || result === undefined) {
                            monitoring.recordMiss(duration, String(prop));
                        } else {
                            monitoring.recordHit(duration, String(prop));
                        }
                    } else {
                        // For other operations, just record the operation
                        monitoring.recordHit(duration, String(prop));
                    }
                    
                    return result;
                } catch (error) {
                    monitoring.recordError(error instanceof Error ? error : new Error(String(error)), String(prop));
                    throw error;
                }
            };
        }
    });
}