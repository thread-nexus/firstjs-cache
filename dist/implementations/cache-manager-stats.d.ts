/**
 * cache-manager-stats.ts
 *
 * Implementation of cache statistics and monitoring functionality
 */
import { CacheStats } from '../types/common';
import { CacheManagerAdvanced } from './cache-manager-advanced';
/**
 * Extension of CacheManager with statistics functionality
 */
export declare class CacheManagerStats extends CacheManagerAdvanced {
    private cacheStats;
    constructor(...args: ConstructorParameters<typeof CacheManagerAdvanced>);
    /**
     * Log an error message
     * @param message Error message
     * @param error Error object
     * @private
     */
    private logError;
    /**
     * Get cache statistics from all layers
     *
     * @returns Object containing stats for each cache layer
     */
    getStats(): Promise<Record<string, CacheStats>>;
    /**
     * Get providers map from parent class
     * @private
     */
    private getProviders;
    /**
     * Get config from parent class
     * @private
     */
    private getConfig;
    /**
     * Calculate aggregate statistics across all cache layers
     *
     * @param layerStats - Statistics from individual cache layers
     * @returns Aggregated statistics
     * @private
     */
    private calculateAggregateStats;
}
