/**
 * Configuration for Reddit API Routes
 * 
 * This file contains configurations for all Reddit API routes 
 * to ensure proper handling of cookies, headers, and dynamic data.
 */

export const apiConfig = {
  // Force dynamic rendering for all routes that use cookies or headers
  dynamic: "force-dynamic",

  // Common headers for all Reddit API requests
  defaultHeaders: {
    "User-Agent": "RedditMobileWebUI/1.0.0",
  },

  // Cache configuration for API responses
  cache: {
    // Default cache duration in milliseconds (5 minutes)
    defaultDuration: 5 * 60 * 1000,
    
    // Cache key prefix for Redis or other cache implementations
    keyPrefix: "reddit-api",
  },
  
  // Rate limiting configuration (Reddit API limits)
  rateLimit: {
    // Maximum requests per minute
    requestsPerMinute: 60,
    
    // Delay between requests in milliseconds (to avoid rate limits)
    minDelay: 100,
  },
  
  // Error handling helpers
  errors: {
    // Standard error responses
    notFound: {
      message: "The requested resource could not be found",
      status: 404,
    },
    unauthorized: {
      message: "Authentication is required to access this resource",
      status: 401,
    },
    forbidden: {
      message: "You do not have permission to access this resource",
      status: 403,
    },
    tooManyRequests: {
      message: "Too many requests, please try again later",
      status: 429,
    },
    nsfw: {
      message: "This content contains NSFW material that is filtered by your settings",
      status: 403,
    },
  },
};
