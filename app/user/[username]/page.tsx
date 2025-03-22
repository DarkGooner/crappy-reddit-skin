"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { use } from "react"
import type { Post, Comment } from "@/types/reddit"
import PostCard from "@/components/post-card"
import CommentCard from "@/components/comment-card"
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Clock, CalendarDays, ArrowUp, BarChart, Award, User2, ExternalLink, Loader2 
} from "lucide-react"
import InfiniteScroll from "react-infinite-scroll-component"
import Navbar from "@/components/navbar"
import { useNSFW } from "@/components/nsfw-context"
import PostFeed from "@/components/post-feed"

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const { showNSFW } = useNSFW()
  const [activeTab, setActiveTab] = useState("comments")
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<{
    name: string
    created_utc: number
    total_karma: number
    link_karma: number
    comment_karma: number
    is_friend: boolean
    is_blocked: boolean
    is_mod: boolean
    is_gold: boolean
    is_suspended: boolean
    icon_img?: string
  } | null>(null)
  
  // Sort options
  const selectedSort = searchParams.get("sort") || "new"
  const selectedTime = searchParams.get("t") || "all"
  
  // Profile data state
  const [profile, setProfile] = useState<any>(null)
  const [postsAfter, setPostsAfter] = useState<string | null>(null)
  const [commentsAfter, setCommentsAfter] = useState<string | null>(null)
  
  // Loading and error states
  const [error, setError] = useState({
    profile: null,
    posts: null,
    comments: null,
  })

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Load comments if switching to comments tab and not loaded yet
    if (value === "comments" && comments.length === 0 && !loading) {
      fetchComments()
    }
  }

  // Update URL when sort or time changes
  const updateSortParams = (sort: string, time: string = "all") => {
    const params = new URLSearchParams(searchParams)
    params.set("sort", sort)
    
    // Only include time param if sort is not "new" or "hot"
    if (["top", "controversial"].includes(sort)) {
      params.set("t", time)
    } else {
      params.delete("t")
    }
    
    router.push(`${pathname}?${params.toString()}`)
  }

  // Fetch user profile data
  const fetchProfile = async () => {
    setLoading(true)
    setError((prev) => ({ ...prev, profile: null }))
    
    try {
      const response = await fetch(`/api/reddit/user/${username}/about`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch profile (${response.status})`)
      }
      
      const data = await response.json()
      if (!data || data.error) {
        throw new Error(data?.error || "Failed to fetch profile")
      }
      setProfile(data)
    } catch (err: any) {
      console.error("Error fetching profile:", err)
      setError((prev) => ({ ...prev, profile: err.message }))
    } finally {
      setLoading(false)
    }
  }

  // Fetch user posts
  const fetchPosts = async (reset = false) => {
    if (loading) return
    
    setLoading(true)
    setError((prev) => ({ ...prev, posts: null }))
    
    // Reset posts if needed (e.g., sort changed)
    if (reset) {
      setPosts([])
      setPostsAfter(null)
    }
    
    try {
      const after = reset ? "" : postsAfter
      const response = await fetch(
        `/api/reddit/user/${username}/posts?sort=${selectedSort}&t=${selectedTime}&after=${after}&showNSFW=${showNSFW}`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch posts (${response.status})`)
      }
      
      const data = await response.json()
      if (!data || data.error) {
        throw new Error(data?.error || "Failed to fetch posts")
      }
      
      // Ensure posts have valid timestamps
      const validPosts = data.posts.map((post: Post) => ({
        ...post,
        created: post.created || Math.floor(Date.now() / 1000),
        created_utc: post.created_utc || Math.floor(Date.now() / 1000)
      }))
      
      setPosts((prev) => (reset ? validPosts : [...prev, ...validPosts]))
      setPostsAfter(data.after)
    } catch (err: any) {
      console.error("Error fetching posts:", err)
      setError((prev) => ({ ...prev, posts: err.message }))
    } finally {
      setLoading(false)
    }
  }

  // Fetch user comments
  const fetchComments = async (reset = false) => {
    if (loading) return
    
    setLoading(true)
    setError((prev) => ({ ...prev, comments: null }))
    
    // Reset comments if needed (e.g., sort changed)
    if (reset) {
      setComments([])
      setCommentsAfter(null)
    }
    
    try {
      const after = reset ? "" : commentsAfter
      const response = await fetch(
        `/api/reddit/user/${username}/comments?sort=${selectedSort}&t=${selectedTime}&after=${after}&showNSFW=${showNSFW}`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch comments (${response.status})`)
      }
      
      const data = await response.json()
      if (!data || data.error) {
        throw new Error(data?.error || "Failed to fetch comments")
      }
      
      // Ensure comments have valid timestamps
      const validComments = data.comments.map((comment: Comment) => ({
        ...comment,
        created_utc: comment.created_utc || Math.floor(Date.now() / 1000)
      }))
      
      setComments((prev) => (reset ? validComments : [...prev, ...validComments]))
      setCommentsAfter(data.after)
    } catch (err: any) {
      console.error("Error fetching comments:", err)
      setError((prev) => ({ ...prev, comments: err.message }))
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    if (username) {
      fetchProfile()
      fetchComments(true)
    }
  }, [username])
  
  // Refetch when sort or time changes
  useEffect(() => {
    if (username) {
      if (activeTab === "posts") {
        fetchPosts(true)
      } else if (activeTab === "comments") {
        fetchComments(true)
      }
    }
  }, [selectedSort, selectedTime, activeTab, showNSFW])

  // Render sort options
  const renderSortOptions = () => (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <Select
        value={selectedSort}
        onValueChange={(value) => updateSortParams(value, selectedTime)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>New</span>
            </div>
          </SelectItem>
          <SelectItem value="hot">
            <div className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              <span>Hot</span>
            </div>
          </SelectItem>
          <SelectItem value="top">
            <div className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4" />
              <span>Top</span>
            </div>
          </SelectItem>
          <SelectItem value="controversial">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span>Controversial</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {(selectedSort === "top" || selectedSort === "controversial") && (
        <Select
          value={selectedTime}
          onValueChange={(value) => updateSortParams(selectedSort, value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hour">Past Hour</SelectItem>
            <SelectItem value="day">Past 24 Hours</SelectItem>
            <SelectItem value="week">Past Week</SelectItem>
            <SelectItem value="month">Past Month</SelectItem>
            <SelectItem value="year">Past Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  )

  // Render profile card
  const renderProfileCard = () => {
    if (loading) {
      return (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-7 w-40 mb-2" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-5 w-3/4" />
          </CardContent>
        </Card>
      )
    }

    if (error.profile) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load user profile</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error.profile}</p>
            <Button variant="outline" className="mt-4" onClick={fetchProfile}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )
    }

    if (!profile) return null

    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="flex-wrap">u/{username}</CardTitle>
                {profile.is_mod && (
                  <span className="bg-green-600 text-white text-xs px-1 rounded">MOD</span>
                )}
                {profile.is_gold && (
                  <span className="bg-yellow-600 text-white text-xs px-1 rounded">PREMIUM</span>
                )}
              </div>
              <CardDescription className="flex items-center gap-1">
                <User2 className="h-3 w-3" />
                {formatDistanceToNow(new Date(profile.created * 1000), { addSuffix: true })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {profile.description && (
            <p className="mb-4 whitespace-pre-line">{profile.description}</p>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Post Karma</span>
              <span className="font-medium">{profile.karma.post.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Comment Karma</span>
              <span className="font-medium">{profile.karma.comment.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Total Karma</span>
              <span className="font-medium">{profile.karma.total.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Account Age</span>
              <span className="font-medium">
                {formatDistanceToNow(new Date(profile.created * 1000))}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {session && session.user.name === username && (
              <Button variant="outline" size="sm" className="text-xs">
                <User2 className="h-3 w-3 mr-1" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl mx-auto px-0 py-6">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            Back
          </Button>
          <h1 className="text-2xl font-bold">User Profile: u/{username}</h1>
        </div>

        {error.profile ? (
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>Failed to load user profile</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{error.profile}</p>
              <Button variant="outline" className="mt-4" onClick={fetchProfile}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {renderProfileCard()}
            
            <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
              </TabsList>
              
              {renderSortOptions()}
              
              <TabsContent value="posts" className="space-y-4">
                {loading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : error.posts ? (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-destructive">{error.posts}</p>
                      <Button variant="outline" className="mt-4" onClick={() => fetchPosts(true)}>
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                ) : posts.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-muted-foreground">No posts found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <PostFeed 
                    posts={{ 
                      posts: posts, 
                      after: postsAfter, 
                      before: null 
                    }} 
                    loading={loading}
                    endpoint={`/api/reddit/user/${username}/posts`}
                    params={{
                      sort: selectedSort,
                      time: selectedTime,
                    }}
                    showNSFW={showNSFW}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="comments" className="space-y-4">
                {loading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : error.comments ? (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-destructive">{error.comments}</p>
                      <Button variant="outline" className="mt-4" onClick={() => fetchComments(true)}>
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                ) : comments.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-muted-foreground">No comments found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <CommentCard key={comment.id} comment={comment} />
                    ))}
                    
                    {commentsAfter && (
                      <div className="flex justify-center py-4">
                        <Button 
                          variant="outline" 
                          onClick={() => fetchComments()}
                          disabled={!commentsAfter || loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            "Load More Comments"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </main>
  )
} 