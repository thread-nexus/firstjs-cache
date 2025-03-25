/**
 * @fileoverview Cache provider statistics implementation
 */

import {CacheStats} from '../types';

/**
 * Create default cache stats
 */
export function createDefaultStats(): CacheStats {
    return {
        hits: 0,
        misses: 0,
        size: 0,
        keyCount: 0,
        memoryUsage: 0,
        lastUpdated: Date.now()
    };
}

/**
 * Cache provider statistics implementation
 */
export class CacheProviderStats {
    /**
     * Cache stats
     */
    private stats: CacheStats;
    
    /**
     * Create a new cache provider stats
     */
    constructor() {
        this.stats = this.createEmptyStats();
    }
    
    /**
     * Create empty stats
     */
    private createEmptyStats(): CacheStats {
        return {
            hits: 0,
            misses: 0,
            size: 0,
            keyCount: 0,
            memoryUsage: 0,
            lastUpdated: Date.now()
        };
    }
    
    /**
     * Record a cache hit
     */
    recordHit(): void {
        this.stats.hits++;
        this.stats.lastUpdated = Date.now();
    }
    
    /**
     * Record a cache miss
     */
    recordMiss(): void {
        this.stats.misses++;
        this.stats.lastUpdated = Date.now();
    }
    
    /**
     * Record an error
     */
    recordError(): void {
        this.stats.lastUpdated = Date.now();
    }
    
    /**
     * Update key count
     * 
     * @param count New key count
     */
    updateKeyCount(count: number): void {
        this.stats.keyCount = count;
        this.stats.lastUpdated = Date.now();
    }
    
    /**
     * Update cache size
     * 
     * @param size New cache size
     */
    updateSize(size: number): void {
        this.stats.size = size;
        this.stats.lastUpdated = Date.now();
    }
    
    /**
     * Update memory usage
     * 
     * @param memoryUsage New memory usage
     */
    updateMemoryUsage(memoryUsage: number): void {
        this.stats.memoryUsage = memoryUsage;
        this.stats.lastUpdated = Date.now();
    }
    
    /**
     * Record an operation
     */
    recordOperation(): void {
        this.stats.lastUpdated = Date.now();
    }
    
    /**
     * Get cache stats
     */
    getStats(): CacheStats {
        return {...this.stats};
    }
    
    /**
     * Get provider-specific stats
     */
    getProviderStats(): Record<string, CacheStats> {
        return {
            default: this.stats
        };
    }
    
    /**
     * Reset cache stats
     */
    resetStats(): void {
        this.stats = this.createEmptyStats();
    }
    
    /**
     * Get hit rate
     */
    getHitRate(): number {
        const total = this.stats.hits + this.stats.misses;
        return total > 0 ? this.stats.hits / total : 0;
    }
    
    /**
     * Get error rate
     */
    getErrorRate(): number {
        return 0;
    }
}