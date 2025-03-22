import { getSession } from "next-auth/react"
import type { Post, Comment, Subreddit } from "@/types/reddit"
import { redditCache } from "@/lib/reddit-cache"

const REDDIT_API_BASE = "https://oauth.reddit.com"

interface RedditAPIOptions {
  method?: string
  body?: any
  params?: Record<string, string>
}

async function redditFetch(endpoint: string, options: RedditAPIOptions = {}) {
  const session = await getSession()
  
  // Determine if this should be an oauth or www request
  const baseUrl = session?.accessToken ? REDDIT_API_BASE : "https://www.reddit.com"
  
  let urlStr = `${baseUrl}${endpoint}`
  
  // Add .json suffix for www.reddit.com if not present and not already ending in .json
  if (baseUrl.includes("www.reddit.com") && !urlStr.endsWith(".json") && !urlStr.includes(".json?")) {
    // Add before query params if present
    if (urlStr.includes("?")) {
      urlStr = urlStr.replace("?", ".json?")
    } else {
      urlStr += ".json"
    }
  }
  
  const url = new URL(urlStr)
  
  // Add params to URL
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }
  
  const headers: HeadersInit = {
    "User-Agent": "RedditWeb/0.1",
  }
  
  if (session?.accessToken) {
    headers["Authorization"] = `Bearer ${session.accessToken}`
  }
  
  console.log(`[redditFetch] Fetching ${url.toString()}`)
  
  try {
    // Use redditCache for better handling
    if (options.method && options.method !== "GET") {
      // For non-GET requests, use normal fetch
      const response = await fetch(url.toString(), {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      })
      
      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`)
      }
      
      return await response.json()
    } else {
      // For GET requests, use redditCache
      return await redditCache.fetchWithCache(url.toString(), {
        method: "GET",
        headers
      })
    }
  } catch (error) {
    console.error("Error fetching from Reddit API:", error)
    throw error
  }
}

export async function getPost(postId: string): Promise<Post> {
  const cleanPostId = postId.replace("t3_", "")

  // First try to get the post data directly with expanded parameters
  const postData = await redditFetch(`/api/info?id=t3_${cleanPostId}`, {
    params: {
      include_over_18: "1",
      include_crossposts: "1",
      include_media: "1",
      include_metadata: "1",
      include_preview: "1",
      include_gallery_data: "1",
      include_media_metadata: "1",
      raw_json: "1",
    },
  })

  let post = null

  // If we got the post data directly, use it
  if (postData?.data?.children?.[0]?.data) {
    post = postData.data.children[0].data
  } else {
    // If not, try getting it through the comments endpoint which sometimes has more complete data
    const commentsData = await redditFetch(`/comments/${cleanPostId}`, {
      params: {
        include_over_18: "1",
        include_crossposts: "1",
        include_media: "1",
        include_metadata: "1",
        include_preview: "1",
        include_gallery_data: "1",
        include_media_metadata: "1",
        raw_json: "1",
      },
    })

    if (commentsData?.[0]?.data?.children?.[0]?.data) {
      post = commentsData[0].data.children[0].data
    } else {
      throw new Error("Post not found")
    }
  }

  // Fix gallery detection for reddit.com/gallery posts
  if (!post.is_gallery && post.url && post.url.includes("reddit.com/gallery/")) {
    post.is_gallery = true

    // If we don't have gallery_data or media_metadata, try to fetch it again with a direct approach
    if (!post.gallery_data || !post.media_metadata) {
      try {
        // The gallery ID is the last part of the URL
        const galleryId = post.url.split("/gallery/")[1]?.split("?")[0]
        if (galleryId) {
          // Try to get more complete data
          const galleryData = await redditFetch(`/comments/${galleryId}`, {
            params: {
              include_over_18: "1",
              include_crossposts: "1",
              include_media: "1",
              include_metadata: "1",
              include_preview: "1",
              include_gallery_data: "1",
              include_media_metadata: "1",
              raw_json: "1",
            },
          })

          if (galleryData?.[0]?.data?.children?.[0]?.data) {
            const completePost = galleryData[0].data.children[0].data

            // Update gallery-specific fields
            post.gallery_data = completePost.gallery_data || post.gallery_data
            post.media_metadata = completePost.media_metadata || post.media_metadata
          }
        }
      } catch (error) {
        console.error("Error fetching complete gallery data:", error)
        // Continue with what we have
      }
    }
  }

  return post
}

export async function getPostComments(postId: string, sort = "best"): Promise<Comment[]> {
  const cleanPostId = postId.replace("t3_", "")
  console.log(`[getPostComments] Fetching comments for post ${cleanPostId} with sort ${sort}`)
  
  try {
    // First attempt with the standard endpoint
    const data = await redditFetch(`/comments/${cleanPostId}`, {
      params: {
        sort,
        raw_json: "1",
      },
    })

    if (!data || !Array.isArray(data) || data.length < 2) {
      throw new Error("Invalid response format from Reddit API")
    }

    const parseReplies = (replies: any): Comment[] | undefined => {
      if (!replies?.data?.children) return undefined
      return replies.data.children
        .filter((reply: any) => reply.kind === "t1")
        .map((reply: any) => ({
          id: reply.data.name,
          author: reply.data.author,
          body: reply.data.body,
          body_html: reply.data.body_html,
          score: reply.data.score,
          created_utc: reply.data.created_utc,
          depth: reply.data.depth,
          replies: parseReplies(reply.data.replies),
          is_submitter: reply.data.is_submitter,
          distinguished: reply.data.distinguished,
          stickied: reply.data.stickied,
          collapsed: reply.data.collapsed,
          score_hidden: reply.data.score_hidden,
          likes: reply.data.likes,
          saved: reply.data.saved,
        }))
    }

    return data[1].data.children
      .filter((child: any) => child.kind === "t1")
      .map((child: any) => ({
        id: child.data.name,
        author: child.data.author,
        body: child.data.body,
        body_html: child.data.body_html,
        score: child.data.score,
        created_utc: child.data.created_utc,
        depth: child.data.depth,
        replies: parseReplies(child.data.replies),
        is_submitter: child.data.is_submitter,
        distinguished: child.data.distinguished,
        stickied: child.data.stickied,
        collapsed: child.data.collapsed,
        score_hidden: child.data.score_hidden,
        likes: child.data.likes,  
        saved: child.data.saved,
      }))
  } catch (error) {
    console.error(`Failed to fetch comments for post ${cleanPostId}:`, error)
    
    // As a fallback, try the alternative endpoint format with r/subreddit
    try {
      console.log("[getPostComments] Attempting fallback method...")
      
      // Get the post info first to obtain the subreddit
      const postInfo = await redditFetch(`/api/info`, {
        params: {
          id: `t3_${cleanPostId}`,
          raw_json: "1",
        },
      })
      
      if (!postInfo?.data?.children?.[0]?.data?.subreddit) {
        throw new Error("Could not determine subreddit for post")
      }
      
      const subreddit = postInfo.data.children[0].data.subreddit
      
      // Now try the alternate endpoint with the subreddit
      const alternateData = await redditFetch(`/r/${subreddit}/comments/${cleanPostId}`, {
        params: {
          sort,
          raw_json: "1",
        },
      })
      
      if (!alternateData || !Array.isArray(alternateData) || alternateData.length < 2) {
        throw new Error("Invalid response format from Reddit API (alternate endpoint)")
      }
      
      // Same parsing logic as above
      const parseReplies = (replies: any): Comment[] | undefined => {
        if (!replies?.data?.children) return undefined
        return replies.data.children
          .filter((reply: any) => reply.kind === "t1")
          .map((reply: any) => ({
            id: reply.data.name,
            author: reply.data.author,
            body: reply.data.body,
            body_html: reply.data.body_html,
            score: reply.data.score,
            created_utc: reply.data.created_utc,
            depth: reply.data.depth,
            replies: parseReplies(reply.data.replies),
            is_submitter: reply.data.is_submitter,
            distinguished: reply.data.distinguished,
            stickied: reply.data.stickied,
            collapsed: reply.data.collapsed,
            score_hidden: reply.data.score_hidden,
            likes: reply.data.likes,
            saved: reply.data.saved,
          }))
      }
  
      return alternateData[1].data.children
        .filter((child: any) => child.kind === "t1")
        .map((child: any) => ({
          id: child.data.name,
          author: child.data.author,
          body: child.data.body,
          body_html: child.data.body_html,
          score: child.data.score,
          created_utc: child.data.created_utc,
          depth: child.data.depth,
          replies: parseReplies(child.data.replies),
          is_submitter: child.data.is_submitter,
          distinguished: child.data.distinguished,
          stickied: child.data.stickied,
          collapsed: child.data.collapsed,
          score_hidden: child.data.score_hidden,
          likes: child.data.likes,
          saved: child.data.saved,
        }))
    } catch (fallbackError) {
      console.error("Fallback method also failed:", fallbackError)
      // Re-throw the original error
      throw error
    }
  }
}

export async function vote(id: string, direction: -1 | 0 | 1) {
  await redditFetch("/api/vote", {
    method: "POST",
    body: {
      id,
      dir: direction,
    },
  })
}

export async function submitComment(parentId: string, text: string) {
  const data = await redditFetch("/api/comment", {
    method: "POST",
    body: {
      parent: parentId,
      text,
    },
  })
  return data
}

export async function savePost(id: string) {
  await redditFetch("/api/save", {
    method: "POST",
    body: { id },
  })
}

export async function unsavePost(id: string) {
  await redditFetch("/api/unsave", {
    method: "POST",
    body: { id },
  })
}

export async function subscribeToSubreddit(subreddit: string, action: "sub" | "unsub") {
  return redditFetch("/api/subscribe", {
    method: "POST",
    body: {
      action,
      sr_name: subreddit,
    },
  })
}

export async function getSubredditPosts(
  subreddit: string,
  sort = "hot",
  after?: string,
  limit = 25,
): Promise<{ posts: Post[]; after: string | null }> {
  const params: Record<string, string> = { limit: limit.toString() }
  if (after) params.after = after

  const response = await redditFetch(`/r/${subreddit}/${sort}`, { params })
  return {
    posts: response.data.children.map((child: any) => child.data),
    after: response.data.after,
  }
}

export async function searchSubreddit(
  subreddit: string,
  query: string,
  sort = "relevance",
  after?: string,
  limit = 25,
): Promise<{ posts: Post[]; after: string | null }> {
  const params: Record<string, string> = {
    q: query,
    restrict_sr: "true",
    sort,
    limit: limit.toString(),
  }
  if (after) params.after = after

  const response = await redditFetch(`/r/${subreddit}/search`, { params })
  return {
    posts: response.data.children.map((child: any) => child.data),
    after: response.data.after,
  }
}

export async function getSubredditInfo(subreddit: string) {
  const response = await redditFetch(`/r/${subreddit}/about`)
  return response.data
}

export async function getUserInfo(username: string) {
  const response = await redditFetch(`/user/${username}/about`)
  return response.data
}

export async function getUserPosts(
  username: string,
  sort = "new",
  after?: string,
  limit = 25,
): Promise<{ posts: Post[]; after: string | null }> {
  const params: Record<string, string> = { limit: limit.toString() }
  if (after) params.after = after

  const response = await redditFetch(`/user/${username}/submitted/${sort}`, { params })
  return {
    posts: response.data.children.map((child: any) => child.data),
    after: response.data.after,
  }
}

export async function getUserComments(
  username: string,
  sort = "new",
  after?: string,
  limit = 25,
): Promise<{ comments: Comment[]; after: string | null }> {
  const params: Record<string, string> = { limit: limit.toString() }
  if (after) params.after = after

  const response = await redditFetch(`/user/${username}/comments/${sort}`, { params })
  return {
    comments: response.data.children.map((child: any) => child.data),
    after: response.data.after,
  }
}

