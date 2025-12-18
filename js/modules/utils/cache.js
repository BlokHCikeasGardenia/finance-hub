// Caching Layer Module
// Provides browser caching for API responses, master data, and computed values

// Cache configuration
const CACHE_CONFIG = {
    // Master data cache (categories, accounts, periods)
    MASTER_DATA_TTL: 30 * 60 * 1000, // 30 minutes
    
    // API response cache (stored procedures)
    API_RESPONSE_TTL: 5 * 60 * 1000, // 5 minutes
    
    // Computed values cache
    COMPUTED_VALUES_TTL: 10 * 60 * 1000, // 10 minutes
    
    // Maximum cache size per category
    MAX_CACHE_SIZE: 100
};

// Cache storage
const cacheStorage = {
    masterData: new Map(),
    apiResponses: new Map(),
    computedValues: new Map()
};

// Cache statistics
const cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0
};

/**
 * Generate cache key from function name and arguments
 */
function generateCacheKey(functionName, args) {
    const argsString = JSON.stringify(args);
    return `${functionName}:${argsString}`;
}

/**
 * Check if cache entry is expired
 */
function isExpired(entry) {
    return Date.now() > entry.expiryTime;
}

/**
 * Clean expired entries from cache
 */
function cleanExpiredEntries(cacheMap) {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of cacheMap.entries()) {
        if (now > entry.expiryTime) {
            cacheMap.delete(key);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
}

/**
 * Evict oldest entries when cache is full
 */
function evictOldestEntries(cacheMap, maxSize) {
    if (cacheMap.size <= maxSize) return;
    
    const entriesToRemove = cacheMap.size - maxSize;
    let removed = 0;
    
    // Remove oldest entries (Map preserves insertion order)
    for (const [key] of cacheMap.entries()) {
        if (removed >= entriesToRemove) break;
        
        cacheMap.delete(key);
        removed++;
    }
    
    cacheStats.evictions += removed;
    console.log(`Cache eviction: removed ${removed} oldest entries`);
}

/**
 * Master Data Cache
 */
export const masterDataCache = {
    /**
     * Get cached master data
     */
    get(key) {
        const entry = cacheStorage.masterData.get(key);
        
        if (!entry) {
            cacheStats.misses++;
            return null;
        }
        
        if (isExpired(entry)) {
            cacheStorage.masterData.delete(key);
            cacheStats.misses++;
            return null;
        }
        
        cacheStats.hits++;
        return entry.data;
    },
    
    /**
     * Set cached master data
     */
    set(key, data) {
        const expiryTime = Date.now() + CACHE_CONFIG.MASTER_DATA_TTL;
        const entry = { data, expiryTime, timestamp: Date.now() };
        
        cacheStorage.masterData.set(key, entry);
        
        // Clean expired entries
        cleanExpiredEntries(cacheStorage.masterData);
        
        // Evict oldest if cache is full
        evictOldestEntries(cacheStorage.masterData, CACHE_CONFIG.MAX_CACHE_SIZE);
        
        console.log(`Master data cached: ${key}`);
    },
    
    /**
     * Invalidate cached master data
     */
    invalidate(key) {
        if (cacheStorage.masterData.has(key)) {
            cacheStorage.masterData.delete(key);
            console.log(`Master data cache invalidated: ${key}`);
        }
    },
    
    /**
     * Clear all master data cache
     */
    clear() {
        cacheStorage.masterData.clear();
        console.log('Master data cache cleared');
    },
    
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: cacheStorage.masterData.size,
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            evictions: cacheStats.evictions
        };
    }
};

/**
 * API Response Cache
 */
export const apiResponseCache = {
    /**
     * Get cached API response
     */
    get(key) {
        const entry = cacheStorage.apiResponses.get(key);
        
        if (!entry) {
            cacheStats.misses++;
            return null;
        }
        
        if (isExpired(entry)) {
            cacheStorage.apiResponses.delete(key);
            cacheStats.misses++;
            return null;
        }
        
        cacheStats.hits++;
        return entry.data;
    },
    
    /**
     * Set cached API response
     */
    set(key, data) {
        const expiryTime = Date.now() + CACHE_CONFIG.API_RESPONSE_TTL;
        const entry = { data, expiryTime, timestamp: Date.now() };
        
        cacheStorage.apiResponses.set(key, entry);
        
        // Clean expired entries
        cleanExpiredEntries(cacheStorage.apiResponses);
        
        // Evict oldest if cache is full
        evictOldestEntries(cacheStorage.apiResponses, CACHE_CONFIG.MAX_CACHE_SIZE);
        
        console.log(`API response cached: ${key}`);
    },
    
    /**
     * Invalidate cached API response
     */
    invalidate(key) {
        if (cacheStorage.apiResponses.has(key)) {
            cacheStorage.apiResponses.delete(key);
            console.log(`API response cache invalidated: ${key}`);
        }
    },
    
    /**
     * Clear all API response cache
     */
    clear() {
        cacheStorage.apiResponses.clear();
        console.log('API response cache cleared');
    },
    
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: cacheStorage.apiResponses.size,
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            evictions: cacheStats.evictions
        };
    }
};

/**
 * Computed Values Cache
 */
export const computedValuesCache = {
    /**
     * Get cached computed value
     */
    get(key) {
        const entry = cacheStorage.computedValues.get(key);
        
        if (!entry) {
            cacheStats.misses++;
            return null;
        }
        
        if (isExpired(entry)) {
            cacheStorage.computedValues.delete(key);
            cacheStats.misses++;
            return null;
        }
        
        cacheStats.hits++;
        return entry.data;
    },
    
    /**
     * Set cached computed value
     */
    set(key, data) {
        const expiryTime = Date.now() + CACHE_CONFIG.COMPUTED_VALUES_TTL;
        const entry = { data, expiryTime, timestamp: Date.now() };
        
        cacheStorage.computedValues.set(key, entry);
        
        // Clean expired entries
        cleanExpiredEntries(cacheStorage.computedValues);
        
        // Evict oldest if cache is full
        evictOldestEntries(cacheStorage.computedValues, CACHE_CONFIG.MAX_CACHE_SIZE);
        
        console.log(`Computed value cached: ${key}`);
    },
    
    /**
     * Invalidate cached computed value
     */
    invalidate(key) {
        if (cacheStorage.computedValues.has(key)) {
            cacheStorage.computedValues.delete(key);
            console.log(`Computed value cache invalidated: ${key}`);
        }
    },
    
    /**
     * Clear all computed values cache
     */
    clear() {
        cacheStorage.computedValues.clear();
        console.log('Computed values cache cleared');
    },
    
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: cacheStorage.computedValues.size,
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            evictions: cacheStats.evictions
        };
    }
};

/**
 * Cache Manager - Unified cache operations
 */
export const cacheManager = {
    /**
     * Get data from cache or fetch it
     */
    async getOrFetch(cacheType, key, fetchFunction, options = {}) {
        const cache = this.getCache(cacheType);
        
        // Try to get from cache
        let data = cache.get(key);
        if (data) {
            console.log(`Cache hit for ${key}`);
            return data;
        }
        
        console.log(`Cache miss for ${key}, fetching...`);
        
        try {
            // Fetch data
            data = await fetchFunction();
            
            // Cache the result
            cache.set(key, data);
            
            return data;
        } catch (error) {
            console.error(`Error fetching data for ${key}:`, error);
            throw error;
        }
    },
    
    /**
     * Get appropriate cache based on type
     */
    getCache(cacheType) {
        switch (cacheType) {
            case 'master':
                return masterDataCache;
            case 'api':
                return apiResponseCache;
            case 'computed':
                return computedValuesCache;
            default:
                throw new Error(`Unknown cache type: ${cacheType}`);
        }
    },
    
    /**
     * Invalidate cache entries by pattern
     */
    invalidatePattern(cacheType, pattern) {
        const cache = this.getCache(cacheType);
        const cacheMap = this.getCacheMap(cacheType);
        
        let invalidated = 0;
        const regex = new RegExp(pattern);
        
        for (const [key] of cacheMap.entries()) {
            if (regex.test(key)) {
                cacheMap.delete(key);
                invalidated++;
            }
        }
        
        if (invalidated > 0) {
            console.log(`Invalidated ${invalidated} cache entries matching pattern: ${pattern}`);
        }
    },
    
    /**
     * Get cache map for direct access
     */
    getCacheMap(cacheType) {
        switch (cacheType) {
            case 'master':
                return cacheStorage.masterData;
            case 'api':
                return cacheStorage.apiResponses;
            case 'computed':
                return cacheStorage.computedValues;
            default:
                throw new Error(`Unknown cache type: ${cacheType}`);
        }
    },
    
    /**
     * Clear all caches
     */
    clearAll() {
        masterDataCache.clear();
        apiResponseCache.clear();
        computedValuesCache.clear();
        console.log('All caches cleared');
    },
    
    /**
     * Get overall cache statistics
     */
    getStats() {
        return {
            totalHits: cacheStats.hits,
            totalMisses: cacheStats.misses,
            totalEvictions: cacheStats.evictions,
            cacheSizes: {
                master: cacheStorage.masterData.size,
                api: cacheStorage.apiResponses.size,
                computed: cacheStorage.computedValues.size
            }
        };
    },
    
    /**
     * Log cache statistics
     */
    logStats() {
        const stats = this.getStats();
        const hitRate = stats.totalHits / (stats.totalHits + stats.totalMisses) * 100;
        
        console.log('=== Cache Statistics ===');
        console.log(`Hit Rate: ${hitRate.toFixed(2)}%`);
        console.log(`Total Hits: ${stats.totalHits}`);
        console.log(`Total Misses: ${stats.totalMisses}`);
        console.log(`Total Evictions: ${stats.totalEvictions}`);
        console.log('Cache Sizes:');
        console.log(`  Master Data: ${stats.cacheSizes.master}`);
        console.log(`  API Responses: ${stats.cacheSizes.api}`);
        console.log(`  Computed Values: ${stats.cacheSizes.computed}`);
        console.log('========================');
    }
};

/**
 * Decorator for caching function results
 */
export function cached(cacheType, ttl = null) {
    return function(target, propertyName, descriptor) {
        const method = descriptor.value;
        
        descriptor.value = async function(...args) {
            const cache = cacheManager.getCache(cacheType);
            const key = generateCacheKey(propertyName, args);
            
            // Try cache first
            let result = cache.get(key);
            if (result) {
                return result;
            }
            
            // Execute function and cache result
            result = await method.apply(this, args);
            cache.set(key, result);
            
            return result;
        };
        
        return descriptor;
    };
}

/**
 * Cache-aware Supabase wrapper
 */
export class CachedSupabase {
    constructor() {
        this.cache = apiResponseCache;
    }
    
    /**
     * Execute RPC with caching
     */
    async rpc(functionName, params = {}) {
        const key = `rpc:${functionName}:${JSON.stringify(params)}`;
        
        // Try cache first
        let result = this.cache.get(key);
        if (result) {
            console.log(`Cache hit for RPC: ${functionName}`);
            return result;
        }
        
        // Execute RPC
        console.log(`Cache miss for RPC: ${functionName}, executing...`);
        const { data, error } = await window.supabase.rpc(functionName, params);
        
        if (error) {
            throw error;
        }
        
        // Cache result
        result = { data, error: null };
        this.cache.set(key, result);
        
        return result;
    }
    
    /**
     * Execute query with caching
     */
    async from(table) {
        // Return a cached query builder
        return new CachedQueryBuilder(table, this.cache);
    }
}

/**
 * Cached Query Builder
 */
class CachedQueryBuilder {
    constructor(table, cache) {
        this.table = table;
        this.cache = cache;
        this.queryParts = [];
    }
    
    select(columns = '*') {
        this.queryParts.push(`select:${columns}`);
        return this;
    }
    
    order(column, options = {}) {
        this.queryParts.push(`order:${column}:${JSON.stringify(options)}`);
        return this;
    }
    
    eq(column, value) {
        this.queryParts.push(`eq:${column}:${JSON.stringify(value)}`);
        return this;
    }
    
    gte(column, value) {
        this.queryParts.push(`gte:${column}:${JSON.stringify(value)}`);
        return this;
    }
    
    lte(column, value) {
        this.queryParts.push(`lte:${column}:${JSON.stringify(value)}`);
        return this;
    }
    
    async execute() {
        const key = `query:${this.table}:${this.queryParts.join('|')}`;
        
        // Try cache first
        let result = this.cache.get(key);
        if (result) {
            console.log(`Cache hit for query: ${this.table}`);
            return result;
        }
        
        // Execute query
        console.log(`Cache miss for query: ${this.table}, executing...`);
        let query = window.supabase.from(this.table);
        
        // Rebuild query from parts
        for (const part of this.queryParts) {
            const [type, ...rest] = part.split(':');
            const params = rest.join(':');
            
            switch (type) {
                case 'select':
                    query = query.select(params);
                    break;
                case 'order':
                    const [column, options] = params.split(':');
                    query = query.order(column, JSON.parse(options));
                    break;
                case 'eq':
                    const [eqColumn, eqValue] = params.split(':');
                    query = query.eq(eqColumn, JSON.parse(eqValue));
                    break;
                case 'gte':
                    const [gteColumn, gteValue] = params.split(':');
                    query = query.gte(gteColumn, JSON.parse(gteValue));
                    break;
                case 'lte':
                    const [lteColumn, lteValue] = params.split(':');
                    query = query.lte(lteColumn, JSON.parse(lteValue));
                    break;
            }
        }
        
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // Cache result
        result = { data, error: null };
        this.cache.set(key, result);
        
        return result;
    }
}

// Auto-cleanup expired entries every 5 minutes
setInterval(() => {
    cleanExpiredEntries(cacheStorage.masterData);
    cleanExpiredEntries(cacheStorage.apiResponses);
    cleanExpiredEntries(cacheStorage.computedValues);
}, 5 * 60 * 1000);

// Export default cache manager
export default cacheManager;
