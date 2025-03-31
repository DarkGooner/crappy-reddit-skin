// components/media-renderer.tsx
"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { useInView } from "react-intersection-observer"
import { getMediaInfo, getOptimalDimensions } from "@/lib/media-utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
// Comment out the static import
// import VideoPlayer from "./VideoPlayer"

// +++ Import dynamic from next/dynamic +++
import dynamic from "next/dynamic"

import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Volume2,
  VolumeX,
  Loader2,
  Play,
  Pause,
  Settings,
  ExternalLink,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// Import videojs CSS dynamically when needed
import 'video.js/dist/video-js.css'
import { Skeleton } from "@/components/ui/skeleton"
import { MediaInfo } from "@/lib/media-utils"
import * as SliderPrimitive from "@radix-ui/react-slider"

// +++ Define the dynamic VideoPlayer component +++
const DynamicVideoPlayer = dynamic(() => import('./VideoPlayer'), {
  ssr: false, // Disable server-side rendering
  loading: () => (
    // Basic loading placeholder matching the structure
    <div className="aspect-video w-full bg-black flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  ),
});


// Custom VolumeSlider component that's completely isolated from theme
// ... (CustomVolumeSlider code remains exactly as provided) ...
const CustomVolumeSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { orientation?: 'horizontal' | 'vertical' }
>(({ className, orientation = 'horizontal', value, onValueChange, ...props }, ref) => {
  const isVertical = orientation === "vertical";
  const internalRef = React.useRef<HTMLDivElement>(null);

  // Manual handling of vertical slider interaction
  const handleMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!internalRef.current) return;

    const sliderRect = internalRef.current.getBoundingClientRect();
    const updateValue = (clientY: number) => {
      if (!internalRef.current) return;

      const height = sliderRect.height;
      const offsetY = clientY - sliderRect.top;

      // Calculate percentage (0-100) based on position
      // For vertical: 0 at bottom, 100 at top
      const percentage = Math.max(0, Math.min(100, 100 - (offsetY / height) * 100));

      if (onValueChange) {
        onValueChange([percentage]);
      }
    };

    // Initial position
    updateValue(e.clientY);

    // Handle mouse movement
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      updateValue(moveEvent.clientY);
    };

    // Handle mouse up to remove listeners
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // Add document-level event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onValueChange]);

  // Handle touch events for mobile - prevent scrolling
  const handleTouchStart = React.useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent scrolling
    e.stopPropagation();

    if (!internalRef.current) return;

    const sliderRect = internalRef.current.getBoundingClientRect();
    const updateValue = (clientY: number) => {
      if (!internalRef.current) return;

      const height = sliderRect.height;
      const offsetY = clientY - sliderRect.top;

      // Calculate percentage (0-100) based on position
      // For vertical: 0 at bottom, 100 at top
      const percentage = Math.max(0, Math.min(100, 100 - (offsetY / height) * 100));

      if (onValueChange) {
        onValueChange([percentage]);
      }
    };

    // Initial position
    updateValue(e.touches[0].clientY);

    // Handle touch movement
    const handleTouchMove = (moveEvent: TouchEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      updateValue(moveEvent.touches[0].clientY);
    };

    // Handle touch end to remove listeners
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    // Add document-level event listeners with passive: false
    // Use this approach to fix TS errors
    document.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false } as AddEventListenerOptions);
    document.addEventListener('touchend', handleTouchEnd);
  }, [onValueChange]);

  // For horizontal orientation - also add touch handling
  const handleHorizontalTouchStart = React.useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent scrolling
    e.stopPropagation();

    if (!ref || !('current' in ref) || !ref.current) return;

    const slider = ref.current as unknown as HTMLDivElement;
    const sliderRect = slider.getBoundingClientRect();

    const updateValue = (clientX: number) => {
      const width = sliderRect.width;
      const offsetX = clientX - sliderRect.left;

      // Calculate percentage (0-100)
      const percentage = Math.max(0, Math.min(100, (offsetX / width) * 100));

      if (onValueChange) {
        onValueChange([percentage]);
      }
    };

    // Initial position
    updateValue(e.touches[0].clientX);

    // Handle touch movement
    const handleTouchMove = (moveEvent: TouchEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      updateValue(moveEvent.touches[0].clientX);
    };

    // Handle touch end to remove listeners
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    // Add document-level event listeners with passive: false
    // Use this approach to fix TS errors
    document.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false } as AddEventListenerOptions);
    document.addEventListener('touchend', handleTouchEnd);
  }, [onValueChange, ref]);

  // If horizontal, use the standard Radix UI implementation with touch handling
  if (!isVertical) {
    return (
      <SliderPrimitive.Root
        ref={ref}
        orientation="horizontal"
        className={cn("relative w-full flex items-center", className)}
        value={value}
        onValueChange={onValueChange}
        {...props}
      >
        <SliderPrimitive.Track
          className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/20"
          onTouchStart={handleHorizontalTouchStart}
        >
          <SliderPrimitive.Range className="absolute h-full bg-white" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block h-3 w-3 rounded-full bg-white"
          style={{
            borderColor: 'white',
            borderWidth: '1px',
            borderStyle: 'solid',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          }}
        />
      </SliderPrimitive.Root>
    );
  }

  // For vertical, implement a custom slider with touch support
  const currentValue = value ? value[0] : 0;
  const fillPercentage = currentValue;

  return (
    <div
      ref={internalRef}
      className={cn("relative h-28 w-5 cursor-pointer", className)}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Track */}
      <div
        className="absolute inset-x-0 h-full rounded-full"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          width: '6px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      >
        {/* Fill */}
        <div
          className="absolute bottom-0 rounded-full"
          style={{
            backgroundColor: 'white',
            width: '100%',
            height: `${fillPercentage}%`
          }}
        />
      </div>

      {/* Thumb */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          backgroundColor: 'white',
          borderColor: 'white',
          borderWidth: '1px',
          borderStyle: 'solid',
          width: '12px',
          height: '12px',
          bottom: `calc(${fillPercentage}% - 6px)`,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
        }}
      />
    </div>
  );
});
CustomVolumeSlider.displayName = "CustomVolumeSlider";

// Define only the types we need from video.js
type VideoJsPlayer = {
  ready: (callback: () => void) => void;
  src: (sources: any) => void;
  play: () => void;
  pause: () => void;
  dispose: () => void;
  volume: (level: number) => number;
  muted: (muted: boolean) => boolean;
  currentTime: (seconds?: number) => number;
  on: (event: string, callback: (...args: any[]) => void) => void;
  duration: () => number;
  controlBar: {
    progressControl: {
      seekBar: {
        update: () => void;
      };
    };
  };
};

interface VideoQuality {
  quality: string
  url: string
  width: number
  height: number
}

interface MediaRendererProps {
  post: any
  className?: string
  maxWidth?: number
  maxHeight?: number
  onLoad?: () => void
  onVote?: (direction: "up" | "down") => void
  onComment?: () => void
  onShare?: () => void
  onSave?: () => void
}

// Add VideoControls component
// ... (VideoControls code remains exactly as provided) ...
interface VideoControlsProps {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  onPlayPause: () => void;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onToggleFullscreen: () => void;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  duration,
  currentTime,
  onPlayPause,
  onSeek,
  onToggleFullscreen,
}) => {
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds === 0) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    // If longer than an hour, show hours too
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.floor(minutes % 60);
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage for the progress bar
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-black/75 px-3 py-2 text-white w-full">
      <div
        className="w-full h-3 bg-gray-700 rounded-full cursor-pointer mb-2 relative overflow-hidden"
        onClick={onSeek}
      >
        <div
          className="h-full bg-white rounded-full absolute top-0 left-0"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={onPlayPause}
            className="flex items-center justify-center w-8 h-8 hover:bg-white/20 rounded-full"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <span className="text-sm font-medium">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        <button
          onClick={onToggleFullscreen}
          className="flex items-center justify-center w-8 h-8 hover:bg-white/20 rounded-full"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};


export default function MediaRenderer({
  post,
  className,
  maxWidth = 800,
  maxHeight = 800,
  onLoad,
}: MediaRendererProps) {
  // Text-only posts detection - check this first before setting up other state
  // ... (Text-only post detection logic remains exactly as provided) ...
  if (!post.url ||
      post.is_self ||
      post.url.includes("reddit.com/r/") ||
      post.domain === "self." + post.subreddit ||
      (post.thumbnail === "self" && !post.media && !post.gallery_data)) {
    // Trigger onLoad callback so parent component continues rendering
    setTimeout(() => onLoad?.(), 0);
    return null;
  }


  // State definitions
  // ... (All state definitions remain exactly as provided) ...
  const [mediaInfo, setMediaInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [showQualitySelector, setShowQualitySelector] = useState(false)
  const [currentQuality, setCurrentQuality] = useState<string>("auto")
  const [showControls, setShowControls] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [isBuffering, setIsBuffering] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [isTextOnly, setIsTextOnly] = useState(false)


  // Ref definitions
  // ... (All ref definitions remain exactly as provided) ...
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const volumeSliderRef = useRef<HTMLDivElement>(null)
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  })
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const durationRef = useRef<number>(0)


  // useEffect hooks
  // ... (All useEffect hooks remain exactly as provided) ...
  // Add responsive maxWidth handling
  const [responsiveMaxWidth, setResponsiveMaxWidth] = useState(maxWidth)

  // Monitor screen width and update responsiveMaxWidth accordingly
  useEffect(() => {
    const updateMaxWidth = () => {
      const screenWidth = window.innerWidth
      // For small screens, ensure content fits within the viewport with some padding
      if (screenWidth <= 600) {
        setResponsiveMaxWidth(Math.min(screenWidth - 24, maxWidth))
      } else {
        setResponsiveMaxWidth(maxWidth)
      }
    }

    // Initial update
    updateMaxWidth()

    // Update on resize
    window.addEventListener('resize', updateMaxWidth)
    return () => window.removeEventListener('resize', updateMaxWidth)
  }, [maxWidth])

  // Force recalculation of media dimensions when screen size changes
  useEffect(() => {
    const handleResize = () => {
      // Re-trigger media info loading to recalculate dimensions
      if (mediaInfo) {
        const optimalDimensions = getOptimalDimensions(
          mediaInfo.width,
          mediaInfo.height,
          responsiveMaxWidth,
          maxHeight
        )
        // Create a new object instead of using the callback form
        const updatedMediaInfo = {
          ...mediaInfo,
          width: optimalDimensions.width,
          height: optimalDimensions.height
        }
        setMediaInfo(updatedMediaInfo)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mediaInfo, responsiveMaxWidth, maxHeight])

  useEffect(() => {
    const loadMediaInfo = async () => {
      try {
        // Check if post has any media content
        const info = await getMediaInfo(post)

        // If no media info is returned, there's no media to display
        if (!info) {
          setLoading(false)
          onLoad?.()
          return
        }

        setMediaInfo(info)

        // Set media dimensions based on post data and container constraints
        const optimalDimensions = getOptimalDimensions(
          info.width,
          info.height,
          responsiveMaxWidth,
          maxHeight
        )

        // ... existing code ...
      } catch (err) {
        console.error("Error loading media:", err)
        // If media loading fails, still trigger onLoad to not block the UI
        onLoad?.()
      } finally {
        setLoading(false)
      }
    }

    loadMediaInfo()
  }, [post, onLoad, responsiveMaxWidth, maxHeight])

  useEffect(() => {
    if (mediaInfo?.type === "vreddit" && videoRef.current) {
      const video = videoRef.current;

      // Set initial mute state
      video.muted = isMuted;
      video.volume = volume;

      if (typeof window !== "undefined") {
        // Use dynamic import to prevent server-side errors
        const loadVideoJS = async () => {
          try {
            // Clean up previous player instance
            if (playerRef.current) {
              playerRef.current.dispose();
              playerRef.current = null;
            }

            // Dynamically import Video.js
            const videojs = (await import('video.js')).default;

            // Initialize the player with video.js
            const player = videojs(video, {
              autoplay: false,
              controls: false,
              fluid: true,
              responsive: true,
              preload: "auto",
              playsinline: true,
              poster: mediaInfo.poster,
              html5: {
                hls: {
                  overrideNative: true
                },
                nativeAudioTracks: false,
                nativeVideoTracks: false
              }
            });

            // Save the player instance
            playerRef.current = player;

            // Set up event handlers
            player.on("play", function() {
              setIsPlaying(true);
            });

            player.on("pause", function() {
              setIsPlaying(false);
            });

            player.on("ended", function() {
              setIsPlaying(false);
            });

            player.on("timeupdate", function(this: any) {
              if (this.currentTime && this.duration) {
                setCurrentTime(this.currentTime());
                setProgress((this.currentTime() / this.duration()) * 100);
              }
            });

            player.on("durationchange", function(this: any) {
              if (this.duration) {
                setDuration(this.duration());
              }
            });

            player.on("waiting", function() {
              setIsBuffering(true);
            });

            player.on("playing", function() {
              setIsBuffering(false);
            });

            player.on("error", function(this: any, error: unknown) {
              console.error("Video.js error:", error);

              // Fallback to direct video URL if streaming fails
              if (mediaInfo.fallbackUrl) {
                console.log("Falling back to direct video URL");
                this.src({
                  src: mediaInfo.fallbackUrl,
                  type: "video/mp4"
                });

                // Try to resume playback
                if (isPlaying) {
                  setTimeout(() => {
                    try {
                      this.play();
                    } catch (e) {
                      console.log("Playback error after fallback:", e);
                    }
                  }, 100);
                }
              }
            });

            // Set the video source based on available formats - prioritize HLS
            if (mediaInfo.hlsUrl) {
              // Clean HLS URL to make sure it's in the right format
              const cleanHlsUrl = mediaInfo.hlsUrl.includes("HLSPlaylist.m3u8")
                ? mediaInfo.hlsUrl
                : `https://v.redd.it/${mediaInfo.hlsUrl.split('/').pop()?.split('?')[0]}/HLSPlaylist.m3u8`;

              player.src({
                src: cleanHlsUrl,
                type: "application/x-mpegURL"
              });
            } else if (mediaInfo.fallbackUrl) {
              player.src({
                src: mediaInfo.fallbackUrl,
                type: "video/mp4"
              });
            }

            // Set volume and muted state
            player.volume(volume);
            player.muted(isMuted);

            // Signal that the video is ready
            setImageLoading(false);
            onLoad?.();

          } catch (err) {
            console.error("Error initializing video.js:", err);
            // Fallback to native video player
            if (mediaInfo.fallbackUrl) {
              video.src = mediaInfo.fallbackUrl;
            }
          }
        };

        // Initialize Video.js
        loadVideoJS();
      } else if (mediaInfo.fallbackUrl) {
        // Use direct video URL if we're in a non-browser environment
        video.src = mediaInfo.fallbackUrl;
      }

      // Return cleanup function
      return () => {
        if (playerRef.current) {
          try {
            playerRef.current.dispose();
          } catch (e) {
            console.error("Error disposing video.js player:", e);
          }
        }
      };
    }
  }, [mediaInfo, isMuted, volume, onLoad]);

  // Handle video playback
  useEffect(() => {
    if (videoRef.current) {
      if (inView) {
        if (isPlaying) {
          videoRef.current.play().catch(() => {
            // Autoplay failed, do nothing (this is expected on mobile)
          })
        }
      } else {
        videoRef.current.pause()
      }
    }
  }, [inView, isPlaying])

  // Handle click outside volume slider
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeSliderRef.current && !volumeSliderRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])


  // Handler functions
  // ... (All handler functions like handleImageLoad, handleAudioTimeUpdate, etc., remain exactly as provided) ...
  const handleImageLoad = () => {
    setImageLoading(false)
    onLoad?.()
  }

  const handleAudioTimeUpdate = () => {
    if (audioRef.current && videoRef.current) {
      // Sync video time with audio time
      const timeDiff = Math.abs(videoRef.current.currentTime - audioRef.current.currentTime)
      if (timeDiff > 0.1) {
        // Only sync if difference is more than 0.1 seconds
        videoRef.current.currentTime = audioRef.current.currentTime
      }
    }
  }

  const handleAudioEnded = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.pause()
    }
  }

  const handleQualityChange = (quality: string) => {
    if (!mediaInfo?.videoQualities) return;

    const selectedQuality = mediaInfo.videoQualities.find((q: any) => q.quality === quality);
    if (selectedQuality) {
      setCurrentQuality(quality);

      if (playerRef.current) {
        try {
          // Get current state
          const currentTime = playerRef.current.currentTime();
          const wasPlaying = isPlaying;

          // If this is a video.js player
          if (typeof playerRef.current.src === 'function') {
            playerRef.current.src({
              src: selectedQuality.url,
              type: "video/mp4"
            });

            // Restore state
            playerRef.current.currentTime(currentTime);
        if (wasPlaying) {
              playerRef.current.play();
            }
          }
        } catch (e) {
          console.error("Error changing video quality:", e);
        }
      } else if (videoRef.current) {
        // Fallback to direct URL switching with native video element
        const currentTime = videoRef.current.currentTime;
        const wasPlaying = !videoRef.current.paused;
        videoRef.current.src = selectedQuality.url;
        videoRef.current.currentTime = currentTime;
        if (wasPlaying) {
          videoRef.current.play().catch(() => {});
        }
      }

      setShowQualitySelector(false);
    }
  };

  const togglePlayPause = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (!mediaInfo) return;

    if (mediaInfo.type === "vreddit") {
      if (playerRef.current) {
        if (isPlaying) {
          playerRef.current.pause();
        } else {
          playerRef.current.play();
        }
      }
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        if (audioRef.current) {
          audioRef.current.pause();
        }
      } else {
        videoRef.current.play().catch(error => {
          console.error("Error playing video:", error);
        });
        if (audioRef.current) {
          audioRef.current.play().catch(error => {
            console.error("Error playing audio:", error);
          });
        }
      }
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    setIsMuted(!isMuted);

    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }

    if (playerRef.current) {
      if (typeof playerRef.current.muted === 'function') {
        playerRef.current.muted(!isMuted);
      }
    }
  };

  const handleVolumeChange = (newVolume: number[], e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const volumeValue = newVolume[0] / 100;
    setVolume(volumeValue);
    setIsMuted(volumeValue === 0);

    if (videoRef.current) {
      videoRef.current.volume = volumeValue;
      videoRef.current.muted = volumeValue === 0;
    }

    if (playerRef.current) {
      if (typeof playerRef.current.volume === 'function') {
        playerRef.current.volume(volumeValue);
      }
      if (typeof playerRef.current.muted === 'function') {
        playerRef.current.muted(volumeValue === 0);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !mediaInfo?.gallery) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      setCurrentGalleryIndex((prev) => (prev + 1) % mediaInfo.gallery.length)
    }
    if (isRightSwipe) {
      setCurrentGalleryIndex((prev) => (prev - 1 + mediaInfo.gallery.length) % mediaInfo.gallery.length)
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const newTime = pos * videoRef.current.duration
    videoRef.current.currentTime = newTime
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  // Add a function to prevent event propagation
  const preventNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Loading/Error/No Media checks
  // ... (Loading, Error, No Media checks remain exactly as provided) ...
  if (loading) {
    return (
      <div className="animate-pulse bg-muted h-48 rounded-md flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // If no media info after loading, return null
  if (!mediaInfo) {
    return null;
  }


  // Dimension calculation
  // ... (Dimension calculation remains exactly as provided) ...
  const { width, height } = getOptimalDimensions(mediaInfo.width, mediaInfo.height, responsiveMaxWidth, maxHeight)


  // Render functions
  // ... (renderMedia, renderGalleryItem remain exactly as provided, except for the change inside renderSingleMedia) ...
  const renderMedia = (isDialog = false) => {
    if (!mediaInfo) return null

    // Enhanced gallery item detection and extraction
    const currentMedia =
      mediaInfo.type === "gallery" && mediaInfo.gallery && mediaInfo.gallery.length > 0
        ? mediaInfo.gallery[currentGalleryIndex]
        : mediaInfo

    const containerClass = cn("relative overflow-hidden rounded-md bg-muted", !isDialog && className)

    // Dedicated function for rendering gallery
    if (mediaInfo.type === "gallery" && mediaInfo.gallery && mediaInfo.gallery.length > 0) {
      return (
        <div
          className={containerClass}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            maxWidth: width,
            aspectRatio: currentMedia?.aspectRatio ? `${currentMedia.aspectRatio}` : "16/9",
            backgroundColor: "black",
          }}
        >
          {/* Render the current gallery item */}
          {renderGalleryItem(currentMedia, isDialog)}

          {/* Gallery Controls */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-2 bg-black/70 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentGalleryIndex((prev) => (prev - 1 + mediaInfo.gallery!.length) % mediaInfo.gallery!.length)
                setImageLoading(true)
              }}
              className="h-8 w-8 text-white hover:bg-white/20"
              disabled={mediaInfo.gallery.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm text-white font-medium">
              {currentGalleryIndex + 1} / {mediaInfo.gallery.length}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentGalleryIndex((prev) => (prev + 1) % mediaInfo.gallery!.length)
                setImageLoading(true)
              }}
              className="h-8 w-8 text-white hover:bg-white/20"
              disabled={mediaInfo.gallery.length <= 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Caption if available */}
          {currentMedia.caption && (
            <div className="absolute bottom-12 left-0 right-0 bg-black/70 text-white p-2 text-sm">
              {currentMedia.caption}
            </div>
          )}
        </div>
      )
    }

    // For non-gallery media
    return renderSingleMedia(currentMedia, isDialog)
  }

  // New function to render a single gallery item
  const renderGalleryItem = (item: any, isDialog = false) => {
    if (!item) return null

    if (item.type === "image") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          <Image
            src={item.url || "/placeholder.svg"}
            alt={`Gallery image ${currentGalleryIndex + 1}`}
            width={item.width || width}
            height={item.height || height}
            className={cn(
              "w-full h-full object-contain transition-opacity duration-300",
              imageLoading ? "opacity-0" : "opacity-100",
            )}
            onLoad={handleImageLoad}
            priority={!isDialog && currentGalleryIndex === 0}
          />
        </div>
      )
    }

    if (item.type === "video") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <video
            src={item.url}
            controls
            playsInline
            className="max-h-[90vh] max-w-full"
            onLoadStart={() => setImageLoading(true)}
            onLoadedData={() => {
              setImageLoading(false)
              onLoad?.()
            }}
          />
        </div>
      )
    }

    if (item.type === "gif") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <Image
            src={item.url || "/placeholder.svg"}
            alt={`Gallery GIF ${currentGalleryIndex + 1}`}
            width={item.width || width}
            height={item.height || height}
            className={cn(
              "w-full h-full object-contain transition-opacity duration-300",
              imageLoading ? "opacity-0" : "opacity-100",
            )}
            onLoad={handleImageLoad}
            priority={!isDialog && currentGalleryIndex === 0}
          />
        </div>
      )
    }

    // Fallback
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-muted-foreground">Unsupported content type</p>
      </div>
    )
  }


  // Function for rendering non-gallery media
  const renderSingleMedia = (media: MediaInfo, isDialog = false) => {
    if (!media) return null

    const mediaClass = cn(
      "w-full h-full object-contain transition-opacity duration-300",
      isDialog ? "max-h-[90vh]" : `max-h-[${maxHeight}px]`,
      imageLoading ? "opacity-0" : "opacity-100",
    )

    // Calculate optimal dimensions based on media info and container constraints
    const { width, height } = getOptimalDimensions(
      media.width,
      media.height,
      isDialog ? maxWidth : responsiveMaxWidth,
      maxHeight
    )

    switch (media.type) {
      case "image":
      case "iredd-image":
        // ... (image rendering remains the same) ...
        return (
          <div
            className={cn("relative", !isDialog && className)}
            style={{ maxWidth: width }}
            onClick={(e) => e.stopPropagation()}
          >
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <Image
              src={media.url || "/placeholder.svg"}
              alt={post.title || ""}
              width={width}
              height={height}
              className={mediaClass}
              onLoad={handleImageLoad}
              priority={!isDialog}
            />

            {!isDialog && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )


      case "video": // NOTE: This case now renders the *dynamic* player if HLS
        const isVReddit = media.url.includes("v.redd.it");

        // --- Check if HLS applies (might be vreddit or generic video with hlsUrl) ---
        if (media.hlsUrl) {
          // Use the DynamicVideoPlayer component with clean HLS URL
          const cleanHlsUrl = media.hlsUrl.includes("HLSPlaylist.m3u8")
            ? media.hlsUrl
            : `https://v.redd.it/${media.hlsUrl.split('/').pop()?.split('?')[0]}/HLSPlaylist.m3u8`;

          return (
            <div className="relative w-full h-full" style={{ maxWidth: width, aspectRatio: media.aspectRatio ? `${media.aspectRatio}` : "16/9" }}>
              {/* +++ Use DynamicVideoPlayer +++ */}
              <DynamicVideoPlayer
                // ref={playerRef} // Ref might not work directly with dynamic import, handle internally in VideoPlayer if needed
                key={cleanHlsUrl} // Add key based on URL
                hlsUrl={cleanHlsUrl}
                posterUrl={media.poster} // Pass posterUrl
                // Pass other props if your VideoPlayer accepts them, like volume, muted etc. but let Plyr handle controls internally
                // fallbackUrl={media.fallbackUrl} // Pass fallback if needed by VideoPlayer
                // onReady={() => { ... }} // These callbacks need to be implemented inside VideoPlayer
                // onPlay={() => ... }
                // onPause={() => ... }
                // onEnded={() => ... }
                // onTimeUpdate={... }
                // onError={() => ... }
                // muted={isMuted} // Let Plyr manage this internally based on its controls
                // volume={volume} // Let Plyr manage this internally
                // className="w-full h-full" // Apply class directly inside VideoPlayer
              />
                {!isDialog && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70 z-10"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                )}
            </div>
          );
        }

        // For non-HLS videos or fallback if hlsUrl is missing
        return (
          // ... (non-HLS video rendering remains the same) ...
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              className="w-full h-full max-h-screen object-contain"
              controls
              playsInline
              loop={false}
              muted={!media.audioUrl}
              poster={media.poster}
              preload="auto"
              onLoadedData={() => {
                setImageLoading(false);
                onLoad?.();
                // Set initial duration if available
                if (videoRef.current && videoRef.current.duration) {
                  setDuration(videoRef.current.duration);
                  durationRef.current = videoRef.current.duration;
                }
              }}
              onCanPlay={() => setIsBuffering(false)}
              onPlay={() => {
                setIsPlaying(true);
              }}
              onPause={() => {
                setIsPlaying(false);
              }}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  const newTime = videoRef.current.currentTime;
                  setCurrentTime(newTime);
                  // Also update progress directly
                  if (videoRef.current.duration) {
                    setProgress((newTime / videoRef.current.duration) * 100);
                  }
                }
              }}
              onDurationChange={() => {
                if (videoRef.current && videoRef.current.duration) {
                  const videoDuration = videoRef.current.duration;
                  if (!isNaN(videoDuration) && Math.abs(videoDuration - durationRef.current) > 0.5) {
                    setDuration(videoDuration);
                    durationRef.current = videoDuration;
                    console.log(`Set video duration: ${videoDuration}`);
                  }
                }
              }}
              onError={(e) => {
                console.error("Video error:", e);
                setError("Failed to load video");
              }}
            >
              <source src={media.url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            {media.audioUrl && (
              <audio
                ref={audioRef}
                preload="auto"
                playsInline
                onTimeUpdate={handleAudioTimeUpdate}
                onError={(e) => {
                  console.error("Audio error:", e);
                }}
              >
                <source src={media.audioUrl} type="audio/mpeg" />
              </audio>
            )}
          </div>
        );

      case "vreddit":
        // For vreddit videos, use the new HLS-based player
        // Clean HLS URL to make sure it's in the right format
        const cleanHlsUrl_vreddit = media.hlsUrl?.includes("HLSPlaylist.m3u8")
          ? media.hlsUrl
          : `https://v.redd.it/${media.hlsUrl?.split('/').pop()?.split('?')[0]}/HLSPlaylist.m3u8`;

        // Ensure we have a valid URL before rendering
        if (!cleanHlsUrl_vreddit || cleanHlsUrl_vreddit.includes("undefined")) {
            console.error("Invalid HLS URL for vreddit:", media.hlsUrl);
            // Optionally render fallback or error
            return <div className="p-4 text-red-500">Error: Invalid video URL.</div>;
        }

        return (
          <div
            className={cn("relative overflow-hidden rounded-md bg-muted", !isDialog && className)}
            style={{
              maxWidth: width,
              aspectRatio: media.aspectRatio ? `${media.aspectRatio}` : "16/9",
              backgroundColor: "black",
              minHeight: "200px", // Keep min height
              position: "relative",
            }}
          >
            {/* +++ Use DynamicVideoPlayer +++ */}
            <DynamicVideoPlayer
              // ref={playerRef} // Ref might not work directly
              key={cleanHlsUrl_vreddit} // Add key based on URL
              hlsUrl={cleanHlsUrl_vreddit}
              posterUrl={media.poster} // Pass posterUrl
              // Pass other props if VideoPlayer accepts them
              // fallbackUrl={media.fallbackUrl}
              // onReady={() => { ... }}
              // onPlay={() => ... }
              // onPause={() => ... }
              // onEnded={() => ... }
              // onTimeUpdate={... }
              // onError={() => ... }
              // muted={isMuted}
              // volume={volume}
              // className="w-full h-full"
            />

            {/* Keep the fullscreen button */}
            {!isDialog && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70 z-10"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )

      // Other cases (redgif, gfycat, etc.)
      // ... (redgif, gfycat, streamable, youtube, twitch cases remain exactly as provided) ...
      case "redgif":
        const redgifAspectRatio = media.aspectRatio || 16/9; // Default to 16:9 if aspectRatio is missing
        const paddingTop = `${(1 / redgifAspectRatio) * 100}%`; // Calculate padding based on aspect ratio
        
        return (
          <div
            className={cn("redgif-embed-container", !isDialog && className)}
            style={{
              maxWidth: media.width || width,
              paddingTop, // Override the default padding with calculated value
            }}
          >
            <iframe
              src={media.url}
              frameBorder="0"
              scrolling="no"
              allowFullScreen
              sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
              onLoad={handleImageLoad}
              title="RedGIFs Content"
            />
          </div>
        )

      case "gfycat":
      case "streamable":
      case "youtube":
      case "twitch":
        return (
          <div
            className={cn("relative overflow-hidden rounded-md bg-muted", !isDialog && className)}
            style={{
              maxWidth: width,
              paddingBottom: "56.25%", // 16:9 aspect ratio
            }}
          >
            <iframe
              src={media.url}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              className="absolute inset-0"
              onLoad={handleImageLoad}
            />
          </div>
        )


      default:
        return null
    }
  }

  // Component return structure
  // ... (Final return with Dialog remains exactly as provided) ...
  return (
    <>
      <div onClick={preventNavigation}>
        {renderMedia()}
      </div>
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-screen-lg p-0 bg-background/95 backdrop-blur">
          {renderMedia(true)}
        </DialogContent>
      </Dialog>
    </>
  )
}