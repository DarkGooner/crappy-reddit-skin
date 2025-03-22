"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { useSession } from "next-auth/react"

interface Notification {
  id: string
  type: "reply" | "mention" | "upvote" | "award" | "message"
  title: string
  body: string
  from: string
  fromAvatar?: string
  subreddit?: string
  postId?: string
  commentId?: string
  read: boolean
  timestamp: number
  link: string
}

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()

  // Load mock notifications
  useEffect(() => {
    if (!session) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    // In a real app, you would fetch notifications from an API
    const mockNotifications: Notification[] = [
      {
        id: "1",
        type: "reply",
        title: "New Reply",
        body: "Someone replied to your comment: \"That's a great point, I hadn't thought of it that way!\"",
        from: "user123",
        fromAvatar: "/placeholder.svg?text=U1",
        subreddit: "AskReddit",
        postId: "post123",
        commentId: "comment456",
        read: false,
        timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
        link: "/r/AskReddit/comments/post123/comment/comment456",
      },
      {
        id: "2",
        type: "upvote",
        title: "Post Upvoted",
        body: 'Your post "What\'s your favorite programming language?" received 25 upvotes',
        from: "system",
        subreddit: "programming",
        postId: "post789",
        read: false,
        timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
        link: "/r/programming/comments/post789",
      },
      {
        id: "3",
        type: "award",
        title: "Award Received",
        body: 'You received a Silver Award on your post "Check out this cool project I made"',
        from: "anonymous",
        subreddit: "webdev",
        postId: "post101",
        read: true,
        timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
        link: "/r/webdev/comments/post101",
      },
      {
        id: "4",
        type: "mention",
        title: "Username Mention",
        body:
          'u/someone mentioned you in a comment: "I think u/' +
          (session?.user?.name || "username") +
          ' would know the answer to this"',
        from: "someone",
        fromAvatar: "/placeholder.svg?text=S",
        subreddit: "AskScience",
        postId: "post202",
        commentId: "comment303",
        read: true,
        timestamp: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
        link: "/r/AskScience/comments/post202/comment/comment303",
      },
      {
        id: "5",
        type: "message",
        title: "New Message",
        body: "Hey, I saw your post about React hooks. Could you explain useEffect a bit more?",
        from: "reactfan",
        fromAvatar: "/placeholder.svg?text=RF",
        read: false,
        timestamp: Date.now() - 1000 * 60 * 15, // 15 minutes ago
        link: "/messages/reactfan",
      },
    ]

    setNotifications(mockNotifications)
    setUnreadCount(mockNotifications.filter((n) => !n.read).length)
  }, [session])

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
    setUnreadCount(0)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reply":
        return "💬"
      case "mention":
        return "@"
      case "upvote":
        return "⬆️"
      case "award":
        return "🏆"
      case "message":
        return "✉️"
      default:
        return "📣"
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b flex flex-row items-center justify-between">
          <SheetTitle>Notifications</SheetTitle>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-5rem)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <p>No notifications</p>
              {!session && <p className="text-sm mt-2">Sign in to see your notifications</p>}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${!notification.read ? "bg-muted/20" : ""}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      {notification.fromAvatar ? (
                        <Avatar>
                          <AvatarImage src={notification.fromAvatar} />
                          <AvatarFallback>{notification.from[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>
                      {notification.subreddit && (
                        <p className="text-xs text-primary mt-1">r/{notification.subreddit}</p>
                      )}
                      {!notification.read && (
                        <div className="mt-2 flex justify-end">
                          <Badge variant="outline" className="text-xs">
                            New
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

