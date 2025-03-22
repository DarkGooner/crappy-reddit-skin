import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import type { Post } from "@/types/reddit"
import { redditCache } from "@/lib/reddit-cache"
import { getMediaInfo } from "@/lib/media-utils"

// Force dynamic to ensure proper cookies/headers handling
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const sort = searchParams.get("sort") || "relevance"
    const timeFilter = searchParams.get("t") || "all"
    const subreddit = searchParams.get("subreddit")
    const limit = searchParams.get("limit") || "25"
    const after = searchParams.get("after") || ""
    const include_nsfw = searchParams.get("include_nsfw") !== "false" // Default to include NSFW
    const include_profiles = searchParams.get("include_profiles") === "true" // Optional profile results
    const type = searchParams.get("type") || "link" // link, sr, user, etc.
    
    if (!query) {
      return NextResponse.json({
        posts: [],
        after: null,
        before: null,
        error: "No search query provided"
      }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    
    // Prepare headers
    const headers: HeadersInit = {
      "User-Agent": "RedditMobileWebUI/1.0.0 (web-client)",
    }
    
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`
    }
    
    // Always use oauth.reddit.com for better rate limits and more consistent responses
    const baseUrl = "https://oauth.reddit.com"
    
    // Construct the API URL with exact same parameters as reddit.com uses
    const queryParams = new URLSearchParams()
    queryParams.set("q", query)
    queryParams.set("sort", sort)
    queryParams.set("t", timeFilter)
    queryParams.set("type", type)
    queryParams.set("limit", limit)
    queryParams.set("raw_json", "1")
    queryParams.set("include_over_18", include_nsfw ? "true" : "false")
    
    if (after) queryParams.set("after", after)
    
    // Add syntax to precisely match reddit.com search
    if (query.indexOf("subreddit:") === -1 && query.indexOf("author:") === -1 && subreddit) {
      queryParams.set("restrict_sr", "true")
    }
    
    let apiUrl: string
    
    if (subreddit) {
      apiUrl = `${baseUrl}/r/${encodeURIComponent(subreddit)}/search?${queryParams.toString()}`
    } else {
      apiUrl = `${baseUrl}/search?${queryParams.toString()}`
    }
    
    console.log(`[Search] Fetching from: ${apiUrl}`)
    
    // Use a shorter cache duration for search to ensure fresher results
    const cacheOptions = { 
      headers,
      cacheDuration: 60 * 1000, // 1 minute cache for search results
    }
    
    // Use redditCache to fetch data with proper error handling and rate limiting
    const data = await redditCache.fetchWithCache<any>(apiUrl, cacheOptions)
    
    if (!data || !data.data || !data.data.children) {
      throw new Error("Invalid response structure from Reddit API")
    }
    
    // Transform posts with media info, using parallel processing for better performance
    const posts: Post[] = await Promise.all(
      data.data.children.map(async (child: any) => {
        const post = child.data
        
        // Get media info using utility function - essential for proper post rendering
        const mediaInfo = getMediaInfo(post)
        
        return {
          id: post.id,
          title: post.title,
          author: post.author,
          subreddit: post.subreddit,
          subreddit_name_prefixed: post.subreddit_name_prefixed,
          created: post.created_utc,
          score: post.score,
          ups: post.ups,
          downs: post.downs,
          upvote_ratio: post.upvote_ratio,
          num_comments: post.num_comments,
          selftext: post.selftext || "",
          selftext_html: post.selftext_html || "",
          over_18: post.over_18,
          media: post.media,
          media_info: mediaInfo,
          permalink: post.permalink,
          url: post.url,
          domain: post.domain,
          post_hint: post.post_hint,
          preview: post.preview,
          gallery_data: post.gallery_data,
          media_metadata: post.media_metadata,
          thumbnail: post.thumbnail,
          is_video: post.is_video,
          is_gallery: post.is_gallery,
          is_self: post.is_self,
          link_flair_text: post.link_flair_text,
          link_flair_background_color: post.link_flair_background_color || "",
          link_flair_text_color: post.link_flair_text_color || "",
          saved: post.saved || false,
          hidden: post.hidden || false,
          visited: post.visited || false,
          stickied: post.stickied || false,
          spoiler: post.spoiler || false,
          locked: post.locked || false,
          distinguished: post.distinguished || null,
          contest_mode: post.contest_mode || false,
          pinned: post.pinned || false,
          archived: post.archived || false,
          gilded: post.gilded || 0,
          gildings: post.gildings || {},
          removed_by_category: post.removed_by_category || null,
          removed: post.removed || false,
          crosspost_parent_list: post.crosspost_parent_list,
          crosspost_parent: post.crosspost_parent,
          is_crosspostable: post.is_crosspostable,
          subreddit_subscribers: post.subreddit_subscribers || 0,
          subreddit_type: post.subreddit_type || "public",
          author_flair_text: post.author_flair_text || null,
          author_flair_background_color: post.author_flair_background_color || null,
          author_flair_text_color: post.author_flair_text_color || null,
          awarders: post.awarders || [],
          likes: post.likes,
        }
      })
    )
    
    // Return complete data in the exact format reddit.com would return it
    const response = {
      posts,
      after: data.data.after,
      before: data.data.before,
      dist: data.data.dist,
      geo_filter: data.data.geo_filter || "",
      modhash: "",  // Excluded for security
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching search results:", error)
    return NextResponse.json({ 
      error: "Failed to fetch search results",
      message: error instanceof Error ? error.message : "Unknown error",
      posts: [],
      after: null,
      before: null
    }, { status: 500 })
  }
}

