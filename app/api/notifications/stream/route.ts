import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const runtime = "edge"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const pollNotifications = async () => {
        try {
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

          // Only send new notifications
          if (notifications.length > 0) {
            const message = `data: ${JSON.stringify(notifications[0])}\n\n`
            controller.enqueue(encoder.encode(message))
          }
        } catch (error) {
          console.error("Error polling notifications:", error)
          controller.error(error)
        }
      }

      // Poll every 30 seconds
      const interval = setInterval(pollNotifications, 30000)

      // Clean up on close
      return () => {
        clearInterval(interval)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

