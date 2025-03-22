import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id, dir } = await request.json()

    if (!id || dir === undefined) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const response = await fetch("https://oauth.reddit.com/api/vote", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "RedditMobileWebUI/1.0.0",
      },
      body: new URLSearchParams({
        id: `t3_${id}`,
        dir: dir.toString(),
      }),
    })

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error voting:", error)
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 })
  }
}

