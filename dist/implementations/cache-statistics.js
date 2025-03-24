"use strict";
/**
 * @fileoverview Cache statistics tracking implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheStatistics = void 0;
/**
* Cache statistics implementation
 */
class CacheStatistics {
    constructor() {
        this.hits = 0;
        this.misses = 0;
        this.sets = 0;
        this.deletes = 0;
        this.size = 0;
        this.operationMetrics = new Map();
        this.lastUpdated = new Date();
    }
    /**
     * Record a cache hit
     *
     * @param time - Operation time in ms
     */
    recordHit(time) {
        this.hits++;
        this.recordOperation('hit', time);
        this.lastUpdated = new Date();
    }
    /**
     * Record a cache miss
     *
     * @param time - Operation time in ms
     */
    recordMiss(time) {
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
    recordSet(size, time) {
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
    recordDelete(size, time) {
        this.deletes++;
        this.size -= size;
        if (this.size < 0)
            this.size = 0;
        this.recordOperation('delete', time);
        this.lastUpdated = new Date();
    }
    /**
     * Record an operation
     *
     * @param operation - Operation name
     * @param time - Operation time in ms
     */
    recordOperation(operation, time) {
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
    getOperationMetrics(operation) {
        return this.operationMetrics.get(operation);
    }
    /**
     * Get average operation time
     *
     * @param operation - Operation name
     * @returns Average time in ms or 0 if no operations recorded
     */
    getAverageOperationTime(operation) {
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
    getHitRatio() {
        const total = this.hits + this.misses;
        if (total === 0) {
            return 0;
        }
        return this.hits / total;
    }
    /**
     * Reset statistics
     */
    reset() {
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
    getStats() {
        const operations = {};
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
exports.CacheStatistics = CacheStatistics;
//# sourceMappingURL=cache-statistics.js.map