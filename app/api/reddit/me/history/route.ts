import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import type { Post } from "@/types/reddit"
//import { withFileCache } from "@/lib/api-cache" //mine

// Force dynamic rendering to ensure we don't cache data between users
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "links" // links, comments, saved, hidden, upvoted, downvoted
  const limit = searchParams.get("limit") || "25"
  const after = searchParams.get("after") || ""
  const sort = searchParams.get("sort") || "new"
  const timeFilter = searchParams.get("t") || "all"

  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    // Construct the appropriate endpoint based on the type
    let endpoint = ""

    if (type === "upvoted") {
      endpoint = `https://oauth.reddit.com/user/${session.user.name}/upvoted?limit=${limit}${after ? `&after=${after}` : ""}&sort=${sort}${timeFilter ? `&t=${timeFilter}` : ""}`
    } else if (type === "downvoted") {
      endpoint = `https://oauth.reddit.com/user/${session.user.name}/downvoted?limit=${limit}${after ? `&after=${after}` : ""}&sort=${sort}${timeFilter ? `&t=${timeFilter}` : ""}`
    } else {
      endpoint = `https://oauth.reddit.com/user/${session.user.name}/history/${type}?limit=${limit}${after ? `&after=${after}` : ""}&sort=${sort}${timeFilter ? `&t=${timeFilter}` : ""}`
    }

    console.log(`Fetching from endpoint: ${endpoint}`)

    // Add timestamp to ensure fresh data
    const freshEndpoint = `${endpoint}&_t=${Date.now()}`
    
    // Make direct API request without caching
    const response = await fetch(freshEndpoint, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "User-Agent": "RedditMobileWebUI/1.0.0",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`Reddit API error: ${response.status}`)
      throw new Error(`Reddit API error: ${response.status}`)
    }

    const data = await response.json()

    // Debug pagination info
    console.log(`Pagination info - After: ${data.data.after || 'null'}, Before: ${data.data.before || 'null'}, Count: ${data.data.children?.length || 0}`)

    const posts: Post[] = data.data.children
      .filter((child: any) => child.kind === "t3")
      .map((child: any) => {
        const post = child.data

        // Extract media information
        let media = null
        if (post.post_hint === "image") {
          const image = post.preview?.images?.[0]
          media = {
            type: "image",
            url: post.url,
            width: image?.source?.width,
            height: image?.source?.height,
          }
        } else if (post.is_video && post.media?.reddit_video) {
          media = {
            type: "video",
            url: post.media.reddit_video.fallback_url,
            width: post.media.reddit_video.width,
            height: post.media.reddit_video.height,
            dashUrl: post.media.reddit_video.dash_url,
            hlsUrl: post.media.reddit_video.hls_url,
            duration: post.media.reddit_video.duration,
          }
        } else if (post.gallery_data) {
          // It's a gallery post
          const galleryItems = post.gallery_data.items.map((item: any) => {
            const mediaId = item.media_id
            const mediaMetadata = post.media_metadata?.[mediaId]
            
            const fileExt = mediaMetadata?.e === "Image" ? "jpg" : "png"
            const imageUrl = `https://i.redd.it/${mediaId}.${fileExt}`
            
            return {
              id: mediaId,
              url: imageUrl,
              width: mediaMetadata?.s?.x,
              height: mediaMetadata?.s?.y,
            }
          })
          
          media = {
            type: "gallery",
            items: galleryItems,
          }
        }

        // Ensure the name field is present for pagination
        const name = post.name || `t3_${post.id}`;
        
        // Debug if name field is constructed rather than provided directly
        if (!post.name) {
          console.log(`Constructing name field for post ${post.id} as ${name}`);
        }

        return {
          id: post.id,
          title: post.title,
          author: post.author,
          subreddit: post.subreddit,
          created: post.created_utc,
          score: post.score,
          num_comments: post.num_comments,
          selftext: post.selftext || "",
          over_18: post.over_18,
          media: media,
          permalink: post.permalink,
          url: post.url,
          thumbnail: post.thumbnail,
          upvote_ratio: post.upvote_ratio,
          saved: post.saved,
          hidden: post.hidden,
          visited: post.visited,
          stickied: post.stickied,
          is_original_content: post.is_original_content,
          is_self: post.is_self,
          domain: post.domain,
          link_flair_text: post.link_flair_text,
          link_flair_background_color: post.link_flair_background_color,
          link_flair_text_color: post.link_flair_text_color,
          // Add the full name which is needed for pagination
          name: name,
        }
      })

    // Final debugging before returning response
    console.log(`Returning ${posts.length} processed posts, with pagination after: ${data.data.after || 'null'}`);
    
    return NextResponse.json({
      posts,
      after: data.data.after,
      before: data.data.before,
    })
  } catch (error) {
    console.error(`Error fetching user ${type}:`, error)
    return NextResponse.json({ error: `Failed to fetch user ${type}` }, { status: 500 })
  }
}

