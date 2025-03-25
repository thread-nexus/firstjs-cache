/**
 * @fileoverview Logging utilities for cache operations
 * 
 * Provides a standardized logging interface that can emit log events
 * and integrate with external logging systems.
 */

import { eventManager } from '../events/event-manager';
import { CacheEventType } from '../events/cache-events';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /**
   * Minimum log level to display
   */
  minLevel: LogLevel;
  
  /**
   * Whether to emit log events
   */
  emitEvents: boolean;
  
  /**
   * Whether to log to console
   */
  console: boolean;
  
  /**
   * Additional log handlers
   */
  handlers?: Array<(entry: LogEntry) => void>;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.INFO,
  emitEvents: true,
  console: true,
  handlers: []
};

/**
 * Logging manager implementation
 */
class Logger {
  private config: LoggerConfig;
  
  /**
   * Create a new logger
   */
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Update logger configuration
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Log a message at DEBUG level
   */
  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  /**
   * Log a message at INFO level
   */
  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  /**
   * Log a message at WARN level
   */
  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  /**
   * Log a message at ERROR level
   */
  public error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }
  
  /**
   * Log a message at a specific level
   */
  private log(level: LogLevel, message: string, context: Record<string, any> = {}): void {
    // Skip if below minimum level
    if (this.shouldSkip(level)) {
      return;
    }
    
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context
    };
    
    // Log to console if enabled
    if (this.config.console) {
      this.logToConsole(entry);
    }
    
    // Emit log event if enabled
    if (this.config.emitEvents) {
      this.emitLogEvent(entry);
    }
    
    // Call additional handlers
    this.callHandlers(entry);
  }
  
  /**
   * Check if a log level should be skipped
   */
  private shouldSkip(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minLevelIndex = levels.indexOf(this.config.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    
    return currentLevelIndex < minLevelIndex;
  }
  
  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry): void {
    const { level, message, context } = entry;
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, context || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, message, context || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, context || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, context || '');
        break;
    }
  }
  
  /**
   * Emit log event
   */
  private emitLogEvent(entry: LogEntry): void {
    // Skip emitting log for some entry types to avoid recursive logging
    if (entry.message?.includes('Failed to emit event')) {
      return;
    }
    
    // Map log levels to event priorities
    const priorityMap: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 1,
      [LogLevel.INFO]: 3,
      [LogLevel.WARN]: 7,
      [LogLevel.ERROR]: 9
    };
    
    try {
      eventManager.emit(
        CacheEventType.LOG,
        {
          metadata: {
            log: entry,
            level: entry.level
          }
        },
        {
          logging: false, // Avoid recursive logging
          reportMetrics: entry.level !== LogLevel.DEBUG, // Only report metrics for non-debug logs
          priority: priorityMap[entry.level] || 5,
          recordInHistory: entry.level === LogLevel.ERROR // Only record errors in history
        }
      );
    } catch (error) {
      // Just output to console if event emission fails
      console.error('[LOGGER] Failed to emit log event:', error);
    }
  }
  
  /**
   * Call additional log handlers
   */
  private callHandlers(entry: LogEntry): void {
    if (!this.config.handlers?.length) {
      return;
    }
    
    for (const handler of this.config.handlers) {
      try {
        handler(entry);
      } catch (error) {
        console.error('[LOGGER] Handler error:', error);
      }
    }
  }
}

/**
 * Export logger singleton
 */
export const logger = new Logger();

/**
 * Add a log entry type to the CacheEventType enum
 */
// This should be defined in cache-events.ts, but we're adding it here for reference
// export enum CacheEventType {
//   // ... existing types ...
//   LOG = 'log'
// }
