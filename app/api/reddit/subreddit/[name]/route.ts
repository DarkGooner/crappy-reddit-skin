import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redditCache } from "@/lib/reddit-cache"
import { Subreddit } from "@/types/reddit"

interface SubredditInfoResponse {
  kind: string;
  data: {
    children: Array<{
      kind: string;
      data: {
        id: string;
        display_name: string;
        name: string;
        title: string;
        url: string;
        description: string;
        public_description: string;
        subscribers: number;
        created_utc: number;
        over18: boolean;
        icon_img?: string;
        community_icon?: string;
        banner_img?: string;
        header_img?: string;
        user_is_subscriber?: boolean;
        user_is_moderator?: boolean;
      };
    }>;
  };
}

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  const subredditName = params.name

  if (!subredditName) {
    return NextResponse.json(
      { error: "Subreddit name is required" },
      { status: 400 }
    )
  }

  try {
    const session = await getServerSession(authOptions)
    const accessToken = session?.accessToken

    const headers: HeadersInit = {
      "User-Agent": "RedditMobileWebUI/1.0.0",
    }

    let apiUrl: string
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`
      apiUrl = `https://oauth.reddit.com/r/${subredditName}/about`
    } else {
      apiUrl = `https://www.reddit.com/r/${subredditName}/about.json`
    }

    const data = await redditCache.fetchWithCache<SubredditInfoResponse>(apiUrl, { headers })

    if (!data || !data.data || !data.data.children || data.data.children.length === 0) {
      return NextResponse.json(
        { error: "Subreddit not found" },
        { status: 404 }
      )
    }

    const subredditData = data.data.children[0].data

    const subreddit: Subreddit = {
      id: subredditData.id,
      name: subredditData.name,
      display_name: subredditData.display_name,
      title: subredditData.title,
      url: subredditData.url,
      description: subredditData.description,
      public_description: subredditData.public_description,
      subscribers: subredditData.subscribers,
      created_utc: subredditData.created_utc,
      over18: subredditData.over18,
      icon_img: subredditData.icon_img || subredditData.community_icon,
      banner_img: subredditData.banner_img,
      header_img: subredditData.header_img,
      user_is_subscriber: !!subredditData.user_is_subscriber,
      user_is_moderator: !!subredditData.user_is_moderator,
    }

    return NextResponse.json(subreddit)
  } catch (error) {
    console.error("Error fetching subreddit info:", error)
    return NextResponse.json(
      { error: "Failed to fetch subreddit info" },
      { status: 500 }
    )
  }
} 