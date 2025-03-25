/**
 * @fileoverview Serialization constants for the cache system
 */

/**
 * Serialization formats
 */
export const SERIALIZATION_FORMAT = {
  /**
   * JSON format
   */
  JSON: 'json',
  
  /**
   * MessagePack format
   */
  MSGPACK: 'msgpack',
  
  /**
   * BSON format
   */
  BSON: 'bson',
  
  /**
   * CBOR format
   */
  CBOR: 'cbor',
  
  /**
   * Protocol Buffers format
   */
  PROTOBUF: 'protobuf',
};

/**
 * Type identifiers for special types
 */
export const TYPE_IDENTIFIER = {
  /**
   * Date type
   */
  DATE: '__date__',
  
  /**
   * RegExp type
   */
  REGEXP: '__regexp__',
  
  /**
   * Map type
   */
  MAP: '__map__',
  
  /**
   * Set type
   */
  SET: '__set__',
  
  /**
   * BigInt type
   */
  BIGINT: '__bigint__',
  
  /**
   * Error type
   */
  ERROR: '__error__',
  
  /**
   * URL type
   */
  URL: '__url__',
  
  /**
   * ArrayBuffer type
   */
  ARRAY_BUFFER: '__arraybuffer__',
  
  /**
   * Uint8Array type
   */
  UINT8_ARRAY: '__uint8array__',
  
  /**
   * Symbol type
   */
  SYMBOL: '__symbol__',
  
  /**
   * Function type
   */
  FUNCTION: '__function__',
  
  /**
   * Undefined value
   */
  UNDEFINED: '__undefined__',
  
  /**
   * Circular reference
   */
  CIRCULAR: '__circular__',
};

/**
 * Default serialization options
 */
export const DEFAULT_SERIALIZATION_OPTIONS = {
  /**
   * Whether to handle special types
   */
  HANDLE_SPECIAL_TYPES: true,
  
  /**
   * Whether to handle circular references
   */
  HANDLE_CIRCULAR_REFERENCES: true,
  
  /**
   * Whether to include function source code
   */
  INCLUDE_FUNCTIONS: false,
  
  /**
   * Maximum depth for nested objects
   */
  MAX_DEPTH: 100,
  
  /**
   * Whether to pretty print JSON
   */
  PRETTY_PRINT: false,
  
  /**
   * Space indentation for pretty printing
   */
  INDENT_SPACES: 2,
  
  /**
   * Whether to sort keys in objects
   */
  SORT_KEYS: false,
};