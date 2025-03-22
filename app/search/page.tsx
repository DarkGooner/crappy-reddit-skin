"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Navbar from "@/components/navbar"
import PostFeed from "@/components/post-feed"
import SelectionControls from "@/components/selection-controls"
import { useToast } from "@/hooks/use-toast"
import type { Post } from "@/types/reddit"
import { Flame, Clock, TrendingUp, Sparkles, Users, FileText, Link2 } from "lucide-react"
import UsernameLink from "@/components/username-link"

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState<string>("posts")
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") || ""
  const [searchData, setSearchData] = useState<{ posts: Post[]; after: string | null; before: string | null }>({
    posts: [],
    after: null,
    before: null,
  })
  const [subreddits, setSubreddits] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sortOption, setSortOption] = useState("relevance")
  const [timeFilter, setTimeFilter] = useState("all")
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const [subredditFilter, setSubredditFilter] = useState<string | null>(null)

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

  const filterBySubreddit = (subreddit: string | null) => {
    setSubredditFilter(subreddit)
    setSortOption("relevance")
  }

  const fetchSearchResults = async () => {
    if (!query) {
      setSearchData({ posts: [], after: null, before: null })
      setSubreddits([])
      setUsers([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const subredditParam = subredditFilter ? `&subreddit=${encodeURIComponent(subredditFilter)}` : ""
      const postsEndpoint = `/api/reddit/search/results?q=${encodeURIComponent(query)}&sort=${sortOption}&t=${timeFilter}${subredditParam}`

      const postsResponse = await fetch(postsEndpoint)

      if (!postsResponse.ok) {
        throw new Error(`Failed to fetch search results: ${postsResponse.status}`)
      }

      const postsData = await postsResponse.json()
      setSearchData(postsData)

      if (!subredditFilter) {
        const subredditsEndpoint = `/api/reddit/search/autocomplete?q=${encodeURIComponent(query)}`
        const subredditsResponse = await fetch(subredditsEndpoint)

        if (subredditsResponse.ok) {
          const subredditsData = await subredditsResponse.json()
          setSubreddits(subredditsData.filter((item: any) => item?.type === "subreddit"))
        } else {
          console.warn("Subreddit search failed, falling back to empty list")
          setSubreddits([])
        }
      }

      if (!subredditFilter) {
        setUsers([
          {
            id: "user1",
            type: "user",
            name: `${query}_user`,
            icon_img: "/placeholder.svg?text=U1",
            karma: 12500,
          },
          {
            id: "user2",
            type: "user",
            name: `reddit_${query}`,
            icon_img: "/placeholder.svg?text=U2",
            karma: 8700,
          },
        ])
      }
    } catch (error) {
      console.error("Search error:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
      toast({
        title: "Error fetching search results",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      })
      setSearchData({ posts: [], after: null, before: null })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSearchResults()
  }, [query, sortOption, timeFilter, subredditFilter, toast])

  const handleSortChange = (sort: string, time?: string) => {
    setSortOption(sort)
    if (time) setTimeFilter(time)
  }

  // Create a function to manually trigger search refresh
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
        <div className="p-2 sm:p-3 md:p-4 border-b">
          <h1 className="text-lg sm:text-xl font-bold break-words">Search results for "{query}"</h1>
        </div>

        {subredditFilter && (
          <div className="flex items-center gap-2 px-2 sm:px-3 md:px-4 py-2 bg-muted/50 border-b">
            <div className="text-xs sm:text-sm text-muted-foreground">Filtering results in r/{subredditFilter}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => filterBySubreddit(null)}
              className="h-7 text-xs sm:text-sm"
            >
              Clear filter
            </Button>
          </div>
        )}

        <Tabs defaultValue="posts" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b overflow-x-auto">
            <TabsList className="p-0 h-auto bg-transparent">
              <TabsTrigger
                value="posts"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 sm:px-4 py-2 text-xs sm:text-sm"
              >
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="communities"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 sm:px-4 py-2 text-xs sm:text-sm"
              >
                <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Communities
              </TabsTrigger>
              <TabsTrigger
                value="people"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 sm:px-4 py-2 text-xs sm:text-sm"
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                People
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="posts" className="flex-1 p-0 m-0">
            <SelectionControls
              options={sortOptions}
              value={sortOption}
              subValue={timeFilter}
              onChange={handleSortChange}
              label="Sort"
            />

            <ScrollArea className="flex-1 h-[calc(100vh-12rem)]">
              <div className="container mx-auto px-0 w-full max-w-2xl">
                {activeTab === "posts" && (
                  <>
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        {error ? (
                          <>
                            <div className="text-destructive mb-2 text-lg sm:text-xl">Error</div>
                            <p className="text-muted-foreground mb-4 text-sm">{error}</p>
                          </>
                        ) : (
                          <p className="text-muted-foreground text-sm">Loading search results...</p>
                        )}
                        <Button variant="outline" onClick={retrySearch} className="text-xs sm:text-sm">
                          Retry Search
                        </Button>
                      </div>
                    ) : searchData.posts.length > 0 ? (
                      <div className="space-y-3 sm:space-y-4">
                        <PostFeed
                          posts={searchData}
                          loading={false}
                          endpoint={`/api/reddit/search/results`}
                          params={{
                            q: query,
                            sort: sortOption,
                            t: timeFilter,
                            ...(subredditFilter ? { subreddit: subredditFilter } : {}),
                          }}
                          showNSFW={true}
                          showFullContent={true}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        {error ? (
                          <>
                            <div className="text-destructive mb-2 text-lg sm:text-xl">Error</div>
                            <p className="text-muted-foreground mb-4 text-sm">{error}</p>
                          </>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {subredditFilter
                              ? `No posts found matching "${query}" in r/${subredditFilter}`
                              : `No posts found matching "${query}"`}
                          </p>
                        )}
                        <Button variant="outline" onClick={retrySearch} className="text-xs sm:text-sm">
                          Retry Search
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="communities" className="flex-1 p-0 m-0">
            <ScrollArea className="flex-1 h-[calc(100vh-12rem)]">
              <div className="px-2 sm:px-3 md:px-4 py-4 space-y-3 sm:space-y-4 max-w-full overflow-hidden">
                {loading ? (
                  <div className="space-y-3 sm:space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-md animate-pulse"
                      >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full flex-shrink-0"></div>
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="h-3 sm:h-4 bg-muted rounded w-1/3"></div>
                          <div className="h-2 sm:h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : subreddits.length > 0 ? (
                  subreddits.map((subreddit) => (
                    <div key={subreddit.id} className="flex gap-2">
                      <Button variant="outline" className="w-full justify-start h-auto p-2 sm:p-3" asChild>
                        <a href={`/r/${subreddit.name}`}>
                          <div className="flex items-center gap-2 sm:gap-3 w-full overflow-hidden">
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                              {subreddit.icon_img ? <AvatarImage src={subreddit.icon_img} /> : null}
                              <AvatarFallback>
                                {subreddit.name && typeof subreddit.name === "string"
                                  ? subreddit.name[0].toUpperCase()
                                  : "r"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-medium truncate text-sm">r/{subreddit.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {subreddit.subscribers?.toLocaleString() || "0"} members
                              </div>
                            </div>
                            {subreddit.over_18 && (
                              <Badge variant="destructive" className="ml-2 flex-shrink-0 text-xs px-1.5 py-0">
                                NSFW
                              </Badge>
                            )}
                          </div>
                        </a>
                      </Button>
                      <Button
                        variant="secondary"
                        className="px-2 sm:px-3 flex-shrink-0 h-auto"
                        onClick={() => {
                          filterBySubreddit(subreddit.name)
                          setActiveTab("posts")
                        }}
                        title="Filter search results by this subreddit"
                      >
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No communities found matching "{query}"
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="people" className="flex-1 p-0 m-0">
            <ScrollArea className="flex-1 h-[calc(100vh-12rem)]">
              <div className="px-2 sm:px-3 md:px-4 py-4 space-y-3 sm:space-y-4 max-w-full overflow-hidden">
                {loading ? (
                  <div className="space-y-3 sm:space-y-4">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-md animate-pulse"
                      >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full flex-shrink-0"></div>
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="h-3 sm:h-4 bg-muted rounded w-1/3"></div>
                          <div className="h-2 sm:h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : users.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 py-4">
                    {users.map((user) => (
                      <Button
                        key={user.id}
                        variant="outline"
                        className="p-3 sm:p-4 h-auto flex items-center justify-start gap-2 sm:gap-3"
                        onClick={() => router.push(`/user/${user.name}`)}
                      >
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                          {user.icon_img && <AvatarImage src={user.icon_img} />}
                          <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="text-left overflow-hidden">
                          <div className="font-medium truncate text-sm">
                            <UsernameLink username={user.name} prefixU={false} />
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.karma?.toLocaleString()} karma
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No users found matching "{query}"
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

