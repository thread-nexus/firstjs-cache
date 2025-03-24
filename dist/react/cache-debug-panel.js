"use strict";
/**
 * @fileoverview Debug panel component for cache inspection and management
 * during development.
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
exports.CacheDebugPanel = CacheDebugPanel;
const react_1 = __importStar(require("react"));
const cache_provider_1 = require("./cache-provider");
const cache_monitor_1 = require("./cache-monitor");
function CacheDebugPanel({ position = 'bottom-right', defaultOpen = false, className }) {
    const cacheManager = (0, cache_provider_1.useCacheManager)();
    const [isOpen, setIsOpen] = (0, react_1.useState)(defaultOpen);
    const [activeTab, setActiveTab] = (0, react_1.useState)('monitor');
    const [operationResult, setOperationResult] = (0, react_1.useState)(null);
    // Key search state
    const [searchKey, setSearchKey] = (0, react_1.useState)('');
    const [searchResult, setSearchResult] = (0, react_1.useState)(null);
    // Operation form state
    const [operationKey, setOperationKey] = (0, react_1.useState)('');
    const [operationValue, setOperationValue] = (0, react_1.useState)('');
    const [operationType, setOperationType] = (0, react_1.useState)('get');
    // Handle cache operations
    const handleOperation = async () => {
        try {
            let result;
            switch (operationType) {
                case 'get':
                    result = await cacheManager.get(operationKey);
                    break;
                case 'set':
                    try {
                        const value = JSON.parse(operationValue);
                        await cacheManager.set(operationKey, value);
                        result = 'Success';
                    }
                    catch {
                        await cacheManager.set(operationKey, operationValue);
                        result = 'Success';
                    }
                    break;
                case 'delete':
                    result = await cacheManager.delete(operationKey);
                    break;
            }
            setOperationResult(result);
        }
        catch (error) {
            setOperationResult({
                error: error instanceof Error ? error.message : String(error)
            });
        }
    };
    // Handle key search
    const handleSearch = async () => {
        try {
            const result = await cacheManager.get(searchKey);
            setSearchResult(result);
        }
        catch (error) {
            setSearchResult({
                error: error instanceof Error ? error.message : String(error)
            });
        }
    };
    return (react_1.default.createElement("div", { className: `cache-debug-panel ${position} ${className || ''}` },
        react_1.default.createElement("button", { className: "toggle-button", onClick: () => setIsOpen(!isOpen) }, isOpen ? 'Close Debug Panel' : 'Open Cache Debug'),
        isOpen && (react_1.default.createElement("div", { className: "panel-content" },
            react_1.default.createElement("div", { className: "tabs" },
                react_1.default.createElement("button", { className: `tab ${activeTab === 'monitor' ? 'active' : ''}`, onClick: () => setActiveTab('monitor') }, "Monitor"),
                react_1.default.createElement("button", { className: `tab ${activeTab === 'operations' ? 'active' : ''}`, onClick: () => setActiveTab('operations') }, "Operations"),
                react_1.default.createElement("button", { className: `tab ${activeTab === 'config' ? 'active' : ''}`, onClick: () => setActiveTab('config') }, "Config")),
            react_1.default.createElement("div", { className: "tab-content" },
                activeTab === 'monitor' && (react_1.default.createElement(cache_monitor_1.CacheMonitor, { showDetails: true, showEvents: true, refreshInterval: 1000 })),
                activeTab === 'operations' && (react_1.default.createElement("div", { className: "operations-panel" },
                    react_1.default.createElement("div", { className: "search-section" },
                        react_1.default.createElement("h4", null, "Search Cache"),
                        react_1.default.createElement("div", { className: "input-group" },
                            react_1.default.createElement("input", { type: "text", placeholder: "Cache key", value: searchKey, onChange: (e) => setSearchKey(e.target.value) }),
                            react_1.default.createElement("button", { onClick: handleSearch }, "Search")),
                        searchResult && (react_1.default.createElement("div", { className: "result-box" },
                            react_1.default.createElement("pre", null, JSON.stringify(searchResult, null, 2))))),
                    react_1.default.createElement("div", { className: "operations-section" },
                        react_1.default.createElement("h4", null, "Cache Operations"),
                        react_1.default.createElement("div", { className: "operation-form" },
                            react_1.default.createElement("select", { value: operationType, onChange: (e) => setOperationType(e.target.value) },
                                react_1.default.createElement("option", { value: "get" }, "Get"),
                                react_1.default.createElement("option", { value: "set" }, "Set"),
                                react_1.default.createElement("option", { value: "delete" }, "Delete")),
                            react_1.default.createElement("input", { type: "text", placeholder: "Cache key", value: operationKey, onChange: (e) => setOperationKey(e.target.value) }),
                            operationType === 'set' && (react_1.default.createElement("textarea", { placeholder: "Value (JSON or string)", value: operationValue, onChange: (e) => setOperationValue(e.target.value) })),
                            react_1.default.createElement("button", { onClick: handleOperation }, "Execute")),
                        operationResult && (react_1.default.createElement("div", { className: "result-box" },
                            react_1.default.createElement("pre", null, JSON.stringify(operationResult, null, 2))))))),
                activeTab === 'config' && (react_1.default.createElement("div", { className: "config-panel" },
                    react_1.default.createElement("h4", null, "Cache Configuration"),
                    react_1.default.createElement("pre", null, JSON.stringify(cacheManager.getConfigInfo ? cacheManager.getConfigInfo() : {}, null, 2))))))),
        react_1.default.createElement("style", { dangerouslySetInnerHTML: { __html: `
        .cache-debug-panel {
          position: fixed;
          z-index: 9999;
          font-family: -apple-system, system-ui, sans-serif;
        }

        .cache-debug-panel.top-right { top: 20px; right: 20px; }
        .cache-debug-panel.top-left { top: 20px; left: 20px; }
        .cache-debug-panel.bottom-right { bottom: 20px; right: 20px; }
        .cache-debug-panel.bottom-left { bottom: 20px; left: 20px; }

        .toggle-button {
          background: #4299e1;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .toggle-button:hover {
          background: #3182ce;
        }

        .panel-content {
          margin-top: 8px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: 500px;
          max-height: 600px;
          overflow: auto;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          background: #f7fafc;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }

        .tab {
          padding: 12px 24px;
          border: none;
          background: none;
          cursor: pointer;
          color: #4a5568;
          font-size: 14px;
        }

        .tab:hover {
          color: #2d3748;
        }

        .tab.active {
          color: #4299e1;
          border-bottom: 2px solid #4299e1;
        }

        .tab-content {
          padding: 16px;
        }

        .input-group {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        input, textarea, select {
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 14px;
        }

        textarea {
          min-height: 100px;
          width: 100%;
        }

        button {
          background: #4299e1;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        button:hover {
          background: #3182ce;
        }

        .result-box {
          background: #f7fafc;
          padding: 12px;
          border-radius: 4px;
          margin-top: 8px;
          overflow: auto;
        }

        pre {
          margin: 0;
          font-size: 13px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .operations-section,
        .search-section {
          margin-bottom: 24px;
        }

        h4 {
          margin: 0 0 12px;
          color: #2d3748;
        }

        .operation-form {
          display: grid;
          gap: 8px;
        }
      ` } })));
}
//# sourceMappingURL=cache-debug-panel.js.map