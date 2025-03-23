/**
 * In-memory storage implementation
 */

const store = new Map<string, { value: string; expiry: number | null }>();

/**
 * Get a value from memory storage
 */
export async function getValue(key: string): Promise<string | null> {
  const item = store.get(key);
  
  if (!item) {
    return null;
  }

  if (item.expiry && item.expiry < Date.now()) {
    store.delete(key);
    return null;
  }

  return item.value;
}

/**
 * Set a value in memory storage
 */
export async function setValue(key: string, value: string, ttl?: number): Promise<void> {
  const expiry = ttl ? Date.now() + (ttl * 1000) : null;
  store.set(key, { value, expiry });
}

/**
 * Check if key exists in memory storage
 */
export async function hasKey(key: string): Promise<boolean> {
  const value = await getValue(key);
  return value !== null;
}

/**
 * Delete a key from memory storage
 */
export async function deleteKey(key: string): Promise<boolean> {
  return store.delete(key);
}

/**
 * Clear all data from memory storage
 */
export async function clearStore(): Promise<void> {
  store.clear();
}

/**
 * Get all keys matching a pattern
 */
export async function getKeys(pattern?: string): Promise<string[]> {
  if (!pattern) {
    return Array.from(store.keys());
  }

  try {
    const regex = new RegExp(pattern);
    return Array.from(store.keys()).filter(key => regex.test(key));
  } catch {
    return Array.from(store.keys()).filter(key => key.includes(pattern));
  }
}

/**
 * Get multiple values at once
 */
export async function getMany(keys: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  
  for (const key of keys) {
    result[key] = await getValue(key);
  }
  
  return result;
}

/**
 * Set multiple values at once
 */
export async function setMany(entries: Record<string, string>, ttl?: number): Promise<void> {
  for (const [key, value] of Object.entries(entries)) {
    await setValue(key, value, ttl);
  }
}