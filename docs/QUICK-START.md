# Quick Start Guide

This guide will help you get started with the cache package quickly and easily.

## Installation

```bash
npm install @missionfabric/firstjs-cache
```

## Basic Usage

The simplest way to use the cache is with the `createCache` function:

```javascript
import { createCache } from '@missionfabric/firstjs-cache';

// Create a cache with default settings
const cache = createCache();

// Store a value in cache
await cache.set('greeting', 'Hello, world!');

// Retrieve a value from cache
const greeting = await cache.get('greeting');
console.log(greeting); // "Hello, world!"

// Delete a value from cache
await cache.delete('greeting');

// Clear the entire cache
await cache.clear();
```

## Caching Expensive Operations

One of the most common use cases is to cache the results of expensive operations:

```javascript
import { createCache } from '@missionfabric/firstjs-cache';

const cache = createCache();

// Function that performs an expensive operation
async function fetchUserData(userId) {
  console.log(`Fetching data for user ${userId}...`);
  // Simulate an API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { id: userId, name: `User ${userId}`, lastUpdated: new Date() };
}

// Option 1: Use getOrCompute
async function getUserData(userId) {
  return cache.getOrCompute(
    `user:${userId}`, 
    () => fetchUserData(userId),
    { ttl: 300 } // Cache for 5 minutes
  );
}

// Option 2: Wrap the function with caching
const getCachedUserData = cache.wrap(
  fetchUserData,
  (userId) => `user:${userId}`, // Function to generate cache keys
  { ttl: 300 } // Cache for 5 minutes
);

// Both approaches achieve the same result
const user1 = await getUserData('123'); // Will call fetchUserData
const user2 = await getUserData('123'); // Will use cached value

const user3 = await getCachedUserData('456'); // Will call fetchUserData
const user4 = await getCachedUserData('456'); // Will use cached value
```

## Using Tags for Invalidation

Tags allow you to group related cache entries and invalidate them together:

```javascript
import { createCache } from '@missionfabric/firstjs-cache';

const cache = createCache();

// Store values with tags
await cache.set('user:1', { name: 'Alice' }, { tags: ['user', 'admin'] });
await cache.set('user:2', { name: 'Bob' }, { tags: ['user'] });
await cache.set('post:1', { title: 'Hello' }, { tags: ['post'] });

// Invalidate all entries with the 'user' tag
await cache.invalidateByTag('user');

// Now user:1 and user:2 are removed from cache, but post:1 remains
```

## React Integration

The package includes React hooks for easy integration:

```jsx
import React from 'react';
import { createCache, useCache } from '@missionfabric/firstjs-cache';

// Create a global cache instance
const cache = createCache();

function UserProfile({ userId }) {
  const { data, isLoading, error, refetch } = useCache(
    `user:${userId}`,
    async () => {
      // Fetch user data from API
      const response = await fetch(`/api/users/${userId}`);
      return response.json();
    },
    { ttl: 300 } // Cache for 5 minutes
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>Email: {data.email}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

## Configuration Options

You can customize the cache behavior with various options:

```javascript
import { createCache } from '@missionfabric/firstjs-cache';

const cache = createCache({
  // Maximum cache size in bytes (default: 100MB)
  maxSize: 50 * 1024 * 1024, // 50MB
  
  // Default time-to-live in seconds (default: 3600)
  ttl: 1800, // 30 minutes
  
  // Whether to refresh values in background when stale (default: true)
  backgroundRefresh: true,
  
  // Threshold (0-1) of TTL after which to refresh (default: 0.75)
  refreshThreshold: 0.8,
  
  // Whether to deduplicate in-flight requests (default: true)
  deduplicateRequests: true,
  
  // Whether to throw errors (default: false)
  throwOnErrors: false
});
```

## Advanced Usage

For advanced use cases, you can access the underlying cache manager:

```javascript
import { createCache } from '@missionfabric/firstjs-cache';

const cache = createCache();

// Access the underlying cache manager for advanced operations
const cacheManager = cache.getCacheManager();

// Now you can use all the advanced features
const stats = await cacheManager.getStats();
console.log(stats);
```

## Next Steps

For more detailed information, check out:

- [API Reference](./API.md)
- [Examples](../examples/)
- [Full Documentation](../README.md)