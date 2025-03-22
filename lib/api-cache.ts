import fs from 'fs';
import path from 'path';

// Cache directory path
const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_EXPIRY = 30 * 1000; // 30 seconds in milliseconds

// Create cache directory if it doesn't exist
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`Created cache directory at: ${CACHE_DIR}`);
  }
} catch (error) {
  console.error(`Failed to create cache directory at ${CACHE_DIR}:`, error);
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Generate a cache key based on the API endpoint and params
 */
export function getCacheKey(endpoint: string, params?: Record<string, any>): string {
  try {
    // Create a safe key - no special characters or excessive length
    let key = endpoint.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    if (params && Object.keys(params).length > 0) {
      // Sort keys for consistency and limit key length
      const sortedParams = Object.keys(params)
        .sort()
        .map(k => {
          // Skip null or undefined values
          if (params[k] === null || params[k] === undefined) return '';
          return `${k}=${params[k]}`;
        })
        .filter(Boolean) // Remove empty strings
        .join('&');
      
      if (sortedParams) {
        key += `_${sortedParams.replace(/[^a-z0-9]/gi, '_')}`;
      }
    }
    
    // Ensure key isn't too long for some filesystems (max 255 chars)
    if (key.length > 220) {
      // Use hash of the full key if it's too long
      key = key.substring(0, 200) + '_' + hashCode(key).toString(16);
    }
    
    return key;
  } catch (error) {
    // Fallback if anything goes wrong
    console.error('Error generating cache key:', error);
    return `fallback_key_${Date.now()}`;
  }
}

/**
 * Simple string hash function
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Get the path to the cache file for a given key
 */
function getCacheFilePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.json`);
}

/**
 * Check if a cache file exists and is still valid
 */
export function cacheExists(key: string): boolean {
  try {
    const filePath = getCacheFilePath(key);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const cachedData = JSON.parse(fileContent) as CachedData<any>;
      
      // Check if cache is expired
      return Date.now() - cachedData.timestamp < CACHE_EXPIRY;
    } catch (error) {
      // If there's an error reading or parsing the file, consider the cache invalid
      console.error(`Error reading cache file: ${filePath}`, error);
      
      // Try to delete the corrupted file
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted corrupted cache file: ${filePath}`);
      } catch (deleteError) {
        console.error(`Could not delete corrupted cache file: ${filePath}`, deleteError);
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error checking if cache exists:', error);
    return false;
  }
}

/**
 * Get data from cache
 */
export function getFromCache<T>(key: string): T | null {
  try {
    const filePath = getCacheFilePath(key);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const cachedData = JSON.parse(fileContent) as CachedData<T>;
      
      // Check if cache is expired
      if (Date.now() - cachedData.timestamp >= CACHE_EXPIRY) {
        // Try to delete expired cache
        try {
          fs.unlinkSync(filePath);
        } catch (deleteError) {
          console.error(`Failed to delete expired cache: ${filePath}`, deleteError);
        }
        return null;
      }
      
      return cachedData.data;
    } catch (error) {
      console.error(`Error reading cache file: ${filePath}`, error);
      
      // Try to delete the corrupted file
      try {
        fs.unlinkSync(filePath);
      } catch (deleteError) {
        // Silent fail - already logged above
      }
      
      return null;
    }
  } catch (error) {
    console.error('Error getting data from cache:', error);
    return null;
  }
}

/**
 * Write data to cache
 */
export function writeToCache<T>(key: string, data: T): void {
  try {
    // Don't cache null or undefined data
    if (data === null || data === undefined) {
      console.warn('Attempted to cache null or undefined data');
      return;
    }
    
    const filePath = getCacheFilePath(key);
    const cachedData: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(cachedData), 'utf-8');
    } catch (error) {
      console.error(`Error writing to cache file: ${filePath}`, error);
      
      // Try to ensure the directory exists
      try {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        
        // Try again after ensuring directory exists
        try {
          fs.writeFileSync(filePath, JSON.stringify(cachedData), 'utf-8');
        } catch (retryError) {
          console.error(`Failed to write cache file on retry: ${filePath}`, retryError);
        }
      } catch (mkdirError) {
        console.error(`Failed to create cache directory: ${CACHE_DIR}`, mkdirError);
      }
    }
  } catch (error) {
    console.error('Error writing data to cache:', error);
  }
}

/**
 * Wrapper function to handle API requests with file caching
 * Only used for specified user-related endpoints
 */
export async function withFileCache<T>(
  endpoint: string, 
  fetchFn: () => Promise<T>, 
  params?: Record<string, any>,
  enableCache: boolean = true
): Promise<T> {
  try {
    // If caching is disabled, just call the fetch function
    if (!enableCache) {
      console.log(`Cache disabled for endpoint: ${endpoint}`);
      return fetchFn();
    }
    
    const cacheKey = getCacheKey(endpoint, params);
    
    // Check if valid cache exists
    if (cacheExists(cacheKey)) {
      const cachedData = getFromCache<T>(cacheKey);
      if (cachedData) {
        console.log(`Cache hit for: ${endpoint}`);
        return cachedData;
      }
    }
    
    // If no valid cache, fetch the data
    console.log(`Cache miss for: ${endpoint}, fetching fresh data`);
    const data = await fetchFn();
    
    // Only cache valid data
    if (data !== null && data !== undefined) {
      // Write to cache
      writeToCache(cacheKey, data);
    }
    
    return data;
  } catch (error) {
    console.error(`Error in withFileCache for ${endpoint}:`, error);
    // If anything fails in the caching layer, still try to get the data
    return fetchFn();
  }
}

/**
 * Removes expired cache files
 */
export function cleanupExpiredCache(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      return;
    }
    
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(CACHE_DIR, file);
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const cachedData = JSON.parse(fileContent) as CachedData<any>;
        
        // If cache is expired, delete the file
        if (now - cachedData.timestamp >= CACHE_EXPIRY) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      } catch (error) {
        // If there's an error reading the file, it might be corrupted, so delete it
        console.error(`Error checking cache file ${file}, removing it:`, error);
        try {
          fs.unlinkSync(filePath);
          cleanedCount++;
        } catch (e) {
          console.error(`Failed to delete potentially corrupted cache file: ${filePath}`, e);
        }
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache files`);
    }
  } catch (error) {
    console.error("Error cleaning up expired cache:", error);
  }
}

/**
 * Manually invalides a specific cache entry
 */
export function invalidateCacheEntry(endpoint: string, params?: Record<string, any>): boolean {
  try {
    const cacheKey = getCacheKey(endpoint, params);
    const filePath = getCacheFilePath(cacheKey);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Manually invalidated cache for: ${endpoint}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error invalidating cache entry for ${endpoint}:`, error);
    return false;
  }
}

/**
 * Set up a periodic cache cleanup (run every minute)
 */
if (typeof window === 'undefined') {
  // Only run on the server side
  setInterval(cleanupExpiredCache, 60 * 1000); // Run every minute
  console.log("Cache cleanup scheduler initialized");
} 