import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id, saved } = await request.json()

    if (!id || saved === undefined) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const endpoint = saved ? "save" : "unsave"

    const response = await fetch(`https://oauth.reddit.com/api/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "RedditMobileWebUI/1.0.0",
      },
      body: new URLSearchParams({
        id: `t3_${id}`,
      }),
    })

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving post:", error)
    return NextResponse.json({ error: "Failed to save post" }, { status: 500 })
  }
}

