"use strict";
/**
 * @fileoverview Advanced cache statistics tracking and performance monitoring
 * with real-time metrics and historical data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheStatistics = void 0;
const cache_events_1 = require("../events/cache-events");
const cache_manager_utils_1 = require("./cache-manager-utils");
class CacheStatistics {
    constructor() {
        this.stats = {
            hits: 0,
            misses: 0,
            size: 0,
            keyCount: 0,
            memoryUsage: 0,
            lastUpdated: new Date(),
            keys: []
        };
        // Detailed operation metrics
        this.operations = {
            get: { count: 0, totalTime: 0, minTime: Infinity, maxTime: 0, lastTime: 0 },
            set: { count: 0, totalTime: 0, minTime: Infinity, maxTime: 0, lastTime: 0 },
            delete: { count: 0, totalTime: 0, minTime: Infinity, maxTime: 0, lastTime: 0 },
            compute: { count: 0, totalTime: 0, minTime: Infinity, maxTime: 0, lastTime: 0 }
        };
        // Time series data for trending
        this.timeSeriesData = {
            hitRate: [],
            size: [],
            operations: []
        };
        // Configuration
        this.maxTimeSeriesPoints = 1000;
        this.timeSeriesInterval = 60000; // 1 minute
        this.timeSeriesTimer = null;
        this.startTimeSeriesCollection();
    }
    /**
     * Record a cache hit
     */
    recordHit(duration) {
        this.stats.hits++;
        this.updateOperationMetrics('get', duration);
        this.emitStatsUpdate();
    }
    /**
     * Record a cache miss
     */
    recordMiss(duration) {
        this.stats.misses++;
        this.updateOperationMetrics('get', duration);
        this.emitStatsUpdate();
    }
    /**
     * Record a set operation
     */
    recordSet(size, duration) {
        this.stats.size += size;
        this.stats.keyCount++;
        this.updateOperationMetrics('set', duration);
        this.emitStatsUpdate();
    }
    /**
     * Record a delete operation
     */
    recordDelete(size, duration) {
        this.stats.size -= size;
        this.stats.keyCount--;
        this.updateOperationMetrics('delete', duration);
        this.emitStatsUpdate();
    }
    /**
     * Record a compute operation
     */
    recordCompute(duration) {
        this.updateOperationMetrics('compute', duration);
        this.emitStatsUpdate();
    }
    /**
     * Update operation metrics
     */
    updateOperationMetrics(operation, duration) {
        const metrics = this.operations[operation];
        if (!metrics)
            return;
        metrics.count++;
        metrics.totalTime += duration;
        metrics.minTime = Math.min(metrics.minTime, duration);
        metrics.maxTime = Math.max(metrics.maxTime, duration);
        metrics.lastTime = duration;
    }
    /**
     * Get current cache statistics
     */
    getStats() {
        const totalOperations = this.stats.hits + this.stats.misses;
        const hitRate = totalOperations > 0 ? this.stats.hits / totalOperations : 0;
        const missRate = totalOperations > 0 ? this.stats.misses / totalOperations : 0;
        const averageOperationTime = {};
        Object.entries(this.operations).forEach(([op, metrics]) => {
            averageOperationTime[op] = metrics.count > 0
                ? metrics.totalTime / metrics.count
                : 0;
        });
        return Object.assign(Object.assign({}, this.stats), { hitRate,
            missRate,
            averageOperationTime, trends: this.timeSeriesData });
    }
    /**
     * Get detailed operation metrics
     */
    getOperationMetrics() {
        const metrics = {};
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
    startTimeSeriesCollection() {
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
    addTimeSeriesPoint(series, timestamp, value) {
        this.timeSeriesData[series].push({ timestamp, value });
        // Maintain fixed size
        if (this.timeSeriesData[series].length > this.maxTimeSeriesPoints) {
            this.timeSeriesData[series].shift();
        }
    }
    /**
     * Emit stats update event
     */
    emitStatsUpdate() {
        this.stats.lastUpdated = new Date();
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.STATS_UPDATE, {
            stats: this.getStats(),
            formatted: {
                size: (0, cache_manager_utils_1.formatCacheSize)(this.stats.size),
                hitRate: `${(this.getStats().hitRate * 100).toFixed(2)}%`
            }
        });
    }
    /**
     * Reset statistics
     */
    reset() {
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
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.STATS_UPDATE, {
            stats: this.getStats(),
            message: 'Statistics reset'
        });
    }
    /**
     * Clean up resources
     */
    dispose() {
        if (this.timeSeriesTimer) {
            clearInterval(this.timeSeriesTimer);
            this.timeSeriesTimer = null;
        }
    }
}
exports.CacheStatistics = CacheStatistics;
