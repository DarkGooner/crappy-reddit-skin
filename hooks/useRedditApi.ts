import { useState, useEffect, useCallback } from "react"

// Cache for client-side requests
const clientCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const MIN_REQUEST_INTERVAL = 500 // Minimum time between requests (ms)

let lastRequestTime = 0

/**
 * Custom hook for fetching data from Reddit API with caching and rate limiting
 */
export function useRedditApi<T = any>(path: string | null, options?: {
  dependencies?: any[]
  skipCache?: boolean
  params?: Record<string, string>
}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!path) return

    try {
      setLoading(true)
      setError(null)

      // Build the full URL with parameters
      const url = new URL('/api/reddit', window.location.origin)
      url.searchParams.append('path', path)
      
      if (options?.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value) url.searchParams.append(key, value)
        })
      }
      
      const urlString = url.toString()
      
      // Check client-side cache if not skipping
      if (!options?.skipCache) {
        const cachedData = clientCache.get(urlString)
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          setData(cachedData.data)
          setLoading(false)
          return
        }
      }

      // Rate limiting: ensure minimum time between requests
      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTime
      
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => 
          setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
        )
      }
      
      lastRequestTime = Date.now()

      // Make the API request
      const response = await fetch(urlString)
      
      // Log the response
      console.log(`[ClientHook] Response from ${urlString}:`, response)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const result = await response.json()
      
      // Update cache
      clientCache.set(urlString, {
        data: result,
        timestamp: Date.now()
      })
      
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      console.error('Error fetching Reddit data:', err)
    } finally {
      setLoading(false)
    }
  }, [path, options?.skipCache, options?.params])

  useEffect(() => {
    fetchData()
  }, [fetchData, ...(options?.dependencies || [])])

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch }
}

// Helper function to clear the client cache
export function clearRedditApiCache() {
  clientCache.clear()
}

// Hook for fetching a subreddit
export function useSubreddit(subredditName: string | null) {
  return useRedditApi<any>(
    subredditName ? `/r/${subredditName}/about` : null
  )
}

// Hook for fetching user profile
export function useUserProfile(username: string | null) {
  return useRedditApi<any>(
    username ? `/user/${username}/about` : null
  )
}

// Hook for fetching posts
export function usePosts(subreddit: string | null, options?: {
  sort?: string
  time?: string
  limit?: number
  after?: string
}) {
  const params = {
    sort: options?.sort || 'hot',
    t: options?.time || 'day',
    limit: options?.limit?.toString() || '25',
    after: options?.after || ''
  }

  return useRedditApi<any>(
    subreddit ? `/r/${subreddit}` : null,
    { params, dependencies: [options?.sort, options?.time, options?.after] }
  )
}

// Hook for search
export function useSearch(query: string | null, options?: {
  type?: 'link' | 'sr' | 'user'
  sort?: string
  time?: string
  subreddit?: string
  limit?: number
  after?: string
}) {
  const [debouncedQuery, setDebouncedQuery] = useState<string | null>(null)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
    }, 500) // Debounce search queries by 500ms
    
    return () => {
      clearTimeout(handler)
    }
  }, [query])
  
  const params = {
    q: debouncedQuery || '',
    type: options?.type || 'link',
    sort: options?.sort || 'relevance',
    t: options?.time || 'all',
    subreddit: options?.subreddit || '',
    limit: options?.limit?.toString() || '25',
    after: options?.after || ''
  }
  
  return useRedditApi<any>(
    debouncedQuery ? '/search' : null,
    { 
      params, 
      dependencies: [
        debouncedQuery, 
        options?.type, 
        options?.sort, 
        options?.time, 
        options?.subreddit,
        options?.after
      ]
    }
  )
} 