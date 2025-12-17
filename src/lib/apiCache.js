/**
 * API Response Caching Utility
 * 
 * Provides intelligent caching of API responses with:
 * - Time-based expiration
 * - Memory-based cache with LRU eviction
 * - LocalStorage persistence for offline support
 * - Cache invalidation strategies
 * - Request deduplication
 */

// Cache configuration
const CACHE_CONFIG = {
  // Default TTL (Time To Live) in milliseconds
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  
  // Maximum cache size in memory (number of entries)
  maxMemoryEntries: 100,
  
  // Maximum localStorage size (approximate, in bytes)
  maxStorageSize: 5 * 1024 * 1024, // 5MB
  
  // Cache key prefix for localStorage
  storagePrefix: 'fortis_api_cache_',
  
  // Enable/disable localStorage persistence
  persistToStorage: true,
};

// TTL configurations for different resource types
const RESOURCE_TTL = {
  // Frequently changing data - short TTL
  guards: 2 * 60 * 1000, // 2 minutes
  shifts: 2 * 60 * 1000, // 2 minutes
  tasks: 3 * 60 * 1000, // 3 minutes
  incidents: 3 * 60 * 1000, // 3 minutes
  timeTracking: 1 * 60 * 1000, // 1 minute
  
  // Moderately changing data - medium TTL
  clients: 10 * 60 * 1000, // 10 minutes
  sites: 10 * 60 * 1000, // 10 minutes
  posts: 10 * 60 * 1000, // 10 minutes
  assets: 10 * 60 * 1000, // 10 minutes
  
  // Rarely changing data - long TTL
  settings: 30 * 60 * 1000, // 30 minutes
  users: 15 * 60 * 1000, // 15 minutes
  reports: 15 * 60 * 1000, // 15 minutes
  analytics: 5 * 60 * 1000, // 5 minutes (refresh frequently for accuracy)
};

// In-memory cache store
class MemoryCache {
  constructor(maxEntries = CACHE_CONFIG.maxMemoryEntries) {
    this.cache = new Map();
    this.accessOrder = []; // For LRU tracking
    this.maxEntries = maxEntries;
  }

  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }
    
    // Update LRU order
    this.updateAccessOrder(key);
    
    return entry.data;
  }

  set(key, data, ttl = CACHE_CONFIG.defaultTTL) {
    // Evict if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    const entry = {
      data,
      expiresAt: Date.now() + ttl,
      cachedAt: Date.now(),
    };
    
    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    
    // Persist to localStorage if enabled
    if (CACHE_CONFIG.persistToStorage) {
      this.persistToStorage(key, entry);
    }
  }

  delete(key) {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    
    // Remove from localStorage
    try {
      localStorage.removeItem(CACHE_CONFIG.storagePrefix + key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
    
    // Clear localStorage cache
    this.clearStorage();
  }

  updateAccessOrder(key) {
    // Remove existing position
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  evictLRU() {
    // Remove least recently used
    if (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder[0];
      this.delete(lruKey);
    }
  }

  persistToStorage(key, entry) {
    try {
      const storageKey = CACHE_CONFIG.storagePrefix + key;
      const serialized = JSON.stringify(entry);
      
      // Check storage size (rough estimate)
      const estimatedSize = new Blob([serialized]).size;
      if (estimatedSize > CACHE_CONFIG.maxStorageSize / 10) {
        // Entry too large, skip
        return;
      }
      
      localStorage.setItem(storageKey, serialized);
    } catch (error) {
      // localStorage full or disabled
      if (error.name === 'QuotaExceededError') {
        this.clearOldStorageEntries();
      }
    }
  }

  loadFromStorage(key) {
    try {
      const storageKey = CACHE_CONFIG.storagePrefix + key;
      const serialized = localStorage.getItem(storageKey);
      
      if (!serialized) {
        return null;
      }
      
      const entry = JSON.parse(serialized);
      
      // Check if expired
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(storageKey);
        return null;
      }
      
      return entry.data;
    } catch (error) {
      return null;
    }
  }

  clearStorage() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_CONFIG.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
    }
  }

  clearOldStorageEntries() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_CONFIG.storagePrefix));
      
      // Sort by expiration time and remove oldest half
      const entries = cacheKeys.map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          return { key, expiresAt: data.expiresAt };
        } catch {
          return { key, expiresAt: 0 };
        }
      });
      
      entries.sort((a, b) => a.expiresAt - b.expiresAt);
      const toRemove = entries.slice(0, Math.floor(entries.length / 2));
      
      toRemove.forEach(({ key }) => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear old storage entries:', error);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxEntries,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instance
const memoryCache = new MemoryCache();

// Pending requests map for deduplication
const pendingRequests = new Map();

/**
 * Generate cache key from request parameters
 */
export const generateCacheKey = (resource, params = {}) => {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  
  return paramString ? `${resource}?${paramString}` : resource;
};

/**
 * Get TTL for a resource type
 */
export const getTTL = (resource) => {
  return RESOURCE_TTL[resource] || CACHE_CONFIG.defaultTTL;
};

/**
 * Cached API request wrapper
 * 
 * @param {string} resource - Resource identifier (e.g., 'guards', 'clients')
 * @param {Function} fetchFn - Async function that fetches the data
 * @param {Object} options - Cache options
 * @returns {Promise} - Cached or fresh data
 */
export const cachedRequest = async (resource, fetchFn, options = {}) => {
  const {
    params = {},
    ttl = getTTL(resource),
    bypassCache = false,
    forceRefresh = false,
  } = options;
  
  const cacheKey = generateCacheKey(resource, params);
  
  // Check if we should bypass cache
  if (bypassCache) {
    return await fetchFn();
  }
  
  // Check memory cache first
  if (!forceRefresh) {
    const cachedData = memoryCache.get(cacheKey);
    if (cachedData !== null) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return cachedData;
    }
    
    // Check localStorage cache if not in memory
    const storedData = memoryCache.loadFromStorage(cacheKey);
    if (storedData !== null) {
      console.log(`[Storage HIT] ${cacheKey}`);
      // Restore to memory cache
      memoryCache.set(cacheKey, storedData, ttl);
      return storedData;
    }
  }
  
  console.log(`[Cache MISS] ${cacheKey}`);
  
  // Check for pending request (deduplication)
  if (pendingRequests.has(cacheKey)) {
    console.log(`[Request DEDUPE] ${cacheKey}`);
    return pendingRequests.get(cacheKey);
  }
  
  // Fetch fresh data
  const requestPromise = (async () => {
    try {
      const data = await fetchFn();
      
      // Cache the result
      memoryCache.set(cacheKey, data, ttl);
      
      return data;
    } catch (error) {
      // On error, try to return stale cache if available
      const staleData = memoryCache.loadFromStorage(cacheKey);
      if (staleData !== null) {
        console.warn(`[Cache STALE] Using stale cache for ${cacheKey} due to error`);
        return staleData;
      }
      
      throw error;
    } finally {
      // Remove from pending requests
      pendingRequests.delete(cacheKey);
    }
  })();
  
  // Store pending request
  pendingRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
};

/**
 * Invalidate cache for a resource
 */
export const invalidateCache = (resource, params = null) => {
  if (params === null) {
    // Invalidate all entries for this resource
    const keys = Array.from(memoryCache.cache.keys());
    keys.forEach(key => {
      if (key.startsWith(resource)) {
        memoryCache.delete(key);
      }
    });
    console.log(`[Cache INVALIDATE] All entries for ${resource}`);
  } else {
    // Invalidate specific entry
    const cacheKey = generateCacheKey(resource, params);
    memoryCache.delete(cacheKey);
    console.log(`[Cache INVALIDATE] ${cacheKey}`);
  }
};

/**
 * Invalidate multiple related resources
 */
export const invalidateRelated = (resources) => {
  resources.forEach(resource => invalidateCache(resource));
  console.log(`[Cache INVALIDATE] Multiple resources:`, resources);
};

/**
 * Prefetch data into cache
 */
export const prefetchData = async (resource, fetchFn, options = {}) => {
  console.log(`[Cache PREFETCH] ${resource}`);
  return cachedRequest(resource, fetchFn, { ...options, forceRefresh: false });
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  memoryCache.clear();
  console.log('[Cache CLEAR] All cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return memoryCache.getStats();
};

/**
 * Configure cache settings
 */
export const configureCacheSettings = (settings) => {
  Object.assign(CACHE_CONFIG, settings);
};

/**
 * Warm up cache with initial data
 */
export const warmUpCache = async (dataLoaders) => {
  console.log('[Cache WARMUP] Starting cache warm-up...');
  
  const promises = Object.entries(dataLoaders).map(([resource, fetchFn]) => {
    return prefetchData(resource, fetchFn).catch(error => {
      console.warn(`[Cache WARMUP] Failed to prefetch ${resource}:`, error);
    });
  });
  
  await Promise.allSettled(promises);
  console.log('[Cache WARMUP] Cache warm-up complete');
};

// Export cache instance for advanced usage
export { memoryCache };

// Example usage patterns
export const CACHE_EXAMPLES = {
  // Basic usage
  basic: `
    import { cachedRequest } from './lib/apiCache';
    
    const guards = await cachedRequest('guards', async () => {
      return await databases.listDocuments(databaseId, guardsCollectionId);
    });
  `,
  
  // With parameters
  withParams: `
    const activeGuards = await cachedRequest('guards', async () => {
      return await databases.listDocuments(
        databaseId, 
        guardsCollectionId,
        [Query.equal('status', 'active')]
      );
    }, {
      params: { status: 'active' },
      ttl: 5 * 60 * 1000, // 5 minutes
    });
  `,
  
  // Force refresh
  forceRefresh: `
    const freshData = await cachedRequest('guards', fetchFn, {
      forceRefresh: true
    });
  `,
  
  // Invalidate after mutation
  invalidateAfterMutation: `
    // After creating a new guard
    await createGuard(guardData);
    invalidateCache('guards'); // Clear all guards cache
    
    // Or invalidate specific query
    invalidateCache('guards', { status: 'active' });
  `,
  
  // Invalidate related resources
  invalidateRelatedResources: `
    // After updating a client, invalidate related data
    await updateClient(clientData);
    invalidateRelated(['clients', 'sites', 'guards']);
  `,
  
  // Prefetch on navigation
  prefetchOnHover: `
    <Link 
      to="/portal/guards"
      onMouseEnter={() => prefetchData('guards', fetchGuards)}
    >
      Guards
    </Link>
  `,
  
  // Warm up cache on app start
  warmUpOnStart: `
    useEffect(() => {
      warmUpCache({
        guards: () => fetchGuards(),
        clients: () => fetchClients(),
        sites: () => fetchSites(),
      });
    }, []);
  `,
};
