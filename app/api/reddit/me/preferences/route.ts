import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import type { UserPreferences } from "@/types/reddit"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch("https://oauth.reddit.com/api/v1/me/prefs", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "User-Agent": "RedditMobileWebUI/1.0.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`)
    }

    const preferences: UserPreferences = await response.json()
    return NextResponse.json(preferences)
  } catch (error) {
    console.error("Error fetching user preferences:", error)
    return NextResponse.json({ error: "Failed to fetch user preferences" }, { status: 500 })
  }
}

