"use client"

import Link from "next/link"
import { ArrowBigUp, ArrowBigDown, MessageSquare, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import UsernameLink from "@/components/username-link"
import { formatRelativeTime, formatScore } from "@/lib/format-utils"
import type { Comment } from "@/types/reddit"
import FormattedContent from "@/components/formatted-content"

interface CommentCardProps {
  comment: Comment
  showSubreddit?: boolean
  onVote?: (commentId: string, direction: number) => void
  onSave?: (commentId: string, saved: boolean) => void
}

export default function CommentCard({ comment, showSubreddit = true, onVote, onSave }: CommentCardProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [userVote, setUserVote] = useState<number>(comment.likes === true ? 1 : comment.likes === false ? -1 : 0)
  const [score, setScore] = useState(comment.score)
  const [isSaved, setIsSaved] = useState(comment.saved || false)

  // Calculate the score based on the user's vote
  const originalScore = comment.score
  const calculatedScore = originalScore - (comment.likes === true ? 1 : comment.likes === false ? -1 : 0) + userVote

  const handleVote = async (direction: number) => {
    if (!session) {
      toast({
        title: "Login required",
        description: "Please login to vote",
        variant: "destructive",
      })
      return
    }

    // Already voted the same way, so undo the vote
    const newDirection = userVote === direction ? 0 : direction

    // Update local state optimistically
    const prevVote = userVote
    setUserVote(newDirection)

    try {
      if (onVote) {
        await onVote(comment.id, newDirection)
      } else {
        const response = await fetch("/api/reddit/vote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: comment.id,
            dir: newDirection,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to vote")
        }
      }
    } catch (error) {
      // Revert on error
      setUserVote(prevVote)
      toast({
        title: "Error",
        description: "Failed to vote. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!session) {
      toast({
        title: "Login required",
        description: "Please login to save comments",
        variant: "destructive",
      })
      return
    }

    const newSavedState = !isSaved
    const prevSavedState = isSaved
    setIsSaved(newSavedState)

    try {
      if (onSave) {
        await onSave(comment.id, newSavedState)
      } else {
        const response = await fetch("/api/reddit/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: comment.id,
            saved: newSavedState,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to save comment")
        }
      }
    } catch (error) {
      // Revert on error
      setIsSaved(prevSavedState)
      toast({
        title: "Error",
        description: "Failed to save comment. Please try again.",
        variant: "destructive",
      })
    }
  }

  const commentThread = comment.permalink || ""
  const postId = commentThread.split("/")[4] // "/r/subreddit/comments/postId/..."
  const commentId = comment.id.slice(3) // Remove "t1_" prefix

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-4 space-y-3 hover:shadow-sm transition-shadow">
      {/* Comment header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback>{comment.author[0]?.toUpperCase()}</AvatarFallback>
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${comment.author}`} />
          </Avatar>
          <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
            <UsernameLink
              username={comment.author}
              prefixU={false}
              isAuthor={true}
              className="font-medium text-primary"
            />
            {comment.is_submitter && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">OP</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.created_utc, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Comment content */}
      <FormattedContent
        html={comment.body_html}
        markdown={comment.body}
        className="prose prose-sm dark:prose-invert max-w-none"
      />

      {/* Comment actions */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center bg-secondary rounded-full">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded-l-full", userVote === 1 && "text-orange-500")}
            onClick={() => handleVote(1)}
          >
            <ArrowBigUp className="h-5 w-5" />
          </Button>
          <span
            className={cn(
              "min-w-[2ch] text-center font-medium",
              userVote === 1 && "text-orange-500",
              userVote === -1 && "text-blue-500",
            )}
          >
            {!comment.score_hidden && formatScore(calculatedScore)}
            {comment.score_hidden && "•"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded-r-full", userVote === -1 && "text-blue-500")}
            onClick={() => handleVote(-1)}
          >
            <ArrowBigDown className="h-5 w-5" />
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="h-8 rounded-full" asChild>
          <Link href={`/r/${comment.subreddit}/comments/${postId}/title/${commentId}`}>
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Reply
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 rounded-full", isSaved && "text-yellow-500")}
          onClick={handleSave}
        >
          <Bookmark className="h-4 w-4" />
        </Button>

        {showSubreddit && (
          <Link href={`/r/${comment.subreddit}`} className="text-xs text-muted-foreground hover:underline ml-auto">
            r/{comment.subreddit}
          </Link>
        )}
      </div>
    </div>
  )
}

