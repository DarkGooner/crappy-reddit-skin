import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redditCache } from "@/lib/reddit-cache"
import { getMediaInfo } from "@/lib/media-utils"
import type { RedditResponse, Post } from "@/types/reddit"

// Force dynamic to ensure proper cookies/headers handling
export const dynamic = 'force-dynamic'

// Extended response type to include search-specific fields
interface SearchRedditResponse extends RedditResponse {
  data: RedditResponse['data'] & {
    geo_filter?: string;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")
  const type = searchParams.get("type") || "link" // link, sr, user
  const sort = searchParams.get("sort") || "relevance" // relevance, hot, top, new, comments
  const t = searchParams.get("t") || "all" // hour, day, week, month, year, all
  const limit = searchParams.get("limit") || "25"
  const after = searchParams.get("after")
  const before = searchParams.get("before")
  const include_over_18 = searchParams.get("include_over_18") !== "false" // Default to include NSFW
  const restrict_sr = searchParams.get("restrict_sr") === "true"
  const subreddit = searchParams.get("subreddit")
  const syntaxSrc = searchParams.get("syntax") || "lucene" // lucene or plain

  if (!q) {
    return NextResponse.json({ error: "Search query is required" }, { status: 400 })
  }

  try {
    const session = await getServerSession(authOptions)
    
    const queryParams = new URLSearchParams()
    queryParams.set("q", q)
    queryParams.set("type", type)
    queryParams.set("sort", sort)
    queryParams.set("t", t)
    queryParams.set("limit", limit)
    queryParams.set("raw_json", "1")
    queryParams.set("include_over_18", include_over_18 ? "true" : "false")
    
    if (restrict_sr) queryParams.set("restrict_sr", "true")
    if (after) queryParams.set("after", after)
    if (before) queryParams.set("before", before)
    if (subreddit) queryParams.set("subreddit", subreddit)
    queryParams.set("syntax", syntaxSrc)
    
    const headers: HeadersInit = {
      "User-Agent": "RedditMobileWebUI/1.0.0 (web-client)",
      "Cache-Control": "no-cache, max-age=0",
    }
    
    // Always use oauth.reddit.com for better rate limits and consistent results
    const baseUrl = "https://oauth.reddit.com"
    
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`
    }

    let apiUrl: string
    
    if (subreddit) {
      apiUrl = `${baseUrl}/r/${encodeURIComponent(subreddit)}/search?${queryParams.toString()}`
    } else {
      apiUrl = `${baseUrl}/search?${queryParams.toString()}`
    }
    
    console.log(`[Search] Executing search: ${apiUrl}`)
    
    // Shorter cache duration for search
    const cacheOptions = {
      headers,
      cacheDuration: 60 * 1000, // 1 minute
    }
    
    const data = await redditCache.fetchWithCache<SearchRedditResponse>(apiUrl, cacheOptions)
    
    if (!data || !data.data || !data.data.children) {
      return NextResponse.json({
        error: "Invalid response from Reddit API",
        posts: [],
        after: null,
        before: null,
      }, { status: 500 })
    }
    
    // For post results, add media info
    if (type === "link") {
      // Process posts in parallel for better performance
      const transformedPosts = await Promise.all(
        data.data.children.map(async (post) => {
          const postData = post.data
          
          // Get media info for the post
          const mediaInfo = getMediaInfo(postData)
          
          return {
            ...postData,
            media_info: mediaInfo,
          }
        })
      )
      
      return NextResponse.json({
        posts: transformedPosts,
        after: data.data.after,
        before: data.data.before,
        dist: data.data.dist || 0,
        geo_filter: data.data.geo_filter || "",
      })
    }
    
    // For subreddit and user search results
    return NextResponse.json({
      items: data.data.children.map(item => item.data),
      after: data.data.after,
      before: data.data.before,
      dist: data.data.dist || 0,
    })
  } catch (error) {
    console.error("Error searching Reddit:", error)
    return NextResponse.json(
      { 
        error: "Failed to search Reddit",
        message: error instanceof Error ? error.message : "Unknown error",
        posts: [],
        after: null,
        before: null,
      },
      { status: 500 }
    )
  }
}

