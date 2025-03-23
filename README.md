# @fourjs/cache

A high-performance, feature-rich caching module with support for multiple providers, background refresh, and comprehensive monitoring.

## Features

🚀 **High Performance**
- Optimized hot-key caching
- Automatic compression
- Request deduplication
- Batch operations

🔄 **Multiple Cache Providers**
- In-memory caching
- Redis integration
- Browser localStorage
- Custom provider support

📊 **Advanced Features**
- Background refresh
- Tag-based invalidation
- TTL management
- Event system
- Real-time monitoring

⚛️ **React Integration**
- React hooks and components
- Automatic cache invalidation
- Development tools
- Performance monitoring

## Installation

```bash
npm install @fourjs/cache

# Optional dependencies
npm install redis # For Redis support
```

## Quick Start

### Basic Usage

```typescript
import { createCache } from '@fourjs/cache';

// Create cache instance
const cache = createCache({
  defaultTtl: 3600,
  backgroundRefresh: true
});

// Basic operations
await cache.set('user:123', { name: 'John' });
const user = await cache.get('user:123');

// Compute with caching
const result = await cache.getOrCompute(
  'expensive:calculation',
  async () => await performExpensiveCalculation()
);
```

### React Integration

```tsx
import { CacheProvider, useCache } from '@fourjs/cache';

function UserProfile({ userId }) {
  const { data, isLoading, error } = useCache(
    `user:${userId}`,
    async () => await fetchUserProfile(userId),
    { ttl: 3600 }
  );

  if (isLoading) return <Loading />;
  if (error) return <Error error={error} />;
  
  return <Profile data={data} />;
}

// Wrap your app with provider
function App() {
  return (
    <CacheProvider>
      <UserProfile userId="123" />
    </CacheProvider>
  );
}
```

### Multiple Providers

```typescript
import { createCache, MemoryAdapter, RedisAdapter } from '@fourjs/cache';

const cache = createCache({
  providers: [
    {
      name: 'memory',
      instance: new MemoryAdapter({ maxSize: '100mb' }),
      priority: 1
    },
    {
      name: 'redis',
      instance: new RedisAdapter({
        host: 'localhost',
        port: 6379
      }),
      priority: 2
    }
  ]
});
```

### Background Refresh

```typescript
const cache = createCache({
  backgroundRefresh: true,
  refreshThreshold: 0.75 // Refresh when 75% of TTL elapsed
});

// Value will be refreshed in background when stale
const value = await cache.getOrCompute(
  'key',
  async () => await fetchData(),
  { ttl: 3600 }
);
```

### Tag-Based Invalidation

```typescript
// Set values with tags
await cache.set('user:123', userData, {
  tags: ['user', 'profile']
});

await cache.set('user:123:posts', posts, {
  tags: ['user', 'posts']
});

// Invalidate by tag
await cache.invalidateByTag('posts');
```

### Batch Operations

```typescript
// Get multiple values
const results = await cache.getMany([
  'user:123',
  'user:123:posts',
  'user:123:settings'
]);

// Set multiple values
await cache.setMany({
  'user:123': userData,
  'user:123:posts': posts
}, { ttl: 3600 });
```

### Monitoring

```typescript
import { CacheMonitor } from '@fourjs/cache';

function Dashboard() {
  return (
    <CacheMonitor 
      refreshInterval={5000}
      showDetails={true}
    />
  );
}
```

### Event System

```typescript
import { subscribeToCacheEvents, CacheEventType } from '@fourjs/cache';

// Subscribe to events
const unsubscribe = subscribeToCacheEvents(
  CacheEventType.GET_HIT,
  (payload) => {
    console.log('Cache hit:', payload);
  }
);

// Cleanup
unsubscribe();
```

### Custom Provider

```typescript
import { ICacheProvider } from '@fourjs/cache';

class CustomProvider implements ICacheProvider {
  async get(key: string): Promise<any> {
    // Implementation
  }

  async set(key: string, value: any, options?: CacheOptions): Promise<void> {
    // Implementation
  }

  // ... other methods
}
```

## Advanced Features

### Compression

```typescript
await cache.set('large:data', data, {
  compression: true,
  compressionThreshold: 1024 // Compress if > 1KB
});
```

### Custom Serialization

```typescript
const serializer = createSerializer({
  typeHandlers: {
    BigInt: {
      serialize: (v) => v.toString(),
      deserialize: (v) => BigInt(v)
    }
  }
});

await cache.set('key', value, { serializer });
```

### Development Tools

```tsx
import { CacheDebugPanel } from '@fourjs/cache';

function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV === 'development' && (
        <CacheDebugPanel position="bottom-right" />
      )}
    </>
  );
}
```

## API Reference

See [API Documentation](./docs/API.md) for complete reference.

## Configuration

```typescript
interface CacheConfig {
  defaultTtl?: number;
  defaultOptions?: CacheOptions;
  deduplicateRequests?: boolean;
  backgroundRefresh?: boolean;
  refreshThreshold?: number;
  throwOnErrors?: boolean;
  logging?: boolean;
  logStackTraces?: boolean;
  logger?: (logEntry: any) => void;
}
```

## Performance

- Hot keys are cached in memory for fastest access
- Automatic compression for large values
- Request deduplication prevents redundant computations
- Batch operations for efficient bulk processing
- Background refresh prevents cache stampedes

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.