/**
 * @fileoverview Cache manager statistics implementation
 */
import { CacheStats } from '../types/common';
import { CacheManager } from './cache-manager';
/**
 * Extension of CacheManager with statistics functionality
 */
export declare class CacheManagerStats extends CacheManager {
    protected statsConfig: {
        throwOnErrors?: boolean;
        defaultTtl: number;
        maxSize: number;
        maxItems: number;
        compressionThreshold: number;
        compressionLevel: number;
        refreshThreshold: number;
        backgroundRefresh: boolean;
        statsInterval: number;
        providers: string[];
        defaultProvider: string;
    };
    protected providerMap: Map<string, any>;
    constructor();
    /**
     * Get cache statistics from all layers
     *
     * @returns Object containing stats for each cache layer
     */
    getStats(): Promise<Record<string, CacheStats>>;
    /**
     * Calculate aggregate statistics across all cache layers
     *
     * @param layerStats - Statistics from individual cache layers
     * @returns Aggregated statistics
     * @private
     */
    private calculateAggregateStats;
    /**
     * Log an error message
     *
     * @param message - Error message
     * @param error - Error object
     * @private
     */
    private logError;
}
