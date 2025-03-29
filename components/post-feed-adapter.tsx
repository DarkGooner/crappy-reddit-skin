import { useState, useEffect } from "react";
import PostFeed from "@/components/post-feed";

interface PostFeedAdapterProps {
  posts: Array<any> | { posts: Array<any>; after: string | null; before: string | null };
  loading: boolean;
  endpoint?: string;
  params?: Record<string, string>;
  showNSFW?: boolean;
  showFullContent?: boolean;
}

export function PostFeedAdapter({
  posts: initialPosts,
  loading: initialLoading,
  endpoint,
  params = {},
  showNSFW = false,
  showFullContent = false,
}: PostFeedAdapterProps) {
  // Debug info
  console.log(`[PostFeedAdapter] Receiving posts, endpoint: ${endpoint}`);

  return (
    <PostFeed
      posts={initialPosts}
      loading={initialLoading}
      endpoint={endpoint}
      params={params}
      showNSFW={showNSFW}
      showFullContent={showFullContent}
    />
  );
} 