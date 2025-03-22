"use client"

import { useState } from "react"
import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2, Bookmark, BookmarkCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { vote, savePost, unsavePost } from "@/lib/reddit-api"
import { formatScore } from "@/lib/format-utils"

interface PostActionsProps {
  postId: string
  score: number
  numComments: number
  initialVoteState?: -1 | 0 | 1
  initialSaveState?: boolean
  onCommentClick?: () => void
  onVote?: (direction: -1 | 0 | 1) => void
  onSave?: (saved: boolean) => void
  className?: string
}

export default function PostActions({
  postId,
  score,
  numComments,
  initialVoteState = 0,
  initialSaveState = false,
  onCommentClick,
  onVote,
  onSave,
  className,
}: PostActionsProps) {
  const [voteState, setVoteState] = useState<-1 | 0 | 1>(initialVoteState)
  const [currentScore, setCurrentScore] = useState(score)
  const [isSaved, setIsSaved] = useState(initialSaveState)
  const [isVoting, setIsVoting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleVote = async (direction: -1 | 0 | 1) => {
    if (isVoting) return

    setIsVoting(true)
    try {
      // If clicking the same direction, remove the vote
      const newDirection = voteState === direction ? 0 : direction
      await vote(postId, newDirection)

      // Update local state
      setVoteState(newDirection)
      setCurrentScore(score + newDirection - voteState)
      onVote?.(newDirection)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to vote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsVoting(false)
    }
  }

  const handleSave = async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      if (isSaved) {
        await unsavePost(postId)
      } else {
        await savePost(postId)
      }
      setIsSaved(!isSaved)
      onSave?.(!isSaved)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save post. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Vote buttons now horizontal */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${voteState === 1 ? "text-orange-500" : ""}`}
          onClick={() => handleVote(1)}
          disabled={isVoting}
        >
          <ArrowBigUp className="h-5 w-5" />
        </Button>
        <span className="min-w-[2ch] text-center font-medium">{formatScore(currentScore)}</span>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${voteState === -1 ? "text-blue-500" : ""}`}
          onClick={() => handleVote(-1)}
          disabled={isVoting}
        >
          <ArrowBigDown className="h-5 w-5" />
        </Button>
      </div>

      <Button variant="ghost" size="sm" className="flex items-center gap-1.5" onClick={onCommentClick}>
        <MessageSquare className="h-4 w-4" />
        <span>{numComments}</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-1.5"
        onClick={() => {
          if (navigator.share) {
            navigator.share({
              title: document.title,
              url: window.location.href,
            })
          } else {
            navigator.clipboard.writeText(window.location.href)
            toast({
              title: "Link copied",
              description: "The post URL has been copied to your clipboard.",
            })
          }
        }}
      >
        <Share2 className="h-4 w-4" />
        <span>Share</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={`flex items-center gap-1.5 ${isSaved ? "text-yellow-500" : ""}`}
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        <span>{isSaved ? "Saved" : "Save"}</span>
      </Button>
    </div>
  )
}

