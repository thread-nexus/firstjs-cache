/**
 * @fileoverview Enhanced monitoring utilities for cache operations
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */
import { PerformanceMetrics, MonitoringConfig, CacheMetrics } from '../types/common';
/**
 * Enhanced cache monitor
 */
export declare class CacheMonitor {
    private static instance;
    private metrics;
    private config;
    private startTime;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(config: MonitoringConfig): CacheMonitor;
    /**
     * Record operation metrics
     */
    recordMetrics(operation: string, metrics: PerformanceMetrics): void;
    /**
     * Get current analytics
     */
    getAnalytics(): CacheAnalytics;
    /**
     * Initialize monitoring
     */
    private initializeMonitoring;
    /**
     * Create empty metrics object
     */
    private createEmptyMetrics;
    /**
     * Update metrics with new data
     */
    private updateMetrics;
    /**
     * Update latency statistics
     */
    private updateLatencyStats;
    /**
     * Check if metrics should be emitted
     */
    private shouldEmitMetrics;
    /**
     * Emit metrics event
     */
    private emitMetrics;
    /**
     * Collect metrics
     * This method is called periodically by the monitoring system
     */
    private collectMetrics;
    /**
     * Aggregate operation metrics
     */
    private aggregateOperationMetrics;
    /**
     * Calculate operation trends
     */
    private calculateTrends;
    /**
     * Calculate health metrics
     */
    private calculateHealthMetrics;
    /**
     * Calculate the error rate across all operations
     */
    private calculateErrorRate;
    /**
     * Calculate average latency across all operations
     */
    private calculateAverageLatency;
    /**
     * Calculate cache utilization
     */
    private calculateUtilization;
    /**
     * Calculate resource usage metrics
     */
    private calculateResourceUsage;
    /**
     * Determine health status based on multiple factors
     */
    private determineHealthStatus;
    /**
     * Estimate connection count
     * In a real implementation, this would be populated with actual connection data
     */
    private estimateConnectionCount;
    /**
     * Check monitoring thresholds
     */
    private checkThresholds;
}
interface HealthMetrics {
    status: 'healthy' | 'degraded' | 'unhealthy';
    errorRate: number;
    latency: number;
    utilization: number;
    resourceUsage: ResourceUsage;
}
interface ResourceUsage {
    memory: number;
    cpu: number;
    connections: number;
}
interface Alert {
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp?: Date;
}
interface OperationMetrics {
    operation: string;
    metrics: PerformanceMetrics;
    trends: {
        hitRate: number;
        latencyTrend: number;
    };
}
interface CacheAnalytics {
    uptime: number;
    operations: OperationMetrics[];
    health: HealthMetrics;
    alerts: Alert[];
}
/**
 * Class for tracking and calculating cache performance metrics
 */
export declare class PerformanceMonitor {
    private operations;
    private hits;
    private misses;
    private errors;
    private totalLatency;
    private maxLatency;
    private timingData;
    private startTime;
    private lastMemoryUsage;
    /**
     * Record the start of an operation
     *
     * @param operation - The name of the operation
     * @returns A function to call when the operation is complete
     */
    startOperation(operation: string): () => void;
    /**
     * Record a cache hit
     */
    recordHit(): void;
    /**
     * Record a cache miss
     */
    recordMiss(): void;
    /**
     * Record current memory usage
     */
    recordMemoryUsage(): void;
    /**
     * Get current cache metrics
     *
     * @returns CacheMetrics object with performance data
     */
    getMetrics(): CacheMetrics;
    /**
     * Reset all metrics
     */
    reset(): void;
}
/**
 * Get the global performance monitor instance
 *
 * @returns Global performance monitor
 */
export declare function getPerformanceMonitor(): PerformanceMonitor;
/**
 * Create a new performance monitor instance
 *
 * @returns New performance monitor
 */
export declare function createPerformanceMonitor(): PerformanceMonitor;
/**
 * Measure the execution time of a function
 *
 * @param operation - Operation name
 * @param fn - Function to measure
 * @returns The function result
 */
export declare function measureOperation<T>(operation: string, fn: () => Promise<T>): Promise<T>;
/**
 * Create empty cache metrics
 *
 * @returns Empty cache metrics
 */
export declare function createEmptyMetrics(): CacheMetrics;
/**
 * Merge multiple cache metrics together
 *
 * @param metrics - Array of metrics to merge
 * @returns Merged metrics
 */
export declare function mergeMetrics(metrics: CacheMetrics[]): CacheMetrics;
export {};
