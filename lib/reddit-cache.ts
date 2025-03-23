import { Post } from "@/types/reddit"

interface CacheEntry<T> {
  data: T
  timestamp: number
}

interface RateLimitInfo {
  remaining: number
  reset: number
  used: number
  limit: number
}

interface AppOnlyToken {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  timestamp: number
}

class RedditCache {
  private static instance: RedditCache
  private cache: Map<string, CacheEntry<any>>
  private rateLimitInfo: RateLimitInfo
  private appOnlyToken: AppOnlyToken | null = null
  private readonly CACHE_DURATION = 0 // Set to 0 to disable caching completely
  private readonly MIN_DELAY = 2000 // 2 seconds
  private readonly MAX_DELAY = 3000 // 3 seconds
  private readonly RATE_LIMIT = 100 // Reddit's rate limit per 10 minutes
  private readonly RATE_WINDOW = 10 * 60 * 1000 // 10 minutes in milliseconds
  private readonly CLIENT_ID = process.env.REDDIT_CLIENT_ID || ""
  private readonly CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || ""

  private constructor() {
    this.cache = new Map()
    this.rateLimitInfo = {
      remaining: this.RATE_LIMIT,
      reset: Date.now() + this.RATE_WINDOW,
      used: 0,
      limit: this.RATE_LIMIT
    }
  }

  public static getInstance(): RedditCache {
    if (!RedditCache.instance) {
      RedditCache.instance = new RedditCache()
    }
    return RedditCache.instance
  }

  private getRandomDelay(): number {
    return Math.floor(Math.random() * (this.MAX_DELAY - this.MIN_DELAY + 1)) + this.MIN_DELAY
  }

  private updateRateLimitInfo(headers: Headers): void {
    const remaining = parseInt(headers.get('x-ratelimit-remaining') || '0')
    const reset = parseInt(headers.get('x-ratelimit-reset') || '0')
    const used = parseInt(headers.get('x-ratelimit-used') || '0')
    const limit = parseInt(headers.get('x-ratelimit-limit') || '0')

    // Log rate limit information when headers are present
    if (remaining || reset || used || limit) {
      console.log(`[RedditCache] Rate limit info - Remaining: ${remaining}, Reset: ${reset}, Used: ${used}, Limit: ${limit}`)
      
      this.rateLimitInfo = {
        remaining: remaining || this.rateLimitInfo.remaining,
        reset: reset || this.rateLimitInfo.reset,
        used: used || this.rateLimitInfo.used,
        limit: limit || this.rateLimitInfo.limit
      }
      
      // Add warning if getting close to rate limit
      if (remaining < 10) {
        console.warn(`[RedditCache] WARNING: Rate limit running low! Only ${remaining} requests remaining.`)
      }
    }
  }

  private async delay(): Promise<void> {
    const delay = this.getRandomDelay()
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  private isRateLimited(): boolean {
    const now = Date.now()
    if (now >= this.rateLimitInfo.reset) {
      // Reset rate limit info
      this.rateLimitInfo = {
        remaining: this.RATE_LIMIT,
        reset: now + this.RATE_WINDOW,
        used: 0,
        limit: this.RATE_LIMIT
      }
      return false
    }
    
    const isLimited = this.rateLimitInfo.remaining <= 5 // Keep a small buffer
    
    if (isLimited) {
      console.warn(`[RedditCache] Rate limited - waiting until ${new Date(this.rateLimitInfo.reset).toISOString()}`)
    }
    
    return isLimited
  }

  /**
   * Get an application-only OAuth token
   */
  private async getAppOnlyToken(): Promise<string> {
    // Check if we have a valid cached token
    if (
      this.appOnlyToken && 
      Date.now() < this.appOnlyToken.timestamp + (this.appOnlyToken.expires_in * 1000) - 60000 // 1 minute buffer
    ) {
      return this.appOnlyToken?.access_token || ''
    }

    // Need to get a new token
    const auth = Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64')
    
    try {
      console.log('[RedditCache] Getting app-only OAuth token')
      
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RedditMobileWebUI/1.0.0'
        },
        body: new URLSearchParams({
          'grant_type': 'client_credentials',
          'device_id': 'DO_NOT_TRACK_THIS_DEVICE'
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to get app-only token: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      this.appOnlyToken = {
        ...data,
        timestamp: Date.now()
      }
      
      console.log(`[RedditCache] Got app-only token, expires in ${data.expires_in}s`)
      
      // Fixed: Add null check before accessing property
      return this.appOnlyToken?.access_token || ''
    } catch (error) {
      console.error('Error getting app-only token:', error)
      throw error
    }
  }

  /**
   * Fetch data with rate limiting and OAuth handling (no caching)
   */
  public async fetchWithCache<T>(url: string, options: RequestInit = {}): Promise<T> {
    console.log(`[RedditCache] Fetching fresh data for ${url.substring(0, 50)}...`)

    // Check rate limits
    if (this.isRateLimited()) {
      const waitTime = this.rateLimitInfo.reset - Date.now() + 1000 // Add 1 second buffer
      console.log(`[RedditCache] Rate limited, waiting ${waitTime}ms before next request`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    // Add delay before making the request
    await this.delay()

    try {
      // Check if we need app-only authentication
      const headers = new Headers(options.headers || {})
      let adjustedUrl = url
      const hasAuthHeader = headers.has('Authorization')
      
      // Special handling for www.reddit.com URLs
      if (url.includes('www.reddit.com')) {
        if (hasAuthHeader) {
          // If we have an auth token, convert to oauth.reddit.com
          adjustedUrl = url.replace('www.reddit.com', 'oauth.reddit.com')
          
          // When using oauth.reddit.com with a user token, we need to remove the .json suffix
          if (adjustedUrl.includes('.json')) {
            adjustedUrl = adjustedUrl.replace('.json', '')
          }
        } else {
          // If no auth token, try to get app-only token for better rate limits
          try {
            const token = await this.getAppOnlyToken()
            headers.set('Authorization', `Bearer ${token}`)
            
            // Convert to oauth.reddit.com with app-only token
            adjustedUrl = url.replace('www.reddit.com', 'oauth.reddit.com')
            
            // When using oauth.reddit.com with an app token, we need to remove the .json suffix
            if (adjustedUrl.includes('.json')) {
              adjustedUrl = adjustedUrl.replace('.json', '')
            }
          } catch (tokenError) {
            // If we can't get an app token, just use the public endpoint
            console.warn('[RedditCache] Failed to get app token, using public endpoint instead')
            // Keep the original URL with www.reddit.com
          }
        }
      } else if (url.includes('oauth.reddit.com') && !hasAuthHeader) {
        // oauth.reddit.com URLs without auth should be converted to use app-only auth
        try {
          const token = await this.getAppOnlyToken()
          headers.set('Authorization', `Bearer ${token}`)
        } catch (tokenError) {
          // If we can't get an app token, fall back to public endpoint
          console.warn('[RedditCache] Failed to get app token, falling back to public endpoint')
          adjustedUrl = url.replace('oauth.reddit.com', 'www.reddit.com')
          
          // Make sure to add .json for public API
          if (!adjustedUrl.includes('.json')) {
            // Determine where to add .json (before query params)
            const queryIndex = adjustedUrl.indexOf('?')
            if (queryIndex !== -1) {
              adjustedUrl = adjustedUrl.substring(0, queryIndex) + '.json' + adjustedUrl.substring(queryIndex)
            } else {
              adjustedUrl = adjustedUrl + '.json'
            }
          }
        }
      }
      
      // Make sure we have the right user agent
      if (!headers.has('User-Agent')) {
        headers.set('User-Agent', 'RedditMobileWebUI/1.0.0')
      }
      
      console.log(`[RedditCache] Fetching ${adjustedUrl.substring(0, 50)}...`)
      
      const response = await fetch(adjustedUrl, {
        ...options,
        headers
      })
      
      // Update rate limit info from response headers
      this.updateRateLimitInfo(response.headers)

      if (!response.ok) {
        console.error(`[RedditCache] HTTP error ${response.status} for ${adjustedUrl.substring(0, 50)}`)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // No longer caching the response
      return data
    } catch (error) {
      console.error('Error fetching data:', error)
      throw error
    }
  }

  public clearCache(): void {
    this.cache.clear()
    console.log('[RedditCache] Cache cleared (though caching is disabled)')
  }

  public getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo }
  }
}

// Export a singleton instance
export const redditCache = RedditCache.getInstance() 