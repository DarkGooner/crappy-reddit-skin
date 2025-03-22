"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"
import PostFeed from "@/components/post-feed"
import SelectionControls from "@/components/selection-controls"
import { useToast } from "@/hooks/use-toast"
import type { Post } from "@/types/reddit"
import { Flame, Clock, TrendingUp, Sparkles, ArrowLeft } from "lucide-react"

export default function SubredditSearchPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [sortOption, setSortOption] = useState("relevance")
  const [timeFilter, setTimeFilter] = useState("all")
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  
  const subreddit = params.subreddit as string

  const sortOptions = [
    {
      id: "relevance",
      label: "Relevance",
      icon: <Flame className="h-4 w-4 mr-2" />,
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
      id: "comments",
      label: "Comments",
      icon: <Sparkles className="h-4 w-4 mr-2" />,
    },
  ]

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) {
        setPosts([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Use the subreddit filter API endpoint
        const endpoint = `/api/reddit/search/results?q=${encodeURIComponent(query)}&sort=${sortOption}&t=${timeFilter}&subreddit=${encodeURIComponent(subreddit)}`
        const response = await fetch(endpoint)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch search results: ${response.status}`)
        }
        
        const postsData = await response.json()
        setPosts(postsData)
      } catch (error) {
        console.error(`Error searching in r/${subreddit}:`, error)
        setError(error instanceof Error ? error.message : "Unknown error occurred")
        toast({
          title: "Error fetching search results",
          description: error instanceof Error ? error.message : "Please try again later",
          variant: "destructive",
        })
        setPosts([])
      } finally {
        setLoading(false)
      }
    }

    fetchSearchResults()
  }, [query, sortOption, timeFilter, subreddit, toast])

  const handleSortChange = (sort: string, time?: string) => {
    setSortOption(sort)
    if (time) setTimeFilter(time)
  }

  // Function to manually trigger search refresh
  const retrySearch = () => {
    setLoading(true)
    setError(null)
    
    // This will trigger the useEffect since we're using these values as dependencies
    const newSort = sortOption === "relevance" ? "relevance_refreshed" : "relevance"
    setSortOption(newSort)
    setTimeout(() => setSortOption(sortOption), 10)
  }

  return (
    <main className="flex flex-col h-screen bg-background">
      <Navbar />

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">
              Search results for "{query}" in r/{subreddit}
            </h1>
          </div>
        </div>

        <div className="px-4 py-2 flex items-center justify-between bg-muted/30 border-b">
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Showing results in <strong>r/{subreddit}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = `/search?q=${encodeURIComponent(query)}`}
            >
              Search All Reddit
            </Button>
          </div>
        </div>

        <SelectionControls
          options={sortOptions}
          value={sortOption}
          subValue={timeFilter}
          onChange={handleSortChange}
          label="Sort"
        />

        <ScrollArea className="flex-1 h-[calc(100vh-12rem)]">
          <div className="container max-w-2xl mx-auto p-4 px-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                {error ? (
                  <>
                    <div className="text-destructive mb-2 text-xl">Error</div>
                    <p className="text-muted-foreground mb-4">{error}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Loading search results...</p>
                )}
                <Button variant="outline" onClick={retrySearch}>
                  Retry Search
                </Button>
              </div>
            ) : posts.length > 0 ? (
              <PostFeed 
                posts={posts} 
                loading={false} 
                showNSFW={true}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                {error ? (
                  <>
                    <div className="text-destructive mb-2 text-xl">Error</div>
                    <p className="text-muted-foreground mb-4">{error}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    No posts found matching "{query}" in r/{subreddit}
                  </p>
                )}
                <Button variant="outline" onClick={retrySearch}>
                  Retry Search
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </main>
  )
}

