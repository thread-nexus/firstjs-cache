/**
 * @fileoverview Debug panel component for cache inspection and management
 * during development.
 */
import React, { useState } from 'react';
import { useCacheManager } from './cache-provider';
import { CacheMonitor } from './cache-monitor';
export function CacheDebugPanel({ position = 'bottom-right', defaultOpen = false, className }) {
    const cacheManager = useCacheManager();
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [activeTab, setActiveTab] = useState('monitor');
    const [operationResult, setOperationResult] = useState(null);
    // Key search state
    const [searchKey, setSearchKey] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    // Operation form state
    const [operationKey, setOperationKey] = useState('');
    const [operationValue, setOperationValue] = useState('');
    const [operationType, setOperationType] = useState('get');
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
    return (React.createElement("div", { className: `cache-debug-panel ${position} ${className || ''}` },
        React.createElement("button", { className: "toggle-button", onClick: () => setIsOpen(!isOpen) }, isOpen ? 'Close Debug Panel' : 'Open Cache Debug'),
        isOpen && (React.createElement("div", { className: "panel-content" },
            React.createElement("div", { className: "tabs" },
                React.createElement("button", { className: `tab ${activeTab === 'monitor' ? 'active' : ''}`, onClick: () => setActiveTab('monitor') }, "Monitor"),
                React.createElement("button", { className: `tab ${activeTab === 'operations' ? 'active' : ''}`, onClick: () => setActiveTab('operations') }, "Operations"),
                React.createElement("button", { className: `tab ${activeTab === 'config' ? 'active' : ''}`, onClick: () => setActiveTab('config') }, "Config")),
            React.createElement("div", { className: "tab-content" },
                activeTab === 'monitor' && (React.createElement(CacheMonitor, { showDetails: true, showEvents: true, refreshInterval: 1000 })),
                activeTab === 'operations' && (React.createElement("div", { className: "operations-panel" },
                    React.createElement("div", { className: "search-section" },
                        React.createElement("h4", null, "Search Cache"),
                        React.createElement("div", { className: "input-group" },
                            React.createElement("input", { type: "text", placeholder: "Cache key", value: searchKey, onChange: (e) => setSearchKey(e.target.value) }),
                            React.createElement("button", { onClick: handleSearch }, "Search")),
                        searchResult && (React.createElement("div", { className: "result-box" },
                            React.createElement("pre", null, JSON.stringify(searchResult, null, 2))))),
                    React.createElement("div", { className: "operations-section" },
                        React.createElement("h4", null, "Cache Operations"),
                        React.createElement("div", { className: "operation-form" },
                            React.createElement("select", { value: operationType, onChange: (e) => setOperationType(e.target.value) },
                                React.createElement("option", { value: "get" }, "Get"),
                                React.createElement("option", { value: "set" }, "Set"),
                                React.createElement("option", { value: "delete" }, "Delete")),
                            React.createElement("input", { type: "text", placeholder: "Cache key", value: operationKey, onChange: (e) => setOperationKey(e.target.value) }),
                            operationType === 'set' && (React.createElement("textarea", { placeholder: "Value (JSON or string)", value: operationValue, onChange: (e) => setOperationValue(e.target.value) })),
                            React.createElement("button", { onClick: handleOperation }, "Execute")),
                        operationResult && (React.createElement("div", { className: "result-box" },
                            React.createElement("pre", null, JSON.stringify(operationResult, null, 2))))))),
                activeTab === 'config' && (React.createElement("div", { className: "config-panel" },
                    React.createElement("h4", null, "Cache Configuration"),
                    React.createElement("pre", null, JSON.stringify(cacheManager.getConfigInfo ? cacheManager.getConfigInfo() : {}, null, 2))))))),
        React.createElement("style", { dangerouslySetInnerHTML: { __html: `
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