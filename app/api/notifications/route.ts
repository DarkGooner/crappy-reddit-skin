import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    // Fetch notifications from Reddit API
    const response = await fetch("https://oauth.reddit.com/message/unread", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "User-Agent": "RedditMobile/1.0.0",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch notifications")
    }

    const data = await response.json()

    // Transform Reddit's response format to our notification format
    const notifications = data.data.children.map((child: any) => ({
      id: child.data.name,
      type: child.data.type,
      title: child.data.subject || "New Message",
      body: child.data.body,
      created: child.data.created_utc,
      subreddit: child.data.subreddit || "reddit",
      permalink: child.data.context || "",
      isUnread: child.data.new,
    }))

    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

