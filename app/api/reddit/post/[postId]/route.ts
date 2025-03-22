import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import type { Post, Comment } from "@/types/reddit"
import { redditCache } from "@/lib/reddit-cache"
import { getMediaInfo } from "@/lib/media-utils"

// Force dynamic rendering to ensure proper cookies/headers context
export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const { searchParams } = new URL(request.url)
    const showNSFW = searchParams.get("showNSFW") === "true"
    const session = await getServerSession(authOptions)
    
    // Get the post ID from the route parameters
    const { postId } = await context.params
    if (!postId) {
      return new NextResponse("Post ID is required", { status: 400 })
    }

    // Prepare the API URL - use either authenticated or non-authenticated endpoint
    const baseUrl = session?.accessToken 
      ? "https://oauth.reddit.com" 
      : "https://www.reddit.com"
    
    const url = `${baseUrl}/comments/${postId}.json?raw_json=1`
    
    // Prepare headers - include authorization token if available
    const headers: HeadersInit = {
      "User-Agent": "RedditMobile/1.0.0",
    }
    
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`
    }
    
    // Fetch the post data
    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401 || response.status === 403) {
        return new NextResponse(
          JSON.stringify({ 
            message: "Authentication required to view this content",
            error: "Unauthorized" 
          }), 
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      }
      
      throw new Error(`Reddit API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data || !Array.isArray(data) || data.length < 2) {
      return new NextResponse("Invalid data format received from Reddit", { status: 500 })
    }
    
    const postData = data[0].data.children[0].data
    
    // Check for NSFW content when showNSFW is false
    if (postData.over_18 && !showNSFW) {
      return new NextResponse(
        JSON.stringify({ 
          message: "This post contains NSFW content. Enable NSFW viewing to see this content.",
          isNSFW: true
        }), 
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    }
    
    // Get media info using our utility
    const mediaInfo = getMediaInfo(postData)
    
    const post: Post = {
      id: postData.name,
      title: postData.title,
      author: postData.author,
      subreddit: postData.subreddit,
      score: postData.score,
      ups: postData.ups || 0,
      downs: postData.downs || 0,
      upvote_ratio: postData.upvote_ratio || 1,
      num_comments: postData.num_comments,
      created: postData.created_utc,
      created_utc: postData.created_utc,
      url: postData.url,
      selftext: postData.selftext || "",
      selftext_html: postData.selftext_html || "",
      is_video: postData.is_video,
      is_self: postData.is_self || false,
      is_gallery: !!postData.is_gallery || !!postData.gallery_data,
      domain: postData.domain,
      media: postData.media,
      media_info: mediaInfo,
      permalink: postData.permalink,
      likes: postData.likes,
      saved: postData.saved,
      hidden: postData.hidden || false,
      over_18: postData.over_18,
      subreddit_name_prefixed: postData.subreddit_name_prefixed,
      subreddit_id: postData.subreddit_id,
      subreddit_subscribers: postData.subreddit_subscribers,
      subreddit_type: postData.subreddit_type,
      thumbnail: postData.thumbnail,
      thumbnail_height: postData.thumbnail_height,
      thumbnail_width: postData.thumbnail_width,
      preview: postData.preview,
      gallery_data: postData.gallery_data,
      media_metadata: postData.media_metadata,
      crosspost_parent_list: postData.crosspost_parent_list,
      link_flair_text: postData.link_flair_text,
      link_flair_background_color: postData.link_flair_background_color,
      link_flair_text_color: postData.link_flair_text_color,
      post_hint: postData.post_hint,
    }

    const comments: Comment[] = data[1].data.children
      .filter((child: any) => child.kind === "t1")
      .map((child: any) => {
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

        return {
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
        }
      })

    return NextResponse.json({ post, comments })
  } catch (error) {
    console.error("Error fetching post:", error)
    return new NextResponse(error instanceof Error ? error.message : "Internal Server Error", { status: 500 })
  }
}

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { postId } = await context.params
    if (!postId) {
      return new NextResponse("Post ID is required", { status: 400 })
    }

    const { text } = await request.json()
    if (!text?.trim()) {
      return new NextResponse("Comment text is required", { status: 400 })
    }

    // Set up headers
    const headers: HeadersInit = {
      Authorization: `Bearer ${session.accessToken}`,
      "User-Agent": "RedditMobile/1.0.0",
      "Content-Type": "application/x-www-form-urlencoded",
    }

    // We don't use cache for POST requests
    const response = await fetch(`https://oauth.reddit.com/api/comment`, {
      method: "POST",
      headers,
      body: new URLSearchParams({
        thing_id: postId,
        text: text,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return new NextResponse(errorData.message || "Failed to post comment", { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({
      id: data.name,
      author: data.author,
      body: data.body,
      score: 0,
      created: data.created_utc,
      is_submitter: true,
      distinguished: null,
    })
  } catch (error) {
    console.error("Error posting comment:", error)
    return new NextResponse(error instanceof Error ? error.message : "Internal Server Error", { status: 500 })
  }
}

