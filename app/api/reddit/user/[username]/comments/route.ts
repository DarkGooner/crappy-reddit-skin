import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
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
    const apiUrl = `https://oauth.reddit.com/user/${username}/comments?after=${after}&sort=${sort}&t=${t}&limit=${limit}`
    
    const data = await redditCache.fetchWithCache<RedditResponse>(apiUrl, { headers })
    
    // Transform comments to a simpler format
    const comments = data.data.children
      // Filter out comments from NSFW posts if showNSFW is false
      .filter((comment: any) => {
        if (!showNSFW && comment.data.over_18) {
          return false;
        }
        return true;
      })
      .map((comment: any) => {
        const commentData = comment.data
        
        return {
          id: commentData.id,
          author: commentData.author,
          body: commentData.body,
          body_html: commentData.body_html,
          created_utc: commentData.created_utc,
          score: commentData.score,
          permalink: commentData.permalink,
          link_id: commentData.link_id,
          link_title: commentData.link_title,
          subreddit: commentData.subreddit,
          subreddit_name_prefixed: commentData.subreddit_name_prefixed,
          likes: commentData.likes,
          depth: commentData.depth || 0,
          is_submitter: commentData.is_submitter,
        }
      })

    return NextResponse.json({
      comments,
      after: data.data.after,
      before: data.data.before,
    })
  } catch (error) {
    console.error("Error fetching user comments:", error)
    return NextResponse.json(
      { error: "Failed to fetch user comments" },
      { status: 500 }
    )
  }
} 