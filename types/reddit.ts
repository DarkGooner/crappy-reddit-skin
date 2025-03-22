// export interface Post {
//   id: string
//   title: string
//   author: string
//   subreddit: string
//   score: number
//   num_comments: number
//   created: number
//   url: string
//   selftext: string
//   is_video: boolean
//   domain: string
//   media: any
//   permalink: string
//   likes: boolean | null
//   saved: boolean
//   over_18: boolean
//   subreddit_name_prefixed: string
//   subreddit_id: string
//   subreddit_subscribers: number
//   subreddit_type: string
//   thumbnail: string
//   thumbnail_height?: number
//   thumbnail_width?: number
//   preview?: {
//     images: Array<{
//       source: {
//         url: string
//         width: number
//         height: number
//       }
//       resolutions: Array<{
//         url: string
//         width: number
//         height: number
//       }>
//     }>
//   }
//   gallery_data?: {
//     items: Array<{
//       media_id: string
//       id: number
//     }>
//   }
//   media_metadata?: Record<string, {
//     status: string
//     e: string
//     m: string
//     p: Array<{
//       y: number
//       x: number
//       u: string
//     }>
//     s: {
//       y: number
//       x: number
//       u: string
//     }
//   }>
// }

// Define consistent interfaces for Reddit API

// Common video-related properties
interface RedditVideo {
  bitrate_kbps?: number;
  fallback_url?: string;
  has_audio?: boolean;
  height?: number;
  width?: number;
  dash_url?: string;
  duration?: number;
  hls_url?: string;
  is_gif?: boolean;
  scrubber_media_url?: string;
  transcoding_status?: string;
}

// Media metadata types
interface MediaMetadata {
  status: string;
  e: string;
  m: string;
  p?: { y: number; x: number; u: string; }[];
  s: { 
    y: number; 
    x: number; 
    u?: string; 
    gif?: string; 
    mp4?: string; 
  };
  id?: string;
}

// Gallery data structure
interface GalleryData {
  items: {
    media_id: string;
    id: number;
    caption?: string;
    outbound_url?: string;
    layout?: string;
  }[];
  layout?: string;
  caption?: string;
  outbound_url?: string;
}

// Preview image structure
interface PreviewImage {
  source: {
    url: string;
    width: number;
    height: number;
  };
  resolutions: {
    url: string;
    width: number;
    height: number;
  }[];
  variants?: any;
  id?: string;
}

// Preview data structure
interface Preview {
  images: PreviewImage[];
  enabled?: boolean;
  reddit_video_preview?: RedditVideo;
}

// Poll data structure
export interface PollData {
  options: {
    text: string;
    vote_count: number;
    id: string;
  }[];
  total_vote_count: number;
  voting_end_timestamp: number;
  user_selection?: number; // The index of the option the user has voted for
}

// Primary Post interface
export interface Post {
  id: string;
  title: string;
  author: string;
  author_fullname?: string;
  subreddit: string;
  subreddit_id: string;
  subreddit_name_prefixed: string;
  subreddit_type?: string;
  subreddit_subscribers?: number;
  subreddit_icon?: string;
  score: number;
  ups: number;
  downs: number;
  upvote_ratio: number;
  num_comments: number;
  created: number;
  created_utc: number;
  url: string;
  selftext: string;
  selftext_html: string;
  is_video: boolean;
  domain?: string;
  media?: {
    reddit_video?: RedditVideo;
    type?: string;
    oembed?: any;
  };
  media_info?: any;
  permalink: string;
  likes: boolean | null;
  saved: boolean;
  hidden: boolean;
  over_18: boolean;
  stickied?: boolean;
  poll_data?: PollData;
  link_flair_text?: string;
  link_flair_type?: string;
  link_flair_background_color?: string;
  link_flair_text_color?: string;
  link_flair_richtext?: {
    e: string;
    t: string;
  }[];
  thumbnail: string;
  thumbnail_height?: number;
  thumbnail_width?: number;
  post_hint?: string;
  is_gallery: boolean;
  is_self: boolean;
  is_meta?: boolean;
  is_original_content?: boolean;
  distinguished?: string | null;
  preview?: Preview;
  gallery_data?: GalleryData;
  media_metadata?: Record<string, MediaMetadata>;
  crosspost_parent?: string;
  crosspost_parent_list?: Post[];
  is_crosspostable?: boolean;
  gilded?: number;
  clicked?: boolean;
  hide_score?: boolean;
  name?: string;
  quarantine?: boolean;
  total_awards_received?: number;
  media_embed?: any;
  secure_media?: any;
  secure_media_embed?: any;
}

// Comment interface
export interface Comment {
  id: string;
  author: string;
  body: string;
  body_html?: string;
  score: number;
  created_utc: number;
  depth: number;
  replies?: Comment[];
  is_submitter: boolean;
  distinguished?: string | null;
  stickied?: boolean;
  collapsed?: boolean;
  score_hidden?: boolean;
  likes?: boolean | null;
  saved?: boolean;
  parent_id?: string;
  subreddit?: string;
  permalink?: string;
  link_id?: string;
  link_title?: string;
}

// Media interface for transformed media data
export interface Media {
  url: string;
  type: string;
  width: number;
  height: number;
  poster?: string;
  duration?: number;
  title?: string;
  artist?: string;
}

// Subreddit interface
export interface Subreddit {
  id: string;
  name: string;
  display_name: string;
  title: string;
  description: string;
  subscribers: number;
  created_utc: number;
  over18: boolean;
  icon_img?: string;
  banner_img?: string;
  public_description: string;
  user_is_subscriber?: boolean;
  user_is_moderator?: boolean;
  url: string;
}

// Reddit API response format
export interface RedditResponse {
  kind: string;
  data: {
    after: string | null;
    before: string | null;
    children: Array<{
      kind: string;
      data: Post;
    }>;
    dist: number;
    modhash: string | null;
  };
}

// User preferences interface
export interface UserPreferences {
  over_18: boolean;
  email_unsubscribe_all: boolean;
  hide_from_robots: boolean;
  show_link_flair: boolean;
  show_trending: boolean;
  show_user_flair: boolean;
  label_nsfw: boolean;
  enable_followers: boolean;
  nightmode: boolean;
  country_code: string;
  display_name: string;
  hide_ads: boolean;
  theme_selector: string;
  threaded_messages: boolean;
  use_global_defaults: boolean;
  beta: boolean;
  default_comment_sort: string;
  feed_recommendations_enabled: boolean;
  collapse_read_messages: boolean;
  mark_messages_read: boolean;
  email_chat_request: boolean;
  email_comment_reply: boolean;
  email_digests: boolean;
  email_messages: boolean;
  email_post_reply: boolean;
  email_private_message: boolean;
  email_upvote_comment: boolean;
  email_upvote_post: boolean;
  email_user_new_follower: boolean;
  email_username_mention: boolean;
  accept_pms: string;
  activity_relevant_ads: boolean;
  allow_clicktracking: boolean;
  autoplay_media: boolean;
  search_include_over_18: boolean;
  show_presence: boolean;
  show_snoovatar: boolean;
  top_karma_subreddits: boolean;
  video_autoplay: boolean;
}

