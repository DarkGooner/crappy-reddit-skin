/**
 * Utility functions for handling media content
 */

import { getCustomMediaHosts, extractIdFromUrl, generateEmbedUrl as generateCustomEmbedUrl } from './media-hosts';

export interface MediaInfo {
  type:
  | "image"
  | "video"
  | "gallery"
  | "gif"
  | "youtube"
  | "vreddit"
  | "iredd-image"
  | "redgif"
  | "gfycat"
  | "imgur-album"
  | "imgur-gifv"
  | "imgur"
  | "streamable"
  | "twitch"
  url: string
  width?: number
  height?: number
  poster?: string
  thumbnail?: string
  gallery?: GalleryItem[]
  aspectRatio?: number
  audioUrl?: string
  duration?: number
  isHLS?: boolean
  isDASH?: boolean
  hlsUrl?: string
  fallbackUrl?: string
  videoQualities?: Array<{
    quality: string
    url: string
    width?: number
    height?: number
  }>
  isCrosspost?: boolean
  crosspostInfo?: {
    original_permalink: string
    original_subreddit: string
    original_author: string
    title?: string
    created?: number
    score?: number
    numComments?: number
    subreddit?: string
    permalink?: string
    fullPermalink?: string
    author?: string
  }
  galleryInfo?: {
    items: GalleryItem[]
    totalItems?: number
    currentIndex?: number
    layout?: string
    caption?: string
    outboundUrl?: string
  }
}

interface GalleryItem {
  id?: string
  url: string
  width?: number
  height?: number
  type?: "image" | "video" | "gif"
  caption?: string
  aspectRatio?: number
  mediaId?: string
  isVideo?: boolean
  isAnimated?: boolean
  thumbnailUrl?: string
  outboundUrl?: string
  layout?: string
  metadata?: {
    status: string
    e: string
    m: string
    id: string
    dashUrl?: string
    hlsUrl?: string
    fallbackUrl?: string
    duration?: number
    hasAudio: boolean
  }
}

type MediaType =
  | "image"
  | "video"
  | "gif"
  | "gallery"
  | "embed"
  | "redgif"
  | "gfycat"
  | "streamable"
  | "imgur"
  | "imgur-gifv"
  | "imgur-album"
  | "vreddit"
  | "iredd-image"
  | "twitch"
  | "youtube"

/**
 * Process media URLs and return standardized media info
 */
export async function getMediaInfo(post: any): Promise<MediaInfo | null> {
  if (!post) return null

  // Handle crossposts by getting the original post data
  let originalPost = post
  const isCrosspost = !!post.crosspost_parent_list && post.crosspost_parent_list.length > 0

  if (isCrosspost) {
    console.log("Processing crosspost:", {
      crosspost_parent: post.crosspost_parent,
      original_author: post.crosspost_parent_list[0]?.author,
      original_subreddit: post.crosspost_parent_list[0]?.subreddit_name_prefixed,
      has_media: !!post.crosspost_parent_list[0]?.media,
      has_gallery_data: !!post.crosspost_parent_list[0]?.gallery_data,
      has_media_metadata: !!post.crosspost_parent_list[0]?.media_metadata,
      has_preview: !!post.crosspost_parent_list[0]?.preview,
      original_url: post.crosspost_parent_list[0]?.url,
      original_domain: post.crosspost_parent_list[0]?.domain,
    })

    // Use the original post data for media content
    originalPost = post.crosspost_parent_list[0]

    // If the original post doesn't have complete data, try to complement it with current post data
    if (!originalPost.media && post.media) {
      originalPost.media = post.media
    }

    if (!originalPost.gallery_data && post.gallery_data) {
      originalPost.gallery_data = post.gallery_data
    }

    if (!originalPost.media_metadata && post.media_metadata) {
      originalPost.media_metadata = post.media_metadata
    }

    if (!originalPost.preview && post.preview) {
      originalPost.preview = post.preview
    }

    // Ensure we have the original post URL if it's missing
    if (!originalPost.url && post.url) {
      originalPost.url = post.url
    }

    // Ensure we have the original post domain if it's missing
    if (!originalPost.domain && post.domain) {
      originalPost.domain = post.domain
    }

    // Ensure we have the original post is_video flag if it's missing
    if (originalPost.is_video === undefined && post.is_video !== undefined) {
      originalPost.is_video = post.is_video
    }

    // Ensure we have the original post is_gallery flag if it's missing
    if (originalPost.is_gallery === undefined && post.is_gallery !== undefined) {
      originalPost.is_gallery = post.is_gallery
    }

    // Ensure we have the original post's reddit_video data if it's missing
    if (!originalPost.media?.reddit_video && post.media?.reddit_video) {
      originalPost.media = {
        ...originalPost.media,
        reddit_video: post.media.reddit_video,
      }
    }

    // Ensure we have the original post's post_hint if it's missing
    if (!originalPost.post_hint && post.post_hint) {
      originalPost.post_hint = post.post_hint
    }

    // Ensure we have the original post's thumbnail data if it's missing
    if (!originalPost.thumbnail && post.thumbnail) {
      originalPost.thumbnail = post.thumbnail
    }
    if (!originalPost.thumbnail_width && post.thumbnail_width) {
      originalPost.thumbnail_width = post.thumbnail_width
    }
    if (!originalPost.thumbnail_height && post.thumbnail_height) {
      originalPost.thumbnail_height = post.thumbnail_height
    }
  }

  // Check for custom media hosts first
  try {
    // Load custom media hosts
    const customHosts = getCustomMediaHosts();
    
    if (customHosts.length > 0 && originalPost.url) {
      // Try to match the URL against each custom host pattern
      for (const host of customHosts) {
        const id = extractIdFromUrl(originalPost.url, host.urlPattern);
        if (id) {
          console.log(`Matched custom media host: ${host.name} for URL: ${originalPost.url}`);
          const embedUrl = generateCustomEmbedUrl(id, host.embedUrlPattern);
          
          return {
            type: "redgif", // Use redgif type for rendering with iframe
            url: embedUrl,
            width: originalPost.preview?.images[0]?.source?.width,
            height: originalPost.preview?.images[0]?.source?.height,
            isCrosspost,
            crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
          };
        }
      }
    }
  } catch (error) {
    console.error("Error processing custom media hosts:", error);
    // Continue with standard processing if custom hosts fail
  }

  // Determine if this is a gallery post
  const isGallery =
    originalPost.url?.includes("/gallery/") ||
    originalPost.is_gallery ||
    (originalPost.media_metadata && Object.keys(originalPost.media_metadata).length > 0)

  if (isGallery) {
    console.log("Processing gallery post:", {
      url: originalPost.url,
      is_gallery: originalPost.is_gallery,
      has_gallery_data: !!originalPost.gallery_data,
      gallery_data_items: originalPost.gallery_data?.items?.length || 0,
      has_media_metadata: !!originalPost.media_metadata,
      media_metadata_keys: originalPost.media_metadata ? Object.keys(originalPost.media_metadata).length : 0,
    })

    // Process gallery items
    const galleryItems: GalleryItem[] = []

    // Extract gallery ID from URL
    const galleryId = originalPost.url?.split("/gallery/")[1]?.split("?")[0]

    // If we have gallery_data and media_metadata, use them
    if (originalPost.gallery_data?.items?.length > 0 && originalPost.media_metadata) {
      originalPost.gallery_data.items.forEach((item: any) => {
        const mediaId = item.media_id
        const mediaMetadata = originalPost.media_metadata[mediaId]

        if (mediaMetadata && mediaMetadata.status === "valid") {
          // Determine file extension based on media type
          const fileExt =
            mediaMetadata.e === "Video"
              ? "mp4"
              : mediaMetadata.e === "AnimatedImage"
                ? "gif"
                : mediaMetadata.m?.includes("png")
                  ? "png"
                  : "jpg"

          // Construct direct URL with appropriate extension
          const imageUrl = `https://i.redd.it/${mediaId}.${fileExt}`

          galleryItems.push({
            url: imageUrl,
            type: mediaMetadata.e === "Video" ? "video" : mediaMetadata.e === "AnimatedImage" ? "gif" : "image",
            width: mediaMetadata.s?.x,
            height: mediaMetadata.s?.y,
            caption: item.caption || "",
            aspectRatio: mediaMetadata.s?.x && mediaMetadata.s?.y ? mediaMetadata.s.x / mediaMetadata.s.y : undefined,
            mediaId,
            isVideo: mediaMetadata.e === "Video",
            isAnimated: mediaMetadata.e === "AnimatedImage",
            thumbnailUrl: mediaMetadata.p?.[0]?.u,
            outboundUrl: item.outbound_url,
            layout: item.layout,
            metadata: {
              status: mediaMetadata.status,
              e: mediaMetadata.e || "",
              m: mediaMetadata.m || "",
              id: mediaId,
              dashUrl: mediaMetadata.d?.u,
              hlsUrl: mediaMetadata.h?.u,
              fallbackUrl: mediaMetadata.f?.u,
              duration: mediaMetadata.duration,
              hasAudio: mediaMetadata.has_audio || false,
            },
          })
        }
      })
    } else if (originalPost.media_metadata) {
      // We only have media_metadata but no gallery_data
      Object.entries(originalPost.media_metadata).forEach(([id, item]: [string, any]) => {
        if (item.status === "valid") {
          // Directly construct i.redd.it URL
          const imageUrl = `https://i.redd.it/${id}.jpg`

          galleryItems.push({
            url: imageUrl, // Use i.redd.it URL directly
            type: item.e === "Video" ? "video" : item.e === "AnimatedImage" ? "gif" : "image",
            width: item.s?.x,
            height: item.s?.y,
            aspectRatio: item.s?.x && item.s?.y ? item.s.x / item.s.y : undefined,
            mediaId: id,
            isVideo: item.e === "Video",
            isAnimated: item.e === "AnimatedImage",
            thumbnailUrl: item.p?.[0]?.u,
            layout: item.l,
            metadata: {
              status: item.status,
              e: item.e || "",
              m: item.m || "",
              id: id,
              dashUrl: item.d?.u,
              hlsUrl: item.h?.u,
              fallbackUrl: item.f?.u,
              duration: item.duration,
              hasAudio: item.has_audio || false,
            },
          })
        }
      })
    } else if (galleryId) {
      // If we have a gallery ID but no metadata, try to fetch the gallery data
      try {
        // Try to get the gallery data from the Reddit API
        const response = await fetch(`https://www.reddit.com/comments/${galleryId}.json`)
        const data = await response.json()

        if (data?.[0]?.data?.children?.[0]?.data) {
          const galleryPost = data[0].data.children[0].data

          // If we got gallery data, use it
          if (galleryPost.gallery_data?.items?.length > 0 && galleryPost.media_metadata) {
            galleryPost.gallery_data.items.forEach((item: any) => {
              const mediaId = item.media_id
              const mediaMetadata = galleryPost.media_metadata[mediaId]

              if (mediaMetadata && mediaMetadata.status === "valid") {
                // Directly construct i.redd.it URL
                //mine
                const fileExtforPostCardFeed =
                  mediaMetadata.e === "Video"
                    ? "mp4"
                    : mediaMetadata.e === "AnimatedImage"
                      ? "gif"
                      : mediaMetadata.m?.includes("png")
                        ? "png"
                        : "jpg"
                //mine
                const imageUrl = `https://i.redd.it/${mediaId}.${fileExtforPostCardFeed}`

                galleryItems.push({
                  url: imageUrl, // Use i.redd.it URL directly
                  type: mediaMetadata.e === "Video" ? "video" : mediaMetadata.e === "AnimatedImage" ? "gif" : "image",
                  width: mediaMetadata.s?.x,
                  height: mediaMetadata.s?.y,
                  caption: item.caption || "",
                  aspectRatio:
                    mediaMetadata.s?.x && mediaMetadata.s?.y ? mediaMetadata.s.x / mediaMetadata.s.y : undefined,
                  mediaId,
                  isVideo: mediaMetadata.e === "Video",
                  isAnimated: mediaMetadata.e === "AnimatedImage",
                  thumbnailUrl: mediaMetadata.p?.[0]?.u,
                  outboundUrl: item.outbound_url,
                  layout: item.layout,
                  metadata: {
                    status: mediaMetadata.status,
                    e: mediaMetadata.e || "",
                    m: mediaMetadata.m || "",
                    id: mediaId,
                    dashUrl: mediaMetadata.d?.u,
                    hlsUrl: mediaMetadata.h?.u,
                    fallbackUrl: mediaMetadata.f?.u,
                    duration: mediaMetadata.duration,
                    hasAudio: mediaMetadata.has_audio || false,
                  },
                })
              }
            })
          }
        }
      } catch (error) {
        console.error("Error fetching gallery data:", error)
      }
    }

    // If we still don't have any gallery items but we have a gallery ID, create a placeholder
    if (galleryItems.length === 0 && galleryId) {
      console.warn("Gallery post detected but missing metadata:", originalPost.url)
      galleryItems.push({
        url: originalPost.thumbnail || "/placeholder-gallery.jpg",
        type: "image",
        width: originalPost.thumbnail_width || 400,
        height: originalPost.thumbnail_height || 300,
        aspectRatio:
          originalPost.thumbnail_width && originalPost.thumbnail_height
            ? originalPost.thumbnail_width / originalPost.thumbnail_height
            : 4 / 3,
        mediaId: galleryId,
        isVideo: false,
        isAnimated: false,
        metadata: {
          status: "valid",
          e: "Image",
          m: "image/jpeg",
          id: galleryId,
          hasAudio: false,
        },
      })
    }

    // If we couldn't extract any gallery items, return null
    if (galleryItems.length === 0) {
      console.error("Failed to extract gallery items from post:", originalPost.id)
      return null
    }

    return {
      type: "gallery",
      url: originalPost.url,
      gallery: galleryItems,
      isCrosspost,
      crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
      galleryInfo: {
        items: galleryItems,
        totalItems: galleryItems.length,
        currentIndex: 0,
        layout: originalPost.gallery_data?.layout,
        caption: originalPost.gallery_data?.caption,
        outboundUrl: originalPost.gallery_data?.outbound_url,
      },
    }
  }

  // NEW SIMPLIFIED V.REDD.IT VIDEO HANDLING - PRIORITIZING HLS
  if (
    originalPost.domain === "v.redd.it" ||
    originalPost.url?.includes("v.redd.it") ||
    (isCrosspost && originalPost.media?.reddit_video) ||
    originalPost.is_video ||
    originalPost.post_hint === "hosted:video"
  ) {
    try {
      console.log("Processing v.redd.it video with HLS:", {
        is_video: originalPost.is_video,
        has_media: !!originalPost.media,
        has_reddit_video: !!originalPost.media?.reddit_video,
        url: originalPost.url,
      });

      // Extract the video ID from the URL or media data
      let videoId = '';
      
      // First try to get video ID from media.reddit_video
      if (originalPost.media?.reddit_video) {
        // Extract ID from HLS URL if available
        if (originalPost.media.reddit_video.hls_url) {
          videoId = originalPost.media.reddit_video.hls_url.split('/')[3];
        }
        // Or extract ID from DASH URL if available
        else if (originalPost.media.reddit_video.dash_url) {
          videoId = originalPost.media.reddit_video.dash_url.split('/')[3];
        }
        // Or extract ID from fallback URL if available
        else if (originalPost.media.reddit_video.fallback_url) {
          videoId = originalPost.media.reddit_video.fallback_url.split('/')[3];
        }
      }
      
      // If we still don't have a video ID, try to extract from URL
      if (!videoId && originalPost.url) {
        videoId = 
          originalPost.url.split('v.redd.it/')[1]?.split('?')[0]?.split('/')[0] ||
          originalPost.permalink?.split('/').pop()?.split('?')[0];
      }
      
      // If we still don't have a video ID, try post.url as a last resort
      if (!videoId && post.url) {
        videoId = post.url.split('v.redd.it/')[1]?.split('?')[0]?.split('/')[0];
      }

      // If we couldn't extract a video ID, return null
      if (!videoId) {
        console.error("Could not extract v.redd.it video ID");
        return null;
      }

      console.log("Video ID extracted:", videoId);
      
      // If the video ID is a full Reddit post ID, extract just the video part
      if (videoId.includes("_")) {
        videoId = videoId.split("_")[0];
      }

      // Generate the video URLs
      
      // 1. HLS URL (primary) - this is what we'll use with hls.js
      let hlsUrl = originalPost.media?.reddit_video?.hls_url || 
        `https://v.redd.it/${videoId}/HLSPlaylist.m3u8`;
        
      // Ensure the HLS URL is properly formatted
      if (!hlsUrl.includes("HLSPlaylist.m3u8")) {
        // Extract the video ID from the URL if it's not in the expected format
        const extractedId = hlsUrl.split('/').pop()?.split('?')[0];
        if (extractedId) {
          hlsUrl = `https://v.redd.it/${extractedId}/HLSPlaylist.m3u8`;
        }
      }
        
      // 2. Fallback direct MP4 URL - used if HLS fails
      const fallbackUrl = originalPost.media?.reddit_video?.fallback_url || 
        `https://v.redd.it/${videoId}/DASH_720.mp4`;
        
      // Get the poster image
      let poster = null;
      if (originalPost.preview?.images?.[0]?.source?.url) {
        poster = originalPost.preview.images[0].source.url.replace(/&amp;/g, "&");
      } else if (post.preview?.images?.[0]?.source?.url) {
        poster = post.preview.images[0].source.url.replace(/&amp;/g, "&");
      } else if (post.thumbnail && post.thumbnail !== "self" && post.thumbnail !== "default") {
        poster = post.thumbnail;
      }

      // Get dimensions and calculate aspect ratio
      const width = originalPost.media?.reddit_video?.width || originalPost.preview?.images?.[0]?.source?.width || 1280;
      const height = originalPost.media?.reddit_video?.height || originalPost.preview?.images?.[0]?.source?.height || 720;
      const aspectRatio = width && height ? width / height : 16 / 9;
      
      // Get duration
      const duration = originalPost.media?.reddit_video?.duration || 0;

      console.log("Video processed with HLS:", {
        video_id: videoId,
        hls_url: hlsUrl,
        fallback_url: fallbackUrl,
        width,
        height,
        has_poster: !!poster,
        duration
      });

      return {
        type: "vreddit",
        url: fallbackUrl, // For backwards compatibility
        hlsUrl: hlsUrl,
        fallbackUrl: fallbackUrl,
        width,
        height,
        poster,
        thumbnail: originalPost.thumbnail,
        aspectRatio,
        duration,
        isHLS: true,
        isCrosspost,
        crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
      };
    } catch (error) {
      console.error("Error processing v.redd.it video:", error);
      return null;
    }
  }

  // Handle i.redd.it images
  if (originalPost.domain === "i.redd.it" || (isCrosspost && originalPost.url?.includes("i.redd.it"))) {
    return {
      type: "iredd-image",
      url: originalPost.url,
      width: originalPost.preview?.images[0]?.source?.width,
      height: originalPost.preview?.images[0]?.source?.height,
      aspectRatio:
        originalPost.preview?.images[0]?.source?.width && originalPost.preview?.images[0]?.source?.height
          ? originalPost.preview.images[0].source.width / originalPost.preview.images[0].source.height
          : undefined,
      isCrosspost,
      crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
    }
  }

  // Handle Redgifs
  if (originalPost.domain === "redgifs.com" || 
      originalPost.domain === "i.redgifs.com" || 
      (isCrosspost && (originalPost.url?.includes("redgifs.com") || originalPost.url?.includes("i.redgifs.com")))) {
    
    let id = "";
    
    // Extract ID based on URL pattern
    if (originalPost.url.includes("/i/")) {
      // Handle i.redgifs.com/i/{id}.ext format - extract ID without file extension
      id = originalPost.url.split("/i/")[1]?.split(/\.[^/.]+$/)[0]; // Split at last dot to remove extension
    } else {
      // Standard redgifs.com format
      id = originalPost.url.split("/").pop()?.split("?")[0];
    }
    
    if (!id) {
      console.error("Could not extract redgifs ID from URL:", originalPost.url);
      return null;
    }
    
    // Calculate aspect ratio if we have width and height information
    let aspectRatio;
    if (originalPost.preview?.images[0]?.source?.width && originalPost.preview?.images[0]?.source?.height) {
      const width = originalPost.preview.images[0].source.width;
      const height = originalPost.preview.images[0].source.height;
      aspectRatio = width / height;
    }
    
    return {
      type: "redgif",
      url: `https://www.redgifs.com/ifr/${id}`,
      width: originalPost.preview?.images[0]?.source?.width,
      height: originalPost.preview?.images[0]?.source?.height,
      aspectRatio: aspectRatio,
      poster: originalPost.preview?.images[0]?.source?.url?.replace(/&amp;/g, "&"),
      isCrosspost,
      crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
    }
  }

  // Handle Gfycat
  if (originalPost.domain === "gfycat.com" || (isCrosspost && originalPost.url?.includes("gfycat.com"))) {
    const id = originalPost.url.split("/").pop()?.split("?")[0]
    return {
      type: "gfycat",
      url: `https://gfycat.com/${id}`,
      width: originalPost.preview?.images[0]?.source?.width,
      height: originalPost.preview?.images[0]?.source?.height,
      isCrosspost,
      crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
    }
  }

  // Handle Imgur
  if (
    originalPost.domain === "imgur.com" ||
    originalPost.domain === "i.imgur.com" ||
    (isCrosspost && (originalPost.url?.includes("imgur.com") || originalPost.url?.includes("i.imgur.com")))
  ) {
    if (originalPost.url.includes("/a/") || originalPost.url.includes("/gallery/")) {
      return {
        type: "imgur-album",
        url: originalPost.url,
        isCrosspost,
        crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
      }
    }

    if (originalPost.url.endsWith(".gifv")) {
      return {
        type: "imgur-gifv",
        url: originalPost.url.replace(".gifv", ".mp4"),
        width: originalPost.preview?.images[0]?.source?.width,
        height: originalPost.preview?.images[0]?.source?.height,
        isCrosspost,
        crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
      }
    }

    // Handle direct Imgur images/gifs
    if (/\.(jpg|jpeg|png|gif)$/i.test(originalPost.url)) {
      return {
        type: originalPost.url.endsWith(".gif") ? "gif" : "image",
        url: originalPost.url,
        width: originalPost.preview?.images[0]?.source?.width,
        height: originalPost.preview?.images[0]?.source?.height,
        isCrosspost,
        crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
      }
    }

    // Try to get direct image URL for non-direct Imgur links
    return {
      type: "imgur",
      url: `${originalPost.url}.jpg`,
      width: originalPost.preview?.images[0]?.source?.width,
      height: originalPost.preview?.images[0]?.source?.height,
      isCrosspost,
      crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
    }
  }

  // Handle Streamable
  if (originalPost.domain === "streamable.com" || (isCrosspost && originalPost.url?.includes("streamable.com"))) {
    const id = originalPost.url.split("/").pop()
    return {
      type: "streamable",
      url: `https://streamable.com/e/${id}`,
      width: originalPost.preview?.images[0]?.source?.width,
      height: originalPost.preview?.images[0]?.source?.height,
      isCrosspost,
      crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
    }
  }

  // Handle YouTube
  if (
    originalPost.domain === "youtube.com" ||
    originalPost.domain === "youtu.be" ||
    (isCrosspost && (originalPost.url?.includes("youtube.com") || originalPost.url?.includes("youtu.be")))
  ) {
    let videoId = ""
    if (originalPost.url.includes("youtube.com/watch")) {
      videoId = new URL(originalPost.url).searchParams.get("v") || ""
    } else if (originalPost.url.includes("youtu.be/")) {
      videoId = originalPost.url.split("youtu.be/")[1].split("?")[0]
    }
    return {
      type: "youtube",
      url: `https://www.youtube.com/embed/${videoId}`,
      width: originalPost.preview?.images[0]?.source?.width,
      height: originalPost.preview?.images[0]?.source?.height,
      isCrosspost,
      crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
    }
  }

  // Handle Twitch
  if (
    originalPost.domain === "twitch.tv" ||
    originalPost.domain === "clips.twitch.tv" ||
    (isCrosspost && (originalPost.url?.includes("twitch.tv") || originalPost.url?.includes("clips.twitch.tv")))
  ) {
    let clipId = ""
    if (originalPost.url.includes("clips.twitch.tv")) {
      clipId = originalPost.url.split("/").pop() || ""
    } else if (originalPost.url.includes("twitch.tv/")) {
      const parts = originalPost.url.split("/")
      const clipIndex = parts.indexOf("clip") + 1
      if (clipIndex > 0 && clipIndex < parts.length) {
        clipId = parts[clipIndex]
      }
    }
    return {
      type: "twitch",
      url: `https://clips.twitch.tv/embed?clip=${clipId}`,
      width: originalPost.preview?.images[0]?.source?.width,
      height: originalPost.preview?.images[0]?.source?.height,
      isCrosspost,
      crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
    }
  }

  // Handle direct media files
  if (originalPost.url) {
    if (/\.(mp4|webm|mov)$/i.test(originalPost.url)) {
      return {
        type: "video",
        url: originalPost.url,
        width: originalPost.preview?.images[0]?.source?.width,
        height: originalPost.preview?.images[0]?.source?.height,
        poster: originalPost.preview?.images[0]?.source?.url?.replace(/&amp;/g, "&"),
        isCrosspost,
        crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
      }
    }

    if (/\.(jpg|jpeg|png|webp)$/i.test(originalPost.url)) {
      return {
        type: "image",
        url: originalPost.url,
        width: originalPost.preview?.images[0]?.source?.width,
        height: originalPost.preview?.images[0]?.source?.height,
        isCrosspost,
        crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
      }
    }

    if (/\.(gif)$/i.test(originalPost.url)) {
      return {
        type: "gif",
        url: originalPost.url,
        width: originalPost.preview?.images[0]?.source?.width,
        height: originalPost.preview?.images[0]?.source?.height,
        isCrosspost,
        crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
      }
    }
  }

  // If we can't determine the media type but there's a thumbnail, use it
  if (originalPost.thumbnail && originalPost.thumbnail !== "self" && originalPost.thumbnail !== "default") {
    return {
      type: "image",
      url: originalPost.thumbnail,
      thumbnail: originalPost.thumbnail,
      width: originalPost.thumbnail_width,
      height: originalPost.thumbnail_height,
      isCrosspost,
      crosspostInfo: isCrosspost ? getCrosspostInfo(originalPost) : undefined,
    }
  }

  return null
}

/**
 * Get the optimal dimensions for displaying media
 */
export function getOptimalDimensions(
  mediaWidth?: number,
  mediaHeight?: number,
  maxWidth = 800,
  maxHeight = 800,
): { width: number; height: number } {
  if (!mediaWidth || !mediaHeight) {
    return { width: maxWidth, height: maxHeight }
  }

  const aspectRatio = mediaWidth / mediaHeight
  
  // For very small screens, ensure we respect viewport width
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 800
  if (screenWidth < 600) {
    // Use a more conservative maxWidth on small screens to prevent overflow
    const safeMaxWidth = Math.min(maxWidth, screenWidth - 24)
    
    if (mediaWidth > safeMaxWidth) {
      return {
        width: safeMaxWidth,
        height: Math.round(safeMaxWidth / aspectRatio),
      }
    }
  } else {
    if (mediaWidth > maxWidth) {
      return {
        width: maxWidth,
        height: Math.round(maxWidth / aspectRatio),
      }
    }
  }

  if (mediaHeight > maxHeight) {
    return {
      width: Math.round(maxHeight * aspectRatio),
      height: maxHeight,
    }
  }

  return {
    width: mediaWidth,
    height: mediaHeight,
  }
}

/**
 * Check if a URL is a valid media URL
 */
export function isMediaUrl(url: string): boolean {
  if (!url) return false

  // Known media domains
  const mediaDomains = [
    /i\.redd\.it/i,
    /v\.redd\.it/i,
    /imgur\.com/i,
    /gfycat\.com/i,
    /redgifs\.com/i,
    /i\.redgifs\.com/i,
    /streamable\.com/i,
    /youtube\.com/i,
    /youtu\.be/i,
    /twitch\.tv/i,
    /clips\.twitch\.tv/i,
  ]

  if (mediaDomains.some((domain) => domain.test(url))) {
    return true
  }

  // Direct media file extensions
  return /\.(jpg|jpeg|png|gif|mp4|webm|mov|webp)$/i.test(url)
}

/**
 * Extracts metadata from a media URL
 * @param url The URL to process
 * @returns An object containing metadata about the media
 */
export async function getMediaMetadata(url: string): Promise<{
  title?: string
  description?: string
  thumbnail?: string
  author?: string
  duration?: number
  width?: number
  height?: number
}> {
  // In a real implementation, you would fetch metadata from the respective APIs
  // For this example, we'll return placeholder data
  return {
    title: "Media content",
    description: "Media description",
    thumbnail: "/placeholder.svg?height=400&width=600",
    width: 600,
    height: 400,
  }
}

export function getEmbedUrl(url: string): string {
  // Try custom media hosts first
  try {
    const customHosts = getCustomMediaHosts();
    
    if (customHosts.length > 0) {
      // Try to match the URL against each custom host pattern
      for (const host of customHosts) {
        const id = extractIdFromUrl(url, host.urlPattern);
        if (id) {
          return generateCustomEmbedUrl(id, host.embedUrlPattern);
        }
      }
    }
  } catch (error) {
    console.error("Error processing custom media hosts in getEmbedUrl:", error);
    // Continue with standard processing if custom hosts fail
  }

  // YouTube
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.match(
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
    )?.[1]
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
  }

  // Vimeo
  if (url.includes("vimeo.com")) {
    const videoId = url.match(/vimeo\.com\/([0-9]+)/)?.[1]
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url
  }

  // Twitch
  if (url.includes("twitch.tv")) {
    const channel = url.match(/twitch\.tv\/([^/]+)/)?.[1]
    return channel ? `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}` : url
  }

  // Redgifs
  if (url.includes("redgifs.com")) {
    let videoId;
    if (url.includes("/i/")) {
      // Handle i.redgifs.com/i/{id}.ext format - extract ID without file extension
      videoId = url.split("/i/")[1]?.split(/\.[^/.]+$/)[0]; // Split at last dot to remove extension
    } else {
      // Standard redgifs.com format
      videoId = url.match(/redgifs\.com\/(?:i\/|watch\/)?([^/?]+)/)?.[1];
    }
    return videoId ? `https://www.redgifs.com/ifr/${videoId}` : url
  }

  return url
}

const getPostMediaData = (postData: any) => {
  return {
    url: postData.url,
    domain: postData.domain,
    media: postData.media,
    preview: postData.preview,
    thumbnail: postData.thumbnail,
    permalink: postData.permalink,
    is_video: postData.is_video,
    is_gallery: postData.is_gallery,
    gallery_data: postData.gallery_data,
    media_metadata: postData.media_metadata,
  }
}

// Helper function to get crosspost info
function getCrosspostInfo(post: any): MediaInfo["crosspostInfo"] {
  if (!post) return undefined

  return {
    title: post.title || "",
    subreddit: post.subreddit_name_prefixed || `r/${post.subreddit}` || "",
    original_permalink: post.permalink || "",
    original_subreddit: post.subreddit_name_prefixed || `r/${post.subreddit}` || "",
    original_author: post.author || "[deleted]",
    permalink: post.permalink || "",
    fullPermalink: `https://reddit.com${post.permalink || ""}`,
    author: post.author || "[deleted]",
    created: post.created_utc || 0,
    score: post.score || 0,
    numComments: post.num_comments || 0,
  }
}

