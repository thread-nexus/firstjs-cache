"use strict";
/**
 * @fileoverview React components for cache monitoring and visualization
 * with real-time updates and performance metrics.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheMonitor = CacheMonitor;
const react_1 = __importStar(require("react"));
const cache_events_1 = require("../events/cache-events");
const cache_manager_utils_1 = require("../implementations/cache-manager-utils");
function CacheMonitor({ refreshInterval = 5000, showDetails = false, showEvents = true, maxEvents = 50, className, eventFilter }) {
    const [stats, setStats] = (0, react_1.useState)({});
    const [events, setEvents] = (0, react_1.useState)([]);
    const [selectedProvider, setSelectedProvider] = (0, react_1.useState)();
    // Subscribe to cache events with correct parameter
    (0, react_1.useEffect)(() => {
        if (!showEvents)
            return;
        const unsubscribe = (0, cache_events_1.subscribeToCacheEvents)('all', (event) => {
            if (eventFilter && !eventFilter({ type: event.type }))
                return;
            setEvents(prev => [
                {
                    type: event.type,
                    timestamp: event.timestamp || Date.now(),
                    key: event.key,
                    duration: event.duration,
                    size: event.size,
                    error: event.error
                },
                ...prev.slice(0, maxEvents - 1)
            ]);
        });
        return () => unsubscribe();
    }, [showEvents, maxEvents, eventFilter]);
    // Calculate aggregated stats
    const aggregatedStats = (0, react_1.useMemo)(() => {
        if (!stats || Object.keys(stats).length === 0)
            return null;
        return Object.values(stats).reduce((acc, curr) => ({
            hits: (acc.hits || 0) + curr.hits,
            misses: (acc.misses || 0) + curr.misses,
            size: (acc.size || 0) + curr.size,
            keyCount: (acc.keyCount || 0) + curr.keyCount
        }), {});
    }, [stats]);
    // Calculate hit rate
    const hitRate = (0, react_1.useMemo)(() => {
        if (!aggregatedStats)
            return 0;
        const total = aggregatedStats.hits + aggregatedStats.misses;
        return total > 0 ? (aggregatedStats.hits / total) * 100 : 0;
    }, [aggregatedStats]);
    return (react_1.default.createElement("div", { className: `cache-monitor ${className || ''}` },
        react_1.default.createElement("div", { className: "cache-monitor-overview" },
            react_1.default.createElement("h3", null, "Cache Overview"),
            aggregatedStats && (react_1.default.createElement("div", { className: "cache-monitor-stats" },
                react_1.default.createElement("div", { className: "stat-item" },
                    react_1.default.createElement("label", null, "Hit Rate"),
                    react_1.default.createElement("div", { className: "stat-value" },
                        hitRate.toFixed(2),
                        "%")),
                react_1.default.createElement("div", { className: "stat-item" },
                    react_1.default.createElement("label", null, "Total Size"),
                    react_1.default.createElement("div", { className: "stat-value" }, (0, cache_manager_utils_1.formatCacheSize)(aggregatedStats.size))),
                react_1.default.createElement("div", { className: "stat-item" },
                    react_1.default.createElement("label", null, "Keys"),
                    react_1.default.createElement("span", { className: "stat-value" }, aggregatedStats.keyCount.toLocaleString()))))),
        showDetails && (react_1.default.createElement("div", { className: "cache-monitor-providers" },
            react_1.default.createElement("h4", null, "Cache Providers"),
            react_1.default.createElement("div", { className: "provider-list" }, Object.entries(stats).map(([name, providerStats]) => (react_1.default.createElement("div", { key: name, className: `provider-item ${selectedProvider === name ? 'selected' : ''}`, onClick: () => setSelectedProvider(name) },
                react_1.default.createElement("div", { className: "provider-header" },
                    react_1.default.createElement("span", { className: "provider-name" }, name),
                    react_1.default.createElement("span", { className: "provider-hit-rate" },
                        ((providerStats.hits / (providerStats.hits + providerStats.misses)) * 100).toFixed(2),
                        "%")),
                selectedProvider === name && (react_1.default.createElement("div", { className: "provider-details" },
                    react_1.default.createElement("div", { className: "stat-row" },
                        react_1.default.createElement("label", null, "Hits"),
                        react_1.default.createElement("span", { className: "stat-value" }, providerStats.hits.toLocaleString())),
                    react_1.default.createElement("div", { className: "stat-row" },
                        react_1.default.createElement("label", null, "Misses"),
                        react_1.default.createElement("span", { className: "stat-value" }, providerStats.misses.toLocaleString())),
                    react_1.default.createElement("div", { className: "stat-row" },
                        react_1.default.createElement("label", null, "Size"),
                        react_1.default.createElement("span", { className: "stat-value" }, (0, cache_manager_utils_1.formatCacheSize)(providerStats.size))),
                    react_1.default.createElement("div", { className: "stat-row" },
                        react_1.default.createElement("label", null, "Keys"),
                        react_1.default.createElement("span", { className: "stat-value" }, providerStats.keyCount.toLocaleString())))))))))),
        showEvents && events.length > 0 && (react_1.default.createElement("div", { className: "cache-monitor-events" },
            react_1.default.createElement("h4", null, "Recent Events"),
            react_1.default.createElement("div", { className: "event-list" }, events.map((event, index) => (react_1.default.createElement("div", { key: index, className: `event-item ${event.error ? 'error' : ''}` },
                react_1.default.createElement("span", { className: "event-time" }, new Date(event.timestamp).toLocaleTimeString()),
                react_1.default.createElement("span", { className: "event-type" }, event.type),
                event.key && (react_1.default.createElement("span", { className: "event-key", title: event.key }, event.key.length > 30 ? `${event.key.slice(0, 27)}...` : event.key)),
                event.duration && (react_1.default.createElement("span", { className: "event-duration" },
                    event.duration.toFixed(2),
                    "ms")),
                event.size && (react_1.default.createElement("span", { className: "event-size" }, (0, cache_manager_utils_1.formatCacheSize)(event.size))),
                event.error && (react_1.default.createElement("span", { className: "event-error", title: event.error.message }, event.error.message)))))))),
        react_1.default.createElement("style", null, `
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
      `)));
}
//# sourceMappingURL=cache-monitor.js.map