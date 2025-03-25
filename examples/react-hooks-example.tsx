import React, {useState} from 'react';
import {createCache} from '../src';
import {useCache, useCachedQuery} from '../src/hooks';

// Create a global cache instance
const cache = createCache({
  maxSize: 50 * 1024 * 1024, // 50MB
  ttl: 1800, // 30 minutes
  backgroundRefresh: true
});

// Example component using the useCache hook
function UserProfile({ userId }: { userId: string }) {
  // This hook will automatically fetch and cache user data
  const { data, isLoading, error, refetch } = useCache(
    `user:${userId}`,
    async () => {
      console.log(`Fetching user ${userId} data...`);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        id: userId,
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
        lastLogin: new Date().toISOString()
      };
    },
    { ttl: 300 } // Cache for 5 minutes
  );

  if (isLoading) return <div>Loading user data...</div>;
  if (error) return <div>Error loading user: {error.message}</div>;

  return (
    <div className="user-profile">
      <h2>{data.name}</h2>
      <p>Email: {data.email}</p>
      <p>Last login: {new Date(data.lastLogin).toLocaleString()}</p>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}

// Example component using multiple cached queries
function Dashboard() {
  const [selectedUserId, setSelectedUserId] = useState('1');

  // Get user list (cached)
  const userList = useCachedQuery(
    'users:list',
    async () => {
      console.log('Fetching user list...');
      await new Promise(resolve => setTimeout(resolve, 800));
      return [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Charlie' }
      ];
    },
    { ttl: 600 } // Cache for 10 minutes
  );

  // Get statistics (cached)
  const statistics = useCachedQuery(
    'dashboard:stats',
    async () => {
      console.log('Fetching statistics...');
      await new Promise(resolve => setTimeout(resolve, 1200));
      return {
        totalUsers: 3,
        activeUsers: 2,
        averageSessionTime: '24 minutes'
      };
    },
    { ttl: 300 } // Cache for 5 minutes
  );

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      {/* Statistics Panel */}
      <div className="stats-panel">
        <h2>Statistics</h2>
        {statistics.isLoading ? (
          <p>Loading statistics...</p>
        ) : statistics.error ? (
          <p>Error: {statistics.error.message}</p>
        ) : (
          <ul>
            <li>Total Users: {statistics.data.totalUsers}</li>
            <li>Active Users: {statistics.data.activeUsers}</li>
            <li>Avg. Session: {statistics.data.averageSessionTime}</li>
          </ul>
        )}
        <button onClick={() => statistics.refetch()}>Refresh Stats</button>
      </div>
      
      {/* User List */}
      <div className="user-list">
        <h2>Users</h2>
        {userList.isLoading ? (
          <p>Loading users...</p>
        ) : userList.error ? (
          <p>Error: {userList.error.message}</p>
        ) : (
          <ul>
            {userList.data.map(user => (
              <li key={user.id}>
                <button 
                  onClick={() => handleUserSelect(user.id)}
                  className={user.id === selectedUserId ? 'selected' : ''}
                >
                  {user.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button onClick={() => userList.refetch()}>Refresh Users</button>
      </div>
      
      {/* Selected User Profile */}
      <div className="selected-user">
        <h2>Selected User</h2>
        <UserProfile userId={selectedUserId} />
      </div>
    </div>
  );
}

export default Dashboard;