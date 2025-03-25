/**
 * @fileoverview Configuration system for cache module
 * 
 * This utility provides a flexible, layered configuration system with
 * schema validation, defaults, and environment variable support.
 */

import { CacheErrorCode, createCacheError } from './error-utils';

/**
 * Configuration schema property
 */
interface ConfigProperty<T> {
  /**
   * Property type
   */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  
  /**
   * Default value
   */
  default?: T;
  
  /**
   * Whether the property is required
   */
  required?: boolean;
  
  /**
   * Environment variable name
   */
  env?: string;
  
  /**
   * Validation function
   */
  validate?: (value: T) => boolean;
  
  /**
   * Property description
   */
  description?: string;
  
  /**
   * Whether the property is sensitive (not logged)
   */
  sensitive?: boolean;
}

/**
 * Configuration schema
 */
export type ConfigSchema = Record<string, ConfigProperty<any>>;

/**
 * Configuration source
 */
export interface ConfigSource {
  /**
   * Source name
   */
  name: string;
  
  /**
   * Source priority (higher takes precedence)
   */
  priority: number;
  
  /**
   * Get a configuration value
   * 
   * @param key Configuration key
   * @returns Configuration value or undefined
   */
  get(key: string): any;
  
  /**
   * Get all configuration values
   * 
   * @returns All configuration values
   */
  getAll(): Record<string, any>;
}

/**
 * Object configuration source
 */
export class ObjectConfigSource implements ConfigSource {
  /**
   * Create a new object configuration source
   * 
   * @param name Source name
   * @param data Configuration data
   * @param priority Source priority
   */
  constructor(
    public readonly name: string,
    private readonly data: Record<string, any>,
    public readonly priority: number
  ) {}
  
  /**
   * Get a configuration value
   * 
   * @param key Configuration key
   * @returns Configuration value or undefined
   */
  get(key: string): any {
    return this.data[key];
  }
  
  /**
   * Get all configuration values
   * 
   * @returns All configuration values
   */
  getAll(): Record<string, any> {
    return { ...this.data };
  }
}

/**
 * Environment variable configuration source
 */
export class EnvConfigSource implements ConfigSource {
  /**
   * Source name
   */
  public readonly name = 'environment';
  
  /**
   * Create a new environment variable configuration source
   * 
   * @param prefix Environment variable prefix
   * @param priority Source priority
   */
  constructor(
    private readonly prefix: string,
    public readonly priority: number
  ) {}
  
  /**
   * Get a configuration value
   * 
   * @param key Configuration key
   * @returns Configuration value or undefined
   */
  get(key: string): any {
    const envKey = this.getEnvKey(key);
    const value = typeof process !== 'undefined' && process.env 
      ? process.env[envKey]
      : undefined;
    
    if (value === undefined) {
      return undefined;
    }
    
    // Try to parse as JSON if it looks like an object or array
    if (
      (value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))
    ) {
      try {
        return JSON.parse(value);
      } catch {
        // If parsing fails, return as string
        return value;
      }
    }
    
    // Try to parse as number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }
    
    // Parse boolean values
    if (value.toLowerCase() === 'true') {
      return true;
    }
    
    if (value.toLowerCase() === 'false') {
      return false;
    }
    
    // Return as string
    return value;
  }
  
  /**
   * Get all configuration values
   * 
   * @returns All configuration values
   */
  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    
    if (typeof process === 'undefined' || !process.env) {
      return result;
    }
    
    const envPrefix = `${this.prefix}_`;
    
    // Find all environment variables with the prefix
    for (const key in process.env) {
      if (key.startsWith(envPrefix)) {
        const configKey = this.getConfigKey(key);
        result[configKey] = this.get(configKey);
      }
    }
    
    return result;
  }
  
  /**
   * Convert a configuration key to an environment variable name
   * 
   * @param key Configuration key
   * @returns Environment variable name
   */
  private getEnvKey(key: string): string {
    return `${this.prefix}_${key.toUpperCase().replace(/\./g, '_')}`;
  }
  
  /**
   * Convert an environment variable name to a configuration key
   * 
   * @param envKey Environment variable name
   * @returns Configuration key
   */
  private getConfigKey(envKey: string): string {
    return envKey
      .slice(this.prefix.length + 1)
      .toLowerCase()
      .replace(/_/g, '.');
  }
}

/**
 * Configuration system
 */
export class Config {
  /**
   * Configuration sources ordered by priority (highest first)
   */
  private readonly sources: ConfigSource[] = [];
  
  /**
   * Configuration schema
   */
  private readonly schema: ConfigSchema;
  
  /**
   * Resolved configuration values
   */
  private resolved: Record<string, any> = {};
  
  /**
   * Whether the configuration has been loaded
   */
  private loaded = false;
  
  /**
   * Create a new configuration system
   * 
   * @param schema Configuration schema
   * @param sources Configuration sources
   */
  constructor(
    schema: ConfigSchema,
    sources: ConfigSource[] = []
  ) {
    this.schema = schema;
    
    // Add sources sorted by priority
    this.sources = [...sources].sort((a, b) => b.priority - a.priority);
    
    // Create default source from schema defaults
    const defaults: Record<string, any> = {};
    
    for (const [key, property] of Object.entries(schema)) {
      if (property.default !== undefined) {
        defaults[key] = property.default;
      }
    }
    
    // Add defaults source with lowest priority
    this.sources.push(new ObjectConfigSource('defaults', defaults, -999));
  }
  
  /**
   * Load configuration from all sources
   */
  load(): void {
    if (this.loaded) {
      return;
    }
    
    // Reset resolved configuration
    this.resolved = {};
    
    // Process each schema property
    for (const [key, property] of Object.entries(this.schema)) {
      // Find the first source with a value
      let value: any;
      
      // Check if property has an environment variable override
      if (property.env) {
        const envValue = typeof process !== 'undefined' && process.env
          ? process.env[property.env]
          : undefined;
        
        if (envValue !== undefined) {
          value = this.parseValue(envValue, property.type);
        }
      }
      
      // If no environment variable, check other sources
      if (value === undefined) {
        for (const source of this.sources) {
          const sourceValue = source.get(key);
          
          if (sourceValue !== undefined) {
            value = sourceValue;
            break;
          }
        }
      }
      
      // Validate value if present
      if (value !== undefined && property.validate) {
        const isValid = property.validate(value);
        
        if (!isValid) {
          throw createCacheError(
            `Invalid configuration value for "${key}": ${value}`,
            CacheErrorCode.INTERNAL_ERROR
          );
        }
      }
      
      // Check if required and missing
      if (value === undefined && property.required) {
        throw createCacheError(
          `Missing required configuration value: ${key}`,
          CacheErrorCode.INTERNAL_ERROR
        );
      }
      
      // Store resolved value
      this.resolved[key] = value;
    }
    
    this.loaded = true;
  }
  
  /**
   * Get a configuration value
   * 
   * @param key Configuration key
   * @returns Configuration value
   */
  get<T>(key: string): T {
    if (!this.loaded) {
      this.load();
    }
    
    if (!(key in this.schema)) {
      throw createCacheError(
        `Unknown configuration key: ${key}`,
        CacheErrorCode.INTERNAL_ERROR
      );
    }
    
    return this.resolved[key] as T;
  }
  
  /**
   * Get all configuration values
   * 
   * @param excludeSensitive Whether to exclude sensitive values
   * @returns All configuration values
   */
  getAll(excludeSensitive = true): Record<string, any> {
    if (!this.loaded) {
      this.load();
    }
    
    if (!excludeSensitive) {
      return { ...this.resolved };
    }
    
    // Filter out sensitive values
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(this.resolved)) {
      const property = this.schema[key];
      
      if (!property.sensitive) {
        result[key] = value;
      } else {
        result[key] = '******';
      }
    }
    
    return result;
  }
  
  /**
   * Reset the configuration
   */
  reset(): void {
    this.resolved = {};
    this.loaded = false;
  }
  
  /**
   * Parse a string value to the specified type
   * 
   * @param value String value
   * @param type Target type
   * @returns Parsed value
   */
  private parseValue(value: string, type: string): any {
    switch (type) {
      case 'string':
        return value;
        
      case 'number':
        return Number(value);
        
      case 'boolean':
        return value.toLowerCase() === 'true';
        
      case 'object':
      case 'array':
        try {
          return JSON.parse(value);
        } catch {
          throw createCacheError(
            `Invalid JSON for ${type}: ${value}`,
            CacheErrorCode.INTERNAL_ERROR
          );
        }
        
      default:
        return value;
    }
  }
}

/**
 * Create a configuration system
 * 
 * @param schema Configuration schema
 * @param sources Configuration sources
 * @returns Configuration system
 */
export function createConfig(
  schema: ConfigSchema,
  sources: ConfigSource[] = []
): Config {
  return new Config(schema, sources);
}
