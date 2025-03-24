import React from 'react';
interface CacheMonitorProps {
    refreshInterval?: number;
    showDetails?: boolean;
}
/**
 * Component for monitoring cache statistics and operations
 */
export declare function CacheMonitor({ refreshInterval, showDetails }: CacheMonitorProps): React.JSX.Element;
export {};
