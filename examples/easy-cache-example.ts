// Basic usage example for EasyCache
import {createCache} from '../src';

async function main() {
  // Create a cache with default settings
  const cache = createCache();
  
  console.log('🚀 EasyCache Example');
  console.log('--------------------');

  // Basic set and get
  console.log('\n📝 Basic operations:');
  await cache.set('greeting', 'Hello, world!');
  const greeting = await cache.get('greeting');
  console.log(`Retrieved value: ${greeting}`);

  // Using getOrCompute with a function that simulates an expensive operation
  console.log('\n🔄 Using getOrCompute:');
  const start = Date.now();
  const result = await cache.getOrCompute('expensive-calculation', async () => {
    // Simulate an expensive calculation
    console.log('  Performing expensive calculation...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { value: 42, timestamp: new Date().toISOString() };
  });
  console.log(`  First call took ${Date.now() - start}ms`);
  console.log(`  Result: ${JSON.stringify(result)}`);

  // Second call should be much faster (from cache)
  console.log('\n🔄 Second call to getOrCompute (should be from cache):');
  const start2 = Date.now();
  const cachedResult = await cache.getOrCompute('expensive-calculation', async () => {
    // This should not run if cache is working
    console.log('  Performing expensive calculation again...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { value: 42, timestamp: new Date().toISOString() };
  });
  console.log(`  Second call took ${Date.now() - start2}ms`);
  console.log(`  Result: ${JSON.stringify(cachedResult)}`);
  
  // Using tags for invalidation
  console.log('\n🏷️ Using tags for invalidation:');
  await cache.set('user:1', { name: 'Alice', role: 'admin' }, { tags: ['user', 'admin'] });
  await cache.set('user:2', { name: 'Bob', role: 'user' }, { tags: ['user'] });
  
  console.log('  Before invalidation:');
  console.log(`  User 1: ${JSON.stringify(await cache.get('user:1'))}`);
  console.log(`  User 2: ${JSON.stringify(await cache.get('user:2'))}`);
  
  // Invalidate all entries with the 'admin' tag
  await cache.invalidateByTag('admin');
  
  console.log('  After invalidating "admin" tag:');
  console.log(`  User 1: ${JSON.stringify(await cache.get('user:1'))}`);
  console.log(`  User 2: ${JSON.stringify(await cache.get('user:2'))}`);
  
  // Function wrapping example
  console.log('\n🔄 Function wrapping:');
  
  // Define a function that we want to cache
  async function fetchUserData(userId: string) {
    console.log(`  Fetching data for user ${userId}...`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { id: userId, name: `User ${userId}`, lastUpdated: new Date().toISOString() };
  }
  
  // Wrap the function with caching
  const cachedFetchUserData = cache.wrap(
    fetchUserData,
    (userId) => `user-data:${userId}`,
    { ttl: 60 } // Cache for 60 seconds
  );
  
  // First call - should execute the function
  console.log('  First call:');
  const userData1 = await cachedFetchUserData('123');
  console.log(`  Result: ${JSON.stringify(userData1)}`);
  
  // Second call with same ID - should use cache
  console.log('  Second call (same ID):');
  const userData2 = await cachedFetchUserData('123');
  console.log(`  Result: ${JSON.stringify(userData2)}`);
  
  // Different ID - should execute the function again
  console.log('  Call with different ID:');
  const userData3 = await cachedFetchUserData('456');
  console.log(`  Result: ${JSON.stringify(userData3)}`);
  
  // Get cache statistics
  console.log('\n📊 Cache statistics:');
  const stats = await cache.getStats();
  console.log(JSON.stringify(stats, null, 2));
}

main().catch(console.error);