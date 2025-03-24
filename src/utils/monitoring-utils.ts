/**
 * Monitoring utilities for cache operations
 */

import {CacheMetrics, LatencyStats, MonitoringConfig} from '../types';

/**
 * Default monitoring configuration
 */
const DEFAULT_MONITORING_CONFIG: Required<MonitoringConfig> = {
    enabled: true,
    samplingRate: 1.0,
    detailedMetrics: false,
    reportingInterval: 60,
    reporter: () => {
    }
};

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetricsData {
    /**
     * Operation duration in milliseconds
     */
    duration: number;

    /**
     * Data size in bytes
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
     * Error count
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

/**
 * Cache monitoring implementation
 */
export class CacheMonitoring {
    /**
     * Monitoring configuration
     */
    private config: Required<MonitoringConfig>;

    /**
     * Metrics data
     */
    private metrics: {
        hits: number;
        misses: number;
        errors: number;
        operations: number;
        latency: LatencyStats;
        size: number;
        memoryUsage: number;
        startTime: number;
    };

    /**
     * Reporting interval
     */
    private reportingInterval: NodeJS.Timeout | null = null;

    /**
     * Create a new cache monitoring instance
     *
     * @param config - Monitoring configuration
     */
    constructor(config: Partial<MonitoringConfig> = {}) {
        this.config = {...DEFAULT_MONITORING_CONFIG, ...config};

        this.metrics = {
            hits: 0,
            misses: 0,
            errors: 0,
            operations: 0,
            latency: {
                avg: 0,
                min: Infinity,
                max: 0,
                p95: 0,
                p99: 0,
                samples: 0
            },
            size: 0,
            memoryUsage: 0,
            startTime: Date.now()
        };

        if (this.config.enabled && this.config.reportingInterval > 0) {
            this.startReporting();
        }
    }

    /**
     * Merge metrics from multiple sources
     *
     * @param current - Current metrics
     * @param newMetrics - New metrics to merge
     * @returns Merged metrics
     */
    static mergeMetrics(current: any, newMetrics: any): any {
        // Create a new object with merged properties
        return {
            hits: (current.hits || 0) + (newMetrics.hits || 0),
            misses: (current.misses || 0) + (newMetrics.misses || 0),
            errorCount: (current.errorCount || 0) + (newMetrics.errorCount || 0),
            size: (current.size || 0) + (newMetrics.size || 0),
            latency: CacheMonitoring.mergeLatencyStats(
                current.latency || {avg: 0, min: 0, max: 0, p95: 0, p99: 0, samples: 0},
                newMetrics.latency || {avg: 0, min: 0, max: 0, p95: 0, p99: 0, samples: 0}
            ),
            memoryUsage: (current.memoryUsage || 0) + (newMetrics.memoryUsage || 0),
            duration: (current.duration || 0) + (newMetrics.duration || 0),
            success: (current.success || 0) + (newMetrics.success || 0),
            timestamp: newMetrics.timestamp || Date.now(),
            operationCount: (current.operationCount || 0) + 1,
            error: newMetrics.error || current.error
        };
    }

    /**
     * Merge latency statistics
     *
     * @param current - Current latency stats
     * @param newStats - New latency stats to merge
     * @returns Merged latency stats
     */
    static mergeLatencyStats(current: LatencyStats, newStats: LatencyStats): LatencyStats {
        const totalSamples = current.samples + newStats.samples;

        if (totalSamples === 0) {
            return {
                avg: 0,
                min: 0,
                max: 0,
                p95: 0,
                p99: 0,
                samples: 0
            };
        }

        return {
            avg: ((current.avg * current.samples) + (newStats.avg * newStats.samples)) / totalSamples,
            min: Math.min(current.min, newStats.min),
            max: Math.max(current.max, newStats.max),
            p95: Math.max(current.p95, newStats.p95),
            p99: Math.max(current.p99, newStats.p99),
            samples: totalSamples
        };
    }

    /**
     * Analyze metrics trend
     *
     * @param metrics - Metrics to analyze
     * @param previousMetrics - Previous metrics for comparison
     * @returns Trend analysis
     */
    static analyzeTrend(metrics: CacheMetrics, previousMetrics?: CacheMetrics): Record<string, any> {
        if (!previousMetrics) {
            return {trend: 'stable'};
        }

        const hitRateTrend = metrics.hitRate - previousMetrics.hitRate;
        const latencyTrend = metrics.avgLatency - previousMetrics.avgLatency;
        const errorRateTrend = metrics.errorRate - previousMetrics.errorRate;

        let trend = 'stable';
        if (hitRateTrend > 0.05 && latencyTrend < 0) {
            trend = 'improving';
        } else if (hitRateTrend < -0.05 || latencyTrend > 10 || errorRateTrend > 0.05) {
            trend = 'degrading';
        }

        return {
            trend,
            hitRateTrend,
            latencyTrend,
            errorRateTrend
        };
    }

    /**
     * Calculate average metrics over time
     *
     * @param metricsList - List of metrics over time
     * @returns Average metrics
     */
    static calculateAverageMetrics(metricsList: CacheMetrics[]): CacheMetrics {
        if (metricsList.length === 0) {
            return {
                hits: 0,
                misses: 0,
                errors: 0,
                hitRate: 0,
                avgLatency: 0,
                averageLatency: 0,
                maxLatency: 0,
                memoryUsage: 0,
                keyCount: 0,
                operationCount: 0,
                operations: 0,
                errorRate: 0,
                throughput: 0
            };
        }

        let totalHits = 0;
        let totalMisses = 0;
        let totalErrors = 0;
        let totalLatency = 0;
        let maxLatency = 0;
        let totalMemoryUsage = 0;
        let totalOperations = 0;

        for (const metric of metricsList) {
            totalHits += metric.hits;
            totalMisses += metric.misses;
            totalErrors += metric.errors;
            totalOperations += metric.operations;

            if (metric.avgLatency) {
                totalLatency += metric.avgLatency;
            }

            maxLatency = Math.max(maxLatency, metric.maxLatency || 0);
            totalMemoryUsage += metric.memoryUsage || 0;
        }

        const avgLatency = totalLatency / metricsList.length;
        const hitRate = (totalHits + totalMisses) > 0 ? totalHits / (totalHits + totalMisses) : 0;
        const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;

        return {
            hits: totalHits,
            misses: totalMisses,
            errors: totalErrors,
            hitRate,
            avgLatency,
            averageLatency: avgLatency,
            maxLatency,
            memoryUsage: totalMemoryUsage / metricsList.length,
            keyCount: 0, // Not tracked here
            operationCount: totalOperations,
            operations: totalOperations,
            errorRate,
            throughput: 0 // Cannot calculate without time information
        };
    }

    /**
     * Get cache health status
     *
     * @param metrics - Cache metrics
     * @returns Health status
     */
    static getHealthStatus(metrics: CacheMetrics): 'healthy' | 'degraded' | 'unhealthy' {
        if (metrics.errorRate > 0.1 || metrics.avgLatency > 500) {
            return 'unhealthy';
        }

        if (metrics.errorRate > 0.05 || metrics.avgLatency > 200 || metrics.hitRate < 0.5) {
            return 'degraded';
        }

        return 'healthy';
    }

    /**
     * Start metrics reporting
     */
    startReporting(): void {
        if (this.reportingInterval) {
            clearInterval(this.reportingInterval);
        }

        this.reportingInterval = setInterval(() => {
            const metrics = this.getMetrics();
            this.config.reporter(metrics);
        }, this.config.reportingInterval * 1000);
    }

    /**
     * Stop metrics reporting
     */
    stopReporting(): void {
        if (this.reportingInterval) {
            clearInterval(this.reportingInterval);
            this.reportingInterval = null;
        }
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            hits: 0,
            misses: 0,
            errors: 0,
            operations: 0,
            latency: {
                avg: 0,
                min: Infinity,
                max: 0,
                p95: 0,
                p99: 0,
                samples: 0
            },
            size: 0,
            memoryUsage: 0,
            startTime: Date.now()
        };
    }

    /**
     * Record a cache hit
     *
     * @param duration - Operation duration in milliseconds
     * @param size - Data size in bytes
     */
    recordHit(duration: number, size: number = 0): void {
        if (!this.config.enabled || Math.random() > this.config.samplingRate) {
            return;
        }

        this.metrics.hits++;
        this.metrics.operations++;
        this.updateLatencyStats(duration);
        this.metrics.size += size;
    }

    /**
     * Record a cache miss
     *
     * @param duration - Operation duration in milliseconds
     */
    recordMiss(duration: number): void {
        if (!this.config.enabled || Math.random() > this.config.samplingRate) {
            return;
        }

        this.metrics.misses++;
        this.metrics.operations++;
        this.updateLatencyStats(duration);
    }

    /**
     * Record an error
     *
     * @param error - Error object
     */
    recordError(error: Error): void {
        if (!this.config.enabled) {
            return;
        }

        this.metrics.errors++;

        // Log error if detailed metrics enabled
        if (this.config.detailedMetrics) {
            console.error('Cache error:', error);
        }
    }

    /**
     * Get current metrics
     *
     * @returns Cache metrics
     */
    getMetrics(): CacheMetrics {
        const uptime = Date.now() - this.metrics.startTime;
        const hitRate = this.getTotalRequests() > 0
            ? this.metrics.hits / this.getTotalRequests()
            : 0;
        const errorRate = this.metrics.operations > 0
            ? this.metrics.errors / this.metrics.operations
            : 0;
        const throughput = uptime > 0
            ? (this.metrics.operations * 1000) / uptime
            : 0;

        return {
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            errors: this.metrics.errors,
            operations: this.metrics.operations,
            hitRate,
            errorRate,
            avgLatency: this.metrics.latency.avg,
            averageLatency: this.metrics.latency.avg,
            maxLatency: this.metrics.latency.max,
            keyCount: 0, // Not tracked here
            memoryUsage: this.metrics.memoryUsage,
            throughput,
            operationCount: this.metrics.operations
        };
    }

    /**
     * Get total requests (hits + misses)
     *
     * @returns Total requests
     */
    getTotalRequests(): number {
        return this.metrics.hits + this.metrics.misses;
    }

    /**
     * Update memory usage
     *
     * @param memoryUsage - Memory usage in bytes
     */
    updateMemoryUsage(memoryUsage: number): void {
        this.metrics.memoryUsage = memoryUsage;
    }

    /**
     * Record performance metrics
     *
     * @param metrics - Performance metrics
     */
    recordPerformanceMetrics(metrics: PerformanceMetricsData): void {
        if (!this.config.enabled || Math.random() > this.config.samplingRate) {
            return;
        }

        this.metrics.operations++;
        this.updateLatencyStats(metrics.duration);
        this.metrics.size += metrics.size;

        if (metrics.errorCount > 0) {
            this.metrics.errors += metrics.errorCount;
        }
    }

    /**
     * Update latency statistics
     *
     * @param duration - Operation duration in milliseconds
     */
    private updateLatencyStats(duration: number): LatencyStats {
        const latency = this.metrics.latency;

        // Update min/max
        latency.min = Math.min(latency.min, duration);
        latency.max = Math.max(latency.max, duration);

        // Update average
        const newCount = latency.samples + 1;
        latency.avg = ((latency.avg * latency.samples) + duration) / newCount;
        latency.samples = newCount;

        // Update percentiles (simplified)
        latency.p95 = latency.max * 0.95;
        latency.p99 = latency.max * 0.99;

        return latency;
    }
}

export default CacheMonitoring;