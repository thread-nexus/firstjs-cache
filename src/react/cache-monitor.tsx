/**
 * @fileoverview React components for cache monitoring and visualization
 * with real-time updates and performance metrics.
 */

import React, {useEffect, useState} from 'react';
import {CacheEventType} from '../events/cache-events';
import {eventManager} from '../events/event-manager';
import {CacheEventPayload, CacheStats} from '../types';

interface CacheEvent {
    type: string;
    timestamp: number;
    key?: string;
    duration?: number;
    size?: number;
    error?: Error | string;
}

interface CacheMonitorProps {
    maxEvents?: number;
    showStats?: boolean;
    showEvents?: boolean;
    refreshInterval?: number;
    cacheManager?: any;
}

export const CacheMonitor: React.FC<CacheMonitorProps> = ({
    maxEvents = 100,
    showStats = true,
    showEvents = true,
    refreshInterval = 2000,
    cacheManager
}) => {
    const [events, setEvents] = useState<CacheEvent[]>([]);
    const [stats, setStats] = useState<Record<string, CacheStats>>({});
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        // Subscribe to all cache events
        const unsubscribe = eventManager.subscribe('*', (event: CacheEventPayload & { type: string }) => {
            setEvents(prev => {
                const newEvent: CacheEvent = {
                    type: event.type,
                    timestamp: event.timestamp || Date.now(),
                    key: event.key,
                    duration: event.duration,
                    size: event.size,
                    error: event.error
                };

                // Keep only the most recent events
                return [newEvent, ...prev].slice(0, maxEvents);
            });
        });

        // Fetch stats periodically if cache manager is provided
        let statsInterval: NodeJS.Timeout | null = null;
        if (cacheManager && showStats) {
            statsInterval = setInterval(async () => {
                try {
                    const cacheStats = await cacheManager.getStats();
                    setStats(cacheStats);
                } catch (error) {
                    console.error('Error fetching cache stats:', error);
                }
            }, refreshInterval);
        }

        return () => {
            unsubscribe();
            if (statsInterval) clearInterval(statsInterval);
        };
    }, [cacheManager, maxEvents, refreshInterval, showStats]);

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    const formatDuration = (duration?: number) => {
        return duration != null ? `${duration.toFixed(2)}ms` : 'N/A';
    };

    const formatSize = (size?: number) => {
        if (size == null) return 'N/A';
        if (size < 1024) return `${size}B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
        return `${(size / (1024 * 1024)).toFixed(1)}MB`;
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case CacheEventType.HIT: return 'green';
            case CacheEventType.MISS: return 'orange';
            case CacheEventType.ERROR: return 'red';
            case CacheEventType.SET: return 'blue';
            case CacheEventType.DELETE: return 'red';
            case CacheEventType.EXPIRED: return 'orange';
            default: return 'gray';
        }
    };

    return (
        <div style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: isExpanded ? '500px' : '200px',
            overflowY: 'auto',
            backgroundColor: '#f9f9f9',
            transition: 'max-height 0.3s ease'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>Cache Monitor</h3>
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    {isExpanded ? '▲' : '▼'}
                </button>
            </div>

            {showStats && (
                <div style={{ marginBottom: '10px' }}>
                    <h4 style={{ marginTop: 0 }}>Cache Stats</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {Object.entries(stats).map(([provider, providerStats]) => (
                            <div key={provider} style={{ 
                                border: '1px solid #ddd', 
                                borderRadius: '4px', 
                                padding: '5px',
                                backgroundColor: 'white',
                                minWidth: '200px'
                            }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{provider}</div>
                                <div>Hits: {providerStats.hits}</div>
                                <div>Misses: {providerStats.misses}</div>
                                <div>Keys: {providerStats.keyCount}</div>
                                <div>Size: {formatSize(providerStats.size)}</div>
                                <div>Memory: {formatSize(providerStats.memoryUsage)}</div>
                                <div>Last Updated: {formatTime(providerStats.lastUpdated)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showEvents && (
                <div>
                    <h4 style={{ marginTop: 0 }}>Recent Events</h4>
                    <div>
                        {events.length === 0 ? (
                            <div style={{ fontStyle: 'italic', color: '#999' }}>No events recorded yet</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                                        <th>Time</th>
                                        <th>Type</th>
                                        <th>Key</th>
                                        <th>Duration</th>
                                        <th>Size</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((event, idx) => (
                                        <tr 
                                            key={idx} 
                                            style={{ 
                                                borderBottom: '1px solid #eee',
                                                color: getEventColor(event.type)
                                            }}
                                        >
                                            <td>{formatTime(event.timestamp)}</td>
                                            <td>{event.type}</td>
                                            <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {event.key || '-'}
                                            </td>
                                            <td>{formatDuration(event.duration)}</td>
                                            <td>{formatSize(event.size)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CacheMonitor;