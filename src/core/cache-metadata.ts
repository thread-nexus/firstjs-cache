/**
 * @fileoverview Cache metadata handling
 */

import {ICacheProvider} from '../interfaces/i-cache-provider';
import {EntryMetadata} from '../types';
import {CacheProviderSelector} from './cache-provider-selection';

/**
 * A class responsible for managing cache metadata.
 */
export class CacheMetadataHandler {
    /**
     * Create a new cache metadata handler
     */
    constructor(
        private providers: Map<string, ICacheProvider>,
        private providerSelector: CacheProviderSelector
    ) {}

    /**
     * Get metadata for a cache key
     */
    getMetadata(key: string): EntryMetadata | undefined {
        try {
            const provider = this.providerSelector.getProvider('default');
            if (!provider || typeof provider.getMetadata !== 'function') {
                return undefined;
            }

            const metadata = provider.getMetadata(key);
            if (metadata &&
                typeof metadata === 'object' &&
                'tags' in metadata &&
                'createdAt' in metadata &&
                'size' in metadata &&
                'lastAccessed' in metadata &&
                'accessCount' in metadata) {
                return metadata as unknown as EntryMetadata;
            }

            return undefined;
        } catch (error) {
            console.error('Error getting metadata:', error);
            return undefined;
        }
    }
}