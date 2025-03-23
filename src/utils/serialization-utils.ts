/**
 * @fileoverview Utilities for serializing and deserializing cache data
 */

/**
 * Serialization options
 */
export interface SerializationOptions {
  /**
   * Whether to handle circular references
   */
  handleCircular?: boolean;
  
  /**
   * Custom replacer function for JSON.stringify
   */
  replacer?: (key: string, value: any) => any;
  
  /**
   * Custom reviver function for JSON.parse
   */
  reviver?: (key: string, value: any) => any;
}

/**
 * Serialize data to string
 * 
 * @param data - Data to serialize
 * @param options - Serialization options
 * @returns Serialized data
 */
export function serialize(data: any, options: SerializationOptions = {}): string {
  try {
    if (typeof data === 'string') {
      return data;
    }
    
    const { handleCircular = true, replacer } = options;
    
    if (handleCircular) {
      // Handle circular references
      const seen = new WeakSet();
      const circularReplacer = (key: string, value: any) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return replacer ? replacer(key, value) : value;
      };
      
      return JSON.stringify(data, circularReplacer);
    }
    
    return JSON.stringify(data, replacer as any);
  } catch (error) {
    throw new Error(`Serialization failed: ${error.message}`);
  }
}

/**
 * Deserialize data from string
 * 
 * @param data - Data to deserialize
 * @param options - Deserialization options
 * @returns Deserialized data
 */
export function deserialize<T = any>(data: string, options: SerializationOptions = {}): T {
  try {
    if (data === undefined || data === null) {
      return null as any;
    }
    
    const { reviver } = options;
    return JSON.parse(data, reviver as any);
  } catch (error) {
    throw new Error(`Deserialization failed: ${error.message}`);
  }
}

/**
 * Check if value is serializable
 * 
 * @param value - Value to check
 * @returns True if value can be serialized
 */
export function isSerializable(value: any): boolean {
  try {
    JSON.stringify(value);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Estimate serialized size of a value
 * 
 * @param value - Value to estimate size for
 * @returns Estimated size in bytes
 */
export function estimateSize(value: any): number {
  if (value === undefined || value === null) {
    return 4;
  }
  
  if (typeof value === 'string') {
    return Buffer.byteLength(value, 'utf8');
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return 8;
  }
  
  try {
    const serialized = JSON.stringify(value);
    return Buffer.byteLength(serialized, 'utf8');
  } catch (e) {
    // For non-serializable objects, make a rough estimate
    return 1024;
  }
}

/**
 * Create a deep clone of a value
 * 
 * @param value - Value to clone
 * @returns Deep clone
 */
export function deepClone<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    throw new Error(`Deep clone failed: ${e.message}`);
  }
}