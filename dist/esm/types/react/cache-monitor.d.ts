/**
 * @fileoverview React components for cache monitoring and visualization
 * with real-time updates and performance metrics.
 */
import React from 'react';
import { CacheEventType } from '../events/cache-events';
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
    eventFilter?: (event: {
        type: CacheEventType;
    }) => boolean;
}
export declare function CacheMonitor({ refreshInterval, showDetails, showEvents, maxEvents, className, eventFilter }: CacheMonitorProps): React.JSX.Element;
export {};
