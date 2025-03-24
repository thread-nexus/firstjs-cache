/**
 * @fileoverview Debug panel component for cache inspection and management
 * during development.
 */
import React from 'react';
interface CacheDebugPanelProps {
    /** Initial position of the panel */
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    /** Whether the panel is initially open */
    defaultOpen?: boolean;
    /** Custom styling */
    className?: string;
}
export declare function CacheDebugPanel({ position, defaultOpen, className }: CacheDebugPanelProps): React.JSX.Element;
export {};
