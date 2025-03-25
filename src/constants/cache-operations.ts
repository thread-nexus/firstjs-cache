/**
 * Cache operation method names
 */
export const CACHE_OPERATION = {
  GET: 'get',
  SET: 'set',
  DELETE: 'delete',
  CLEAR: 'clear',
  HAS: 'has',
  GET_MANY: 'getMany',
  SET_MANY: 'setMany',
  DELETE_MANY: 'deleteMany',
  GET_STATS: 'getStats',
  HEALTH_CHECK: 'healthCheck',
  GET_TTL: 'getTtl',
  SET_TTL: 'setTtl',
} as const;

/**
 * Types of cache operations
 */
export type CacheOperation = typeof CACHE_OPERATION[keyof typeof CACHE_OPERATION];
