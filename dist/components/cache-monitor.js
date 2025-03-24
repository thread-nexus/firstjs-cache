"use strict";
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
function CacheMonitor({ refreshInterval = 5000, showDetails = false }) {
    const [stats, setStats] = (0, react_1.useState)({});
    const [events, setEvents] = (0, react_1.useState)([]);
    // Fetch cache stats periodically
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
        return (0, cache_events_1.subscribeToCacheEvents)('all', (event) => {
            setEvents(prev => [...prev.slice(-99), event]);
        });
    }, []);
    return (react_1.default.createElement("div", { className: "cache-monitor" },
        react_1.default.createElement("h3", null, "Cache Statistics"),
        react_1.default.createElement("div", { className: "stats-grid" }, Object.entries(stats).map(([provider, providerStats]) => (react_1.default.createElement("div", { key: provider, className: "provider-stats" },
            react_1.default.createElement("h4", null, provider),
            react_1.default.createElement("div", null,
                "Hits: ",
                providerStats.hits),
            react_1.default.createElement("div", null,
                "Misses: ",
                providerStats.misses),
            react_1.default.createElement("div", null,
                "Keys: ",
                providerStats.keyCount),
            react_1.default.createElement("div", null,
                "Size: ",
                formatBytes(providerStats.size)))))),
        showDetails && (react_1.default.createElement("div", { className: "events-log" },
            react_1.default.createElement("h3", null, "Recent Events"),
            react_1.default.createElement("div", { className: "events-list" }, events.map((event, index) => (react_1.default.createElement("div", { key: index, className: "event-item" },
                react_1.default.createElement("span", { className: "event-time" }, new Date(event.timestamp).toLocaleTimeString()),
                react_1.default.createElement("span", { className: "event-type" }, event.type),
                react_1.default.createElement("span", { className: "event-key" }, event.key)))))))));
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