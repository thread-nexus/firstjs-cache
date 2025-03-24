/**
 * Default cache configuration
 */
export declare const DEFAULT_CONFIG: {
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
/**
 * Cache constants
 */
export declare const CACHE_CONSTANTS: {
    MAX_KEY_LENGTH: number;
    MAX_VALUE_SIZE: number;
    MAX_BATCH_SIZE: number;
    MAX_TTL: number;
    DEFAULT_STATS_INTERVAL: number;
};
