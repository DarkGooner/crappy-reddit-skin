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
      try {
        const response = await fetch(`/api/reddit/me/history?type=upvoted&sort=${sortOption}&t=${timeFilter}`)
        if (!response.ok) throw new Error("Failed to fetch upvoted posts")

        const data = await response.json()
        setPosts(data)
      } catch (error) {
        console.error("Error fetching upvoted posts:", error)
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

        <ScrollArea className="flex-1 h-[calc(100vh-10rem)]">
          <PostFeed
            posts={posts}
            loading={loading}
            endpoint="/api/reddit/me/history"
            params={{ type: "upvoted", sort: sortOption, t: timeFilter }}
          />
        </ScrollArea>
      </div>
    </main>
  )
}

