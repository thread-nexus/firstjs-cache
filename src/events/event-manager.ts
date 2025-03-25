/**
 * @fileoverview Centralized event management system
 * 
 * This module provides a centralized approach to emitting events 
 * throughout the cache system with standardized payload formatting,
 * error handling, performance monitoring, and event batching.
 */

import { EventEmitter } from 'events';
import { CacheEventType, emitCacheEvent } from './cache-events';
import { metrics } from '../utils/metrics';
import { logger } from '../utils/logger';

/**
 * Base event payload interface
 */
export interface BaseEventPayload {
  timestamp?: number;
  provider?: string;
  key?: string;
  keys?: string[];
  duration?: number;
  error?: Error | string;
  size?: number;
  metadata?: Record<string, any>;
}

/**
 * Event with complete information
 */
export interface CacheEvent extends BaseEventPayload {
  type: string;
  timestamp: number;
  id: string;
}

/**
 * Options for event emission
 */
export interface EventEmissionOptions {
  /**
   * Whether to include timing information
   */
  timing?: boolean;
  
  /**
   * Whether to report metrics
   */
  reportMetrics?: boolean;
  
  /**
   * Whether to log event
   */
  logging?: boolean;
  
  /**
   * Custom event tags
   */
  tags?: string[];
  
  /**
   * Sampling rate (0-1)
   */
  samplingRate?: number;
  
  /**
   * Whether to store this event in history
   */
  recordInHistory?: boolean;
  
  /**
   * Priority of the event (1-10, 10 being highest)
   */
  priority?: number;
  
  /**
   * Whether to batch this event
   */
  batchable?: boolean;
}

/**
 * Default event emission options
 */
const DEFAULT_OPTIONS: EventEmissionOptions = {
  timing: true,
  reportMetrics: true,
  logging: false,
  samplingRate: 1.0,
  recordInHistory: false,
  priority: 5,
  batchable: false
};

/**
 * Event filter specification
 */
export interface EventFilter {
  types?: CacheEventType[] | '*';
  providers?: string[];
  minPriority?: number;
  keyPattern?: RegExp | string;
  metadata?: Record<string, any>;
}

/**
 * Event history configuration
 */
export interface EventHistoryConfig {
  enabled: boolean;
  maxEvents: number;
  retentionTime: number; // milliseconds
}

/**
 * Event batch configuration
 */
export interface EventBatchConfig {
  enabled: boolean;
  maxBatchSize: number; 
  flushInterval: number; // milliseconds
  eventTypes: string[];
}

/**
 * Centralized event manager configuration
 */
export interface EventManagerConfig {
  maxListeners?: number;
  defaultSamplingRate?: number;
  historyConfig?: EventHistoryConfig;
  batchConfig?: EventBatchConfig;
}

/**
 * Default event manager configuration
 */
const DEFAULT_CONFIG: EventManagerConfig = {
  maxListeners: 50,
  defaultSamplingRate: 1.0,
  historyConfig: {
    enabled: false,
    maxEvents: 1000,
    retentionTime: 60 * 60 * 1000 // 1 hour
  },
  batchConfig: {
    enabled: true,
    maxBatchSize: 50,
    flushInterval: 1000, // 1 second
    eventTypes: [CacheEventType.METRICS.toString()]
  }
};

/**
 * Centralized event manager for cache system
 */
export class EventManager {
  private static instance: EventManager;
  private emitter: EventEmitter;
  private enabled: boolean = true;
  private samplingRates: Map<string, number> = new Map();
  private eventHistory: CacheEvent[] = [];
  private eventBatches: Map<string, CacheEvent[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventCounter: number = 0;
  
  private config: EventManagerConfig;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor(config: EventManagerConfig = DEFAULT_CONFIG) {
    this.emitter = new EventEmitter();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Set default limits
    this.emitter.setMaxListeners(this.config.maxListeners || 50);
    
    // Set up batch flush timers if batching is enabled
    if (this.config.batchConfig?.enabled) {
      this.setupBatchFlushTimers();
    }
    
    // Set up history cleanup if history is enabled
    if (this.config.historyConfig?.enabled) {
      this.setupHistoryCleanup();
    }
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(config?: EventManagerConfig): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager(config);
    }
    return EventManager.instance;
  }
  
  /**
   * Update configuration
   */
  public updateConfig(config: Partial<EventManagerConfig>): void {
    // Clean up existing timers
    this.cleanupTimers();
    
    // Update config
    this.config = { ...this.config, ...config };
    
    // Update emitter max listeners
    if (config.maxListeners) {
      this.emitter.setMaxListeners(config.maxListeners);
    }
    
    // Re-setup batch flush timers if needed
    if (this.config.batchConfig?.enabled) {
      this.setupBatchFlushTimers();
    }
    
    // Re-setup history cleanup if needed
    if (this.config.historyConfig?.enabled) {
      this.setupHistoryCleanup();
    }
  }
  
  /**
   * Clean up all timers
   */
  private cleanupTimers(): void {
    // Clear batch timers
    for (const timer of this.batchTimers.values()) {
      clearInterval(timer);
    }
    this.batchTimers.clear();
  }
  
  /**
   * Set up batch flush timers
   */
  private setupBatchFlushTimers(): void {
    const { flushInterval, eventTypes } = this.config.batchConfig!;
    
    // Create timer for each event type that needs batching
    for (const eventType of eventTypes) {
      const timer = setInterval(() => {
        this.flushBatch(eventType);
      }, flushInterval);
      
      this.batchTimers.set(eventType, timer);
      
      // Initialize batch
      if (!this.eventBatches.has(eventType)) {
        this.eventBatches.set(eventType, []);
      }
    }
  }
  
  /**
   * Set up history cleanup timer
   */
  private setupHistoryCleanup(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupEventHistory();
    }, 60 * 60 * 1000);
  }
  
  /**
   * Clean up old events from history
   */
  private cleanupEventHistory(): void {
    if (!this.config.historyConfig?.enabled) return;
    
    const { retentionTime, maxEvents } = this.config.historyConfig;
    const now = Date.now();
    
    // Remove events older than retention time
    this.eventHistory = this.eventHistory.filter(event => 
      now - event.timestamp < retentionTime
    );
    
    // Trim to max events
    if (this.eventHistory.length > maxEvents) {
      this.eventHistory = this.eventHistory.slice(-maxEvents);
    }
  }
  
  /**
   * Set the event emitter
   */
  public setEventEmitter(emitter: EventEmitter): void {
    this.emitter = emitter;
  }
  
  /**
   * Get the event emitter
   */
  public getEventEmitter(): EventEmitter {
    return this.emitter;
  }
  
  /**
   * Enable or disable event emission
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Set sampling rate for an event type
   */
  public setSamplingRate(eventType: string, rate: number): void {
    if (rate < 0 || rate > 1) {
      throw new Error(`Sampling rate must be between 0 and 1, got ${rate}`);
    }
    this.samplingRates.set(eventType, rate);
  }
  
  /**
   * Get recent events from history
   */
  public getEventHistory(filter?: EventFilter): CacheEvent[] {
    if (!this.config.historyConfig?.enabled) {
      return [];
    }
    
    if (!filter) {
      return [...this.eventHistory];
    }
    
    return this.filterEvents(this.eventHistory, filter);
  }
  
  /**
   * Filter events based on criteria
   */
  private filterEvents(events: CacheEvent[], filter: EventFilter): CacheEvent[] {
    return events.filter(event => {
      // Filter by type
      if (filter.types && filter.types !== '*') {
        if (!filter.types.includes(event.type as CacheEventType)) {
          return false;
        }
      }
      
      // Filter by provider
      if (filter.providers && event.provider) {
        if (!filter.providers.includes(event.provider)) {
          return false;
        }
      }
      
      // Filter by priority
      if (filter.minPriority !== undefined && event.metadata?.priority) {
        if ((event.metadata.priority as number) < filter.minPriority) {
          return false;
        }
      }
      
      // Filter by key pattern
      if (filter.keyPattern && event.key) {
        const pattern = filter.keyPattern instanceof RegExp 
          ? filter.keyPattern 
          : new RegExp(filter.keyPattern);
        
        if (!pattern.test(event.key)) {
          return false;
        }
      }
      
      // Filter by metadata
      if (filter.metadata && event.metadata) {
        for (const [key, value] of Object.entries(filter.metadata)) {
          if (event.metadata[key] !== value) {
            return false;
          }
        }
      }
      
      return true;
    });
  }
  
  /**
   * Emit a cache event with standardized formatting
   */
  public emit(
    eventType: CacheEventType,
    payload: BaseEventPayload = {},
    options: EventEmissionOptions = DEFAULT_OPTIONS
  ): void {
    if (!this.enabled) return;
    
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    
    // Apply sampling rate
    const samplingRate = this.samplingRates.get(eventType.toString()) || 
      mergedOptions.samplingRate || 
      this.config.defaultSamplingRate || 
      1.0;
      
    if (Math.random() > samplingRate) return;
    
    // Ensure timestamp exists
    const timestamp = payload.timestamp || Date.now();
    
    // Generate event ID
    const id = `${timestamp}-${++this.eventCounter}`;
    
    // Prepare the complete event object
    const event: CacheEvent = {
      id,
      type: eventType.toString(),
      timestamp,
      ...payload
    };
    
    // Store in history if enabled and requested
    if (this.config.historyConfig?.enabled && mergedOptions.recordInHistory) {
      this.eventHistory.push(event);
      
      // Cleanup if too many events
      if (this.eventHistory.length > this.config.historyConfig.maxEvents) {
        this.eventHistory.shift();
      }
    }
    
    // Check if this event should be batched
    if (
      this.config.batchConfig?.enabled && 
      mergedOptions.batchable &&
      this.config.batchConfig.eventTypes.includes(eventType.toString())
    ) {
      this.addToBatch(eventType.toString(), event);
      return;
    }
    
    // Emit the event immediately if not batched
    this.emitEventInternal(eventType, event, mergedOptions);
  }
  
  /**
   * Add an event to a batch
   */
  private addToBatch(eventType: string, event: CacheEvent): void {
    // Get or create batch for this event type
    if (!this.eventBatches.has(eventType)) {
      this.eventBatches.set(eventType, []);
    }
    
    const batch = this.eventBatches.get(eventType)!;
    batch.push(event);
    
    // Flush if batch size reached
    if (batch.length >= this.config.batchConfig!.maxBatchSize) {
      this.flushBatch(eventType);
    }
  }
  
  /**
   * Flush a batch of events
   */
  private flushBatch(eventType: string): void {
    const batch = this.eventBatches.get(eventType);
    if (!batch || batch.length === 0) return;
    
    // Create batch event
    const batchEvent = {
      timestamp: Date.now(),
      events: [...batch],
      count: batch.length
    };
    
    // Emit batch event
    try {
      this.emitter.emit(`${eventType}_batch`, batchEvent);
      this.emitter.emit('*', batchEvent);
      
      // Track metrics
      metrics.increment('cache.events_batched', batch.length, {
        event_type: eventType
      });
      
      // Log if needed
      logger.debug(`Flushed batch of ${batch.length} ${eventType} events`);
    } catch (error) {
      logger.error(`Failed to emit batch of ${eventType} events`, {
        error: error instanceof Error ? error.message : String(error),
        count: batch.length
      });
    }
    
    // Clear batch
    batch.length = 0;
  }
  
  /**
   * Emit an event internally
   */
  private emitEventInternal(
    eventType: CacheEventType,
    event: CacheEvent,
    options: EventEmissionOptions
  ): void {
    try {
      // Emit the event
      emitCacheEvent(eventType, event);
      
      // Track metrics if enabled
      if (options.reportMetrics) {
        metrics.increment('cache.events', 1, {
          event_type: eventType.toString(),
          provider: event.provider || 'unknown'
        });
        
        if (event.duration) {
          metrics.histogram('cache.event_duration', event.duration, {
            event_type: eventType.toString()
          });
        }
      }
      
      // Log if enabled
      if (options.logging) {
        logger.debug(`Cache event: ${eventType}`, {
          ...event,
          timestamp: event.timestamp
        });
      }
    } catch (error) {
      // Don't let event failures crash the application
      logger.error(`Failed to emit event ${eventType}`, {
        error: error instanceof Error ? error.message : String(error),
        event: eventType.toString()
      });
    }
  }
  
  /**
   * Subscribe to cache events
   */
  public subscribe(
    filter: EventFilter | CacheEventType | '*',
    handler: (event: CacheEvent) => void
  ): () => void {
    // Convert simple type filter to full filter object
    const fullFilter: EventFilter = typeof filter === 'string' || (filter as unknown) === '*'
      ? { types: (filter as unknown) === '*' ? '*' : [filter as CacheEventType] } 
      : filter;
    
    // Create the handler function with filtering
    const wrappedHandler = (event: CacheEvent) => {
      // Skip if should be filtered
      if (!this.eventMatchesFilter(event, fullFilter)) {
        return;
      }
      
      // Call the actual handler
      try {
        handler(event);
      } catch (error) {
        logger.error('Error in event handler', {
          error: error instanceof Error ? error.message : String(error),
          eventType: event.type
        });
      }
    };
    
    // Store the mapping for unsubscribing
    const handlerMap = new WeakMap<Function, Function>();
    handlerMap.set(handler, wrappedHandler);
    
    // Subscribe to all events or specific type
    const eventType = fullFilter.types === '*' 
      ? '*' 
      : (Array.isArray(fullFilter.types) && fullFilter.types.length > 0 
        ? String(fullFilter.types[0]) 
        : String(fullFilter.types));
    
    if (!eventType) {
      logger.warn('No event type specified in filter, subscribing to all events');
      this.emitter.on('*', wrappedHandler);
    } else {
      this.emitter.on(eventType, wrappedHandler);
    }
    
    // Return unsubscribe function
    return () => {
      const eventType = fullFilter.types === '*' ? '*' : 
        (Array.isArray(fullFilter.types) ? String(fullFilter.types[0]) : String(fullFilter.types));
      
      if (!eventType) {
        this.emitter.off('*', wrappedHandler);
      } else {
        this.emitter.off(eventType, wrappedHandler);
      }
    };
  }
  
  /**
   * Check if an event matches a filter
   */
  private eventMatchesFilter(event: CacheEvent, filter: EventFilter): boolean {
    // Filter by type
    if (filter.types && filter.types !== '*') {
      const typesList = Array.isArray(filter.types) ? filter.types : [filter.types];
      if (!typesList.some(t => t.toString() === event.type)) {
        return false;
      }
    }
    
    // Filter by provider
    if (filter.providers && event.provider) {
      if (!filter.providers.includes(event.provider)) {
        return false;
      }
    }
    
    // Filter by key pattern
    if (filter.keyPattern && event.key) {
      const pattern = filter.keyPattern instanceof RegExp 
        ? filter.keyPattern 
        : new RegExp(filter.keyPattern);
      
      if (!pattern.test(event.key)) {
        return false;
      }
    }
    
    // Filter by metadata
    if (filter.metadata && event.metadata) {
      for (const [key, value] of Object.entries(filter.metadata)) {
        if (event.metadata[key] !== value) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Unsubscribe from cache events
   */
  public unsubscribe(
    type: CacheEventType | '*',
    handler: (event: any) => void
  ): void {
    const eventType = type === '*' ? '*' : type.toString();
    this.emitter.off(eventType, handler);
  }
  
  /**
   * Remove all event listeners
   */
  public clearAllListeners(): void {
    this.emitter.removeAllListeners();
  }
  
  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.clearAllListeners();
    this.cleanupTimers();
    this.eventHistory = [];
    this.eventBatches.clear();
  }
}

/**
 * Singleton instance of the event manager
 */
export const eventManager = EventManager.getInstance();

/**
 * Emit a cache hit event
 */
export function emitCacheHit(
  key: string,
  provider: string,
  duration?: number,
  metadata?: Record<string, any>
): void {
  eventManager.emit(
    CacheEventType.GET_HIT,
    {
      key,
      provider,
      duration,
      metadata
    }
  );
}

/**
 * Emit a cache miss event
 */
export function emitCacheMiss(
  key: string,
  provider: string,
  duration?: number,
  metadata?: Record<string, any>
): void {
  eventManager.emit(
    CacheEventType.GET_MISS,
    {
      key,
      provider,
      duration,
      metadata
    }
  );
}

/**
 * Emit a cache error event
 */
export function emitCacheError(
  error: Error | string,
  provider: string,
  operation: string,
  key?: string,
  metadata?: Record<string, any>
): void {
  eventManager.emit(
    CacheEventType.ERROR,
    {
      error,
      provider,
      key,
      metadata: {
        ...metadata,
        operation
      }
    },
    {
      logging: true,
      recordInHistory: true, // Always record errors in history
      priority: 9 // High priority for errors
    }
  );
}

/**
 * Emit a cache operation event with timing
 */
export function emitOperationEvent(
  eventType: CacheEventType,
  provider: string,
  startTime: number,
  payload: BaseEventPayload = {}
): void {
  const duration = performance.now() - startTime;
  
  eventManager.emit(
    eventType,
    {
      ...payload,
      provider,
      duration
    }
  );
}

/**
 * Emit a metric event with standardized format
 */
export function emitMetricEvent(
  type: 'hit' | 'miss' | 'success' | 'error',
  operation: string,
  duration: number,
  context: Record<string, any>
): void {
  eventManager.emit(
    CacheEventType.METRICS,
    {
      duration,
      metadata: { 
        operation,
        ...context
      }
    },
    {
      logging: false,
      samplingRate: 0.1, // Sample metrics at 10% to reduce event volume
      batchable: true // Enable batching for metrics events
    }
  );
}

/**
 * Emit a batch of metrics events
 */
export function emitMetricBatch(
  events: Array<{
    type: 'hit' | 'miss' | 'success' | 'error';
    operation: string;
    duration: number;
    context?: Record<string, any>;
  }>
): void {
  const batchEvents = events.map(event => ({
    duration: event.duration,
    metadata: {
      operation: event.operation,
      ...(event.context || {})
    },
    timestamp: Date.now()
  }));
  
  eventManager.emit(
    CacheEventType.METRICS,
    {
      metadata: {
        batch: true,
        events: batchEvents,
        count: batchEvents.length
      }
    },
    {
      batchable: false // Don't batch this batch event
    }
  );
}
