"use strict";
/**
 * @fileoverview Enhanced rate limiting utility
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const error_utils_1 = require("./error-utils");
/**
 * Enhanced rate limiter with fairness and burst handling
 */
class RateLimiter {
    constructor(configs) {
        this.limits = new Map(Object.entries(configs));
        this.usage = new Map();
        this.queue = new Map();
        this.startCleanupInterval();
    }
    /**
     * Check if operation is within rate limits
     */
    async checkLimit(operation, count = 1) {
        const config = this.limits.get(operation);
        if (!config)
            return;
        const maxRequests = config.maxRequests || 100;
        const burstable = config.burstable || false;
        const fairness = config.fairness || false;
        const queueSize = config.queueSize || 1000;
        const now = Date.now();
        const entry = this.getUsageEntry(operation);
        if (this.isLimited(entry, config, count)) {
            if (burstable) {
                await this.handleBurst(operation, count);
            }
            else if (fairness) {
                await this.queueRequest(operation);
            }
            else {
                throw (0, error_utils_1.createCacheError)(error_utils_1.CacheErrorCode.RATE_LIMIT_EXCEEDED, `Rate limit exceeded for operation: ${operation}`, { operation });
            }
        }
        this.updateUsage(operation, count);
    }
    /**
     * Get current usage statistics
     */
    getStats(operation) {
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
    getUsageEntry(operation) {
        let entry = this.usage.get(operation);
        if (!entry) {
            entry = [];
            this.usage.set(operation, entry);
        }
        return entry;
    }
    isLimited(entry, config, count) {
        const now = Date.now();
        // Use a safe operation string even if config.operation is undefined
        const op = config.operation || 'unknown';
        const windowUsage = this.calculateWindowUsage(entry, now, op);
        return windowUsage + count > config.maxRequests;
    }
    async handleBurst(operation, count) {
        const config = this.limits.get(operation);
        if (!config)
            return;
        const burstLimit = config.maxRequests * 2;
        const usage = this.getUsageEntry(operation);
        const windowUsage = this.calculateWindowUsage(usage, Date.now(), operation);
        if (windowUsage + count > burstLimit) {
            throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.RATE_LIMIT_EXCEEDED, `Burst limit exceeded for operation: ${operation}`, { operation });
        }
    }
    async queueRequest(operation) {
        const config = this.limits.get(operation);
        if (!config)
            return;
        let queue = this.queue.get(operation);
        if (!queue) {
            queue = [];
            this.queue.set(operation, queue);
        }
        if (queue.length >= (config.queueSize || 1000)) {
            throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.RATE_LIMIT_EXCEEDED, `Queue full for operation: ${operation}`, { operation });
        }
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = queue.indexOf(resolve);
                if (index !== -1) {
                    queue.splice(index, 1);
                    reject(new error_utils_1.CacheError(error_utils_1.CacheErrorCode.TIMEOUT, `Queue timeout for operation: ${operation}`, { operation }));
                }
            }, 5000);
            queue.push(() => {
                clearTimeout(timeout);
                resolve();
            });
        });
    }
    updateUsage(operation, count) {
        const entry = this.getUsageEntry(operation);
        entry.push({
            timestamp: Date.now(),
            count
        });
    }
    calculateWindowUsage(entry, now, operation) {
        const config = this.limits.get(operation);
        if (!config)
            return 0;
        const windowStart = now - config.window;
        return entry
            .filter(e => e.timestamp >= windowStart)
            .reduce((sum, e) => sum + e.count, 0);
    }
    getResetTime(entry, config) {
        if (entry.length === 0)
            return Date.now();
        const oldestTimestamp = Math.min(...entry.map(e => e.timestamp));
        return oldestTimestamp + config.window;
    }
    startCleanupInterval() {
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
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rate-limiter.js.map