"use client"

import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PostFeedAdapter } from "@/components/post-feed-adapter"
import Navbar from "@/components/navbar"
import SelectionControls from "@/components/selection-controls"
import { useToast } from "@/hooks/use-toast"
import type { Subreddit, Post } from "@/types/reddit"
import { Flame, Clock, TrendingUp, Sparkles, Award, Loader2, RefreshCw, LogIn } from "lucide-react"
import { useSession } from "next-auth/react"
import { useNSFW } from "@/components/nsfw-context"
import { useRouter } from "next/navigation"
import LoadingSpinner from "@/components/LoadingSpinner"
import { Button } from "@/components/ui/button"
import { signIn } from "next-auth/react"
import ErrorWithNavbar from "@/components/error-with-navbar"

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState("best")
  const [timeFilter, setTimeFilter] = useState("day")
  const [subscribedSubreddits, setSubscribedSubreddits] = useState<Subreddit[]>([])
  const [loadingSubreddits, setLoadingSubreddits] = useState(false)
  const [isAuthError, setIsAuthError] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [afterValue, setAfterValue] = useState<string | null>(null)
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const { showNSFW } = useNSFW()
  const router = useRouter()

  const sortOptions = [
    {
      id: "best",
      label: "Best",
      icon: <Award className="h-4 w-4 mr-2" />,
    },
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

  // Fetch user's subscribed subreddits if logged in
  useEffect(() => {
    const fetchSubscribedSubreddits = async () => {
      if (status !== "authenticated" || !session) return

      setLoadingSubreddits(true)
      try {
        const response = await fetch("/api/reddit/me/subreddits")
        if (!response.ok) throw new Error("Failed to fetch subscribed subreddits")

        const data = await response.json()
        setSubscribedSubreddits(data)
      } catch (error) {
        console.error("Error fetching subscribed subreddits:", error)
        toast({
          title: "Error",
          description: "Failed to load your subscribed subreddits",
          variant: "destructive",
        })
      } finally {
        setLoadingSubreddits(false)
      }
    }

    fetchSubscribedSubreddits()
  }, [session, status, toast])

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        setError(null);
        setIsAuthError(false);
        // Reset afterValue when sort or time filter changes
        setAfterValue(null);
        setPosts([]);

        // Use the API route that supports our file-based caching
        const url = `/api/reddit/posts?sort=${sortOption}&t=${timeFilter}&showNSFW=${showNSFW}`;
        
        console.log(`Fetching posts from: ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
          // Check if this is an authentication error
          if (response.status === 401) {
            setIsAuthError(true);
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Authentication required to view this content");
          }
          
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch posts: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.posts || !Array.isArray(data.posts)) {
          throw new Error("Invalid data format received from API");
        }
        
        console.log(`Loaded ${data.posts.length} posts, pagination after: ${data.after || 'none'}`);
        setPosts(data.posts);
        setAfterValue(data.after);
      } catch (err) {
        console.error("Error in fetchPosts:", err);
        setError(err instanceof Error ? err.message : "Failed to load posts");
        
        // Show toast for better user feedback
        toast({
          title: "Failed to load posts",
          description: "Please try refreshing the page",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [sortOption, timeFilter, toast, showNSFW]);

  const handleSubredditChange = (subreddit: string | null) => {
    if (subreddit) {
      router.push(`/r/${subreddit}`)
    }
  }

  const handleSortChange = (sort: string, time?: string) => {
    setSortOption(sort);
    if (time) setTimeFilter(time);
    
    // Trigger loading state to show we're fetching new posts
    setLoading(true);
  }

  const handleSignIn = async () => {
    setIsSigningIn(true);
    await signIn("reddit", { callbackUrl: "/" });
    setIsSigningIn(false);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Force skip cache when retrying
    fetch(`/api/reddit/posts?sort=${sortOption}&t=${timeFilter}&skipCache=true&showNSFW=${showNSFW}`)
      .then(res => res.json())
      .then(data => {
        setPosts(data.posts || []);
        setAfterValue(data.after || null);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error retrying fetch:", err);
        setError("Still unable to load posts. Please try again later.");
        setLoading(false);
      });
  };

  // Always show navbar in all states
  return (
    <main className="flex flex-col h-screen bg-background">
      <Navbar
        onSubredditChange={handleSubredditChange}
        subscribedSubreddits={subscribedSubreddits}
        loadingSubreddits={loadingSubreddits}
      />

      {loading && posts.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="large" />
        </div>
      )}

      {error && !loading && (
        isAuthError ? (
          <ErrorWithNavbar
            title="Authentication Required"
            description="You need to sign in to view personalized content."
            action={{
              label: isSigningIn ? "Signing in..." : "Sign in with Reddit",
              onClick: handleSignIn
            }}
          >
            <div className="flex flex-col items-center justify-center mt-4">
              <Button 
                onClick={handleSignIn} 
                disabled={isSigningIn} 
                size="lg"
                className="mb-4 w-full"
              >
                <LogIn className="mr-2 h-5 w-5" />
                {isSigningIn ? "Signing in..." : "Sign in with Reddit"}
              </Button>
              
              <p className="text-sm text-muted-foreground text-center mt-4">
                You can still browse without signing in by using the "Popular" and "All" options.
              </p>

              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setSortOption("hot");
                  handleRetry();
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Popular Content
              </Button>
            </div>
          </ErrorWithNavbar>
        ) : (
          <ErrorWithNavbar
            title="Unable to load posts"
            description={error}
            action={{
              label: "Retry",
              onClick: handleRetry
            }}
          />
        )
      )}

      {(posts.length > 0 || !error) && (
        <div className="flex-1 flex flex-col">
          <SelectionControls
            options={sortOptions}
            value={sortOption}
            subValue={timeFilter}
            onChange={handleSortChange}
            label="Sort"
          />
          <div className="h-[calc(100vh-8rem)] overflow-auto">
            <div className="content-max-width">
              <div className="post-feed-container">
                {/* {posts.length > 0 && (
                  <div className="text-xs text-center text-muted-foreground mb-2">
                    {posts.length} posts loaded | Scroll down for more
                  </div>
                )} */}
                
                <PostFeedAdapter
                  key={`${sortOption}-${timeFilter}-${posts.length}`}
                  posts={{
                    posts: posts,
                    after: afterValue,
                    before: null,
                  }}
                  loading={loading}
                  endpoint={`/api/reddit/posts`}
                  params={{ sort: sortOption, t: timeFilter }}
                  showNSFW={showNSFW}
                />
                
                {process.env.NODE_ENV !== 'production' && (
                  <div className="text-xs text-center text-muted-foreground mt-4 p-2 border border-dashed rounded">
                    <div>Debug: afterValue = {afterValue || 'null'}</div>
                    <div>Posts Count: {posts.length}</div>
                    <div>Loading: {loading ? 'true' : 'false'}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

