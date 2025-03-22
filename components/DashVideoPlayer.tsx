"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

// Define types for props
interface DashVideoPlayerProps {
  dashUrl: string;
  audioUrl?: string;
  poster?: string;
  fallbackUrl?: string;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: () => void;
  autoPlay?: boolean;
  muted?: boolean;
  volume?: number;
  className?: string;
}

// Define the exposed methods interface
export interface PlayerHandle {
  play: () => Promise<void> | void;
  pause: () => void;
}

const DashVideoPlayer = forwardRef<PlayerHandle, DashVideoPlayerProps>(({
  dashUrl,
  audioUrl,
  poster,
  fallbackUrl,
  onReady,
  onPlay,
  onPause,
  onTimeUpdate,
  onEnded,
  onError,
  autoPlay = false,
  muted = true,
  volume = 0.5,
  className = '',
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    play: async () => {
      try {
        // If using DASH.js player
        if (playerRef.current) {
          playerRef.current.play();
          if (audioRef.current) {
            await audioRef.current.play().catch(err => console.error("Audio play error:", err));
          }
        } 
        // If using native video element
        else if (videoRef.current) {
          await videoRef.current.play();
          if (audioRef.current) {
            await audioRef.current.play().catch(err => console.error("Audio play error:", err));
          }
        }
        if (onPlay) onPlay();
      } catch (error) {
        console.error("Error playing video:", error);
        if (onError) onError();
        throw error;
      }
    },
    pause: () => {
      try {
        // If using DASH.js player
        if (playerRef.current) {
          playerRef.current.pause();
        } 
        // If using native video element
        else if (videoRef.current) {
          videoRef.current.pause();
        }
        
        // Always pause audio if available
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        if (onPause) onPause();
      } catch (error) {
        console.error("Error pausing video:", error);
      }
    }
  }));

  // Handle separate audio element for v.redd.it videos
  const handleAudioTimeUpdate = () => {
    if (audioRef.current && videoRef.current) {
      // Sync video time with audio time
      const timeDiff = Math.abs(videoRef.current.currentTime - audioRef.current.currentTime);
      if (timeDiff > 0.1) {
        // Only sync if difference is more than 0.1 seconds
        videoRef.current.currentTime = audioRef.current.currentTime;
      }
    }
  };

  // Initialize DASH player
  useEffect(() => {
    if (!videoRef.current || isInitialized) return;

    const initDashPlayer = async () => {
      try {
        // Dynamically import dashjs to avoid SSR issues
        const dashjs = await import('dashjs');
        
        // Make sure videoRef exists
        if (!videoRef.current) {
          console.warn('Video element not available for DASH player initialization');
          return;
        }
        
        // Create a MediaPlayer instance
        const player = dashjs.MediaPlayer().create();
        
        // Store player reference
        playerRef.current = player;
        
        // Initialize with the video element
        player.initialize(videoRef.current, dashUrl, autoPlay);
        
        // Set up configuration - using the correct property names
        player.updateSettings({
          streaming: {
            abr: {
              autoSwitchBitrate: {
                video: true,
                audio: true
              }
            },
            buffer: {
              stallThreshold: 0.5,
              bufferTimeAtTopQuality: 30
            },
            retryAttempts: {
              MPD: 3,
              XLinkExpansion: 1,
              InitializationSegment: 3,
              IndexSegment: 3,
              MediaSegment: 3
            }
          }
        });
        
        // Set up event listeners
        player.on(dashjs.MediaPlayer.events.CAN_PLAY, () => {
          console.log('DASH.js player can play');
          
          // Report duration when ready
          if (videoRef.current && videoRef.current.duration) {
            if (onTimeUpdate) {
              onTimeUpdate(0, videoRef.current.duration);
            }
          }
          
          if (onReady) onReady();
        });
        
        player.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, () => {
          console.log('DASH.js playback started');
          if (onPlay) onPlay();
          
          // Start playing audio if available
          if (audioRef.current) {
            const audioPlayPromise = audioRef.current.play();
            if (audioPlayPromise !== undefined) {
              audioPlayPromise.catch(error => {
                console.error('Audio play error:', error);
                // Mute the audio on failure and continue with video only
                if (audioRef.current) audioRef.current.muted = true;
              });
            }
          }
        });
        
        player.on(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, () => {
          console.log('DASH.js playback paused');
          if (onPause) onPause();
          
          // Pause audio if available
          if (audioRef.current) {
            audioRef.current.pause();
          }
        });
        
        player.on(dashjs.MediaPlayer.events.PLAYBACK_ENDED, () => {
          console.log('DASH.js playback ended');
          if (onEnded) onEnded();
        });
        
        player.on(dashjs.MediaPlayer.events.PLAYBACK_TIME_UPDATED, (e: any) => {
          if (onTimeUpdate && videoRef.current) {
            const duration = videoRef.current.duration || 0;
            onTimeUpdate(
              videoRef.current.currentTime,
              duration
            );
          }
        });
        
        player.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
          console.error('DASH.js player error:', e);
          if (onError) onError();
          
          // Fall back to direct URL if available
          if (fallbackUrl && !useFallback) {
            console.log('Falling back to direct video URL:', fallbackUrl);
            setUseFallback(true);
          }
        });
        
        // Set initial properties
        if (videoRef.current) {
          videoRef.current.volume = volume;
          videoRef.current.muted = muted;
        }
        
        if (audioRef.current) {
          audioRef.current.volume = volume;
          audioRef.current.muted = muted;
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing DASH player:', error);
        if (onError) onError();
        
        // Fall back to direct URL if available
        if (fallbackUrl && !useFallback) {
          console.log('Falling back to direct video URL after init error:', fallbackUrl);
          setUseFallback(true);
        }
      }
    };

    // Start initialization
    initDashPlayer();

    // Cleanup function
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (e) {
          console.error('Error destroying DASH player:', e);
        }
      }
    };
  }, [dashUrl, autoPlay, isInitialized, onReady, onPlay, onPause, onTimeUpdate, onEnded, onError, useFallback, fallbackUrl]);

  // Handle volume and mute changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  // Handle fallback mode
  useEffect(() => {
    if (useFallback && fallbackUrl && videoRef.current) {
      // Clean up DASH player first
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (e) {
          console.error('Error destroying DASH player:', e);
        }
      }
      
      // Use the native video element with the fallback URL
      videoRef.current.src = fallbackUrl;
      videoRef.current.load();
      
      // Re-apply properties
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
      
      // Set up native video events
      videoRef.current.oncanplay = () => { if (onReady) onReady(); };
      videoRef.current.onplay = () => { if (onPlay) onPlay(); };
      videoRef.current.onpause = () => { if (onPause) onPause(); };
      videoRef.current.onended = () => { if (onEnded) onEnded(); };
      videoRef.current.onerror = () => { if (onError) onError(); };
      videoRef.current.ontimeupdate = () => {
        if (onTimeUpdate && videoRef.current) {
          onTimeUpdate(
            videoRef.current.currentTime,
            videoRef.current.duration || 0
          );
        }
      };
    }
  }, [useFallback, fallbackUrl, volume, muted, onReady, onPlay, onPause, onTimeUpdate, onEnded, onError]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
        controls={false}
        preload="auto"
        muted={muted}
      ></video>
      
      {audioUrl && !useFallback && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          hidden
          onTimeUpdate={handleAudioTimeUpdate}
          muted={muted}
        />
      )}
    </div>
  );
});

export default DashVideoPlayer; 