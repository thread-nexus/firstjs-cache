/**
 * Rate limiter for cache operations
 */

import { RateLimitConfig } from '../types/common';
import { CacheError, CacheErrorCode } from './error-utils';

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  /**
   * Rate limit configuration
   */
  private config: Required<RateLimitConfig>;
  
  /**
   * Operation counters
   */
  private counters = new Map<string, { count: number; resetAt: number }>();
  
  /**
   * Operation queues
   */
  private queues = new Map<string, Array<{ resolve: () => void; reject: (error: Error) => void; timeout: NodeJS.Timeout }>>();
  
  /**
   * Create a new rate limiter
   * 
   * @param config - Rate limit configuration
   */
  constructor(config: RateLimitConfig) {
    this.config = {
      limit: config.limit,
      window: config.window,
      throwOnLimit: config.throwOnLimit || false,
      queueExceeding: config.queueExceeding || false,
      maxQueueSize: config.maxQueueSize || 100,
      maxWaitTime: config.maxWaitTime || 30000
    };
  }
  
  /**
   * Limit an operation
   * 
   * @param operation - Operation name
   * @returns Promise that resolves when the operation can proceed
   */
  async limit(operation: string): Promise<void> {
    // Get or create counter
    const counter = this.getCounter(operation);
    
    // Check if limit is exceeded
    if (counter.count >= this.config.limit) {
      // Check if we should queue
      if (this.config.queueExceeding) {
        await this.queueOperation(operation);
        return;
      }
      
      // Throw or return based on configuration
      if (this.config.throwOnLimit) {
        throw new CacheError(
          `Rate limit exceeded for operation: ${operation}`,
          CacheErrorCode.RATE_LIMIT_EXCEEDED
        );
      }
      
      // Wait for next window
      await this.waitForNextWindow(counter);
    }
    
    // Increment counter
    counter.count++;
  }
  
  /**
   * Get or create a counter for an operation
   * 
   * @param operation - Operation name
   * @returns Counter
   */
  private getCounter(operation: string): { count: number; resetAt: number } {
    const now = Date.now();
    
    // Get existing counter
    const counter = this.counters.get(operation);
    
    // Check if counter exists and is still valid
    if (counter && counter.resetAt > now) {
      return counter;
    }
    
    // Create new counter
    const resetAt = now + this.config.window;
    const newCounter = { count: 0, resetAt };
    
    // Store counter
    this.counters.set(operation, newCounter);
    
    // Schedule reset
    setTimeout(() => {
      // Reset counter
      const currentCounter = this.counters.get(operation);
      if (currentCounter && currentCounter.resetAt === resetAt) {
        this.counters.delete(operation);
      }
    }, this.config.window);
    
    return newCounter;
  }
  
  /**
   * Wait for the next window
   * 
   * @param counter - Counter
   */
  private async waitForNextWindow(counter: { resetAt: number }): Promise<void> {
    const delay = Math.max(0, counter.resetAt - Date.now());
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * Queue an operation
   * 
   * @param operation - Operation name
   */
  private async queueOperation(operation: string): Promise<void> {
    // Get or create queue
    if (!this.queues.has(operation)) {
      this.queues.set(operation, []);
    }
    
    const queue = this.queues.get(operation)!;
    
    // Check if queue is full
    if (queue.length >= this.config.maxQueueSize) {
      throw new CacheError(
        `Queue full for operation: ${operation}`,
        CacheErrorCode.RATE_LIMIT_EXCEEDED
      );
    }
    
    // Add to queue
    return new Promise<void>((resolve, reject) => {
      // Create timeout
      const timeout = setTimeout(() => {
        // Remove from queue
        const index = queue.findIndex(item => item.timeout === timeout);
        if (index !== -1) {
          queue.splice(index, 1);
        }
        
        // Reject with timeout error
        reject(new CacheError(
          `Queue timeout for operation: ${operation}`,
          CacheErrorCode.TIMEOUT
        ));
      }, this.config.maxWaitTime);
      
      // Add to queue
      queue.push({ resolve, reject, timeout });
      
      // Process queue
      this.processQueue(operation);
    });
  }
  
  /**
   * Process the operation queue
   * 
   * @param operation - Operation name
   */
  private async processQueue(operation: string): Promise<void> {
    // Get queue
    const queue = this.queues.get(operation);
    if (!queue || queue.length === 0) {
      return;
    }
    
    // Check if we can process an item
    const counter = this.getCounter(operation);
    if (counter.count < this.config.limit) {
      // Get next item
      const item = queue.shift();
      if (item) {
        // Clear timeout
        clearTimeout(item.timeout);
        
        // Increment counter
        counter.count++;
        
        // Resolve promise
        item.resolve();
      }
    }
    
    // Schedule next check
    setTimeout(() => this.processQueue(operation), 100);
  }
  
  /**
   * Check if an operation is rate limited
   * 
   * @param operation - Operation name
   * @returns Whether the operation is rate limited
   */
  isLimited(operation: string): boolean {
    const counter = this.counters.get(operation);
    return counter !== undefined && counter.count >= this.config.limit;
  }
  
  /**
   * Get current rate limit status
   * 
   * @param operation - Operation name
   * @returns Rate limit status
   */
  getStatus(operation: string): { limit: number; remaining: number; resetAt: number } {
    const counter = this.counters.get(operation);
    
    if (!counter) {
      return {
        limit: this.config.limit,
        remaining: this.config.limit,
        resetAt: Date.now() + this.config.window
      };
    }
    
    return {
      limit: this.config.limit,
      remaining: Math.max(0, this.config.limit - counter.count),
      resetAt: counter.resetAt
    };
  }
  
  /**
   * Reset rate limit for an operation
   * 
   * @param operation - Operation name
   */
  reset(operation: string): void {
    this.counters.delete(operation);
  }
  
  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.counters.clear();
  }
}