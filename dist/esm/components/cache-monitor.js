import React, { useEffect, useState } from 'react';
import { subscribeToCacheEvents } from '../events/cache-events';
// Remove incorrect import
// import { getStats as getCacheStats } from '../core/cache-manager';
// Create a simple implementation
const getCacheStats = async () => {
    try {
        // You can replace this with an actual implementation that fetches from your cache manager
        return {
            memory: {
                hits: 0,
                misses: 0,
                keyCount: 0,
                size: 0,
                memoryUsage: 0
            }
        };
    }
    catch (error) {
        console.error('Error fetching cache stats:', error);
        return {};
    }
};
/**
 * Component for monitoring cache statistics and operations
 */
export function CacheMonitor({ refreshInterval = 5000, showDetails = false }) {
    const [stats, setStats] = useState({});
    const [events, setEvents] = useState([]);
    // Fetch cache stats periodically
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const statsData = await getCacheStats();
                setStats(statsData);
            }
            catch (error) {
                console.error('Error fetching stats:', error);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval]);
    // Subscribe to cache events
    useEffect(() => {
        return subscribeToCacheEvents('all', (event) => {
            setEvents(prev => [...prev.slice(-99), event]);
        });
    }, []);
    return (React.createElement("div", { className: "cache-monitor" },
        React.createElement("h3", null, "Cache Statistics"),
        React.createElement("div", { className: "stats-grid" }, Object.entries(stats).map(([provider, providerStats]) => (React.createElement("div", { key: provider, className: "provider-stats" },
            React.createElement("h4", null, provider),
            React.createElement("div", null,
                "Hits: ",
                providerStats.hits),
            React.createElement("div", null,
                "Misses: ",
                providerStats.misses),
            React.createElement("div", null,
                "Keys: ",
                providerStats.keyCount),
            React.createElement("div", null,
                "Size: ",
                formatBytes(providerStats.size)))))),
        showDetails && (React.createElement("div", { className: "events-log" },
            React.createElement("h3", null, "Recent Events"),
            React.createElement("div", { className: "events-list" }, events.map((event, index) => (React.createElement("div", { key: index, className: "event-item" },
                React.createElement("span", { className: "event-time" }, new Date(event.timestamp).toLocaleTimeString()),
                React.createElement("span", { className: "event-type" }, event.type),
                React.createElement("span", { className: "event-key" }, event.key)))))))));
}
// Helper function to format bytes
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
// Default styles
const styles = `
.cache-monitor {
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.provider-stats {
  padding: 1rem;
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.events-log {
  margin-top: 1rem;
}

.events-list {
  max-height: 300px;
  overflow-y: auto;
  background: white;
  border-radius: 4px;
  padding: 0.5rem;
}

.event-item {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 0.5rem;
  padding: 0.25rem;
  border-bottom: 1px solid #eee;
}

.event-time {
  color: #666;
  font-size: 0.9em;
}

.event-type {
  font-weight: 500;
}

.event-key {
  color: #0066cc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;
// Inject styles
if (typeof document !== 'undefined') {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
}
//# sourceMappingURL=cache-monitor.js.map