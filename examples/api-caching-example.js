// Example of using the cache for API request caching
const { createCache } = require('../dist/index');
const fetch = require('node-fetch'); // You would need to install this package

// Create a cache with custom settings
const cache = createCache({
  ttl: 600, // Cache items for 10 minutes by default
  maxSize: 50 * 1024 * 1024, // 50MB max cache size
  backgroundRefresh: true,
  refreshThreshold: 0.8 // Refresh when 80% of TTL has elapsed
});

/**
 * Fetch weather data for a city with caching
 * @param {string} city - City name
 * @returns {Promise<Object>} - Weather data
 */
async function getWeatherData(city) {
  return cache.getOrCompute(
    `weather:${city.toLowerCase()}`,
    async () => {
      console.log(`🌐 Fetching weather data for ${city} from API...`);
      
      // This would be a real API call in production
      // const response = await fetch(`https://api.weather.com/current?city=${encodeURIComponent(city)}`);
      // return response.json();
      
      // For this example, we'll simulate an API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        city,
        temperature: Math.round(10 + Math.random() * 25),
        conditions: ['Sunny', 'Cloudy', 'Rainy', 'Windy'][Math.floor(Math.random() * 4)],
        humidity: Math.round(30 + Math.random() * 60),
        updatedAt: new Date().toISOString()
      };
    },
    { 
      ttl: 300, // Cache for 5 minutes
      tags: ['weather', `city:${city.toLowerCase()}`] // Tag for easy invalidation
    }
  );
}

/**
 * Fetch user data with caching
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User data
 */
async function getUserData(userId) {
  return cache.getOrCompute(
    `user:${userId}`,
    async () => {
      console.log(`🌐 Fetching user data for ID ${userId} from API...`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        id: userId,
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
        preferences: {
          theme: 'light',
          notifications: true
        },
        lastLogin: new Date().toISOString()
      };
    },
    { 
      ttl: 600, // Cache for 10 minutes
      tags: ['user', `user:${userId}`]
    }
  );
}

/**
 * Get user's favorite cities with caching
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} - List of favorite cities
 */
async function getUserFavoriteCities(userId) {
  return cache.getOrCompute(
    `user:${userId}:favorites`,
    async () => {
      console.log(`🌐 Fetching favorite cities for user ${userId} from API...`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Return some random cities
      const cities = ['New York', 'London', 'Tokyo', 'Paris', 'Sydney', 'Berlin', 'Rome'];
      const numCities = 2 + Math.floor(Math.random() * 3); // 2-4 cities
      const favorites = [];
      
      for (let i = 0; i < numCities; i++) {
        const randomIndex = Math.floor(Math.random() * cities.length);
        favorites.push(cities[randomIndex]);
        cities.splice(randomIndex, 1); // Remove selected city
      }
      
      return favorites;
    },
    { 
      ttl: 1800, // Cache for 30 minutes
      tags: ['user', `user:${userId}`, 'favorites']
    }
  );
}

/**
 * Get dashboard data for a user (combines multiple data sources)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Dashboard data
 */
async function getDashboardData(userId) {
  console.log(`\n📊 Generating dashboard for user ${userId}...`);
  
  // Get user data and favorite cities in parallel
  const [userData, favoriteCities] = await Promise.all([
    getUserData(userId),
    getUserFavoriteCities(userId)
  ]);
  
  // Get weather data for each favorite city
  const weatherPromises = favoriteCities.map(city => getWeatherData(city));
  const weatherData = await Promise.all(weatherPromises);
  
  // Build the dashboard data
  return {
    user: userData,
    favorites: favoriteCities.map((city, index) => ({
      city,
      weather: weatherData[index]
    })),
    generatedAt: new Date().toISOString()
  };
}

// Function to invalidate user data when it changes
async function updateUserPreferences(userId, newPreferences) {
  console.log(`\n✏️ Updating preferences for user ${userId}...`);
  
  // This would update the database in a real application
  
  // Invalidate the cached user data
  await cache.invalidateByTag(`user:${userId}`);
  console.log(`✅ Invalidated cache for user ${userId}`);
}

// Main function to demonstrate the caching behavior
async function main() {
  console.log('🚀 API Caching Example');
  console.log('=====================');
  
  // First dashboard generation - should fetch all data from APIs
  console.log('\n🔄 First dashboard generation:');
  const start1 = Date.now();
  const dashboard1 = await getDashboardData('123');
  console.log(`✅ Dashboard generated in ${Date.now() - start1}ms`);
  console.log(`📋 User: ${dashboard1.user.name}`);
  console.log(`🌆 Favorite cities: ${dashboard1.favorites.map(f => f.city).join(', ')}`);
  dashboard1.favorites.forEach(f => {
    console.log(`   ${f.city}: ${f.weather.temperature}°C, ${f.weather.conditions}`);
  });
  
  // Second dashboard generation - should use cached data
  console.log('\n🔄 Second dashboard generation (should be faster):');
  const start2 = Date.now();
  const dashboard2 = await getDashboardData('123');
  console.log(`✅ Dashboard generated in ${Date.now() - start2}ms`);
  console.log(`📋 User: ${dashboard2.user.name}`);
  console.log(`🌆 Favorite cities: ${dashboard2.favorites.map(f => f.city).join(', ')}`);
  
  // Update user preferences and invalidate cache
  await updateUserPreferences('123', { theme: 'dark', notifications: false });
  
  // Third dashboard generation - should fetch user data again but use cached weather
  console.log('\n🔄 Third dashboard generation (after user data update):');
  const start3 = Date.now();
  const dashboard3 = await getDashboardData('123');
  console.log(`✅ Dashboard generated in ${Date.now() - start3}ms`);
  console.log(`📋 User: ${dashboard3.user.name}`);
  console.log(`🌆 Favorite cities: ${dashboard3.favorites.map(f => f.city).join(', ')}`);
  
  // Get cache statistics
  const stats = await cache.getStats();
  console.log('\n📊 Cache Statistics:');
  console.log(`   Hits: ${stats.memory.hits}`);
  console.log(`   Misses: ${stats.memory.misses}`);
  console.log(`   Items: ${stats.memory.keyCount}`);
  console.log(`   Memory usage: ${Math.round(stats.memory.memoryUsage / 1024)} KB`);
}

// Run the example
main()
  .catch(err => console.error('Error:', err))
  .finally(() => console.log('\n✅ Example completed'));