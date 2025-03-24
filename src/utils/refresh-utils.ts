import { CacheOptions } from '../types/common';
import { emitCacheEvent, CacheEventType } from '../events/cache-events';
import * as cacheCore from '../implementations/cache-manager-core';

interface RefreshTask {
  key: string;
  fn: () => Promise<any>;
  options: CacheOptions;
  nextRefresh: number;
}

// Store for background refresh tasks
const refreshTasks = new Map<string, RefreshTask>();

/**
 * Schedule a background refresh task
 */
export function scheduleRefresh(
  key: string,
  fn: () => Promise<any>,
  options: CacheOptions
): void {
  if (!options.backgroundRefresh) {
    return;
  }

  const ttl = options.ttl || 3600; // Default 1 hour
  const threshold = options.refreshThreshold || 0.75;
  const nextRefresh = Date.now() + (ttl * threshold * 1000);

  refreshTasks.set(key, {
    key,
    fn,
    options,
    nextRefresh
  });
}

/**
 * Execute background refresh for a task
 */
async function executeRefresh(task: RefreshTask): Promise<void> {
  try {
    // Add required properties to event payload
    emitCacheEvent(CacheEventType.REFRESH_START, { 
      key: task.key,
      type: 'refresh:start', // Use string literal since enum may not have this value
      timestamp: Date.now()
    });
    
    const value = await task.fn();
    await cacheCore.setCacheValue(task.key, value, task.options);
    
    // Add required properties to event payload
    emitCacheEvent(CacheEventType.REFRESH_SUCCESS, { 
      key: task.key,
      type: 'refresh:success', // Use string literal since enum may not have this value
      timestamp: Date.now()
    });
    
    // Schedule next refresh
    scheduleRefresh(task.key, task.fn, task.options);
  } catch (error) {
    // Add required properties to event payload
    emitCacheEvent(CacheEventType.REFRESH_ERROR, { 
      key: task.key,
      error: error as Error,
      type: 'refresh:error', // Use string literal since enum may not have this value
      timestamp: Date.now()
    });
  }
}

/**
 * Process all pending refresh tasks
 */
async function processRefreshTasks(): Promise<void> {
  const now = Date.now();
  
  for (const [key, task] of refreshTasks.entries()) {
    if (task.nextRefresh <= now) {
      refreshTasks.delete(key);
      executeRefresh(task).catch(() => {
        // Error is already handled in executeRefresh
      });
    }
  }
}

// Start the background refresh processor
const REFRESH_INTERVAL = 1000; // Check every second
setInterval(processRefreshTasks, REFRESH_INTERVAL);

/**
 * Cancel a scheduled refresh task
 */
export function cancelRefresh(key: string): void {
  refreshTasks.delete(key);
}

/**
 * Get all pending refresh tasks
 */
export function getPendingRefreshTasks(): RefreshTask[] {
  return Array.from(refreshTasks.values());
}

/**
 * Check if a value needs refresh
 */
export function needsRefresh(
  key: string
): boolean {
  const task = refreshTasks.get(key);
  if (!task) {
    return false;
  }
  return Date.now() >= task.nextRefresh;
}

/**
 * Force immediate refresh of a cached value
 */
export async function forceRefresh(
  key: string
): Promise<void> {
  const task = refreshTasks.get(key);
  if (task) {
    await executeRefresh(task);
  }
}

/**
 * Clear all scheduled refresh tasks
 */
export function clearAllRefreshTasks(): void {
  refreshTasks.clear();
}