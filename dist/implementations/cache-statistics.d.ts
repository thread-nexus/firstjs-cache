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
export declare class CacheStatistics {
    private hits;
    private misses;
    private sets;
    private deletes;
    private size;
    private operationMetrics;
    private lastUpdated;
    /**
     * Record a cache hit
     *
     * @param time - Operation time in ms
     */
    recordHit(time: number): void;
    /**
     * Record a cache miss
     *
     * @param time - Operation time in ms
     */
    recordMiss(time: number): void;
    /**
     * Record a cache set operation
     *
     * @param size - Size of the value in bytes
     * @param time - Operation time in ms
     */
    recordSet(size: number, time: number): void;
    /**
     * Record a cache delete operation
     *
     * @param size - Size of the deleted value in bytes
     * @param time - Operation time in ms
     */
    recordDelete(size: number, time: number): void;
    /**
     * Record an operation
     *
     * @param operation - Operation name
     * @param time - Operation time in ms
     */
    recordOperation(operation: string, time: number): void;
    /**
     * Get operation metrics
     *
     * @param operation - Operation name
     * @returns Operation metrics or undefined if not found
     */
    getOperationMetrics(operation: string): OperationMetrics | undefined;
    /**
     * Get average operation time
     *
     * @param operation - Operation name
     * @returns Average time in ms or 0 if no operations recorded
     */
    getAverageOperationTime(operation: string): number;
    /**
     * Get cache hit ratio
     *
     * @returns Hit ratio between 0 and 1
     */
    getHitRatio(): number;
    /**
     * Reset statistics
     */
    reset(): void;
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
    };
}
export {};
