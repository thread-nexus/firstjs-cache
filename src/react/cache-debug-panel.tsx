/**
 * @fileoverview Debug panel component for cache inspection and management
 * during development.
 */

import React, { useState } from 'react';
import { useCacheManager } from './cache-provider';
import { CacheMonitor } from './cache-monitor';

interface CacheDebugPanelProps {
  /** Initial position of the panel */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Whether the panel is initially open */
  defaultOpen?: boolean;
  /** Custom styling */
  className?: string;
}

export function CacheDebugPanel({
  position = 'bottom-right',
  defaultOpen = false,
  className
}: CacheDebugPanelProps) {
  const cacheManager = useCacheManager();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<'monitor' | 'operations' | 'config'>('monitor');
  const [operationResult, setOperationResult] = useState<any>(null);

  // Key search state
  const [searchKey, setSearchKey] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);

  // Operation form state
  const [operationKey, setOperationKey] = useState('');
  const [operationValue, setOperationValue] = useState('');
  const [operationType, setOperationType] = useState<'get' | 'set' | 'delete'>('get');

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
          } catch {
            await cacheManager.set(operationKey, operationValue);
            result = 'Success';
          }
          break;
        case 'delete':
          result = await cacheManager.delete(operationKey);
          break;
      }
      setOperationResult(result);
    } catch (error) {
      setOperationResult({ error: error.message });
    }
  };

  // Handle key search
  const handleSearch = async () => {
    try {
      const result = await cacheManager.get(searchKey);
      setSearchResult(result);
    } catch (error) {
      setSearchResult({ error: error.message });
    }
  };

  return (
    <div className={`cache-debug-panel ${position} ${className || ''}`}>
      {/* Toggle Button */}
      <button 
        className="toggle-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? 'Close Debug Panel' : 'Open Cache Debug'}
      </button>

      {isOpen && (
        <div className="panel-content">
          {/* Tabs */}
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'monitor' ? 'active' : ''}`}
              onClick={() => setActiveTab('monitor')}
            >
              Monitor
            </button>
            <button 
              className={`tab ${activeTab === 'operations' ? 'active' : ''}`}
              onClick={() => setActiveTab('operations')}
            >
              Operations
            </button>
            <button 
              className={`tab ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              Config
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'monitor' && (
              <CacheMonitor 
                showDetails 
                showEvents 
                refreshInterval={1000}
              />
            )}

            {activeTab === 'operations' && (
              <div className="operations-panel">
                {/* Key Search */}
                <div className="search-section">
                  <h4>Search Cache</h4>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Cache key"
                      value={searchKey}
                      onChange={(e) => setSearchKey(e.target.value)}
                    />
                    <button onClick={handleSearch}>Search</button>
                  </div>
                  {searchResult && (
                    <div className="result-box">
                      <pre>{JSON.stringify(searchResult, null, 2)}</pre>
                    </div>
                  )}
                </div>

                {/* Cache Operations */}
                <div className="operations-section">
                  <h4>Cache Operations</h4>
                  <div className="operation-form">
                    <select 
                      value={operationType}
                      onChange={(e) => setOperationType(e.target.value as any)}
                    >
                      <option value="get">Get</option>
                      <option value="set">Set</option>
                      <option value="delete">Delete</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Cache key"
                      value={operationKey}
                      onChange={(e) => setOperationKey(e.target.value)}
                    />
                    {operationType === 'set' && (
                      <textarea
                        placeholder="Value (JSON or string)"
                        value={operationValue}
                        onChange={(e) => setOperationValue(e.target.value)}
                      />
                    )}
                    <button onClick={handleOperation}>Execute</button>
                  </div>
                  {operationResult && (
                    <div className="result-box">
                      <pre>{JSON.stringify(operationResult, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'config' && (
              <div className="config-panel">
                <h4>Cache Configuration</h4>
                <pre>{JSON.stringify(cacheManager.config, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
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
      `}</style>
    </div>
  );
}