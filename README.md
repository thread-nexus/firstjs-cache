# Cache Module

A comprehensive, multi-layer caching system for JavaScript applications with support for various storage backends.

## Features

- **Multi-layer caching**: Combine memory, Redis, file system, and other providers
- **Flexible configuration**: Extensive options for TTL, compression, validation
- **Advanced patterns**: Support for cache-aside, write-through, background refresh
- **Strong observability**: Built-in logging, metrics, and health checks
- **Robust error handling**: Circuit breakers, retry mechanisms, fallbacks
- **Type safety**: Full TypeScript support with generic types

## Installation

```bash
npm install @fourjs/cache-module
```

## Quick Start

```typescript
import { CacheManager } from '@fourjs/cache-module';

// Create a cache manager with memory and Redis providers
const cache = new CacheManager({
  providers: {
    memory: {
      type: 'memory',
      options: {
        maxSize: 100000000, // 100MB
        maxItems: 10000
      }
    },
    redis: {
      type: 'redis',
      options: {
        host: 'localhost',
        port: 6379,
        prefix: 'app:cache'
      }
    }
  }
});

// Basic operations
await cache.set('user:123', { name: 'Alice', role: 'admin' }, { ttl: 3600 });
const user = await cache.get('user:123');

// Cache a function result (automatic key generation)
const getUserData = cache.wrap(
  async (userId) => {
    // Expensive operation to fetch user data
    return await database.fetchUser(userId);
  },
  (userId) => `user:${userId}:data`,
  { ttl: 300 }
);

// Use the wrapped function
const userData = await getUserData('123');

// Invalidate cache entries
await cache.invalidateByTag('user:123');
await cache.invalidateByPrefix('user:');
await cache.deleteByPattern('^user:[0-9]+$');
```

## Architecture

The cache module follows a layered design with clear separation of concerns:

1. **Core Layer**: Manages providers and orchestrates operations
2. **Provider Layer**: Implements specific storage backends (Memory, Redis, etc.)
3. **Utility Layer**: Provides supporting functionality (serialization, monitoring, etc.)

### Storage Providers

- **Memory**: In-process memory cache with LRU eviction
- **Redis**: Distributed cache using Redis
- **File System**: Persistent cache using the file system
- **LocalStorage**: Browser-based persistent storage
- **IndexedDB**: More robust browser storage for larger datasets
- **Custom**: Implement your own provider by extending the `ICacheProvider` interface

## Advanced Usage

### Background Refresh

```typescript
// Set up a cache entry with background refresh
await cache.set('stats:daily', calculateStats(), {
  ttl: 3600,                // 1 hour TTL
  backgroundRefresh: true,  // Enable background refresh
  refreshThreshold: 0.8     // Refresh when 80% of TTL has passed
});

// Get value (will trigger background refresh if stale)
const stats = await cache.get('stats:daily');
```

### Batching Operations

```typescript
// Get multiple values at once
const values = await cache.getMany(['key1', 'key2', 'key3']);

// Set multiple values
await cache.setMany({
  'key1': 'value1',
  'key2': 'value2',
  'key3': 'value3'
}, { ttl: 300 });
```

### Cache Tags

```typescript
// Set cache entries with tags
await cache.set('user:123:profile', profileData, { 
  tags: ['user:123', 'profile']
});
await cache.set('user:123:preferences', prefsData, { 
  tags: ['user:123', 'preferences']
});

// Invalidate all entries with a specific tag
await cache.invalidateByTag('user:123');
```

### Circuit Breaker

```typescript
// The cache manager automatically handles circuit breaking
// You can configure its behavior
const cache = new CacheManager({
  // ... other config
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,      // Number of failures before opening
    resetTimeout: 30000,      // 30 seconds until retry
    halfOpenLimit: 3          // Number of requests allowed in half-open state
  }
});
```

## Monitoring and Observability

The cache module provides built-in monitoring capabilities:

```typescript
// Get cache statistics
const stats = await cache.getStats();
console.log(stats);
// {
//   memory: { hits: 127, misses: 43, ... },
//   redis: { hits: 89, misses: 21, ... }
// }

// Health checks
const health = await cache.healthCheck();
console.log(health);
// {
//   status: 'healthy',
//   providers: {
//     memory: { status: 'healthy' },
//     redis: { status: 'healthy' }
//   }
// }
```

## Best Practices

1. **Set appropriate TTLs** - Match the TTL to the volatility of the data
2. **Use tags for related data** - Makes invalidation easier
3. **Consider background refresh** - Prevents cache stampedes
4. **Monitor cache hit rates** - Low hit rates may indicate issues
5. **Implement proper error handling** - Use fallbacks when cache operations fail

## Contributing

Contributions are welcome! Please see the [Contributing Guide](CONTRIBUTING.md) for more details.

## License

[MIT](LICENSE)