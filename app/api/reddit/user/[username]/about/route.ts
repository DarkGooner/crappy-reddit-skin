import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redditCache } from "@/lib/reddit-cache"

// Force dynamic to ensure proper headers/cookies context handling
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    )
  }

  try {
    // Get user session to check if authenticated
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
    const apiUrl = `https://oauth.reddit.com/user/${username}/about`
    
    // Use the redditCache for better performance and rate limit handling
    const data = await redditCache.fetchWithCache<any>(apiUrl, { headers })
    const userData = data.data

    // Transform the user data
    const transformedData = {
      name: userData.name,
      id: userData.id,
      created: userData.created,
      karma: {
        post: userData.link_karma,
        comment: userData.comment_karma,
        total: userData.link_karma + userData.comment_karma,
        awardee: userData.awardee_karma,
        awarder: userData.awarder_karma,
      },
      avatar: userData.icon_img || userData.snoovatar_img || null,
      banner: userData.banner_img || null,
      description: userData.subreddit?.description || userData.public_description || "",
      is_mod: userData.is_mod,
      is_gold: userData.is_gold,
      has_verified_email: userData.has_verified_email,
      is_suspended: userData.is_suspended,
      is_friend: userData.is_friend,
      accept_followers: userData.accept_followers,
      has_subscribed: userData.has_subscribed,
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error("Error in user profile API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 