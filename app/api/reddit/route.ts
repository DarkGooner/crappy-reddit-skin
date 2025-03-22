import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redditCache } from "@/lib/reddit-cache"

// Force dynamic to ensure proper cookies/headers handling
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const path = searchParams.get("path")
    const sort = searchParams.get("sort") || "hot"
    const time = searchParams.get("t") || "day"
    const after = searchParams.get("after")
    const before = searchParams.get("before")
    const limit = searchParams.get("limit") || "25"

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 })
    }

    const baseUrl = "https://oauth.reddit.com"
    const url = new URL(`${baseUrl}${path}`)
    url.searchParams.append("sort", sort)
    url.searchParams.append("t", time)
    if (after) url.searchParams.append("after", after)
    if (before) url.searchParams.append("before", before)
    url.searchParams.append("limit", limit)

    const headers: HeadersInit = {
      "User-Agent": "RedditMobile/1.0",
    }

    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`
    }

    const data = await redditCache.fetchWithCache(url.toString(), { headers })
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching Reddit data:", error)
    return NextResponse.json(
      { error: "Failed to fetch Reddit data" },
      { status: 500 }
    )
  }
} 