"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { getPostComments, vote, submitComment, subscribeToSubreddit } from "@/lib/reddit-api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import Comment from "./comment"
import { Loader2, RefreshCw, Filter, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface CommentsProps {
  postId: string
  subreddit: string
  isSubscribed?: boolean
  className?: string
}

export default function CommentsSection({ postId, subreddit, isSubscribed = false, className }: CommentsProps) {
  const [comments, setComments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sort, setSort] = useState<"best" | "top" | "new" | "controversial" | "old">("best")
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userSubscribed, setUserSubscribed] = useState(isSubscribed)
  const { data: session } = useSession()
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchComments()
  }, [postId, sort])

  const fetchComments = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      console.log(`Fetching comments for post ${postId} with sort ${sort}`)
      const data = await getPostComments(postId, sort)
      
      if (data && data.length > 0) {
        console.log(`Received ${data.length} comments`)
        setComments(data)
      } else {
        console.log('No comments returned from API')
        setComments([])
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
      toast({
        title: "Error",
        description: "Failed to load comments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleVote = async (commentId: string, direction: -1 | 0 | 1) => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on comments",
        variant: "destructive",
      })
      return
    }

    // Update local state optimistically
    setComments((prevComments) => {
      const updateComment = (comments: any[]): any[] => {
        return comments.map((comment) => {
          if (comment.id === commentId) {
            const prevDirection = comment.likes === true ? 1 : comment.likes === false ? -1 : 0
            const scoreDiff = direction - prevDirection

            return {
              ...comment,
              score: comment.score + scoreDiff,
              likes: direction === 1 ? true : direction === -1 ? false : null,
            }
          }
          if (comment.replies?.length) {
            return {
              ...comment,
              replies: updateComment(comment.replies),
            }
          }
          return comment
        })
      }
      return updateComment(prevComments)
    })

    // Make API call
    try {
      await vote(commentId, direction)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to vote. Please try again.",
        variant: "destructive",
      })
      // Could revert the optimistic update here
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to comment",
        variant: "destructive",
      })
      return
    }

    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      await submitComment(postId, newComment)
      setNewComment("")
      toast({
        title: "Comment posted",
        description: "Your comment has been posted successfully",
      })
      // Refresh comments to show the new one
      fetchComments(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReply = async (commentId: string, text: string) => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to reply to comments",
        variant: "destructive",
      })
      return
    }

    try {
      await submitComment(commentId, text)
      toast({
        title: "Reply posted",
        description: "Your reply has been posted successfully",
      })
      // Refresh comments to show the new reply
      fetchComments(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post reply. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSubscribe = async () => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to subscribe to subreddits",
        variant: "destructive",
      })
      return
    }

    try {
      await subscribeToSubreddit(subreddit, userSubscribed ? "unsub" : "sub")
      setUserSubscribed(!userSubscribed)
      toast({
        title: userSubscribed ? "Unsubscribed" : "Subscribed",
        description: userSubscribed
          ? `You have unsubscribed from r/${subreddit}`
          : `You have subscribed to r/${subreddit}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subscription. Please try again.",
        variant: "destructive",
      })
    }
  }

  const sortOptions: { label: string; value: typeof sort }[] = [
    { label: "Best", value: "best" },
    { label: "Top", value: "top" },
    { label: "New", value: "new" },
    { label: "Controversial", value: "controversial" },
    { label: "Old", value: "old" },
  ]

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full mb-6 rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-32 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-full">
              <Filter className="h-4 w-4 mr-2" />
              {sort.charAt(0).toUpperCase() + sort.slice(1)}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setSort(option.value)}
                className={sort === option.value ? "bg-secondary" : ""}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchComments(true)}
            disabled={isRefreshing}
            className="rounded-full"
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh
          </Button>

          {session && (
            <Button
              variant={userSubscribed ? "outline" : "default"}
              size="sm"
              onClick={handleSubscribe}
              className="rounded-full"
            >
              {userSubscribed ? "Joined" : "Join"}
            </Button>
          )}
        </div>
      </div>

      {session ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex items-start gap-3 bg-secondary/30 p-3 rounded-xl">
            <Avatar className="h-8 w-8 mt-1">
              <AvatarFallback>{session.user?.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
              <AvatarImage
                src={
                  session.user?.image ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${session.user?.name || "User"}`
                }
              />
            </Avatar>
            <div className="flex-1">
              <Textarea
                ref={commentInputRef}
                placeholder="What are your thoughts?"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px] mb-2 bg-background border-0 focus-visible:ring-1"
              />
              <Button type="submit" disabled={!newComment.trim() || isSubmitting} className="rounded-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Comment"
                )}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-6 border rounded-xl bg-secondary/20 text-center">
          <p className="mb-3">Sign in to leave a comment</p>
          <Button onClick={() => (window.location.href = "/auth/signin")} className="rounded-full">
            Sign In
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 bg-secondary/20 rounded-xl">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {comments.map((comment) => (
              <Comment key={comment.id} {...comment} onVote={handleVote} onReply={handleReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

