import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import type { Subreddit } from "@/types/reddit"
//import { withFileCache } from "@/lib/api-cache" //mine
import { redditCache } from "@/lib/reddit-cache"

interface SubredditResponse {
  kind: string;
  data: {
    after: string | null;
    before: string | null;
    children: Array<{
      kind: string;
      data: {
        id: string;
        name: string;
        display_name: string;
        title: string;
        description: string;
        subscribers: number;
        created_utc: number;
        over18: boolean;
        icon_img?: string;
        community_icon?: string;
        banner_img?: string;
        header_img?: string;
        public_description: string;
        user_is_moderator: boolean;
        user_is_banned: boolean;
      };
    }>;
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Use caching for user's subreddits
    const cacheKey = `user-subreddits-${session.user.name}`
    const apiUrl = "https://oauth.reddit.com/subreddits/mine/subscriber?limit=100"
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      "User-Agent": "RedditMobileWebUI/1.0.0",
    }

    const data = await redditCache.fetchWithCache<SubredditResponse>(apiUrl, { headers })

    // Transform the response to our format
    const subreddits: Subreddit[] = data.data.children.map((child) => {
      const subreddit = child.data
      return {
        id: subreddit.id,
        name: subreddit.name,
        display_name: subreddit.display_name,
        title: subreddit.title,
        description: subreddit.description,
        subscribers: subreddit.subscribers,
        created: subreddit.created_utc,
        over18: subreddit.over18,
        icon_img: subreddit.icon_img || subreddit.community_icon,
        banner_img: subreddit.banner_img,
        header_img: subreddit.header_img,
        public_description: subreddit.public_description,
        user_is_subscriber: true,
        user_is_moderator: subreddit.user_is_moderator,
        user_is_banned: subreddit.user_is_banned,
      }
    })

    return NextResponse.json(subreddits)
  } catch (error) {
    console.error("Error fetching subscribed subreddits:", error)
    return NextResponse.json({ error: "Failed to fetch subscribed subreddits" }, { status: 500 })
  }
}

