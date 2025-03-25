/**
 * @fileoverview HTTP constants for the cache system
 */

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  /**
   * OK
   */
  OK: 200,
  
  /**
   * Created
   */
  CREATED: 201,
  
  /**
   * No Content
   */
  NO_CONTENT: 204,
  
  /**
   * Bad Request
   */
  BAD_REQUEST: 400,
  
  /**
   * Unauthorized
   */
  UNAUTHORIZED: 401,
  
  /**
   * Forbidden
   */
  FORBIDDEN: 403,
  
  /**
   * Not Found
   */
  NOT_FOUND: 404,
  
  /**
   * Method Not Allowed
   */
  METHOD_NOT_ALLOWED: 405,
  
  /**
   * Conflict
   */
  CONFLICT: 409,
  
  /**
   * Too Many Requests
   */
  TOO_MANY_REQUESTS: 429,
  
  /**
   * Internal Server Error
   */
  INTERNAL_SERVER_ERROR: 500,
  
  /**
   * Service Unavailable
   */
  SERVICE_UNAVAILABLE: 503,
  
  /**
   * Gateway Timeout
   */
  GATEWAY_TIMEOUT: 504,
};

/**
 * HTTP methods
 */
export const HTTP_METHOD = {
  /**
   * GET method
   */
  GET: 'GET',
  
  /**
   * POST method
   */
  POST: 'POST',
  
  /**
   * PUT method
   */
  PUT: 'PUT',
  
  /**
   * DELETE method
   */
  DELETE: 'DELETE',
  
  /**
   * PATCH method
   */
  PATCH: 'PATCH',
  
  /**
   * HEAD method
   */
  HEAD: 'HEAD',
  
  /**
   * OPTIONS method
   */
  OPTIONS: 'OPTIONS',
};

/**
 * HTTP headers
 */
export const HTTP_HEADER = {
  /**
   * Content Type
   */
  CONTENT_TYPE: 'Content-Type',
  
  /**
   * Authorization
   */
  AUTHORIZATION: 'Authorization',
  
  /**
   * Accept
   */
  ACCEPT: 'Accept',
  
  /**
   * Cache Control
   */
  CACHE_CONTROL: 'Cache-Control',
  
  /**
   * ETag
   */
  ETAG: 'ETag',
  
  /**
   * If-None-Match
   */
  IF_NONE_MATCH: 'If-None-Match',
  
  /**
   * Last-Modified
   */
  LAST_MODIFIED: 'Last-Modified',
  
  /**
   * If-Modified-Since
   */
  IF_MODIFIED_SINCE: 'If-Modified-Since',
  
  /**
   * Expires
   */
  EXPIRES: 'Expires',
  
  /**
   * X-Cache
   */
  X_CACHE: 'X-Cache',
};

/**
 * Content types
 */
export const CONTENT_TYPE = {
  /**
   * JSON
   */
  JSON: 'application/json',
  
  /**
   * XML
   */
  XML: 'application/xml',
  
  /**
   * Form URL Encoded
   */
  FORM: 'application/x-www-form-urlencoded',
  
  /**
   * Multipart Form Data
   */
  MULTIPART: 'multipart/form-data',
  
  /**
   * Text
   */
  TEXT: 'text/plain',
  
  /**
   * HTML
   */
  HTML: 'text/html',
  
  /**
   * Binary
   */
  BINARY: 'application/octet-stream',
  
  /**
   * MessagePack
   */
  MSGPACK: 'application/msgpack',
};