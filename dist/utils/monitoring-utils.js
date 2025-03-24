"use strict";
/**
 * @fileoverview Enhanced monitoring utilities for cache operations
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = exports.CacheMonitor = void 0;
exports.getPerformanceMonitor = getPerformanceMonitor;
exports.createPerformanceMonitor = createPerformanceMonitor;
exports.measureOperation = measureOperation;
exports.createEmptyMetrics = createEmptyMetrics;
exports.mergeMetrics = mergeMetrics;
const cache_events_1 = require("../events/cache-events");
const perf_hooks_1 = require("perf_hooks");
/**
 * Enhanced cache monitor
 */
class CacheMonitor {
    constructor(config) {
        this.metrics = new Map();
        this.config = config;
        this.startTime = Date.now();
        this.initializeMonitoring();
    }
    /**
     * Get singleton instance
     */
    static getInstance(config) {
        if (!CacheMonitor.instance) {
            CacheMonitor.instance = new CacheMonitor(config);
        }
        return CacheMonitor.instance;
    }
    /**
     * Record operation metrics
     */
    recordMetrics(operation, metrics) {
        if (!this.config.enabled)
            return;
        const current = this.metrics.get(operation) || this.createEmptyMetrics();
        this.metrics.set(operation, this.updateMetrics(current, metrics));
        if (this.shouldEmitMetrics(metrics)) {
            this.emitMetrics(operation, metrics);
        }
    }
    /**
     * Get current analytics
     */
    getAnalytics() {
        return {
            uptime: Date.now() - this.startTime,
            operations: this.aggregateOperationMetrics(),
            health: this.calculateHealthMetrics(),
            alerts: this.checkThresholds()
        };
    }
    /**
     * Initialize monitoring
     */
    initializeMonitoring() {
        if (!this.config.enabled)
            return;
        setInterval(() => {
            this.collectMetrics();
        }, this.config.interval);
    }
    /**
     * Create empty metrics object
     */
    createEmptyMetrics() {
        return {
            duration: 0,
            hits: 0,
            misses: 0,
            latency: { avg: 0, min: 0, max: 0, count: 0 },
            memoryUsage: 0,
            success: true,
            timestamp: Date.now()
        };
    }
    /**
     * Update metrics with new data
     */
    updateMetrics(current, newMetrics) {
        return {
            duration: (current.duration || 0) + (newMetrics.duration || 0),
            hits: current.hits + (newMetrics.hits || 0),
            misses: current.misses + (newMetrics.misses || 0),
            error: current.error || newMetrics.error,
            latency: this.updateLatencyStats(current.latency, typeof newMetrics.latency === 'number'
                ? { avg: newMetrics.latency, min: newMetrics.latency, max: newMetrics.latency, count: 1 }
                : newMetrics.latency),
            memoryUsage: current.memoryUsage + (newMetrics.memoryUsage || 0),
            size: (current.size || 0) + (newMetrics.size || 0),
            success: current.success && newMetrics.success,
            timestamp: Date.now(),
            operationCount: (current.operationCount || 0) + (newMetrics.operationCount || 0),
            errorCount: (current.errorCount || 0) + (newMetrics.error ? 1 : 0)
        };
    }
    /**
     * Update latency statistics
     */
    updateLatencyStats(current, newLatency) {
        return {
            avg: (current.avg * current.count + newLatency.avg * newLatency.count) /
                (current.count + newLatency.count),
            min: Math.min(current.min === 0 ? Infinity : current.min, newLatency.min),
            max: Math.max(current.max, newLatency.max),
            count: current.count + newLatency.count
        };
    }
    /**
     * Check if metrics should be emitted
     */
    shouldEmitMetrics(metrics) {
        if (!this.config.alertThresholds)
            return false;
        return (metrics.duration || 0) > (this.config.alertThresholds?.latency || 0) ||
            metrics.error === true;
    }
    /**
     * Emit metrics event
     */
    emitMetrics(operation, metrics) {
        // Add required type property to event payload
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.PERFORMANCE, {
            operation,
            metrics,
            timestamp: Date.now(),
            type: cache_events_1.CacheEventType.PERFORMANCE.toString()
        });
    }
    /**
     * Collect metrics
     * This method is called periodically by the monitoring system
     */
    collectMetrics() {
        // Implementation would depend on how you want to collect metrics
        // This is a placeholder
    }
    /**
     * Aggregate operation metrics
     */
    aggregateOperationMetrics() {
        return Array.from(this.metrics.entries()).map(([operation, metrics]) => ({
            operation,
            metrics,
            trends: this.calculateTrends(operation)
        }));
    }
    /**
     * Calculate operation trends
     */
    calculateTrends(operation) {
        const metrics = this.metrics.get(operation);
        if (!metrics) {
            return { hitRate: 0, latencyTrend: 0 };
        }
        const totalRequests = metrics.hits + metrics.misses;
        const hitRate = totalRequests > 0 ? (metrics.hits / totalRequests) * 100 : 0;
        // Simple latency trend - in a real implementation you would compare with historical data
        const latencyTrend = metrics.latency?.avg || 0;
        return { hitRate, latencyTrend };
    }
    /**
     * Calculate health metrics
     */
    calculateHealthMetrics() {
        const totalOperations = this.metrics.size;
        const errorRate = this.calculateErrorRate();
        const avgLatency = this.calculateAverageLatency();
        const utilization = this.calculateUtilization();
        return {
            status: this.determineHealthStatus(errorRate, avgLatency, utilization),
            errorRate,
            latency: avgLatency,
            utilization,
            resourceUsage: this.calculateResourceUsage()
        };
    }
    /**
     * Calculate the error rate across all operations
     */
    calculateErrorRate() {
        let totalOperations = 0;
        let totalErrors = 0;
        this.metrics.forEach(metric => {
            totalErrors += (metric.errorCount || 0) + (metric.error ? 1 : 0);
            totalOperations += (metric.operationCount || 0) || (metric.hits + metric.misses);
        });
        return totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;
    }
    /**
     * Calculate average latency across all operations
     */
    calculateAverageLatency() {
        let totalLatency = 0;
        let count = 0;
        this.metrics.forEach(metric => {
            if (metric.latency && metric.latency.avg) {
                totalLatency += metric.latency.avg;
                count++;
            }
        });
        return count > 0 ? totalLatency / count : 0;
    }
    /**
     * Calculate cache utilization
     */
    calculateUtilization() {
        // Simple implementation - would depend on your cache size limits
        return 75; // Placeholder - implement actual calculation based on your cache constraints
    }
    /**
     * Calculate resource usage metrics
     */
    calculateResourceUsage() {
        let totalMemory = 0;
        let totalCpu = 0;
        let count = 0;
        this.metrics.forEach(metric => {
            if (metric.memoryUsage) {
                totalMemory += metric.memoryUsage;
                count++;
            }
            if (metric.cpuUsage) {
                totalCpu += metric.cpuUsage;
            }
        });
        return {
            memory: totalMemory,
            cpu: totalCpu > 0 ? totalCpu / (count || 1) : 0,
            connections: this.estimateConnectionCount()
        };
    }
    /**
     * Determine health status based on multiple factors
     */
    determineHealthStatus(errorRate, latency, utilization) {
        // Critical error rate takes precedence
        if (errorRate > 10)
            return 'unhealthy';
        if (errorRate > 3)
            return 'degraded';
        // High latency is next priority
        if (latency > this.config.alertThresholds?.latency * 3)
            return 'unhealthy';
        if (latency > this.config.alertThresholds?.latency)
            return 'degraded';
        // High utilization is next concern
        if (utilization > 95)
            return 'degraded';
        return 'healthy';
    }
    /**
     * Estimate connection count
     * In a real implementation, this would be populated with actual connection data
     */
    estimateConnectionCount() {
        return 1; // Placeholder
    }
    /**
     * Check monitoring thresholds
     */
    checkThresholds() {
        const alerts = [];
        const metrics = this.getAnalytics();
        if (this.config.alertThresholds &&
            metrics.health.errorRate > (this.config.alertThresholds.errorRate || 5)) {
            alerts.push({
                type: 'ERROR_RATE',
                message: `High error rate detected: ${metrics.health.errorRate}%`,
                severity: 'high'
            });
        }
        // Add more threshold checks as needed
        return alerts;
    }
}
exports.CacheMonitor = CacheMonitor;
function updateMetrics(current, newMetrics) {
    const mergedMetrics = {
        hits: current.hits + (newMetrics.hits || 0),
        misses: current.misses + (newMetrics.misses || 0),
        errorCount: (current.errorCount || 0) + (newMetrics.error ? 1 : 0),
        size: (current.size || 0) + (newMetrics.size || 0),
        latency: newMetrics.latency,
        memoryUsage: newMetrics.memoryUsage,
        duration: newMetrics.duration,
        success: newMetrics.success,
        timestamp: newMetrics.timestamp,
        operationCount: (current.operationCount || 0) + 1,
        error: newMetrics.error
    };
    return {
        ...current,
        ...mergedMetrics
    };
}
/**
 * Class for tracking and calculating cache performance metrics
 */
class PerformanceMonitor {
    constructor() {
        this.operations = 0;
        this.hits = 0;
        this.misses = 0;
        this.errors = 0;
        this.totalLatency = 0;
        this.maxLatency = 0;
        this.timingData = [];
        this.startTime = perf_hooks_1.performance.now();
        this.lastMemoryUsage = 0;
    }
    /**
     * Record the start of an operation
     *
     * @param operation - The name of the operation
     * @returns A function to call when the operation is complete
     */
    startOperation(operation) {
        const startTime = perf_hooks_1.performance.now();
        return (success = true) => {
            const endTime = perf_hooks_1.performance.now();
            const duration = endTime - startTime;
            this.operations++;
            this.totalLatency += duration;
            this.maxLatency = Math.max(this.maxLatency, duration);
            if (!success) {
                this.errors++;
            }
            this.timingData.push({
                startTime,
                endTime,
                operation,
                success
            });
            // Trim timing data if it gets too large
            if (this.timingData.length > 1000) {
                this.timingData = this.timingData.slice(-500);
            }
        };
    }
    /**
     * Record a cache hit
     */
    recordHit() {
        this.hits++;
    }
    /**
     * Record a cache miss
     */
    recordMiss() {
        this.misses++;
    }
    /**
     * Record current memory usage
     */
    recordMemoryUsage() {
        try {
            // Node.js environment
            if (typeof process !== 'undefined' && process.memoryUsage) {
                this.lastMemoryUsage = process.memoryUsage().heapUsed;
            }
            // Browser environment
            else if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
                this.lastMemoryUsage = window.performance.memory.usedJSHeapSize;
            }
        }
        catch (e) {
            // Ignore memory measurement errors
        }
    }
    /**
     * Get current cache metrics
     *
     * @returns CacheMetrics object with performance data
     */
    getMetrics() {
        const currentTime = perf_hooks_1.performance.now();
        const elapsedTimeInSeconds = (currentTime - this.startTime) / 1000;
        // Record memory usage before returning metrics
        this.recordMemoryUsage();
        return {
            operations: this.operations,
            averageLatency: this.operations ? this.totalLatency / this.operations : 0,
            maxLatency: this.maxLatency,
            errorRate: this.operations ? this.errors / this.operations : 0,
            hitRate: (this.hits + this.misses) ? this.hits / (this.hits + this.misses) : 0,
            throughput: elapsedTimeInSeconds > 0 ? this.operations / elapsedTimeInSeconds : 0,
            memoryUsage: this.lastMemoryUsage
        };
    }
    /**
     * Reset all metrics
     */
    reset() {
        this.operations = 0;
        this.hits = 0;
        this.misses = 0;
        this.errors = 0;
        this.totalLatency = 0;
        this.maxLatency = 0;
        this.timingData = [];
        this.startTime = perf_hooks_1.performance.now();
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
// Singleton instance for global monitoring
const globalMonitor = new PerformanceMonitor();
/**
 * Get the global performance monitor instance
 *
 * @returns Global performance monitor
 */
function getPerformanceMonitor() {
    return globalMonitor;
}
/**
 * Create a new performance monitor instance
 *
 * @returns New performance monitor
 */
function createPerformanceMonitor() {
    return new PerformanceMonitor();
}
/**
 * Measure the execution time of a function
 *
 * @param operation - Operation name
 * @param fn - Function to measure
 * @returns The function result
 */
async function measureOperation(operation, fn) {
    const monitor = globalMonitor.startOperation(operation);
    try {
        const result = await fn();
        monitor(); // No arguments needed
        return result;
    }
    catch (error) {
        monitor(); // No arguments needed
        throw error;
    }
}
/**
 * Create empty cache metrics
 *
 * @returns Empty cache metrics
 */
function createEmptyMetrics() {
    return {
        operations: 0,
        averageLatency: 0,
        maxLatency: 0,
        errorRate: 0,
        hitRate: 0,
        throughput: 0,
        memoryUsage: 0
    };
}
/**
 * Merge multiple cache metrics together
 *
 * @param metrics - Array of metrics to merge
 * @returns Merged metrics
 */
function mergeMetrics(metrics) {
    if (!metrics.length) {
        return createEmptyMetrics();
    }
    const result = createEmptyMetrics();
    let totalOps = 0;
    let totalHits = 0;
    let totalMisses = 0;
    for (const metric of metrics) {
        totalOps += metric.operations || 0;
        // Estimate hits and misses based on hitRate and operations
        const estimatedHits = metric.operations * metric.hitRate;
        const estimatedMisses = metric.operations * (1 - metric.hitRate);
        totalHits += estimatedHits;
        totalMisses += estimatedMisses;
        result.maxLatency = Math.max(result.maxLatency, metric.maxLatency || 0);
        result.memoryUsage += metric.memoryUsage || 0;
    }
    // Calculate aggregated metrics
    result.operations = totalOps;
    result.averageLatency = metrics.reduce((sum, m) => sum + (m.averageLatency || 0) * (m.operations || 0), 0) /
        (totalOps || 1);
    result.hitRate = (totalHits + totalMisses) ? totalHits / (totalHits + totalMisses) : 0;
    result.errorRate = metrics.reduce((sum, m) => sum + (m.errorRate || 0) * (m.operations || 0), 0) /
        (totalOps || 1);
    result.throughput = metrics.reduce((sum, m) => sum + (m.throughput || 0), 0);
    return result;
}
//# sourceMappingURL=monitoring-utils.js.map