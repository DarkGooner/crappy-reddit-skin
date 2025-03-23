"use client"

import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import Navbar from "@/components/navbar"
import PostFeed from "@/components/post-feed"
import SelectionControls from "@/components/selection-controls"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import type { Post } from "@/types/reddit"
import { Flame, Clock, TrendingUp, Sparkles } from "lucide-react"

export default function UpvotedPage() {
  const [posts, setPosts] = useState<{ posts: Post[]; after: string | null; before: string | null }>({
    posts: [],
    after: null,
    before: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState("new")
  const [timeFilter, setTimeFilter] = useState("all")
  const { toast } = useToast()
  const { data: session, status } = useSession()

  const sortOptions = [
    {
      id: "new",
      label: "New",
      icon: <Clock className="h-4 w-4 mr-2" />,
    },
    {
      id: "hot",
      label: "Hot",
      icon: <Flame className="h-4 w-4 mr-2" />,
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
    // Redirect if not logged in
    if (status === "unauthenticated") {
      redirect("/auth/signin?callbackUrl=/upvoted")
    }
  }, [status])

  useEffect(() => {
    const fetchUpvotedPosts = async () => {
      if (status !== "authenticated" || !session) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      
      try {
        const timestamp = Date.now();
        const response = await fetch(`/api/reddit/me/history?type=upvoted&sort=${sortOption}&t=${timeFilter}&_t=${timestamp}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch upvoted posts")
        }

        const data = await response.json()
        
        if (!data.posts || !Array.isArray(data.posts)) {
          console.error("Invalid response format:", data)
          throw new Error("Invalid response format")
        }
        
        console.log(`[UpvotedPage] Loaded ${data.posts.length} upvoted posts, pagination after: ${data.after || 'none'}`);
        
        // Check if any posts are missing the 'name' property
        const postsWithoutName = data.posts.filter((post: Post) => !post.name).length;
        if (postsWithoutName > 0) {
          console.warn(`[UpvotedPage] Warning: ${postsWithoutName} posts are missing the 'name' property needed for pagination`);
        }
        
        // Check the first few and last few post names for debugging
        if (data.posts.length > 0) {
          const first3 = data.posts.slice(0, Math.min(3, data.posts.length));
          const last3 = data.posts.slice(Math.max(0, data.posts.length - 3));
          
          console.log('[UpvotedPage] First few posts:', first3.map((p: Post) => ({ id: p.id, name: p.name })));
          console.log('[UpvotedPage] Last few posts:', last3.map((p: Post) => ({ id: p.id, name: p.name })));
          console.log('[UpvotedPage] After token:', data.after);
        }
        
        setPosts(data)
      } catch (error) {
        console.error("Error fetching upvoted posts:", error)
        setError(error instanceof Error ? error.message : "Failed to load upvoted posts")
        toast({
          title: "Error",
          description: "Failed to load your upvoted posts",
          variant: "destructive",
        })
        setPosts({ posts: [], after: null, before: null })
      } finally {
        setLoading(false)
      }
    }

    fetchUpvotedPosts()
  }, [session, status, toast, sortOption, timeFilter])

  const handleSortChange = (sort: string, time?: string) => {
    setSortOption(sort)
    if (time) setTimeFilter(time)
  }

  return (
    <main className="flex flex-col h-screen bg-background">
      <Navbar />

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Upvoted Posts</h1>
          <p className="text-sm text-muted-foreground">Posts you've upvoted</p>
        </div>

        <SelectionControls
          options={sortOptions}
          value={sortOption}
          subValue={timeFilter}
          onChange={handleSortChange}
          label="Sort"
        />

        {error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-red-500 mb-2">{error}</p>
              <button 
                className="px-4 py-2 bg-primary text-primary-foreground rounded"
                onClick={() => {
                  setError(null)
                  setLoading(true)
                  // Force reload with timestamp
                  fetch(`/api/reddit/me/history?type=upvoted&sort=${sortOption}&t=${timeFilter}&_t=${Date.now()}`)
                    .then(res => res.json())
                    .then(data => {
                      setPosts(data)
                      setLoading(false)
                    })
                    .catch(err => {
                      console.error("Error retrying:", err)
                      setError("Still unable to load posts. Please try again later.")
                      setLoading(false)
                    })
                }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 h-[calc(100vh-10rem)]">
            <PostFeed
              posts={posts}
              loading={loading}
              endpoint="/api/reddit/me/history"
              params={{ type: "upvoted", sort: sortOption, t: timeFilter }}
            />
          </ScrollArea>
        )}
      </div>
    </main>
  )
}

