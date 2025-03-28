/**
 * Deep merge two objects
 */
export function deepMerge(target: any, source: any): any {
    // Handle null values
    if (source === null) return null;
    if (target === null) return source;

    // Handle undefined target
    if (target === undefined) {
        if (Array.isArray(source)) return [...source];
        if (typeof source === 'object') return {...source};
        return source;
    }

    // Handle arrays - always replace with source array
    if (Array.isArray(source)) return [...source];

    // Handle non-object sources
    if (typeof source !== 'object') return source;
    if (typeof target !== 'object') target = {};

    // Create a copy of target to avoid mutation
    const result = {...target};

    // Handle object merging
    for (const key in source) {
        // Skip undefined values
        if (source[key] === undefined) continue;

        // Use null to delete keys
        if (source[key] === null) {
            result[key] = null;
            continue;
        }

        // Recursively merge objects
        if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key], source[key]);
        } else {
            // Arrays and primitives just get replaced
            result[key] = source[key];
        }
    }

    return result;
}
