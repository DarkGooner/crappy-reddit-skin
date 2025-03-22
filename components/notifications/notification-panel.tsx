"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Bell, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"

interface RedditNotification {
  id: string
  type: string
  title: string
  body: string
  created: number
  subreddit: string
  permalink: string
  isUnread: boolean
}

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<RedditNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()
  const { toast } = useToast()

  useEffect(() => {
    let eventSource: EventSource | null = null

    const fetchNotifications = async () => {
      if (!session) return

      try {
        // Initial fetch of notifications
        const response = await fetch("/api/notifications")
        const data = await response.json()
        setNotifications(data)
        setLoading(false)

        // Set up SSE for real-time updates
        eventSource = new EventSource("/api/notifications/stream")

        eventSource.onmessage = (event) => {
          const newNotification = JSON.parse(event.data)
          setNotifications((prev) => [newNotification, ...prev])

          // Show toast for new notification
          toast({
            title: newNotification.title,
            description: newNotification.body,
            duration: 5000,
          })
        }

        eventSource.onerror = () => {
          console.error("SSE connection error")
          eventSource?.close()
        }
      } catch (err) {
        console.error("Error fetching notifications:", err)
        setError("Failed to load notifications")
        setLoading(false)
      }
    }

    fetchNotifications()

    return () => {
      eventSource?.close()
    }
  }, [session])

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      })

      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isUnread: false } : n)))
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  if (!session) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">Please sign in to view notifications</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Notifications</h2>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setNotifications([])}>
              Clear all
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.isUnread ? "bg-muted/50 border-primary" : "bg-background"
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{notification.body}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>r/{notification.subreddit}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(notification.created * 1000, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  {notification.isUnread && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

