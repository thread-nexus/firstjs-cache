import React, {useEffect, useState} from 'react';
import {CacheManagerCore} from '../implementations';

interface CacheDebugPanelProps {
    cacheManager: CacheManagerCore;
}

export const CacheDebugPanel: React.FC<CacheDebugPanelProps> = ({cacheManager}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [operationType, setOperationType] = useState<'get' | 'set' | 'delete'>('get');
    const [operationKey, setOperationKey] = useState('');
    const [operationValue, setOperationValue] = useState('');
    const [operationResult, setOperationResult] = useState<any>(null);
    const [searchKey, setSearchKey] = useState('');
    const [searchResult, setSearchResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch stats on mount and when panel is opened
    useEffect(() => {
        if (isOpen) {
            fetchStats().then(r => {});
        }
    }, [isOpen]);

    // Fetch cache statistics
    const fetchStats = async () => {
        try {
            const stats = await cacheManager.getStats();
            setStats(stats);
            setError(null);
        } catch (err) {
            setError(`Error fetching stats: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    // Perform cache operation
    const performOperation = async () => {
        try {
            setError(null);
            let result;

            switch (operationType) {
                case 'get':
                    result = await cacheManager.get(operationKey);
                    break;
                case 'set':
                    try {
                        // Try to parse as JSON if it looks like an object or array
                        const value = operationValue.trim().startsWith('{') || operationValue.trim().startsWith('[')
                            ? JSON.parse(operationValue)
                            : operationValue;
                        await cacheManager.set(operationKey, value);
                    } catch (parseError) {
                        // If JSON parsing fails, store as string
                        await cacheManager.set(operationKey, operationValue);
                    }
                    result = 'Value set successfully';
                    break;
                case 'delete':
                    result = await cacheManager.delete(operationKey);
                    break;
                default:
                    result = 'Unknown operation';
            }

            setOperationResult(result);
            await fetchStats(); // Refresh stats after operation
        } catch (err) {
            setError(`Error performing operation: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    // Search for a key
    const searchForKey = async () => {
        try {
            setError(null);
            const result = await cacheManager.get(searchKey);
            setSearchResult(result);
        } catch (err) {
            setError(`Error searching: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    if (!isOpen) {
        return (
            <div className="cache-debug-panel-toggle" style={styles.toggle}>
                <button onClick={() => setIsOpen(true)} style={styles.toggleButton}>
                    Debug Cache
                </button>
            </div>
        );
    }

    return (
        <div className="cache-debug-panel" style={styles.panel}>
            <div className="cache-debug-panel-header" style={styles.header}>
                <h3 style={styles.title}>Cache Debug Panel</h3>
                <button onClick={() => setIsOpen(false)} style={styles.closeButton}>
                    Close
                </button>
            </div>

            {error && (
                <div className="cache-debug-panel-error" style={styles.error}>
                    {error}
                </div>
            )}

            <div className="cache-debug-panel-section" style={styles.section}>
                <h4 style={styles.sectionTitle}>Cache Operations</h4>
                <div style={styles.form}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            Operation:
                            <select
                                value={operationType}
                                onChange={(e) => setOperationType(e.target.value as any)}
                                style={styles.select}
                            >
                                <option value="get">Get</option>
                                <option value="set">Set</option>
                                <option value="delete">Delete</option>
                            </select>
                        </label>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            Key:
                            <input
                                type="text"
                                value={operationKey}
                                onChange={(e) => setOperationKey(e.target.value)}
                                style={styles.input}
                            />
                        </label>
                    </div>

                    {operationType === 'set' && (
                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                Value:
                                <textarea
                                    value={operationValue}
                                    onChange={(e) => setOperationValue(e.target.value)}
                                    style={styles.textarea}
                                />
                            </label>
                        </div>
                    )}

                    <button onClick={performOperation} style={styles.button}>
                        Execute
                    </button>

                    {operationResult !== null && (
                        <div style={styles.result}>
                            <h5>Result:</h5>
                            <pre>{JSON.stringify(operationResult, null, 2)}</pre>
                        </div>
                    )}
                </div>
            </div>

            <div className="cache-debug-panel-section" style={styles.section}>
                <h4 style={styles.sectionTitle}>Search Cache</h4>
                <div style={styles.form}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            Key:
                            <input
                                type="text"
                                value={searchKey}
                                onChange={(e) => setSearchKey(e.target.value)}
                                style={styles.input}
                            />
                        </label>
                    </div>

                    <button onClick={searchForKey} style={styles.button}>
                        Search
                    </button>

                    {searchResult !== null && (
                        <div style={styles.result}>
                            <h5>Result:</h5>
                            <pre>{JSON.stringify(searchResult, null, 2)}</pre>
                        </div>
                    )}
                </div>
            </div>

            <div className="cache-debug-panel-section" style={styles.section}>
                <h4 style={styles.sectionTitle}>Cache Statistics</h4>
                <button onClick={fetchStats} style={styles.button}>
                    Refresh Stats
                </button>
                <div style={styles.stats}>
                    {stats ? (
                        <pre>{JSON.stringify(stats, null, 2)}</pre>
                    ) : (
                        <p>No statistics available</p>
                    )}
                </div>
            </div>

            <div className="cache-debug-panel-section" style={styles.section}>
                <h4 style={styles.sectionTitle}>Configuration</h4>
                <div style={styles.stats}>
                    {cacheManager && (
                        <pre>{JSON.stringify(cacheManager.getConfig ? cacheManager.getConfig() : {}, null, 2)}</pre>
                    )}
                </div>
            </div>
        </div>
    );
};

// Inline styles
const styles = {
    toggle: {
        position: 'fixed' as const,
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
    },
    toggleButton: {
        padding: '8px 12px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    panel: {
        position: 'fixed' as const,
        top: '20px',
        right: '20px',
        bottom: '20px',
        width: '400px',
        backgroundColor: 'white',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        padding: '16px',
        overflowY: 'auto' as const,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '16px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px',
    },
    title: {
        margin: 0,
        fontSize: '18px',
    },
    closeButton: {
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
    },
    section: {
        borderBottom: '1px solid #eee',
        paddingBottom: '16px',
    },
    sectionTitle: {
        margin: '0 0 8px 0',
        fontSize: '16px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px',
    },
    label: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px',
        fontSize: '14px',
    },
    input: {
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
    },
    textarea: {
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        minHeight: '100px',
        fontFamily: 'monospace',
    },
    select: {
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
    },
    button: {
        padding: '8px 12px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        alignSelf: 'flex-start',
    },
    result: {
        backgroundColor: '#f8f9fa',
        padding: '8px',
        borderRadius: '4px',
    },
    stats: {
        backgroundColor: '#f8f9fa',
        padding: '8px',
        borderRadius: '4px',
        marginTop: '8px',
        maxHeight: '200px',
        overflowY: 'auto' as const,
    },
    error: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '8px',
        borderRadius: '4px',
    },
};

export default CacheDebugPanel;