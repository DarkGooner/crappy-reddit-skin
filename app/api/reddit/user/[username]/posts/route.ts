import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getMediaInfo } from "@/lib/media-utils"
import { redditCache } from "@/lib/reddit-cache"
import type { RedditResponse } from "@/types/reddit"

// Force dynamic to ensure proper headers/cookies context handling
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params
  const { searchParams } = new URL(request.url)
  
  // Pagination and sorting parameters
  const after = searchParams.get("after") || ""
  const sort = searchParams.get("sort") || "new"
  const t = searchParams.get("t") || "all"
  const limit = Number(searchParams.get("limit")) || 25
  // Get NSFW preference
  const showNSFW = searchParams.get("showNSFW") === "true"

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    )
  }

  try {
    // Get user session to check if authenticated - use dynamic = force-dynamic to ensure proper async context
    const session = await getServerSession(authOptions)
    const accessToken = session?.accessToken

    // Set up headers
    const headers: Record<string, string> = {
      "User-Agent": "RedditMobileWebUI/1.0.0",
    }

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`
    }

    // Always use oauth.reddit.com with our enhanced cache
    const apiUrl = `https://oauth.reddit.com/user/${username}/submitted?after=${after}&sort=${sort}&t=${t}&limit=${limit}`
    
    const data = await redditCache.fetchWithCache<RedditResponse>(apiUrl, { headers })
    
    // Transform posts to include media info
    const transformedPosts = await Promise.all(
      data.data.children
        // Filter NSFW content based on preference
        .filter((post: any) => {
          if (!showNSFW && post.data.over_18) {
            return false;
          }
          return true;
        })
        .map(async (post: any) => {
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
    })
  } catch (error) {
    console.error("Error in user posts API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 