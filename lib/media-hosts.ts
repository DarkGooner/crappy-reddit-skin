/**
 * Custom media hosts management
 * This module provides functionality to manage custom media hosts for rendering
 */

import type { PathLike } from 'fs';

// Import fs and path only in Node.js environment
let fs: {
  existsSync: (path: PathLike) => boolean;
  mkdirSync: (path: PathLike, options?: { recursive?: boolean }) => string | undefined;
  writeFileSync: (path: PathLike, data: string) => void;
  readFileSync: (path: PathLike, encoding: BufferEncoding) => string;
};
let path: {
  join: (...paths: string[]) => string;
};
let MEDIA_HOSTS_PATH: string;

// Only import Node.js modules on the server
if (typeof window === 'undefined') {
  fs = require('fs');
  path = require('path');
  MEDIA_HOSTS_PATH = path.join(process.cwd(), 'data', 'media-hosts.json');
}

// Define the type for a custom media host
export interface CustomMediaHost {
  id: string;
  name: string;
  urlPattern: string; // Example: "https://example.com/{id}.{ext}"
  embedUrlPattern: string; // Example: "https://example.com/embed/{id}"
  sampleUrl?: string; // For testing
  createdAt: number;
}

// Ensure the data directory exists - server-side only
export const ensureDataDir = () => {
  if (typeof window === 'undefined') {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Initialize empty hosts file if it doesn't exist
    if (!fs.existsSync(MEDIA_HOSTS_PATH)) {
      fs.writeFileSync(MEDIA_HOSTS_PATH, JSON.stringify([], null, 2));
    }
  }
};

/**
 * Get all custom media hosts - server-side only
 */
export const getCustomMediaHosts = (): CustomMediaHost[] => {
  // Return empty array on client-side
  if (typeof window !== 'undefined') {
    return [];
  }
  
  try {
    ensureDataDir();
    const data = fs.readFileSync(MEDIA_HOSTS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading media hosts:', error);
    return [];
  }
};

/**
 * Add a new custom media host - server-side only
 */
export const addCustomMediaHost = (host: Omit<CustomMediaHost, 'id' | 'createdAt'>): CustomMediaHost | null => {
  if (typeof window !== 'undefined') {
    return null;
  }
  
  try {
    ensureDataDir();
    const hosts = getCustomMediaHosts();
    
    // Create new host with ID and timestamp
    const newHost: CustomMediaHost = {
      ...host,
      id: Date.now().toString(),
      createdAt: Date.now()
    };
    
    // Add to list and save
    hosts.push(newHost);
    fs.writeFileSync(MEDIA_HOSTS_PATH, JSON.stringify(hosts, null, 2));
    
    return newHost;
  } catch (error) {
    console.error('Error adding media host:', error);
    return null;
  }
};

/**
 * Delete a custom media host - server-side only
 */
export const deleteCustomMediaHost = (id: string): boolean => {
  if (typeof window !== 'undefined') {
    return false;
  }
  
  try {
    ensureDataDir();
    const hosts = getCustomMediaHosts();
    const filteredHosts = hosts.filter(host => host.id !== id);
    
    fs.writeFileSync(MEDIA_HOSTS_PATH, JSON.stringify(filteredHosts, null, 2));
    return true;
  } catch (error) {
    console.error('Error deleting media host:', error);
    return false;
  }
};

/**
 * Extract ID from a media URL based on pattern
 */
export const extractIdFromUrl = (url: string, pattern: string): string | null => {
  // Convert pattern to regex by replacing {id} and {ext} placeholders
  // Make the {ext} part optional by adding a question mark after its capture group
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/{id}/g, '([\\w-]+)')
    .replace(/{ext}/g, '([a-zA-Z0-9]+)?'); // Make extension optional
  
  const regex = new RegExp(regexPattern);
  const match = url.match(regex);
  
  // Return the first capture group (the ID) if found
  return match ? match[1] : null;
};

/**
 * Generate embed URL from ID and pattern
 */
export const generateEmbedUrl = (id: string, pattern: string): string => {
  return pattern.replace('{id}', id);
}; 