"use client"

import React, { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { formatDistanceToNow } from "date-fns"
import { ArrowUp, ArrowDown, ChevronDown, MessageSquare, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { submitComment } from "@/lib/reddit-api"
import type { Comment } from "@/types/reddit"
import FormattedContent from "@/components/formatted-content"
import Link from "next/link"

interface CommentSectionProps {
  postId: string
  permalink: string
}

type SortOption = "best" | "top" | "new" | "controversial" | "old" | "qa"

export default function CommentSection({ postId, permalink }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>("best")
  const { data: session } = useSession()

  const fetchComments = async (sort: SortOption) => {
    setLoading(true)
    try {
      // In a real implementation, you would fetch from Reddit API with the sort parameter
      // For example: GET /comments/{postId}?sort={sort}
      setTimeout(() => {
        // For now, we'll use mock data
        // In a real implementation, you would fetch from Reddit API
        const mockComments: Comment[] = [
          {
            id: "comment1",
            author: "user123",
            body: "This is a great post! I really enjoyed reading it. The content is very informative and well-presented. I appreciate the effort that went into creating this.",
            created_utc: Date.now() / 1000 - 3600,
            score: 42,
            depth: 0,
            is_submitter: false,
            stickied: false,
          },
          {
            id: "comment2",
            author: "moderator",
            body: "Please remember to follow the community guidelines when commenting. We want to maintain a respectful and constructive environment for all users. Thank you for your cooperation.",
            created_utc: Date.now() / 1000 - 7200,
            score: 15,
            depth: 0,
            is_submitter: false,
            distinguished: "moderator",
            stickied: true,
          },
          {
            id: "comment3",
            author: "enthusiast",
            body: "I have a question about this. Has anyone tried implementing this approach in a different context? I'm curious about how it would perform in various scenarios and if there are any limitations or considerations to be aware of.",
            created_utc: Date.now() / 1000 - 5400,
            score: 8,
            depth: 0,
            is_submitter: false,
            stickied: false,
            replies: [
              {
                id: "comment4",
                author: "expert",
                body: "Yes, I've tried it in several contexts. It works well for X but not for Y because of Z reasons. You need to consider factors like performance, compatibility, and user experience. I'd be happy to share more details about my implementation if you're interested.",
                created_utc: Date.now() / 1000 - 3600,
                score: 12,
                depth: 1,
                is_submitter: false,
                stickied: false,
                replies: [
                  {
                    id: "comment5",
                    author: "enthusiast",
                    body: "That's really helpful, thank you! I'd love to hear more about your implementation. Did you encounter any specific challenges or unexpected behaviors?",
                    created_utc: Date.now() / 1000 - 1800,
                    score: 5,
                    depth: 2,
                    is_submitter: false,
                    stickied: false,
                  },
                ],
              },
            ],
          },
          {
            id: "comment6",
            author: "newbie",
            body: "I'm new to this topic. Can someone explain the basic concepts in simpler terms? I'm trying to understand but finding some of the terminology confusing.",
            created_utc: Date.now() / 1000 - 10800,
            score: 3,
            depth: 0,
            is_submitter: false,
            stickied: false,
            replies: [
              {
                id: "comment7",
                author: "helpful_user",
                body: "Of course! The basic idea is [detailed explanation with simplified terminology]. Hope that helps! Let me know if you have any other questions.",
                created_utc: Date.now() / 1000 - 9000,
                score: 7,
                depth: 1,
                is_submitter: false,
                stickied: false,
              },
            ],
          },
          {
            id: "comment8",
            author: "critic",
            body: "I disagree with some points in this post. Specifically, [detailed critique with supporting evidence]. I think it's important to consider alternative perspectives.",
            created_utc: Date.now() / 1000 - 14400,
            score: -2,
            depth: 0,
            is_submitter: false,
            stickied: false,
            replies: [
              {
                id: "comment9",
                author: "original_poster",
                body: "Thank you for your feedback. You make some valid points. I'll consider these perspectives in future posts.",
                created_utc: Date.now() / 1000 - 12600,
                score: 4,
                depth: 1,
                is_submitter: true,
                stickied: false,
              },
            ],
          },
        ]

        // Sort comments based on the selected option
        const sortedComments = sortComments(mockComments, sort)
        setComments(sortedComments)
        setLoading(false)
      }, 1000)
    } catch (err) {
      console.error("Error fetching comments:", err)
      setError("Failed to load comments. Please try again later.")
      setLoading(false)
    }
  }

  const sortComments = (commentsToSort: Comment[], sort: SortOption): Comment[] => {
    const sortFunctions = {
      best: (a: Comment, b: Comment) => b.score - a.score,
      top: (a: Comment, b: Comment) => b.score - a.score,
      new: (a: Comment, b: Comment) => b.created_utc - a.created_utc,
      controversial: (a: Comment, b: Comment) => a.score - b.score,
      old: (a: Comment, b: Comment) => a.created_utc - b.created_utc,
      qa: (a: Comment, b: Comment) => (b.is_submitter ? 1 : 0) - (a.is_submitter ? 1 : 0),
    }

    return [...commentsToSort].sort(sortFunctions[sort])
  }

  useEffect(() => {
    fetchComments(sortBy)
  }, [postId, sortBy])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) {
      // Prompt user to sign in
      return
    }

    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      // In a real implementation, you would post to Reddit API
      // For now, we'll just add it to the local state
      const newCommentObj: Comment = {
        id: `comment${Date.now()}`,
        author: session.user.name,
        body: newComment,
        created_utc: Date.now() / 1000,
        score: 1,
        depth: 0,
        is_submitter: true,
        stickied: false,
      }

      setComments([newCommentObj, ...comments])
      setNewComment("")
    } catch (err) {
      console.error("Error posting comment:", err)
      alert("Failed to post comment. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const loadMoreComments = async () => {
    setLoadingMore(true)

    // Simulate loading more comments
    setTimeout(() => {
      const additionalComments: Comment[] = [
        {
          id: "comment10",
          author: "late_commenter",
          body: "I know I'm late to the discussion, but I wanted to add that this topic has been really helpful for my research. Thanks for sharing!",
          created_utc: Date.now() / 1000 - 86400, // 1 day ago
          score: 2,
          depth: 0,
          is_submitter: false,
          stickied: false,
        },
        {
          id: "comment11",
          author: "question_asker",
          body: "Has anyone found resources for learning more about this topic? I'd appreciate any recommendations for books, courses, or websites.",
          created_utc: Date.now() / 1000 - 172800, // 2 days ago
          score: 1,
          depth: 0,
          is_submitter: false,
          stickied: false,
          replies: [
            {
              id: "comment12",
              author: "resource_sharer",
              body: "I found these resources really helpful: [list of detailed resources with descriptions]. They cover everything from basics to advanced topics.",
              created_utc: Date.now() / 1000 - 86400, // 1 day ago
              score: 3,
              depth: 1,
              is_submitter: false,
              stickied: false,
            },
          ],
        },
      ]

      setComments([...comments, ...additionalComments])
      setLoadingMore(false)
    }, 1500)
  }

  const renderComment = (comment: Comment) => {
    return (
      <div key={comment.id} className={cn("mb-4", comment.depth > 0 && "ml-6 border-l-2 pl-4 border-muted")}>
        <div className="flex items-start gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback>{comment.author[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Link 
                href={`/user/${comment.author}`} 
                className={cn(
                  "text-sm font-medium hover:underline",
                  comment.is_submitter && "text-primary",
                  comment.distinguished === "moderator" && "text-green-500",
                  comment.distinguished === "admin" && "text-red-500",
                )}
              >
                {comment.author}
                {comment.is_submitter && " (OP)"}
                {comment.distinguished === "moderator" && " [MOD]"}
                {comment.distinguished === "admin" && " [ADMIN]"}
              </Link>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_utc * 1000), { addSuffix: true })}
              </span>
              {comment.stickied && <span className="text-xs text-green-500">Pinned</span>}
            </div>
            <FormattedContent 
              html={comment.body_html}
              markdown={comment.body}
              className="mt-1 text-sm"
            />
            <div className="mt-2 flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                <ArrowUp className="h-3 w-3" />
              </Button>
              <span className="text-xs font-medium">{comment.score}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                Reply
              </Button>
            </div>
          </div>
        </div>
        {comment.replies?.map(renderComment)}
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Comments</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Sort by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortBy("best")}>Best</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("top")}>Top</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("new")}>New</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("controversial")}>Controversial</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("old")}>Old</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("qa")}>Q&A</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {session ? (
        <form onSubmit={handleSubmitComment} className="mb-4">
          <Textarea
            placeholder="What are your thoughts?"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="mb-2"
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Comment"
            )}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">Please sign in to comment.</p>
      )}

      {loading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center text-destructive p-4">{error}</div>
      ) : (
        <>
          {comments.map(renderComment)}
          <Button variant="outline" className="w-full mt-4" onClick={loadMoreComments} disabled={loadingMore}>
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading more...
              </>
            ) : (
              "Load more comments"
            )}
          </Button>
        </>
      )}
    </div>
  )
}

