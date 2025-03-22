import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redditCache } from "@/lib/reddit-cache"

export async function GET(request: Request) {
  try {
    // In Next.js 15, getServerSession uses headers() and cookies() which must be awaited
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const headers: HeadersInit = {
      Authorization: `Bearer ${session.accessToken}`,
      "User-Agent": "RedditMobile/1.0.0",
    }

    // Use the redditCache with oauth.reddit.com
    const endpoint = "https://oauth.reddit.com/subreddits/mine/subscriber"
    const data = await redditCache.fetchWithCache<any>(endpoint, { headers })

    // Transform the data to match the Subreddit type
    const subreddits = data.data.children.map((subreddit: any) => ({
      id: subreddit.data.id,
      name: subreddit.data.display_name,
      display_name: subreddit.data.display_name,
      title: subreddit.data.title,
      description: subreddit.data.description,
      public_description: subreddit.data.public_description,
      subscribers: subreddit.data.subscribers,
      created: subreddit.data.created,
      over18: subreddit.data.over18,
      icon_img: subreddit.data.icon_img,
      banner_img: subreddit.data.banner_background_image,
      header_img: subreddit.data.header_img,
      user_is_subscriber: subreddit.data.user_is_subscriber,
      user_is_moderator: subreddit.data.user_is_moderator,
      user_is_banned: subreddit.data.user_is_banned,
    }))

    return NextResponse.json(subreddits)
  } catch (error) {
    console.error("Error fetching subscribed subreddits:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

