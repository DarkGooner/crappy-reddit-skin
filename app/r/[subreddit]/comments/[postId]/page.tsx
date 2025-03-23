"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import MediaRenderer from "@/components/media-renderer"
import Navbar from "@/components/navbar"
import { Loader2, ArrowLeft, Share2, Share, ExternalLink, ArrowBigUp, ArrowBigDown, MessageSquare } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useSession } from "next-auth/react"
import { useSubscribedSubreddits } from "@/hooks/use-subscribed-subreddits"
import { toast } from "@/components/ui/use-toast"
import PostActions from "@/components/post-actions"
import CommentsSection from "@/components/comments-section"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Post } from "@/types/reddit"
import UsernameLink from "@/components/username-link"
import Link from "next/link"
import FormattedContent from "@/components/formatted-content"
import { formatRelativeTime, formatScore } from "@/lib/format-utils"
import TextRenderer from "@/components/text-renderer"
import { useNSFW } from "@/components/nsfw-context"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { showNSFW } = useNSFW()
  const { subreddits: subscribedSubreddits, loading: loadingSubreddits } = useSubscribedSubreddits()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNSFWContent, setIsNSFWContent] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [requiresAuth, setRequiresAuth] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      if (!params?.postId) {
        setError("Post ID is missing")
        setLoading(false)
        return
      }

      try {
        // Clean the postId parameter
        const cleanPostId = (params.postId as string).replace("t3_", "")
        const response = await fetch(`/api/reddit/post/${cleanPostId}?showNSFW=${showNSFW}`)

        if (!response.ok) {
          // Check if this is an authentication issue
          if (response.status === 401) {
            const data = await response.json()
            setRequiresAuth(true)
            setError(data.message || "Please sign in to view this content")
            setLoading(false)
            return
          }

          // Check if this is an NSFW content error
          if (response.status === 403) {
            const data = await response.json()
            if (data.isNSFW) {
              setIsNSFWContent(true)
              setError(data.message)
              setLoading(false)
              return
            }
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setPost(data.post)

        // Check if user is subscribed to this subreddit
        if (subscribedSubreddits && subscribedSubreddits.length > 0) {
          const isSubbed = subscribedSubreddits.some(
            (sub) => sub.display_name.toLowerCase() === data.post.subreddit.toLowerCase(),
          )
          setIsSubscribed(isSubbed)
        }
      } catch (err) {
        console.error("Error fetching post:", err)
        let errorMessage = "Failed to load post"

        if (err instanceof Error) {
          if (err.message.includes("Unauthorized")) {
            setRequiresAuth(true)
            errorMessage = "Please sign in to view this post"
          } else if (err.message.includes("404")) {
            errorMessage = "Post not found"
          } else {
            errorMessage = err.message
          }
        }

        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [params?.postId, subscribedSubreddits, showNSFW, session])

  const handleShare = async () => {
    if (!post) return

    const postUrl = `https://reddit.com${post.permalink}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          url: postUrl,
        })
      } catch (err) {
        console.error("Error sharing:", err)
        navigator.clipboard.writeText(postUrl)
        toast({
          title: "Link copied",
          description: "Post link copied to clipboard",
        })
      }
    } else {
      navigator.clipboard.writeText(postUrl)
      toast({
        title: "Link copied",
        description: "Post link copied to clipboard",
      })
    }
  }

  const goBack = () => {
    router.back()
  }

  // Check if post is a crosspost
  const isCrosspost = !!post?.crosspost_parent_list?.length
  const originalAuthor = post?.crosspost_parent_list?.[0]?.author
  const originalSubreddit = post?.crosspost_parent_list?.[0]?.subreddit

  // Always render the Navbar regardless of state
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ScrollArea className="flex-1 h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-0 py-2 sm:py-4">
          <div className="max-w-3xl mx-auto">
            {/* Show the back button at the top */}
            <div className="mb-2 sm:mb-4 flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-6 sm:p-12">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
              </div>
            ) : requiresAuth ? (
              <div className="bg-card rounded-lg shadow-sm p-4 sm:p-8 text-center">
                <h2 className="text-xl sm:text-2xl font-bold mb-4">Authentication Required</h2>
                <p className="mb-6">{error || "Please sign in to view this content"}</p>
                <Button onClick={() => router.push("/")}>Return to Home</Button>
              </div>
            ) : isNSFWContent ? (
              <div className="bg-card rounded-lg shadow-sm p-4 sm:p-8 text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-destructive mb-4">NSFW Content</h2>
                <p className="mb-4">
                  {error || "This post contains NSFW content. Enable NSFW viewing in settings to view this content."}
                </p>
                <Button onClick={() => router.push("/")}>Return to Home</Button>
              </div>
            ) : error ? (
              <div className="bg-card rounded-lg shadow-sm p-4 sm:p-8 text-center">
                <p className="text-destructive font-medium mb-4">{error}</p>
                <Button onClick={() => router.push("/")}>Return to Home</Button>
              </div>
            ) : post ? (
              <>
                {/* Post Content Card */}
                <div className="bg-card rounded-lg shadow-sm p-3 sm:p-4 mb-3 sm:mb-6">
                  <div className="flex flex-wrap justify-between items-start gap-1 mb-1.5">
                    {/* Left side: Subreddit > Author > Time */}
                    <div className="flex flex-col min-w-0 max-w-[75%]">
                      <Link
                        href={`/r/${post.subreddit}`}
                        className="text-primary hover:underline text-sm font-medium truncate"
                      >
                        r/{post.subreddit}
                      </Link>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-hidden">
                        <UsernameLink username={post.author} isAuthor={true} className="text-xs truncate max-w-[120px] sm:max-w-[180px]" />
                        <span>·</span>
                        <span className="truncate">{formatDistanceToNow(post.created * 1000)} ago</span>
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
                  <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                    <TextRenderer text={post.title} />
                  </h1>

                  {/* Crosspost indication */}
                  {originalSubreddit && (
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Share className="h-3 w-3" />
                      <span>Crossposted from </span>
                      <Link href={`/r/${originalSubreddit}`} className="text-primary hover:underline">
                        r/{originalSubreddit}
                      </Link>
                      {originalAuthor && (
                        <>
                          <span> by </span>
                          <UsernameLink username={originalAuthor} prefixU={false} className="text-primary" />
                        </>
                      )}
                    </div>
                  )}

                  {post.selftext && (
                    <FormattedContent 
                      html={post.selftext_html} 
                      markdown={post.selftext} 
                      className="mb-4 text-sm" 
                      showGradient={false}
                    />
                  )}

                  {post.url && !post.is_self && (
                    <div className="mb-4 overflow-hidden rounded-md">
                      <MediaRenderer post={post} maxWidth={800} maxHeight={500} className="w-full" />
                    </div>
                  )}

                  {/* Poll UI */}
                  {post?.poll_data && (
                    <div className="mt-3 sm:mt-4 border rounded-lg p-3 sm:p-4">
                      <div className="text-base sm:text-lg font-medium mb-2">Poll</div>
                      <div className="space-y-2">
                        {post.poll_data.options?.map((option: any) => (
                          <div key={option.id} className="flex items-center">
                            <div className="flex-1">
                              <div className="relative">
                                <div
                                  className="bg-primary/20 h-8 sm:h-10 rounded-md flex items-center px-2 sm:px-3"
                                  style={{
                                    width: `${
                                      post.poll_data && post.poll_data.total_vote_count > 0
                                        ? (option.vote_count / post.poll_data.total_vote_count) * 100
                                        : 0
                                    }%`,
                                  }}
                                >
                                  <span className="font-medium text-xs sm:text-sm">{option.text}</span>
                                </div>
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sm:text-sm">
                                  {option.vote_count || 0} votes
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                        <span>{post.poll_data.total_vote_count || 0} total votes</span>
                        <span>
                          {post.poll_data.voting_end_timestamp
                            ? `Ends ${formatRelativeTime(post.poll_data.voting_end_timestamp)}`
                            : post.poll_data.user_selection
                              ? "You voted"
                              : "Voting closed"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
                    {/* Vote buttons */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${post.likes === true ? "text-orange-500" : ""}`}
                        onClick={async () => {
                          try {
                            const response = await fetch("/api/reddit/vote", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                id: post.id,
                                dir: post.likes === true ? 0 : 1,
                              }),
                            });
                            if (!response.ok) throw new Error("Failed to vote");
                            
                            // Update local state would happen here in a real app
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to vote. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <ArrowBigUp className="h-5 w-5" />
                      </Button>
                      <span className="min-w-[2ch] text-center font-medium">{formatScore(post.score)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${post.likes === false ? "text-blue-500" : ""}`}
                        onClick={async () => {
                          try {
                            const response = await fetch("/api/reddit/vote", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                id: post.id,
                                dir: post.likes === false ? 0 : -1,
                              }),
                            });
                            if (!response.ok) throw new Error("Failed to vote");
                            
                            // Update local state would happen here in a real app
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to vote. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <ArrowBigDown className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Comments count */}
                    <Button variant="ghost" size="sm" className="h-8 flex items-center gap-1.5">
                      <MessageSquare className="h-5 w-5" />
                      <span>{post.num_comments}</span>
                    </Button>
                    
                    {/* Share button */}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare}>
                      <Share2 className="h-5 w-5" />
                    </Button>
                    
                    {/* View Original (replaces Save) */}
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link
                        href={
                          post.permalink
                            ? `https://reddit.com${post.permalink}`
                            : `https://reddit.com/r/${post.subreddit}/comments/${post.id}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="bg-card rounded-lg shadow-sm p-3 sm:p-4">
                  <CommentsSection postId={post.id} subreddit={post.subreddit} isSubscribed={isSubscribed} />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center p-8">
                <p className="text-red-500">{error || "Post not found"}</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

