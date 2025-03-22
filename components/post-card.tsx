"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowBigUp, ArrowBigDown, MessageSquare, ExternalLink, Share2, Share } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import MediaRenderer from "@/components/media-renderer"
import type { Post } from "@/types/reddit"
import UsernameLink from "@/components/username-link"
import { formatRelativeTime, formatScore } from "@/lib/format-utils"
import FormattedContent from "@/components/formatted-content"
import TextRenderer from "@/components/text-renderer"

interface PostCardProps {
  post: Post
  showSubreddit?: boolean
  showFullContent?: boolean
  className?: string
  onVote?: (postId: string, direction: number) => void
  onSave?: (postId: string, saved: boolean) => void
  onHide?: (postId: string, hidden: boolean) => void
}

export default function PostCard({
  post,
  showSubreddit = true,
  showFullContent = false,
  className,
  onVote,
  onSave,
  onHide,
}: PostCardProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [score, setScore] = useState(post.score)
  const [userVote, setUserVote] = useState<1 | -1 | 0>(post.likes === true ? 1 : post.likes === false ? -1 : 0)
  const [saved, setSaved] = useState(post.saved || false)
  const [hidden, setHidden] = useState(post.hidden || false)

  // Check if post is a crosspost
  const isCrosspost = !!post.crosspost_parent_list && post.crosspost_parent_list?.length > 0
  const originalSubreddit = isCrosspost ? post.crosspost_parent_list?.[0]?.subreddit : null
  const originalAuthor = isCrosspost ? post.crosspost_parent_list?.[0]?.author : null

  // Check if post is a text-only post
  const isTextOnlyPost = post.is_self && post.selftext && !post.url.match(/\.(gif|jpe?g|png|mp4)$/i);

  const handleVote = async (value: 1 | -1) => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on posts",
        variant: "destructive",
      })
      return
    }

    const newValue = userVote === value ? 0 : value
    const scoreDiff = newValue - userVote

    setUserVote(newValue)
    setScore((prev) => prev + scoreDiff)

    if (onVote) {
      onVote(post.id, newValue)
    } else {
      // Fallback to direct API call if no handler provided
      try {
        const response = await fetch("/api/reddit/vote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: post.id,
            dir: newValue,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to vote")
        }

        toast({
          title: "Vote recorded",
          description: `Successfully ${newValue === 0 ? "removed vote" : newValue === 1 ? "upvoted" : "downvoted"}`,
        })
      } catch (error) {
        console.error("Error voting:", error)
        // Revert UI state on error
        setUserVote(userVote)
        setScore(score)
        toast({
          title: "Error",
          description: "Failed to vote. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleShare = async () => {
    const postUrl = `https://reddit.com${post.permalink}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          url: postUrl,
        })
      } catch (err) {
        console.error("Error sharing:", err)
        copyToClipboard(postUrl)
      }
    } else {
      copyToClipboard(postUrl)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Link copied",
      description: "Post link copied to clipboard",
    })
  }

  const navigateToSubreddit = (e: React.MouseEvent, subreddit: string) => {
    e.stopPropagation()
    router.push(`/r/${subreddit}`)
  }

  const handlePostClick = () => {
    router.push(`/r/${post.subreddit}/comments/${post.id}`)
  }

  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground overflow-hidden max-w-full w-full", 
      isTextOnlyPost ? "text-post" : "",
      className)}>
      {/* Post content */}
      <div className="p-1.5 sm:p-3 overflow-hidden">
        {/* Post header and title - clickable to navigate to post */}
        <div className="cursor-pointer hover:bg-accent/50" onClick={handlePostClick}>
          {/* Post header - reorganized with badges on right */}
          <div className="flex flex-wrap justify-between items-start gap-1 mb-1.5">
            {/* Left side: Subreddit > Author > Time */}
            <div className="flex flex-col min-w-0 max-w-[75%]">
              {showSubreddit && (
                <Link
                  href={`/r/${post.subreddit}`}
                  className="text-primary hover:underline text-sm font-medium truncate"
                >
                  r/{post.subreddit}
                </Link>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-hidden">
                <UsernameLink username={post.author} isAuthor={true} className="text-xs truncate max-w-[120px] sm:max-w-[180px]" />
                <span>·</span>
                <span className="truncate">{formatRelativeTime(post.created, { addSuffix: true })}</span>
              </div>
            </div>

            {/* Right side: Flair and NSFW badge */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {post.link_flair_text && (
                <Badge
                  style={{
                    backgroundColor: post.link_flair_background_color || undefined,
                    color: post.link_flair_text_color === "light" ? "white" : "black",
                  }}
                  className="text-xs px-1.5 py-0"
                >
                  {post.link_flair_text}
                </Badge>
              )}

              {post.over_18 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0">
                  NSFW
                </Badge>
              )}
            </div>
          </div>

          {/* Post title */}
          <h2 className="text-sm sm:text-base md:text-lg font-semibold mb-2 break-words hyphens-auto overflow-wrap-anywhere">
            <TextRenderer text={post.title} />
          </h2>

          {/* Crosspost indication */}
          {isCrosspost && originalSubreddit && (
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1 flex-wrap">
              <Share className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Crossposted from </span>
              <Link href={`/r/${originalSubreddit}`} className="text-primary hover:underline truncate">
                r/{originalSubreddit}
              </Link>
              {originalAuthor && (
                <>
                  <span className="whitespace-nowrap"> by </span>
                  <UsernameLink username={originalAuthor} prefixU={false} className="text-primary truncate max-w-[100px] sm:max-w-[150px]" />
                </>
              )}
            </div>
          )}

          {/* Post text content */}
          {post.selftext && (
            <div className="overflow-hidden max-w-full">
              <FormattedContent
                html={post.selftext_html}
                markdown={post.selftext}
                className="text-xs sm:text-sm mb-4 break-words overflow-wrap-anywhere text-balance"
                lineClamp={showFullContent ? undefined : 3}
                showHoverEffect={!showFullContent}
              />
            </div>
          )}
        </div>

        {/* Media content - non-clickable */}
        {post.url && !post.is_self && (
          <div
            className="mb-4 rounded-md w-full"
            onClick={(e) => {
              e.stopPropagation() // Prevent navigation to post page when media is clicked
            }}
          >
            <MediaRenderer
              post={post}
              className="w-full h-auto object-contain"
              maxWidth={Math.min(600, window.innerWidth - 32)}
            />
          </div>
        )}

        {/* Poll content */}
        {post.poll_data && (
          <div
            className="mb-4 p-3 border rounded-md"
            onClick={(e) => e.stopPropagation()} // Prevent navigation when interacting with poll
          >
            <h3 className="font-medium mb-2">Poll</h3>
            <div className="space-y-2">
              {post.poll_data?.options?.map((option: any, index: number) => (
                <div
                  key={index}
                  className="flex flex-col cursor-pointer hover:bg-accent/50 rounded-md p-2"
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!session) {
                      toast({
                        title: "Sign in required",
                        description: "Please sign in to vote on polls",
                        variant: "destructive",
                      })
                      return
                    }
                    if (post.poll_data?.user_selection) {
                      toast({
                        title: "Already voted",
                        description: "You have already voted on this poll",
                        variant: "destructive",
                      })
                      return
                    }
                    try {
                      const response = await fetch("/api/reddit/vote", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          id: post.id,
                          poll_option: index,
                        }),
                      })
                      if (!response.ok) throw new Error("Failed to vote")
                      toast({
                        title: "Vote recorded",
                        description: "Your vote has been recorded",
                      })
                    } catch (error) {
                      console.error("Error voting:", error)
                      toast({
                        title: "Error",
                        description: "Failed to vote. Please try again.",
                        variant: "destructive",
                      })
                    }
                  }}
                >
                  <div className="flex justify-between text-sm">
                    <span>{option.text}</span>
                    <span>{option.vote_count || 0} votes</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full mt-1">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          post.poll_data?.total_vote_count
                            ? (option.vote_count / post.poll_data.total_vote_count) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
              <span>{post.poll_data?.total_vote_count || 0} total votes</span>
              <span>
                {post.poll_data?.voting_end_timestamp
                  ? `Ends ${formatRelativeTime(post.poll_data.voting_end_timestamp)}`
                  : post.poll_data?.user_selection
                    ? "You voted"
                    : "Voting closed"}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between text-muted-foreground flex-wrap gap-1 pb-1">
          {/* Vote buttons and score - now horizontal */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7 sm:h-8 sm:w-8", userVote === 1 && "text-orange-500 dark:text-orange-400")}
              onClick={(e) => {
                e.stopPropagation()
                handleVote(1)
              }}
            >
              <ArrowBigUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <span className="text-sm font-medium min-w-[2ch] text-center">{formatScore(score)}</span>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7 sm:h-8 sm:w-8", userVote === -1 && "text-blue-500 dark:text-blue-400")}
              onClick={(e) => {
                e.stopPropagation()
                handleVote(-1)
              }}
            >
              <ArrowBigDown className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          {/* Comments button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 sm:h-8 whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation()
              handlePostClick()
            }}
          >
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
            {new Intl.NumberFormat().format(post.num_comments)}
          </Button>

          {/* Other buttons grouped on the right */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 sm:h-8 whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation()
                handleShare()
              }}
            >
              <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 sm:h-8 whitespace-nowrap" asChild>
              <Link
                href={
                  post.permalink
                    ? `https://reddit.com${post.permalink}`
                    : `https://reddit.com/r/${post.subreddit}/comments/${post.id}`
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

