/**
 * @fileoverview Enhanced rate limiting utility
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */

import { CacheError, CacheErrorCode, createCacheError } from './error-utils';

interface RateLimitConfig {
  maxRequests: number;
  burstable?: boolean; 
  fairness?: boolean;
  queueSize?: number;
  operation?: string;
  window: number; // Time window in milliseconds
}

interface RateLimitEntry {
  timestamp: number;
  count: number;
}

/**
 * Rate limit statistics
 */
export interface RateLimitStats {
  operation: string;
  currentUsage: number;
  limit: number;
  remaining: number;
  resetTime: number;
  queueSize: number;
  burstCapacity: number;
}

/**
 * Enhanced rate limiter with fairness and burst handling
 */
export class RateLimiter {
  private limits: Map<string, RateLimitConfig>;
  private usage: Map<string, RateLimitEntry[]>;
  private queue: Map<string, Array<() => void>>;

  constructor(configs: Record<string, RateLimitConfig>) {
    this.limits = new Map(Object.entries(configs));
    this.usage = new Map();
    this.queue = new Map();
    this.startCleanupInterval();
  }

  /**
   * Check if operation is within rate limits
   */
  public async checkLimit(
    operation: string,
    count: number = 1
  ): Promise<void> {
    const config = this.limits.get(operation);
    if (!config) return;

    const maxRequests = config.maxRequests || 100;
    const burstable = config.burstable || false;
    const fairness = config.fairness || false;
    const queueSize = config.queueSize || 1000;

    const now = Date.now();
    const entry = this.getUsageEntry(operation);

    if (this.isLimited(entry, config, count)) {
      if (burstable) {
        await this.handleBurst(operation, count);
      } else if (fairness) {
        await this.queueRequest(operation);
      } else {
        throw createCacheError(
          CacheErrorCode.RATE_LIMIT_EXCEEDED,
          `Rate limit exceeded for operation: ${operation}`,
          { operation }
        );
      }
    }

    this.updateUsage(operation, count);
  }

  /**
   * Get current usage statistics
   */
  public getStats(operation: string): RateLimitStats | null {
    const config = this.limits.get(operation);
    const usage = this.usage.get(operation);
    const queueSize = this.queue.get(operation)?.length || 0;

    if (!config || !usage) {
      return null;
    }

    const now = Date.now();
    const windowUsage = this.calculateWindowUsage(usage, now, operation);

    return {
      operation,
      currentUsage: windowUsage,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - windowUsage),
      resetTime: this.getResetTime(usage, config),
      queueSize,
      burstCapacity: config.burstable ? config.maxRequests * 2 : config.maxRequests
    };
  }

  private getUsageEntry(operation: string): RateLimitEntry[] {
    let entry = this.usage.get(operation);
    if (!entry) {
      entry = [];
      this.usage.set(operation, entry);
    }
    return entry;
  }

  private isLimited(
    entry: RateLimitEntry[],
    config: RateLimitConfig,
    count: number
  ): boolean {
    const now = Date.now();
    // Use a safe operation string even if config.operation is undefined
    const op = config.operation || 'unknown';
    const windowUsage = this.calculateWindowUsage(entry, now, op);
    return windowUsage + count > config.maxRequests;
  }

  private async handleBurst(
    operation: string,
    count: number
  ): Promise<void> {
    const config = this.limits.get(operation);
    if (!config) return;
    
    const burstLimit = config.maxRequests * 2;
    const usage = this.getUsageEntry(operation);
    const windowUsage = this.calculateWindowUsage(usage, Date.now(), operation);

    if (windowUsage + count > burstLimit) {
      throw new CacheError(
        CacheErrorCode.RATE_LIMIT_EXCEEDED,
        `Burst limit exceeded for operation: ${operation}`,
        { operation }
      );
    }
  }

  private async queueRequest(operation: string): Promise<void> {
    const config = this.limits.get(operation);
    if (!config) return;
    
    let queue = this.queue.get(operation);

    if (!queue) {
      queue = [];
      this.queue.set(operation, queue);
    }

    if (queue.length >= (config.queueSize || 1000)) {
      throw new CacheError(
        CacheErrorCode.RATE_LIMIT_EXCEEDED,
        `Queue full for operation: ${operation}`,
        { operation }
      );
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = queue!.indexOf(resolve);
        if (index !== -1) {
          queue!.splice(index, 1);
          reject(new CacheError(
            CacheErrorCode.TIMEOUT,
            `Queue timeout for operation: ${operation}`,
            { operation }
          ));
        }
      }, 5000);

      queue!.push(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private updateUsage(
    operation: string,
    count: number
  ): void {
    const entry = this.getUsageEntry(operation);
    entry.push({
      timestamp: Date.now(),
      count
    });
  }

  private calculateWindowUsage(
    entry: RateLimitEntry[],
    now: number,
    operation: string
  ): number {
    const config = this.limits.get(operation);
    if (!config) return 0;
    
    const windowStart = now - config.window;
    return entry
      .filter(e => e.timestamp >= windowStart)
      .reduce((sum, e) => sum + e.count, 0);
  }

  private getResetTime(
    entry: RateLimitEntry[],
    config: RateLimitConfig
  ): number {
    if (entry.length === 0) return Date.now();
    const oldestTimestamp = Math.min(...entry.map(e => e.timestamp));
    return oldestTimestamp + config.window;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [operation, config] of this.limits) {
        const entry = this.usage.get(operation);
        if (entry) {
          const windowStart = now - config.window;
          const filtered = entry.filter(e => e.timestamp >= windowStart);
          this.usage.set(operation, filtered);
        }
      }
    }, 60000); // Clean up every minute
  }
}