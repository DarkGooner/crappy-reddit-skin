import fs from 'fs';
import path from 'path';
import { cleanupExpiredCache } from '@/lib/api-cache';

// This file ensures the cache cleanup is initialized on the server side
let initialized = false;

// Cache directory path
const CACHE_DIR = path.join(process.cwd(), '.cache');

export function initCacheCleanup() {
  if (typeof window !== 'undefined' || initialized) {
    return; // Only run on server and only once
  }

  console.log('Initializing API cache system...');

  // Make sure cache directory exists
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      console.log(`Created cache directory at: ${CACHE_DIR}`);
    } else {
      console.log(`Using existing cache directory at: ${CACHE_DIR}`);
    }
  } catch (error) {
    console.error(`Failed to create/verify cache directory: ${CACHE_DIR}`, error);
  }

  // Check if we can write to the cache directory
  try {
    const testFile = path.join(CACHE_DIR, '.test_write');
    fs.writeFileSync(testFile, 'test', 'utf-8');
    fs.unlinkSync(testFile);
    console.log('Cache directory is writable');
  } catch (error) {
    console.error('Cache directory is not writable:', error);
  }

  // Run cleanup immediately to clear any stale cache files
  try {
    cleanupExpiredCache();
    console.log('Initial cache cleanup completed');
  } catch (error) {
    console.error('Failed to perform initial cache cleanup:', error);
  }

  initialized = true;
  console.log('API cache system initialized successfully');
}

// Call the init function
try {
  initCacheCleanup();
} catch (error) {
  console.error('Failed to initialize cache system:', error);
} 