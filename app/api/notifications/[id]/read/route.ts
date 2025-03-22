import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    // Mark message as read in Reddit API
    const response = await fetch("https://oauth.reddit.com/api/read_message", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "User-Agent": "RedditMobile/1.0.0",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `id=${params.id}`,
    })

    if (!response.ok) {
      throw new Error("Failed to mark notification as read")
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

