"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, ArrowBigUp, ArrowBigDown, MoreHorizontal, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { vote, submitComment } from "@/lib/reddit-api"
import { toast } from "@/components/ui/use-toast"
import { formatRelativeTime, formatScore } from "@/lib/format-utils"
import { cn, decodeHtmlEntities } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface CommentProps {
  id: string
  author: string
  body: string
  body_html: string
  score: number
  created_utc: number
  depth: number
  replies?: CommentProps[]
  is_submitter: boolean
  distinguished?: string | null
  stickied?: boolean
  collapsed?: boolean
  score_hidden?: boolean
  onReply?: (commentId: string, text: string) => void
  onVote?: (commentId: string, direction: -1 | 0 | 1) => void
  className?: string
}

export default function Comment({
  id,
  author,
  body,
  body_html,
  score,
  created_utc,
  depth,
  replies,
  is_submitter,
  distinguished,
  stickied,
  collapsed: initialCollapsed,
  score_hidden,
  onReply,
  onVote,
  className,
}: CommentProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [voteState, setVoteState] = useState<-1 | 0 | 1>(0)
  const [currentScore, setCurrentScore] = useState(score)
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const [isVoting, setIsVoting] = useState(false)
  const commentRef = useRef<HTMLDivElement>(null)
  const [showThreadLine, setShowThreadLine] = useState(true)

  // Observer for thread line visibility
  useEffect(() => {
    if (!commentRef.current || depth === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setShowThreadLine(entry.isIntersecting)
        })
      },
      { threshold: 0.1 },
    )

    observer.observe(commentRef.current)

    return () => {
      if (commentRef.current) {
        observer.unobserve(commentRef.current)
      }
    }
  }, [depth])

  const handleVote = async (direction: -1 | 0 | 1) => {
    if (isVoting) return

    setIsVoting(true)
    try {
      const newDirection = voteState === direction ? 0 : direction
      await vote(id, newDirection)

      setVoteState(newDirection)
      setCurrentScore(score + newDirection - voteState)
      onVote?.(id, newDirection)
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

  const handleSubmitReply = async () => {
    if (!replyText.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await submitComment(id, replyText)
      setReplyText("")
      setIsReplying(false)
      onReply?.(id, replyText)
      toast({
        title: "Success",
        description: "Your reply has been posted.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post reply. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div ref={commentRef} className={cn("relative flex flex-col", depth > 0 && "ml-3 md:ml-5 pt-2", className)}>
      {/* Thread indicator line */}
      {depth > 0 && showThreadLine && (
        <div className="absolute left-0 top-0 bottom-0 flex items-stretch">
          <div className="w-[2px] rounded-full opacity-60 bg-primary/60" />
          {/* Curved connector to parent */}
          <div className="absolute top-6 left-0 w-3 h-[2px] rounded-full opacity-60 bg-primary/60" />
        </div>
      )}

      <div className={cn("pl-4 md:pl-6 py-2", isCollapsed ? "opacity-70" : "")}>
        {/* Comment Header */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback>{author[0]?.toUpperCase()}</AvatarFallback>
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${author}`} />
          </Avatar>
          <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
            <button
              className="hover:underline font-medium text-foreground"
              onClick={() => window.location.href = `/user/${author}`}
            >
              {author}
            </button>
            {is_submitter && <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">OP</span>}
            {distinguished === "moderator" && (
              <span className="px-1.5 py-0.5 text-xs bg-green-500 text-white rounded-full">MOD</span>
            )}
            {distinguished === "admin" && (
              <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">ADMIN</span>
            )}
            <span className="text-xs text-muted-foreground">{formatRelativeTime(created_utc * 1000)}</span>
            {stickied && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m18 13-6 6-6-6h4V6h4v7h4z" />
                </svg>
                Pinned
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-auto rounded-full"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>

        {/* Comment Body */}
        {!isCollapsed && (
          <div
            className="text-sm prose prose-sm max-w-none dark:prose-invert mb-2"
            dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(body_html) }}
          />
        )}

        {/* Comment Actions */}
        {!isCollapsed && (
          <div className="flex items-center flex-wrap gap-1 mt-1">
            <div className="flex items-center bg-secondary rounded-full">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-l-full", voteState === 1 ? "text-orange-500" : "")}
                onClick={() => handleVote(1)}
                disabled={isVoting}
              >
                <ArrowBigUp className="h-4 w-4" />
              </Button>
              <span
                className={cn(
                  "min-w-[2ch] text-center text-sm font-medium",
                  voteState === 1 ? "text-orange-500" : "",
                  voteState === -1 ? "text-blue-500" : "",
                )}
              >
                {score_hidden ? "•" : formatScore(currentScore)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-r-full", voteState === -1 ? "text-blue-500" : "")}
                onClick={() => handleVote(-1)}
                disabled={isVoting}
              >
                <ArrowBigDown className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full text-xs"
              onClick={() => setIsReplying(!isReplying)}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Reply
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Reply Form */}
        {isReplying && !isCollapsed && (
          <div className="mt-3 space-y-2 bg-secondary/30 p-3 rounded-lg">
            <Textarea
              placeholder="What are your thoughts?"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[100px] bg-background"
            />
            <div className="flex items-center gap-2">
              <Button onClick={handleSubmitReply} disabled={!replyText.trim() || isSubmitting} className="rounded-full">
                Reply
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsReplying(false)
                  setReplyText("")
                }}
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {!isCollapsed && replies?.length > 0 && (
        <div className="space-y-1">
          {replies.map((reply) => (
            <Comment key={reply.id} {...reply} depth={depth + 1} onReply={onReply} onVote={onVote} />
          ))}
        </div>
      )}
    </div>
  )
}

