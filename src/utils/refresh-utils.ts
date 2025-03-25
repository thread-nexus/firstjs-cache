/**
 * Refresh utilities for cache operations
 */

import {CacheOptions} from '../types';
import {CacheManagerCore} from '../implementations';
import {handleCacheError} from './error-utils';

// Default cache manager instance
const defaultCacheManager = new CacheManagerCore();

/**
 * Refresh task
 */
interface RefreshTask<T = any> {
    /**
     * Cache key
     */
    key: string;

    /**
     * Function to fetch data
     */
    fetcher: () => Promise<T>;

    /**
     * Cache options
     */
    options?: CacheOptions;

    /**
     * When the task was scheduled
     */
    scheduledAt: number;
}

/**
 * Refresh queue
 */
class RefreshQueue {
    /**
     * Task queue
     */
    private queue: RefreshTask[] = [];

    /**
     * Whether the queue is processing
     */
    private isProcessing = false;

    /**
     * Add a task to the queue
     *
     * @param task - Refresh task
     */
    add<T>(task: RefreshTask<T>): void {
        // Check if task already exists
        const existingIndex = this.queue.findIndex(t => t.key === task.key);

        if (existingIndex !== -1) {
            // Replace an existing task
            this.queue[existingIndex] = task;
        } else {
            // Add a new task
            this.queue.push(task);
        }

        // Start processing if not already
        if (!this.isProcessing) {
            this.process().then(r => {});
        }
    }

    /**
     * Process the queue
     */
    private async process(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            // Get next task
            const task = this.queue.shift();

            if (task) {
                await this.executeTask(task);
            }
        } finally {
            this.isProcessing = false;

            // Continue processing if there are more tasks
            if (this.queue.length > 0) {
                setTimeout(() => this.process(), 0);
            }
        }
    }

    /**
     * Execute a refresh task
     *
     * @param task - Refresh task
     */
    private async executeTask<T>(task: RefreshTask<T>): Promise<void> {
        try {
            // Execute fetcher
            const value = await task.fetcher();

            // Update cache
            await defaultCacheManager.set(task.key, value, task.options);
        } catch (error) {
            handleCacheError(error, {operation: 'refreshTask', key: task.key}, true);
        }
    }
}

// Singleton refresh queue
const refreshQueue = new RefreshQueue();

/**
 * Schedule a background refresh
 *
 * @param key - Cache key
 * @param fetcher - Function to fetch data
 * @param options - Cache options
 */
export function scheduleRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
): void {
    refreshQueue.add({
        key,
        fetcher,
        options,
        scheduledAt: Date.now()
    });
}

/**
 * Check if a value should be refreshed based on TTL and threshold
 *
 * @param timestamp - When the value was created
 * @param ttl - Time-to-live in seconds
 * @param threshold - Refresh threshold (0-1)
 * @returns Whether the value should be refreshed
 */
export function shouldRefresh(
    timestamp: number | Date,
    ttl: number,
    threshold: number
): boolean {
    if (!ttl || !threshold || threshold <= 0 || threshold > 1) {
        return false;
    }

    const createdAt = timestamp instanceof Date ? timestamp.getTime() : timestamp;
    const expiresAt = createdAt + (ttl * 1000);
    const refreshAt = createdAt + (ttl * threshold * 1000);

    return Date.now() >= refreshAt && Date.now() < expiresAt;
}

/**
 * Get refresh threshold based on options
 *
 * @param options - Cache options
 * @param defaultThreshold - Default threshold
 * @returns Refresh threshold
 */
export function getRefreshThreshold(
    options?: CacheOptions,
    defaultThreshold = 0.8
): number {
    return options?.refreshThreshold !== undefined
        ? options.refreshThreshold
        : defaultThreshold;
}