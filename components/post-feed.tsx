"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import PostCard from "@/components/post-card"
import type { Post } from "@/types/reddit"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import InfinityScrollTrigger from "@/components/infinity-scroll-trigger"

interface PostFeedProps {
  posts: Post[] | { posts: Post[]; after: string | null; before: string | null }
  loading: boolean
  endpoint?: string
  params?: Record<string, string>
  showNSFW?: boolean
  showFullContent?: boolean
}

export default function PostFeed({
  posts: initialPosts,
  loading: initialLoading,
  endpoint,
  params = {},
  showNSFW = false,
  showFullContent = false,
}: PostFeedProps) {
  // Extract initial posts and after value
  const initialPostsArray = Array.isArray(initialPosts) ? initialPosts : initialPosts.posts;
  const initialAfterValue = Array.isArray(initialPosts) ? null : initialPosts.after;
  
  // State for controlling how infinite scroll loads more content
  const [scrollMode, setScrollMode] = useState<'auto' | 'button' | 'hybrid'>('auto');

  const { data: session } = useSession();
  const { toast } = useToast();

  // Fetch more posts implementation
  const fetchMorePosts = useCallback(async (after?: string | null) => {
    if (!endpoint) {
      return { items: [], after: null };
    }

    const queryParams = new URLSearchParams({
      ...params,
      ...(after ? { after } : {}),
      showNSFW: String(showNSFW),
      _: Date.now().toString() // Prevent caching
    });

    console.log(`[PostFeed] Fetching more posts with params:`, 
      Object.fromEntries(queryParams.entries()),
      `from endpoint: ${endpoint}`
    );

    try {
      const response = await fetch(
        `${endpoint}?${queryParams.toString()}`,
        { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const data = await response.json();
      
      // Debug the response
      console.log(`[PostFeed] Response received:`, {
        postsCount: data.posts?.length || 0,
        after: data.after || 'none',
        before: data.before || 'none'
      });
      
      // Ensure we have an array of posts and valid pagination
      if (!data.posts || !Array.isArray(data.posts)) {
        console.error("[PostFeed] Invalid posts data:", data);
        return { items: [], after: null };
      }
      
      // Check if any posts have the required 'name' field for pagination
      const missingNames = data.posts.filter((post: Post) => !post.name).length;
      if (missingNames > 0) {
        console.warn(`[PostFeed] ${missingNames} posts are missing 'name' field needed for pagination`);
      }
      
      return { 
        items: data.posts || [], 
        after: data.after 
      };
    } catch (error) {
      console.error("[PostFeed] Error fetching posts:", error);
      throw error;
    }
  }, [endpoint, params, showNSFW]);

  // Use our custom infinite scroll hook
  const {
    items: posts,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
    triggerRef
  } = useInfiniteScroll<Post>({
    items: initialPostsArray,
    fetchItems: fetchMorePosts,
    afterValue: initialAfterValue,
    initialLoading: initialLoading,
    enabled: !!endpoint,
  });

  // Vote handler
  const handleVote = async (postId: string, direction: number) => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on posts",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/reddit/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: postId,
          dir: direction,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to vote");
      }
    } catch (error) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: "Failed to vote. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Save post handler
  const handleSave = async (postId: string, saved: boolean) => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save posts",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/reddit/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: postId,
          saved,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save post");
      }

      toast({
        title: saved ? "Saved" : "Unsaved",
        description: `Post ${saved ? "saved" : "unsaved"} successfully`,
      });
    } catch (error) {
      console.error("Error saving post:", error);
      toast({
        title: "Error",
        description: `Failed to ${saved ? "save" : "unsave"} post. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Hide post handler
  const handleHide = async (postId: string, hidden: boolean) => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to hide posts",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/reddit/hide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: postId,
          hidden,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to hide post");
      }

      toast({
        title: hidden ? "Hidden" : "Unhidden",
        description: `Post ${hidden ? "hidden" : "unhidden"} successfully`,
      });
    } catch (error) {
      console.error("Error hiding post:", error);
      toast({
        title: "Error",
        description: `Failed to ${hidden ? "hide" : "unhide"} post. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // If initial loading or no posts provided
  if (initialLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // If error and no posts
  if (error && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-4 border rounded-lg">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={refresh}>
          Retry
        </Button>
      </div>
    );
  }

  // If no posts at all
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 border rounded-lg">
        <p className="text-muted-foreground">No posts found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Post list */}
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            showFullContent={showFullContent}
            onVote={handleVote}
            onSave={handleSave}
            onHide={handleHide}
          />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <InfinityScrollTrigger
        loading={loading}
        hasMore={hasMore}
        loadMore={loadMore}
        mode={scrollMode}
        triggerRef={triggerRef}
      />
    </div>
  );
}

