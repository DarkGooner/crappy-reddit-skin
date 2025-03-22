import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redditCache } from "@/lib/reddit-cache"

interface UserProfileResponse {
  kind: string;
  data: {
    is_employee: boolean;
    is_friend: boolean;
    name: string;
    id: string;
    icon_img: string;
    created: number;
    created_utc: number;
    link_karma: number;
    comment_karma: number;
    has_verified_email: boolean;
    is_gold: boolean;
    is_mod: boolean;
    total_karma: number;
    subreddit: {
      display_name_prefixed: string;
      banner_img?: string;
      public_description: string;
      subscribers: number;
    };
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params

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

    // Construct API URL based on authentication
    let apiUrl = ""
    const headers: Record<string, string> = {
      "User-Agent": "RedditMobileWebUI/1.0.0",
    }

    if (accessToken) {
      // Authenticated request
      apiUrl = `https://oauth.reddit.com/user/${username}/about`
      headers["Authorization"] = `Bearer ${accessToken}`
    } else {
      // Public request
      apiUrl = `https://www.reddit.com/user/${username}/about.json`
    }

    const data = await redditCache.fetchWithCache<UserProfileResponse>(apiUrl, { headers })

    // Transform the response to a simpler format
    const userProfile = {
      username: data.data.name,
      id: data.data.id,
      avatar: data.data.icon_img.split('?')[0], // Remove query params
      created: data.data.created_utc,
      link_karma: data.data.link_karma,
      comment_karma: data.data.comment_karma,
      total_karma: data.data.total_karma,
      is_gold: data.data.is_gold,
      is_mod: data.data.is_mod,
      has_verified_email: data.data.has_verified_email,
      is_employee: data.data.is_employee,
      banner: data.data.subreddit?.banner_img || null,
      description: data.data.subreddit?.public_description || "",
      subscribers: data.data.subreddit?.subscribers || 0,
    }

    return NextResponse.json(userProfile)
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    )
  }
} 