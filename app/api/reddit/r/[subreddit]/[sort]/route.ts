import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redditCache } from "@/lib/reddit-cache"
import { getMediaInfo } from "@/lib/media-utils"

// Force dynamic to ensure proper cookies/headers handling
export const dynamic = 'force-dynamic'

// Remove the old in-memory caching and rate limiting code since it's in redditCache now
export async function GET(request: Request, context: { params: Promise<{ subreddit: string; sort: string }> }) {
  const url = new URL(request.url)
  const timeFilter = url.searchParams.get("t") || "day"
  const after = url.searchParams.get("after") || ""
  const before = url.searchParams.get("before") || ""
  const limit = url.searchParams.get("limit") || "25"
  // Get NSFW preference from query parameters
  const showNSFW = url.searchParams.get("showNSFW") === "true"
  const { subreddit, sort } = await context.params
  
  try {
    // Get user session to check if authenticated
    const session = await getServerSession(authOptions)
    
    // Set up headers based on authentication status
    const headers: HeadersInit = {
      "User-Agent": "RedditMobileWebUI/1.0.0",
    }
    
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`
      console.log(`Authenticated request to /r/${subreddit}/${sort}`)
    } else {
      console.log(`Unauthenticated request to /r/${subreddit}/${sort} - using app-only auth via redditCache`)
      // redditCache will handle app-only auth
    }
    
    // Always use oauth.reddit.com - our cache will handle authentication for us
    const baseUrl = "https://oauth.reddit.com"
    
    // Fetch subreddit info first to get the icon
    const subredditApiUrl = `${baseUrl}/r/${subreddit}/about`
    
    const subredditData = await redditCache.fetchWithCache<any>(subredditApiUrl, { headers })
    
    let subredditIcon = ""
    let subredditInfo = null
    
    if (subredditData && subredditData.data) {
      subredditInfo = subredditData.data
      subredditIcon = subredditData.data.community_icon || subredditData.data.icon_img || ""
    }
    
    // Fetch posts
    const postsApiUrl = `${baseUrl}/r/${subreddit}/${sort}?t=${timeFilter}&limit=${limit}${after ? `&after=${after}` : ''}`
    
    const postsData = await redditCache.fetchWithCache<any>(postsApiUrl, { headers })
    
    // Transform posts data
    const posts = await Promise.all(
      postsData.data.children
        // Filter NSFW posts based on preference
        .filter((post: any) => {
          if (!showNSFW && post.data.over_18) {
            return false;
          }
          return true;
        })
        .map(async (post: any) => {
          const postData = post.data
          
          // Get media info
          const mediaInfo = getMediaInfo(postData)
          
          return {
            id: postData.name,
            title: postData.title,
            author: postData.author,
            subreddit: postData.subreddit,
            score: postData.score,
            num_comments: postData.num_comments,
            created: postData.created_utc,
            permalink: postData.permalink,
            url: postData.url,
            is_video: postData.is_video,
            selftext: postData.selftext || "",
            selftext_html: postData.selftext_html || "",
            link_flair_text: postData.link_flair_text,
            link_flair_background_color: postData.link_flair_background_color,
            link_flair_text_color: postData.link_flair_text_color,
            over_18: postData.over_18,
            media: postData.media,
            media_info: mediaInfo,
            domain: postData.domain,
            subreddit_icon: subredditIcon,
            preview: postData.preview,
            thumbnail: postData.thumbnail,
            post_hint: postData.post_hint,
            gallery_data: postData.gallery_data,
            media_metadata: postData.media_metadata,
            crosspost_parent_list: postData.crosspost_parent_list,
            name: postData.name,
          }
        })
    )
    
    const responseData = {
      posts,
      after: postsData.data.after,
      before: postsData.data.before,
      subreddit: subredditInfo
        ? {
            id: subredditInfo.name,
            name: subredditInfo.name,
            display_name: subredditInfo.display_name,
            title: subredditInfo.title,
            description: subredditInfo.description,
            subscribers: subredditInfo.subscribers,
            created: subredditInfo.created_utc,
            over18: subredditInfo.over_18,
            icon_img: subredditIcon,
            banner_img: subredditInfo.banner_img,
            header_img: subredditInfo.header_img,
            public_description: subredditInfo.public_description,
            user_is_subscriber: subredditInfo.user_is_subscriber,
            user_is_moderator: subredditInfo.user_is_moderator,
            user_is_banned: subredditInfo.user_is_banned,
          }
        : null,
    }
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error fetching subreddit posts:", error)
    return NextResponse.json(
      { error: "Failed to fetch subreddit posts" },
      { status: 500 }
    )
  }
}

