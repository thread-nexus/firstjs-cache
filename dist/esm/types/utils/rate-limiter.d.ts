/**
 * @fileoverview Enhanced rate limiting utility
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */
interface RateLimitConfig {
    maxRequests: number;
    burstable?: boolean;
    fairness?: boolean;
    queueSize?: number;
    operation?: string;
    window: number;
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
export declare class RateLimiter {
    private limits;
    private usage;
    private queue;
    constructor(configs: Record<string, RateLimitConfig>);
    /**
     * Check if operation is within rate limits
     */
    checkLimit(operation: string, count?: number): Promise<void>;
    /**
     * Get current usage statistics
     */
    getStats(operation: string): RateLimitStats | null;
    private getUsageEntry;
    private isLimited;
    private handleBurst;
    private queueRequest;
    private updateUsage;
    private calculateWindowUsage;
    private getResetTime;
    private startCleanupInterval;
}
export {};
