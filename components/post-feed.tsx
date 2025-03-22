"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import PostCard from "@/components/post-card"
import type { Post } from "@/types/reddit"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw } from "lucide-react"
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
  
  // States for pull-to-refresh functionality
  const [touchStart, setTouchStart] = useState<number>(0);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
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

    try {
      const response = await fetch(
        `${endpoint}?${queryParams.toString()}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const data = await response.json();
      return { 
        items: data.posts || [], 
        after: data.after 
      };
    } catch (error) {
      console.error("Error fetching posts:", error);
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

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (refreshing) return;

    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStart;

    // Only allow pull down when at top of scroll
    if (document.documentElement.scrollTop === 0 && distance > 0) {
      setPullDistance(Math.min(distance * 0.5, 150));
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 100) {
      handleRefresh();
    }
    setPullDistance(0);
  };
  
  // Refresh the feed
  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    
    try {
      await refresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  };

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
    <div
      className="space-y-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="fixed top-0 left-0 right-0 flex items-center justify-center bg-background z-50 transition-transform"
          style={{ height: `${pullDistance}px`, transform: `translateY(0)` }}
        >
          <RefreshCw
            className={cn(
              "h-6 w-6 text-primary transition-transform",
              pullDistance > 100 ? "rotate-180" : `rotate-${Math.round((pullDistance / 100) * 180)}`
            )}
          />
        </div>
      )}

      {/* Refreshing indicator */}
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-primary-foreground z-50">
          <div className="h-full bg-primary animate-progress" />
        </div>
      )}

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

