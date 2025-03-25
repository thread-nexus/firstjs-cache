import React, {useEffect, useState} from 'react';
import {eventManager} from '../events/event-manager';

// Remove incorrect import
// import { getStats as getCacheStats } from '../core/cache-manager';

// Create a simple implementation
const getCacheStats = async (): Promise<Record<string, any>> => {
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
    } catch (error) {
        console.error('Error fetching cache stats:', error);
        return {};
    }
};

interface CacheMonitorProps {
    refreshInterval?: number;
    showDetails?: boolean;
}

/**
 * Component for monitoring cache statistics and operations
 */
export function CacheMonitor({
                                 refreshInterval = 5000,
                                 showDetails = false
                             }: CacheMonitorProps) {
    const [stats, setStats] = useState<Record<string, any>>({});
    const [events, setEvents] = useState<any[]>([]);

    // Fetch cache stats periodically
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const statsData = await getCacheStats();
                setStats(statsData);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };

        fetchStats().then(r => {});
        const interval = setInterval(fetchStats, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval]);

    // Subscribe to cache events
    useEffect(() => {
        // Subscribe to all cache events
        const unsubscribe = eventManager.subscribe('*', (event) => {
            // Event handling logic
            setEvents(prev => [...prev.slice(-99), event]);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="cache-monitor">
            <h3>Cache Statistics</h3>
            <div className="stats-grid">
                {Object.entries(stats).map(([provider, providerStats]) => (
                    <div key={provider} className="provider-stats">
                        <h4>{provider}</h4>
                        <div>Hits: {providerStats.hits}</div>
                        <div>Misses: {providerStats.misses}</div>
                        <div>Keys: {providerStats.keyCount}</div>
                        <div>Size: {formatBytes(providerStats.size)}</div>
                    </div>
                ))}
            </div>

            {showDetails && (
                <div className="events-log">
                    <h3>Recent Events</h3>
                    <div className="events-list">
                        {events.map((event, index) => (
                            <div key={index} className="event-item">
                <span className="event-time">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                                <span className="event-type">{event.type}</span>
                                <span className="event-key">{event.key}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
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