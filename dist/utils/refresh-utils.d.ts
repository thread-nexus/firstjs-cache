import { CacheOptions } from '../types/common';
interface RefreshTask {
    key: string;
    fn: () => Promise<any>;
    options: CacheOptions;
    nextRefresh: number;
}
/**
 * Schedule a background refresh task
 */
export declare function scheduleRefresh(key: string, fn: () => Promise<any>, options: CacheOptions): void;
/**
 * Cancel a scheduled refresh task
 */
export declare function cancelRefresh(key: string): void;
/**
 * Get all pending refresh tasks
 */
export declare function getPendingRefreshTasks(): RefreshTask[];
/**
 * Check if a value needs refresh
 */
export declare function needsRefresh(key: string): boolean;
/**
 * Force immediate refresh of a cached value
 */
export declare function forceRefresh(key: string): Promise<void>;
/**
 * Clear all scheduled refresh tasks
 */
export declare function clearAllRefreshTasks(): void;
export {};
