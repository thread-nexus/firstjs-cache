/**
 * @fileoverview React components for cache monitoring and visualization
 * with real-time updates and performance metrics.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {CacheEventType, subscribeToCacheEvents} from '../events/cache-events';
import {formatCacheSize} from '../implementations/cache-manager-utils';

interface CacheMonitorProps {
    /** Refresh interval in milliseconds */
    refreshInterval?: number;
    /** Whether to show detailed stats */
    showDetails?: boolean;
    /** Whether to show real-time events */
    showEvents?: boolean;
    /** Maximum number of events to show */
    maxEvents?: number;
    /** Custom styling */
    className?: string;
    /** Custom event filter */
    eventFilter?: (event: { type: CacheEventType }) => boolean;
}

interface CacheEvent {
    type: string; // Changed from CacheEventType to string
    timestamp: number;
    key?: string;
    duration?: number;
    size?: number;
    error?: Error;
}

export function CacheMonitor({
                                 refreshInterval = 5000,
                                 showDetails = false,
                                 showEvents = true,
                                 maxEvents = 50,
                                 className,
                                 eventFilter
                             }: CacheMonitorProps) {
    const [stats, setStats] = useState<Record<string, any>>({});
    const [events, setEvents] = useState<CacheEvent[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<string>();

    // Subscribe to cache events with correct parameter
    useEffect(() => {
        if (!showEvents) return;

        const unsubscribe = subscribeToCacheEvents('all', (event) => {
            if (eventFilter && !eventFilter({type: event.type as CacheEventType})) return;

            setEvents(prev => [
                {
                    type: event.type,
                    timestamp: event.timestamp || Date.now(),
                    key: event.key,
                    duration: event.duration,
                    size: event.size,
                    error: event.error
                } as CacheEvent,
                ...prev.slice(0, maxEvents - 1)
            ]);
        });

        return () => unsubscribe();
    }, [showEvents, maxEvents, eventFilter]);

    // Calculate aggregated stats
    const aggregatedStats = useMemo(() => {
        if (!stats || Object.keys(stats).length === 0) return null;

        return Object.values(stats).reduce((acc, curr) => ({
            hits: (acc.hits || 0) + curr.hits,
            misses: (acc.misses || 0) + curr.misses,
            size: (acc.size || 0) + curr.size,
            keyCount: (acc.keyCount || 0) + curr.keyCount
        }), {} as Record<string, number>);
    }, [stats]);

    // Calculate hit rate
    const hitRate = useMemo(() => {
        if (!aggregatedStats) return 0;
        const total = aggregatedStats.hits + aggregatedStats.misses;
        return total > 0 ? (aggregatedStats.hits / total) * 100 : 0;
    }, [aggregatedStats]);

    return (
        <div className={`cache-monitor ${className || ''}`}>
            {/* Overview Section */}
            <div className="cache-monitor-overview">
                <h3>Cache Overview</h3>
                {aggregatedStats && (
                    <div className="cache-monitor-stats">
                        <div className="stat-item">
                            <label>Hit Rate</label>
                            <div className="stat-value">{hitRate.toFixed(2)}%</div>
                        </div>
                        <div className="stat-item">
                            <label>Total Size</label>
                            <div className="stat-value">{formatCacheSize(aggregatedStats.size)}</div>
                        </div>
                        <div className="stat-item">
                            <label>Keys</label>
                            <span className="stat-value">{aggregatedStats.keyCount.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Provider Details */}
            {showDetails && (
                <div className="cache-monitor-providers">
                    <h4>Cache Providers</h4>
                    <div className="provider-list">
                        {Object.entries(stats).map(([name, providerStats]) => (
                            <div
                                key={name}
                                className={`provider-item ${selectedProvider === name ? 'selected' : ''}`}
                                onClick={() => setSelectedProvider(name)}
                            >
                                <div className="provider-header">
                                    <span className="provider-name">{name}</span>
                                    <span className="provider-hit-rate">
                    {((providerStats.hits / (providerStats.hits + providerStats.misses)) * 100).toFixed(2)}%
                  </span>
                                </div>
                                {selectedProvider === name && (
                                    <div className="provider-details">
                                        <div className="stat-row">
                                            <label>Hits</label>
                                            <span className="stat-value">{providerStats.hits.toLocaleString()}</span>
                                        </div>
                                        <div className="stat-row">
                                            <label>Misses</label>
                                            <span className="stat-value">{providerStats.misses.toLocaleString()}</span>
                                        </div>
                                        <div className="stat-row">
                                            <label>Size</label>
                                            <span className="stat-value">{formatCacheSize(providerStats.size)}</span>
                                        </div>
                                        <div className="stat-row">
                                            <label>Keys</label>
                                            <span
                                                className="stat-value">{providerStats.keyCount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Event Log */}
            {showEvents && events.length > 0 && (
                <div className="cache-monitor-events">
                    <h4>Recent Events</h4>
                    <div className="event-list">
                        {events.map((event, index) => (
                            <div key={index} className={`event-item ${event.error ? 'error' : ''}`}>
                <span className="event-time">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                                <span className="event-type">{event.type}</span>
                                {event.key && (
                                    <span className="event-key" title={event.key}>
                    {event.key.length > 30 ? `${event.key.slice(0, 27)}...` : event.key}
                  </span>
                                )}
                                {event.duration && (
                                    <span className="event-duration">{event.duration.toFixed(2)}ms</span>
                                )}
                                {event.size && (
                                    <span className="event-size">{formatCacheSize(event.size)}</span>
                                )}
                                {event.error && (
                                    <span className="event-error" title={event.error.message}>
                    {event.error.message}
                  </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
        .cache-monitor {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }

        .cache-monitor h3,
        .cache-monitor h4 {
          margin: 0 0 16px;
          color: #2d3748;
        }

        .cache-monitor-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-item {
          background: white;
          padding: 12px;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .stat-item label {
          display: block;
          color: #718096;
          font-size: 0.875rem;
          margin-bottom: 4px;
        }

        .stat-value {
          display: block;
          color: #2d3748;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .provider-list {
          display: grid;
          gap: 12px;
        }

        .provider-item {
          background: white;
          border-radius: 6px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .provider-item:hover {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .provider-item.selected {
          border-left: 3px solid #4299e1;
        }

        .provider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .provider-name {
          font-weight: 500;
          color: #2d3748;
        }

        .provider-hit-rate {
          color: #48bb78;
          font-size: 0.875rem;
        }

        .provider-details {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 0.875rem;
        }

        .stat-row label {
          color: #718096;
        }

        .stat-value {
          color: #2d3748;
          font-weight: 500;
        }

        .event-list {
          background: white;
          border-radius: 6px;
          padding: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .event-item {
          display: grid;
          grid-template-columns: auto auto 1fr auto auto;
          gap: 12px;
          padding: 8px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 0.875rem;
        }

        .event-item:last-child {
          border-bottom: none;
        }

        .event-item.error {
          background: #fff5f5;
        }

        .event-time {
          color: #718096;
        }

        .event-type {
          color: #4299e1;
          font-weight: 500;
        }

        .event-key {
          color: #2d3748;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .event-duration {
          color: #805ad5;
        }

        .event-size {
          color: #38a169;
        }

        .event-error {
          color: #e53e3e;
          font-weight: 500;
        }
      `}</style>
        </div>
    );
}