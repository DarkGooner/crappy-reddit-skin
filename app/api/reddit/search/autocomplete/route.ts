import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Force dynamic to ensure proper cookies/headers handling
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const limit = parseInt(searchParams.get("limit") || "10", 10)
  const includeNsfw = searchParams.get("include_nsfw") !== "false" // Default to include NSFW
  const includeUsers = searchParams.get("include_users") !== "false" // Default to include users
  const includeSubs = searchParams.get("include_subs") !== "false" // Default to include subreddits
  const types = searchParams.get("types") || "sr,user" // Default to subreddits and users

  if (!query || query.length < 2) {
    return NextResponse.json([])
  }

  const session = await getServerSession(authOptions)
  const accessToken = session?.accessToken

  try {
    // Prepare the search parameters - match exactly what reddit.com uses
    const params = new URLSearchParams({
      query: query,
      include_over_18: includeNsfw ? "true" : "false",
      include_profiles: includeUsers ? "true" : "false",
      limit: limit.toString(),
      types: types,
      raw_json: "1",
    })

    // Set up the cache control headers to avoid stale results
    const requestInit: RequestInit = {
      headers: {
        "User-Agent": "RedditMobileWebUI/1.0.0 (web-client)",
        "Cache-Control": "no-cache, max-age=0",
      },
      cache: "no-store",
    }

    // First, try to fetch with authentication if available for personalized results
    let response: Response | null = null

    if (accessToken) {
      requestInit.headers = {
        ...requestInit.headers,
        "Authorization": `Bearer ${accessToken}`,
      }

      try {
        response = await fetch(
          `https://oauth.reddit.com/api/subreddit_autocomplete_v2?${params.toString()}`,
          requestInit
        )

        if (!response.ok) {
          console.warn(`Authenticated autocomplete failed with status ${response.status}, falling back to public API`)
          response = null // Reset so we try the public API
        }
      } catch (error) {
        console.error("Error with authenticated autocomplete:", error)
        response = null // Reset so we try the public API
      }
    }

    // If authenticated request failed or no auth token, try public API
    if (!response) {
      response = await fetch(
        `https://www.reddit.com/api/subreddit_autocomplete_v2.json?${params.toString()}`,
        requestInit
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch autocomplete results: ${response.status}`)
      }
    }

    const data = await response.json()
    
    if (!data || !data.data || !data.data.children) {
      return NextResponse.json([])
    }

    // Transform the response to our format, exactly matching reddit.com's structure
    const results = data.data.children.map((child: any) => {
      const item = child.data
      
      // Check if it's a subreddit or user
      if (child.kind === "t5") { // Subreddit
        return {
          id: item.id || `subreddit-${Math.random().toString(36).substring(2, 9)}`,
          type: "subreddit",
          name: item.display_name || "Subreddit",
          display_name: item.display_name,
          display_name_prefixed: item.display_name_prefixed,
          url: item.url,
          over_18: Boolean(item.over_18),
          subscribers: item.subscribers || 0,
          icon_img: item.icon_img || item.community_icon || null,
          community_icon: item.community_icon || null,
          description: item.public_description || "",
          active_user_count: item.active_user_count,
          key_color: item.key_color || "",
          is_subscribed: item.user_is_subscriber || false,
        }
      } else if (child.kind === "t2") { // User
        return {
          id: item.id || `user-${Math.random().toString(36).substring(2, 9)}`,
          type: "user",
          name: item.name || "User",
          profile_img: item.profile_img || item.icon_img || null,
          is_gold: Boolean(item.is_gold),
          is_verified: Boolean(item.verified),
          link_karma: item.link_karma || 0,
          comment_karma: item.comment_karma || 0,
          has_verified_email: Boolean(item.has_verified_email),
          display_name: item.name,
          display_name_prefixed: `u/${item.name}`,
          url: `/user/${item.name}`,
          is_friend: Boolean(item.is_friend),
        }
      }
      
      // Fallback for any other types (shouldn't happen)
      return {
        id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
        type: "unknown",
        name: item.name || item.display_name || "Item",
        display_name: item.display_name || item.name || "Item",
        display_name_prefixed: item.display_name_prefixed || item.name || "Item",
        url: item.url || "",
      }
    }).filter(Boolean); // Remove any null/undefined results

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fetching autocomplete results:", error)
    
    // Return empty results on error to not break the UI
    return NextResponse.json([], { status: 200 })
  }
}

