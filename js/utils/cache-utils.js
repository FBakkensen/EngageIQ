/**
 * EngageIQ Chrome Extension
 * Cache Utilities Module
 * 
 * This module provides functions for caching API responses to reduce redundant API calls
 * and improve performance for the Smart Suggestions feature.
 */

console.log('EngageIQ: Cache Utilities Module Loaded');

// Cache configuration
const CACHE_CONFIG = {
  DIRECTION_CACHE_PREFIX: 'engageiq_direction_cache_',
  COMMENT_CACHE_PREFIX: 'engageiq_comment_cache_',
  // Default TTL values in milliseconds
  DEFAULT_DIRECTION_TTL: 24 * 60 * 60 * 1000, // 24 hours
  DEFAULT_COMMENT_TTL: 24 * 60 * 60 * 1000, // 24 hours
  // Maximum cache sizes
  MAX_DIRECTION_CACHE_ENTRIES: 50,
  MAX_COMMENT_CACHE_ENTRIES: 50
};

/**
 * Creates a cache key for a specific post content
 * Uses a deterministic hash of the post text for efficient retrieval
 * 
 * @param {string} postText - The post text to create a key for
 * @returns {string} A cache key for the post content
 */
function createCacheKey(postText) {
  // Normalize text by trimming and converting to lowercase
  const normalizedText = postText.trim().toLowerCase();
  
  // Simple hash function for strings
  let hash = 0;
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Retrieves direction analysis results from cache if available and not expired
 * 
 * @param {string} postText - The post text to look up in cache
 * @returns {Object|null} Cached direction data or null if not found/expired
 */
function getCachedDirections(postText) {
  if (!postText) {
    return null;
  }
  
  const cacheKey = `${CACHE_CONFIG.DIRECTION_CACHE_PREFIX}${createCacheKey(postText)}`;
  const cachedData = localStorage.getItem(cacheKey);
  
  if (!cachedData) {
    console.log('EngageIQ: No cached directions found');
    return null;
  }
  
  try {
    const parsedData = JSON.parse(cachedData);
    
    // Check if cache is expired
    if (parsedData.expiresAt && new Date().getTime() > parsedData.expiresAt) {
      console.log('EngageIQ: Cached directions found but expired');
      localStorage.removeItem(cacheKey); // Clean up expired cache
      return null;
    }
    
    console.log('EngageIQ: Retrieved cached directions successfully');
    return parsedData.data;
  } catch (error) {
    console.error('EngageIQ: Error parsing cached directions:', error);
    localStorage.removeItem(cacheKey); // Clean up invalid cache
    return null;
  }
}

/**
 * Stores direction analysis results in cache with TTL
 * 
 * @param {string} postText - The post text to use as cache key
 * @param {Object} directions - The direction data to cache
 * @param {number} ttl - Optional TTL in milliseconds (defaults to 24 hours)
 */
function cacheDirections(postText, directions, ttl = CACHE_CONFIG.DEFAULT_DIRECTION_TTL) {
  if (!postText || !directions) {
    return;
  }
  
  const cacheKey = `${CACHE_CONFIG.DIRECTION_CACHE_PREFIX}${createCacheKey(postText)}`;
  const expiresAt = new Date().getTime() + ttl;
  
  const cacheObject = {
    data: directions,
    cachedAt: new Date().getTime(),
    expiresAt: expiresAt
  };
  
  try {
    // Store in localStorage
    localStorage.setItem(cacheKey, JSON.stringify(cacheObject));
    console.log('EngageIQ: Directions cached successfully');
    
    // Perform cache management to avoid exceeding storage limits
    manageCacheSize(CACHE_CONFIG.DIRECTION_CACHE_PREFIX, CACHE_CONFIG.MAX_DIRECTION_CACHE_ENTRIES);
  } catch (error) {
    console.error('EngageIQ: Error caching directions:', error);
    // If storage error (likely quota exceeded), clean up by removing oldest entries
    cleanupOldestCache(CACHE_CONFIG.DIRECTION_CACHE_PREFIX);
  }
}

/**
 * Retrieves cached comments for a specific direction if available and not expired
 * 
 * @param {string} postText - The post text part of the cache key
 * @param {string} directionTitle - The selected direction title
 * @returns {Object|null} Cached comments or null if not found/expired
 */
function getCachedComments(postText, directionTitle) {
  if (!postText || !directionTitle) {
    return null;
  }
  
  const postKey = createCacheKey(postText);
  const directionKey = directionTitle.trim().toLowerCase().replace(/\s+/g, '_');
  const cacheKey = `${CACHE_CONFIG.COMMENT_CACHE_PREFIX}${postKey}_${directionKey}`;
  
  const cachedData = localStorage.getItem(cacheKey);
  
  if (!cachedData) {
    console.log('EngageIQ: No cached comments found');
    return null;
  }
  
  try {
    const parsedData = JSON.parse(cachedData);
    
    // Check if cache is expired
    if (parsedData.expiresAt && new Date().getTime() > parsedData.expiresAt) {
      console.log('EngageIQ: Cached comments found but expired');
      localStorage.removeItem(cacheKey); // Clean up expired cache
      return null;
    }
    
    console.log('EngageIQ: Retrieved cached comments successfully');
    return parsedData.data;
  } catch (error) {
    console.error('EngageIQ: Error parsing cached comments:', error);
    localStorage.removeItem(cacheKey); // Clean up invalid cache
    return null;
  }
}

/**
 * Stores generated comments in cache with TTL
 * 
 * @param {string} postText - The post text part of the cache key
 * @param {string} directionTitle - The selected direction title
 * @param {Object} comments - The comments data to cache
 * @param {number} ttl - Optional TTL in milliseconds (defaults to 24 hours)
 */
function cacheComments(postText, directionTitle, comments, ttl = CACHE_CONFIG.DEFAULT_COMMENT_TTL) {
  if (!postText || !directionTitle || !comments) {
    return;
  }
  
  const postKey = createCacheKey(postText);
  const directionKey = directionTitle.trim().toLowerCase().replace(/\s+/g, '_');
  const cacheKey = `${CACHE_CONFIG.COMMENT_CACHE_PREFIX}${postKey}_${directionKey}`;
  
  const expiresAt = new Date().getTime() + ttl;
  
  const cacheObject = {
    data: comments,
    cachedAt: new Date().getTime(),
    expiresAt: expiresAt
  };
  
  try {
    // Store in localStorage
    localStorage.setItem(cacheKey, JSON.stringify(cacheObject));
    console.log('EngageIQ: Comments cached successfully');
    
    // Perform cache management to avoid exceeding storage limits
    manageCacheSize(CACHE_CONFIG.COMMENT_CACHE_PREFIX, CACHE_CONFIG.MAX_COMMENT_CACHE_ENTRIES);
  } catch (error) {
    console.error('EngageIQ: Error caching comments:', error);
    // If storage error (likely quota exceeded), clean up by removing oldest entries
    cleanupOldestCache(CACHE_CONFIG.COMMENT_CACHE_PREFIX);
  }
}

/**
 * Manages cache size by removing oldest entries when exceeding maxEntries
 * 
 * @param {string} cachePrefix - The prefix identifying the cache category
 * @param {number} maxEntries - Maximum number of entries to keep
 */
function manageCacheSize(cachePrefix, maxEntries) {
  try {
    // Get all keys for this cache category
    const allKeys = Object.keys(localStorage).filter(key => key.startsWith(cachePrefix));
    
    if (allKeys.length <= maxEntries) {
      return; // Cache size is within limits
    }
    
    console.log(`EngageIQ: Cache size ${allKeys.length} exceeds limit ${maxEntries}, pruning oldest entries`);
    
    // Find cache entries and their timestamps
    const cacheEntries = allKeys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        return {
          key: key,
          cachedAt: data.cachedAt || 0
        };
      } catch {
        return {
          key: key,
          cachedAt: 0 // For invalid entries, prioritize removal
        };
      }
    });
    
    // Sort by time (oldest first)
    cacheEntries.sort((a, b) => a.cachedAt - b.cachedAt);
    
    // Remove oldest entries to get back under the limit
    const entriesToRemove = cacheEntries.slice(0, allKeys.length - maxEntries);
    entriesToRemove.forEach(entry => {
      localStorage.removeItem(entry.key);
      console.log(`EngageIQ: Removed old cache entry: ${entry.key}`);
    });
  } catch (error) {
    console.error('EngageIQ: Error managing cache size:', error);
  }
}

/**
 * Removes the oldest entries from a specific cache category
 * Used as emergency cleanup when storage quota is exceeded
 * 
 * @param {string} cachePrefix - The prefix identifying the cache category
 */
function cleanupOldestCache(cachePrefix) {
  try {
    // Get all keys for this cache category
    const allKeys = Object.keys(localStorage).filter(key => key.startsWith(cachePrefix));
    
    if (allKeys.length === 0) {
      return;
    }
    
    console.log(`EngageIQ: Emergency cache cleanup for ${cachePrefix}`);
    
    // Find the oldest 20% of entries to remove
    const cacheEntries = allKeys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        return {
          key: key,
          cachedAt: data.cachedAt || 0
        };
      } catch {
        return {
          key: key,
          cachedAt: 0 // For invalid entries, prioritize removal
        };
      }
    });
    
    // Sort by time (oldest first)
    cacheEntries.sort((a, b) => a.cachedAt - b.cachedAt);
    
    // Remove the oldest 20% or at least one entry
    const removeCount = Math.max(1, Math.floor(allKeys.length * 0.2));
    const entriesToRemove = cacheEntries.slice(0, removeCount);
    
    entriesToRemove.forEach(entry => {
      localStorage.removeItem(entry.key);
      console.log(`EngageIQ: Emergency removed cache entry: ${entry.key}`);
    });
  } catch (error) {
    console.error('EngageIQ: Error during emergency cache cleanup:', error);
  }
}

// Export cache functions
export {
  getCachedDirections,
  cacheDirections,
  getCachedComments,
  cacheComments
};
