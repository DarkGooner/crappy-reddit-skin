"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import PostFeed from "@/components/post-feed"
import { Button } from "@/components/ui/button"
import { Loader2, Flame, Clock, TrendingUp, Sparkles } from "lucide-react"
import type { Post, Subreddit } from "@/types/reddit"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { useSession } from "next-auth/react"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import Navbar from "@/components/navbar"
import SelectionControls from "@/components/selection-controls"
import { useNSFW } from "@/components/nsfw-context"
import SubredditSearch from "@/components/subreddit-search"
import { subscribeToSubreddit } from "@/lib/reddit-api"
import { useRouter } from "next/navigation"

export default function SubredditPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<Post[]>([])
  const [subredditData, setSubredditData] = useState<Subreddit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSort, setCurrentSort] = useState("hot")
  const [timeFilter, setTimeFilter] = useState("day")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const { data: session } = useSession()
  const { toast } = useToast()
  const { showNSFW } = useNSFW()
  const router = useRouter()

  // Add refs to track request state
  const abortControllerRef = useRef<AbortController | null>(null)
  const fetchingRef = useRef<boolean>(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const subreddit = params.subreddit as string

  const sortOptions = [
    {
      id: "hot",
      label: "Hot",
      icon: <Flame className="h-4 w-4 mr-2" />,
    },
    {
      id: "new",
      label: "New",
      icon: <Clock className="h-4 w-4 mr-2" />,
    },
    {
      id: "top",
      label: "Top",
      icon: <TrendingUp className="h-4 w-4 mr-2" />,
      subOptions: [
        { id: "hour", label: "Past Hour" },
        { id: "day", label: "Today" },
        { id: "week", label: "This Week" },
        { id: "month", label: "This Month" },
        { id: "year", label: "This Year" },
        { id: "all", label: "All Time" },
      ],
    },
    {
      id: "rising",
      label: "Rising",
      icon: <Sparkles className="h-4 w-4 mr-2" />,
    },
  ]

  useEffect(() => {
    // Cancel any ongoing debounce timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    // Create a new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      const fetchPosts = async () => {
        // Don't start a new request if one is already in progress
        if (fetchingRef.current) {
          console.log("Request already in progress, skipping")
          return
        }

        // Abort any previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }

        // Create a new abort controller for this request
        abortControllerRef.current = new AbortController()

        // Mark as fetching to prevent concurrent requests
        fetchingRef.current = true
        setLoading(true)

        try {
          console.log(`Fetching posts for r/${subreddit}/${currentSort}?t=${timeFilter}`)
          const response = await fetch(
            `/api/reddit/r/${subreddit}/${currentSort}?t=${timeFilter}&showNSFW=${showNSFW}`,
            { signal: abortControllerRef.current.signal },
          )

          if (!response.ok) throw new Error("Failed to fetch posts")
          const data = await response.json()
          setPosts(data.posts)
          setSubredditData(data.subreddit)

          // Check if user is subscribed
          if (session && data.subreddit) {
            setIsSubscribed(data.subreddit.user_is_subscriber || false)
          }
        } catch (err) {
          // Only set error if this isn't an abort error
          if (!(err instanceof DOMException && err.name === "AbortError")) {
            console.error("Error fetching posts:", err)
            setError("Failed to load posts")
          }
        } finally {
          // Clear flags when complete
          fetchingRef.current = false
          setLoading(false)
        }
      }

      fetchPosts()
    }, 300) // 300ms debounce delay

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [subreddit, currentSort, timeFilter, session, showNSFW])

  const handleSortChange = (sort: string, time?: string) => {
    setCurrentSort(sort)
    if (time) setTimeFilter(time)
  }

  const handleSubscribe = async () => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to subscribe to subreddits",
        variant: "destructive",
      })
      router.push("/auth/signin")
      return
    }

    try {
      await subscribeToSubreddit(subreddit, isSubscribed ? "unsub" : "sub")
      setIsSubscribed(!isSubscribed)
      toast({
        title: isSubscribed ? "Unsubscribed" : "Subscribed",
        description: isSubscribed
          ? `You've unsubscribed from r/${subreddit}`
          : `You've subscribed to r/${subreddit}`,
      })
    } catch (error) {
      console.error("Error subscribing to subreddit:", error)
      toast({
        title: "Error",
        description: `Failed to ${isSubscribed ? "unsubscribe from" : "subscribe to"} r/${subreddit}`,
        variant: "destructive",
      })
    }
  }

  if (loading && posts.length === 0) {
    return (
      <main className="flex flex-col h-screen bg-background">
        <Navbar />
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </main>
    )
  }

  if (error && posts.length === 0) {
    return (
      <main className="flex flex-col h-screen bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md p-6 bg-card rounded-lg shadow-sm border text-center">
            <p className="text-destructive font-medium mb-4">{error}</p>
            <Button onClick={() => router.push("/")}>Return to Home</Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col h-screen bg-background">
      <Navbar />

      <main className="flex-1 pb-16">
        <div className="container mx-auto px-0 w-full max-w-2xl">
          <div className="flex items-start gap-2 sm:gap-3 mb-4">
            {subredditData?.icon_img && (
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                <AvatarImage src={subredditData.icon_img} />
                <AvatarFallback>{subreddit[0].toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">r/{subreddit}</h1>
              {subredditData?.subscribers && (
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                  {new Intl.NumberFormat().format(subredditData.subscribers)} members
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant={isSubscribed ? "outline" : "default"}
                  onClick={handleSubscribe}
                  className="h-7 sm:h-8 text-xs sm:text-sm"
                  size="sm"
                >
                  {isSubscribed ? "Joined" : "Join"}
                </Button>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-7 sm:h-8 text-xs sm:text-sm">
                      About
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>About r/{subreddit}</SheetTitle>
                      <SheetDescription>
                        {subredditData && (
                          <div className="space-y-4 mt-4">
                            <p>{subredditData.public_description || subredditData.description}</p>
                            <div className="text-sm text-muted-foreground">
                              {subredditData?.created_utc && (
                                <p>Created {formatDistanceToNow(new Date(subredditData.created_utc * 1000))} ago</p>
                              )}
                              <p>{new Intl.NumberFormat().format(subredditData.subscribers)} members</p>
                            </div>
                            {subredditData?.over18 && (
                              <div className="text-destructive text-sm">NSFW • 18+ year old community</div>
                            )}
                          </div>
                        )}
                      </SheetDescription>
                    </SheetHeader>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          <SubredditSearch subreddit={subreddit} />

          <SelectionControls
            options={sortOptions}
            value={currentSort}
            subValue={timeFilter}
            onChange={handleSortChange}
            label="Sort"
          />
        </div>

        <ScrollArea className="flex-1 h-full">
          <div className="container mx-auto px-0 pb-16 w-full max-w-2xl">
            <div className="space-y-3 sm:space-y-4">
              {/* Initial loading indicator */}
              {loading && posts.length === 0 && (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {/* Error display */}
              {error && posts.length === 0 && (
                <div className="text-center p-4 text-destructive">
                  <p>{error}</p>
                  <Button 
                    variant="outline" 
                    className="mt-2" 
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                      // Retry loading
                      fetchingRef.current = false;
                      abortControllerRef.current?.abort();
                      abortControllerRef.current = null;
                    }}
                  >
                    Retry
                  </Button>
                </div>
              )}
              
              {/* Post feed with infinite scrolling */}
              <PostFeed
                posts={{
                  posts: posts,
                  after: posts.length > 0 && posts[posts.length - 1]?.name 
                    ? String(posts[posts.length - 1].name) 
                    : null,
                  before: null,
                }}
                loading={loading && posts.length === 0}
                endpoint={`/api/reddit/r/${subreddit}/${currentSort}`}
                params={{ t: timeFilter }}
                showNSFW={showNSFW}
              />
            </div>
          </div>
        </ScrollArea>
      </main>
    </main>
  )
}

