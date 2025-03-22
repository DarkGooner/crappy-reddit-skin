import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import type { Post } from "@/types/reddit"
import { redditCache } from "@/lib/reddit-cache"
import { getMediaInfo } from "@/lib/media-utils"

// Force dynamic to ensure proper cookies/headers handling
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sort = searchParams.get("sort") || "best"
  const timeFilter = searchParams.get("t") || "day"
  const limit = searchParams.get("limit") || "25"
  const after = searchParams.get("after") || ""
  // Get the NSFW preference from query parameters
  const showNSFW = searchParams.get("showNSFW") === "true"
  const skipCache = searchParams.get("skipCache") === "true"

  try {
    const session = await getServerSession(authOptions)

    // Use different base URLs based on authentication status and sort type
    let baseUrl: string;
    let endpointPath: string;

    // For unauthenticated users, convert 'best' to 'hot' since 'best' requires auth
    const effectiveSort = (!session?.accessToken && sort === "best") ? "hot" : sort;
    
    if (session?.accessToken) {
      // User is authenticated, use OAuth endpoint
      baseUrl = "https://oauth.reddit.com";
      endpointPath = effectiveSort;
      console.log("User is authenticated, using user auth token");
    } else {
      // User is not authenticated, use public endpoint
      baseUrl = "https://www.reddit.com";
      
      // For r/all and r/popular, we need special handling
      if (["all", "popular"].includes(effectiveSort)) {
        endpointPath = `${effectiveSort}`;
      } else {
        endpointPath = effectiveSort;
      }
      console.log("User is not authenticated, using public endpoint");
    }

    // Construct the full endpoint URL
    const endpoint = `${baseUrl}/${endpointPath}.json?limit=${limit}&t=${timeFilter}${after ? `&after=${after}` : ""}`;
    console.log(`Fetching home feed from: ${endpoint}`);

    const headers: HeadersInit = {
      "User-Agent": "RedditMobileWebUI/1.0.0",
    }

    // Add authorization header if authenticated
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }

    console.log(`Fetching home feed with sort: ${effectiveSort}, timeFilter: ${timeFilter}, showNSFW: ${showNSFW}`);

    // If skipCache is true, generate a unique URL with a timestamp to force cache miss
    const cacheBustingEndpoint = skipCache 
      ? `${endpoint}&_cb=${Date.now()}` 
      : endpoint;

    // Use the redditCache for API requests
    const data = await redditCache.fetchWithCache<any>(cacheBustingEndpoint, { headers });

    // Process posts
    if (!data || !data.data || !Array.isArray(data.data.children)) {
      console.error("Invalid data structure returned from API:", data);
      return NextResponse.json({ 
        error: "Invalid data received from Reddit API",
        posts: [],
        after: null,
        before: null
      }, { status: 500 });
    }

    // Transform posts with media info
    const posts: Post[] = await Promise.all(
      data.data.children
        .filter((child: any) => {
          if (!child || !child.data) {
            return false;
          }
          // Filter out NSFW content based on showNSFW parameter
          if (child.data.over_18 && !showNSFW) {
            return false;
          }
          return true;
        })
        .map(async (child: any) => {
          const post = child.data
          
          // Get media info using utility function
          const mediaInfo = getMediaInfo(post)
          
          return {
            id: post.id,
            title: post.title,
            author: post.author,
            subreddit: post.subreddit,
            created: post.created_utc,
            score: post.score,
            num_comments: post.num_comments,
            selftext: post.selftext || "",
            selftext_html: post.selftext_html || "",
            over_18: post.over_18,
            media: post.media,
            media_info: mediaInfo,
            permalink: post.permalink,
            url: post.url,
            thumbnail: post.thumbnail,
            upvote_ratio: post.upvote_ratio,
            saved: post.saved,
            hidden: post.hidden || false,
            visited: post.visited || false,
            stickied: post.stickied,
            is_original_content: post.is_original_content,
            is_self: post.is_self,
            domain: post.domain,
            link_flair_text: post.link_flair_text,
            link_flair_background_color: post.link_flair_background_color,
            link_flair_text_color: post.link_flair_text_color,
            post_hint: post.post_hint,
            gallery_data: post.gallery_data,
            media_metadata: post.media_metadata,
            crosspost_parent_list: post.crosspost_parent_list,
            name: post.name,
          }
        })
    )

    return NextResponse.json({
      posts,
      after: data.data.after,
      before: data.data.before,
    })
  } catch (error) {
    console.error("Error fetching posts:", error)
    return NextResponse.json({ 
      error: "Failed to fetch posts. Please try refreshing the page.",
      errorDetails: error instanceof Error ? error.message : "Unknown error",
      posts: [],
      after: null,
      before: null
    }, { status: 500 })
  }
}

