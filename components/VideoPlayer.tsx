"use client";
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  MouseEvent,
  TouchEvent,
} from "react";
import Hls from "hls.js";
import { cn } from "@/lib/utils"; // Assuming you have this utility
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  Loader2,
  Check,
} from "lucide-react";

// --- Helper Function ---
const formatTime = (seconds: number): string => {
  // ... (keep formatTime as is)
  if (isNaN(seconds) || seconds === Infinity || seconds < 0) return "0:00";
  const date = new Date(0);
  date.setSeconds(seconds);
  const timeString = date.toISOString().substring(11, 19);
  if (seconds < 3600) {
    return timeString.substring(3); // MM:SS
  }
  return timeString; // HH:MM:SS
};

// --- Types ---
interface QualityLevel {
  height: number;
  index: number; // HLS level index
}

interface VideoPlayerProps {
  hlsUrl: string;
  posterUrl?: string;
}

// --- Constants ---
const INITIAL_UNMUTE_VOLUME = 0.4; // Set initial volume to 40% on start

// --- Component ---
const VideoPlayer: React.FC<VideoPlayerProps> = ({ hlsUrl, posterUrl }) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  // --- CHANGE 1: Update initial audio state ---
  const [isMuted, setIsMuted] = useState(false); // Start unmuted
  const [volume, setVolume] = useState(INITIAL_UNMUTE_VOLUME); // Start volume at initial target
  const [lastVolume, setLastVolume] = useState(INITIAL_UNMUTE_VOLUME); // Store last non-zero volume
  // --- CHANGE 2: Remove hasBeenUnmuted state ---
  // const [hasBeenUnmuted, setHasBeenUnmuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<QualityLevel[]>([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isNativeHLS, setIsNativeHLS] = useState(false);
  const [activeAutoQualityHeight, setActiveAutoQualityHeight] = useState<number | null>(null);
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);


  // --- Callbacks ---

  // Toggle Play/Pause (unchanged)
  const togglePlayPause = useCallback((e?: MouseEvent | TouchEvent) => {
    if (e && (e.target as Element).closest('button, [role="slider"], [role="menu"]')) {
        return;
    }
    const video = videoRef.current;
    if (!video) return;
    const clickedOnSlider = volumeSliderRef.current?.contains(e?.target as Node);
    const clickedOnSettings = settingsMenuRef.current?.contains(e?.target as Node);
    if (clickedOnSlider || clickedOnSettings) return;

    if (video.paused || video.ended) {
      video.play().catch((error) => console.error("Error playing video:", error));
    } else {
      video.pause();
    }
    resetControlsTimeout();
  }, []); // Add dependencies if needed

   // Reset the timeout (unchanged)
   const resetControlsTimeout = useCallback(() => {
    showControlsHandler();
    hideControlsHandler();
   }, [/* dependencies */]);

  // Toggle Mute state
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);

    if (newMuted) {
      // Muting: store current volume if it wasn't 0, then set volume state to 0
      if (volume > 0) {
        setLastVolume(volume);
      }
      setVolume(0);
      // video.volume = 0; // video.muted = true handles this
    } else {
      // Unmuting: Restore to last known volume, ensuring it's not 0
      const restoreVolume = lastVolume > 0.05 ? lastVolume : INITIAL_UNMUTE_VOLUME;
      setVolume(restoreVolume);
      video.volume = restoreVolume;
      setLastVolume(restoreVolume); // Update lastVolume as well
    }
    resetControlsTimeout();
    // --- CHANGE 4: Remove hasBeenUnmuted logic ---
  }, [isMuted, volume, lastVolume, resetControlsTimeout]); // Removed hasBeenUnmuted

  // Handle Volume Change from Slider
  const handleVolumeChange = useCallback((newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    video.volume = clampedVolume;
    const newMuted = clampedVolume === 0;

    // --- CHANGE 5: Simplify volume change logic ---
    if (newMuted !== isMuted) {
        setIsMuted(newMuted);
        video.muted = newMuted;
    }

    // Update lastVolume if the sound is audible and not currently muted
    if (!newMuted && clampedVolume > 0.05) {
        setLastVolume(clampedVolume);
    }

    resetControlsTimeout();
  }, [isMuted, resetControlsTimeout]); // Removed hasBeenUnmuted, lastVolume (implicitly handled)


  // Handle Seeking on Progress Bar Click/Drag Start (unchanged)
  const handleSeekMouseDown = useCallback(/* ... */ (e: MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;
    if (!video || !progressBar || isNaN(video.duration) || video.duration <= 0) return;

    setIsSeeking(true);
    const rect = progressBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
    const newTime = percentage * video.duration;

    setCurrentTime(newTime);
    video.currentTime = newTime;

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const moveOffsetX = moveEvent.clientX - rect.left;
      const movePercentage = Math.max(0, Math.min(1, moveOffsetX / rect.width));
      const moveTime = movePercentage * video.duration;
      setCurrentTime(moveTime);
      video.currentTime = moveTime;
    };

    const handleMouseUp = () => {
      setIsSeeking(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      resetControlsTimeout();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [resetControlsTimeout]);

   // Handle Seeking on Progress Bar Touch (unchanged)
   const handleSeekTouchStart = useCallback(/* ... */ (e: TouchEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;
    if (!video || !progressBar || isNaN(video.duration) || video.duration <= 0) return;

    e.preventDefault();
    e.stopPropagation();

    setIsSeeking(true);
    const rect = progressBar.getBoundingClientRect();
    const touch = e.touches[0];
    const offsetX = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
    const newTime = percentage * video.duration;

    setCurrentTime(newTime);
    video.currentTime = newTime;

    const handleTouchMove = (moveEvent: globalThis.TouchEvent) => {
        if (moveEvent.touches.length === 0) return;
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        const moveTouch = moveEvent.touches[0];
        const moveOffsetX = moveTouch.clientX - rect.left;
        const movePercentage = Math.max(0, Math.min(1, moveOffsetX / rect.width));
        const moveTime = movePercentage * video.duration;
        setCurrentTime(moveTime);
        video.currentTime = moveTime;
    };

    const handleTouchEnd = () => {
      setIsSeeking(false);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
      resetControlsTimeout();
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchEnd);
   }, [resetControlsTimeout]);

  // Handle Quality Change (Unchanged)
  const handleQualityChange = useCallback(/* ... */ (qualityIndex: number) => {
    const hls = hlsRef.current;
    if (hls) {
      console.log(`User requested quality index: ${qualityIndex}`);
      hls.currentLevel = qualityIndex;
      setCurrentQualityIndex(qualityIndex);
      setShowSettingsMenu(false);
      resetControlsTimeout();
    }
  }, [resetControlsTimeout]);

  // Toggle Fullscreen (Unchanged)
  const toggleFullscreen = useCallback(/* ... */ () => {
    const elem = containerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
      });
    } else {
      document.exitFullscreen();
    }
     resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Show controls on interaction (unchanged)
  const showControlsHandler = useCallback(/* ... */ () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  }, []);

  // Hide controls after a delay (unchanged)
  const hideControlsHandler = useCallback(/* ... */ () => {
    const video = videoRef.current;
    if (showVolumeSlider || showSettingsMenu || !isPlaying || video?.ended) return;

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      controlsTimeoutRef.current = null;
    }, 3000);
  }, [showVolumeSlider, showSettingsMenu, isPlaying]);


  // Handle Vertical Volume Slider Interaction (Unchanged)
  const handleVolumeSliderInteraction = useCallback(/* ... */ (clientY: number) => {
    const slider = volumeSliderRef.current;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const offsetY = clientY - rect.top;
    const height = rect.height;
    const newVolume = 1 - Math.max(0, Math.min(1, offsetY / height));
    handleVolumeChange(newVolume);
  }, [handleVolumeChange]);

  // Mouse down/move/up for volume slider (Unchanged)
  const handleVolumeMouseDown = useCallback(/* ... */ (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleVolumeSliderInteraction(e.clientY);

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
        handleVolumeSliderInteraction(moveEvent.clientY);
    };
    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        resetControlsTimeout();
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleVolumeSliderInteraction, resetControlsTimeout]);

  // Touch start/move/end for volume slider (Unchanged)
  const handleVolumeTouchStart = useCallback(/* ... */ (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    handleVolumeSliderInteraction(touch.clientY);

    const handleTouchMove = (moveEvent: globalThis.TouchEvent) => {
        if (moveEvent.touches.length === 0) return;
        const moveTouch = moveEvent.touches[0];
        handleVolumeSliderInteraction(moveTouch.clientY);
        moveEvent.preventDefault();
    };
    const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
        resetControlsTimeout();
    };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
  }, [handleVolumeSliderInteraction, resetControlsTimeout]);

  // --- Effects ---

   // Main HLS Setup and Cleanup Effect
   useEffect(() => {
     const videoElement = videoRef.current;
     if (!videoElement || !hlsUrl) return;

     let hlsInstance: Hls | null = null;
     setIsNativeHLS(false);
     setIsMetadataLoaded(false); // Reset metadata flag on new source

     const cleanup = () => {
       console.log(`Cleaning up player for ${hlsUrl}`);
       if (hlsInstance) hlsInstance.destroy();
       if (hlsRef.current) hlsRef.current.destroy();
       hlsRef.current = null; // Clear the ref

       if (videoElement) {
         videoElement.pause();
         videoElement.removeAttribute("src");
         videoElement.load(); // Important to reset internal state
         console.log('Video element source cleared and loaded.');
       }
       // --- CHANGE 7: Adjust state reset in cleanup ---
       // Reset to a neutral state before the *next* video loads.
       // The 'loadedmetadata' handler for the next video will set the desired *initial* playback state.
       setAvailableQualities([]);
       setCurrentQualityIndex(-1);
       setActiveAutoQualityHeight(null);
       setDuration(0);
       setCurrentTime(0);
       setIsPlaying(false);
       setIsBuffering(false);
       setIsMuted(true); // Reset visual mute state (will be overridden by loadedmetadata)
       setVolume(0);    // Reset visual volume state (will be overridden)
       setLastVolume(INITIAL_UNMUTE_VOLUME); // Reset memory
       // Do NOT reset isMetadataLoaded here, it's handled at the start of the effect
       setIsNativeHLS(false); // Reset native flag as well
     };

     cleanup(); // Clean previous instance first

     console.log(`Setting up player for HLS URL: ${hlsUrl}`);

     // --- HLS Setup Logic (unchanged) ---
      if (Hls.isSupported()) {
        console.log("HLS.js supported. Initializing...");
        hlsInstance = new Hls({ startLevel: -1 }); // Auto start level
        hlsRef.current = hlsInstance;

        // HLS Event Listeners (unchanged)
         hlsInstance.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
           console.log("HLS Manifest Parsed. Levels:", data.levels);
           if (!hlsRef.current) return;
           const levels = hlsRef.current.levels || [];
           const qualities: QualityLevel[] = levels
             .map((level, index) => ({ height: level.height, index: index }))
             .filter((q, idx, self) => self.findIndex(l => l.height === q.height) === idx)
             .sort((a, b) => b.height - a.height);
           setAvailableQualities(qualities);
           setCurrentQualityIndex(hlsRef.current.currentLevel);
           if (hlsRef.current.currentLevel === -1 && levels.length > 0) {
                setActiveAutoQualityHeight(levels[hlsRef.current.loadLevel]?.height ?? null);
           }
         });
         hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
           console.log(`HLS Level Switched to index: ${data.level}`);
           if (!hlsRef.current) return;
           setCurrentQualityIndex(hlsRef.current.currentLevel);
           const currentLevel = hlsRef.current.levels[data.level];
           if (hlsRef.current.autoLevelEnabled && currentLevel) {
                setActiveAutoQualityHeight(currentLevel.height);
           } else if (hlsRef.current.currentLevel !== -1) {
                 setActiveAutoQualityHeight(null); // Clear if manually selected
           }
           // If still on auto (-1), don't clear activeAutoQualityHeight yet
         });
         hlsInstance.on(Hls.Events.ERROR, (event, data) => {
           console.error("HLS Error:", data);
           if (data.fatal && hlsRef.current) { // Check hlsRef.current exists
             switch (data.type) {
               case Hls.ErrorTypes.NETWORK_ERROR: hlsRef.current.startLoad(); break;
               case Hls.ErrorTypes.MEDIA_ERROR: hlsRef.current.recoverMediaError(); break;
               default: cleanup(); break; // Consider if cleanup is always best
             }
           }
         });

        console.log("Attaching HLS and loading source...");
        hlsInstance.attachMedia(videoElement);
        hlsInstance.loadSource(hlsUrl);

      } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
        console.log("Native HLS support detected.");
        setIsNativeHLS(true);
        videoElement.src = hlsUrl;
        // Reset HLS specific state if switching from HLS.js to native
        setAvailableQualities([]);
        setCurrentQualityIndex(-1);
        setActiveAutoQualityHeight(null);
      } else {
        console.error("HLS is not supported.");
        // Optionally display an error message to the user here
      }


     // Return the cleanup function
     return cleanup;
   }, [hlsUrl]); // Re-run ONLY when hlsUrl changes

  // Effect for Video Element Event Listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
        setIsPlaying(false);
        // Requirement: "muted only when user makes it or the video ends"
        // Let's NOT mute on end, consistent with many players. User can replay.
        // If you WANTED to mute on end, uncomment below:
        // video.muted = true;
        // setIsMuted(true);
        // setVolume(0);
    };
    const handleTimeUpdate = () => {
      if (!isSeeking && video.currentTime !== null && isFinite(video.currentTime)) {
        setCurrentTime(video.currentTime);
      }
    };
    const handleDurationChange = () => {
      if (video.duration !== Infinity && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };
     // Handle external volume/mute changes (e.g., system controls)
     const handleExternalVolumeChange = () => {
         const currentMuted = video.muted;
         const currentVolume = video.volume;
         setIsMuted(currentMuted);
         setVolume(currentMuted ? 0 : currentVolume);
         // Update lastVolume only if unmuted and volume changed significantly
         if (!currentMuted && currentVolume > 0.05) {
             setLastVolume(currentVolume);
         }
         // --- CHANGE 6: Removed hasBeenUnmuted logic ---
     };
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlaying = () => setIsBuffering(false);
    // Use loadedmetadata to know when dimensions/poster are ready AND set initial state
    const handleLoadedMetadata = () => {
        console.log("Video metadata loaded.");
        setIsMetadataLoaded(true); // Show video/hide poster
        if (video.duration !== Infinity && !isNaN(video.duration)) {
             setDuration(video.duration);
        }
        // --- CHANGE 3: Set initial unmuted state on video element ---
        console.log(`Setting initial volume to ${INITIAL_UNMUTE_VOLUME} and unmuted.`);
        video.muted = false;
        video.volume = INITIAL_UNMUTE_VOLUME;
        // Sync React state just in case external handler hasn't fired yet
        setIsMuted(false);
        setVolume(INITIAL_UNMUTE_VOLUME);
        setLastVolume(INITIAL_UNMUTE_VOLUME); // Ensure lastVolume starts correctly
    };

    // Add listeners
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("volumechange", handleExternalVolumeChange);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    // Cleanup listeners
    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("volumechange", handleExternalVolumeChange);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
     // Remove hasBeenUnmuted dependency
  }, [isSeeking]);

   // Effect for handling click outside menus (unchanged)
   useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent | globalThis.TouchEvent) => {
      if (showVolumeSlider && volumeSliderRef.current && !volumeSliderRef.current.contains(event.target as Node) && !(event.target as Element).closest('[data-testid="volume-button"]')) {
        setShowVolumeSlider(false);
      }
      if (showSettingsMenu && settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node) && !(event.target as Element).closest('[data-testid="settings-button"]')) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showVolumeSlider, showSettingsMenu]);

   // Effect for control visibility timeout management (unchanged)
   useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isPlaying) {
       hideControlsHandler();
    } else {
       showControlsHandler();
    }

    container.addEventListener("pointermove", resetControlsTimeout);
    container.addEventListener("pointerleave", hideControlsHandler);
    container.addEventListener("pointerdown", showControlsHandler, { passive: true });

    return () => {
      container.removeEventListener("pointermove", resetControlsTimeout);
      container.removeEventListener("pointerleave", hideControlsHandler);
      container.removeEventListener("pointerdown", showControlsHandler);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, resetControlsTimeout, hideControlsHandler, showControlsHandler]);


  // --- Render Logic ---
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // (JSX Render part remains exactly the same as before)
  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-full relative bg-black overflow-hidden group",
        "focus:outline-none"
      )}
      onClick={togglePlayPause}
      tabIndex={0}
      role="application"
      aria-label="Video Player"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className={cn(
            "w-full h-full object-contain block",
            !isMetadataLoaded && "opacity-0"
        )}
        playsInline
        poster={posterUrl}
        preload="metadata"
        crossOrigin="anonymous"
        // `muted` and `volume` attributes are controlled via the effect now
      />

      {/* Poster Image */}
      {!isMetadataLoaded && posterUrl && (
         <img
             src={posterUrl}
             alt="Video poster"
             className="absolute inset-0 w-full h-full object-contain pointer-events-none"
         />
      )}
      {!isMetadataLoaded && !posterUrl && (
         <div className="absolute inset-0 bg-black"></div>
      )}


      {/* Buffering Indicator */}
      {isBuffering && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 pointer-events-none">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      {/* Custom Controls Overlay */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-end transition-opacity duration-300 z-10",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        // onClick={(e) => e.stopPropagation()} // Keep clicks within controls from toggling play/pause
      >
        {/* Gradient Background */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none"></div>

        {/* Progress Bar Area */}
        <div
            className="relative mx-3 mb-2 px-1 cursor-pointer group/progress"
            ref={progressBarRef}
            onMouseDown={handleSeekMouseDown}
            onTouchStart={handleSeekTouchStart}
            role="slider"
            aria-label="Video progress"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            tabIndex={0}
        >
           <div className="relative h-1.5 bg-white/30 rounded-full w-full transition-all duration-150 group-hover/progress:h-2.5">
                {/* Played Progress */}
                <div
                    className="absolute top-0 left-0 h-full bg-red-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                />
                {/* Seek Handle */}
                 <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 transition-opacity group-hover/progress:opacity-100"
                    style={{ left: `${progressPercent}%`, transform: 'translate(-50%, -50%)' }}
                 />
           </div>
        </div>


        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between px-3 pb-2 text-white relative">
          {/* Left Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Play/Pause Button */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePlayPause(e); }}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            {/* Volume Control Area */}
            <div className="relative flex items-center group/volume">
              {/* Volume Button */}
              <button
                data-testid="volume-button"
                onClick={(e) => {
                    e.stopPropagation();
                    // --- Keep toggleMute for quick mute/unmute ---
                    // If you prefer the button *only* opens the slider, change this:
                    // setShowVolumeSlider(!showVolumeSlider);
                    toggleMute(); // Button press toggles mute state directly
                    resetControlsTimeout();
                 }}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
                 aria-haspopup="true"
                 aria-expanded={showVolumeSlider}
                 // Add onMouseEnter/Focus to show slider on desktop hover/focus
                 onMouseEnter={() => setShowVolumeSlider(true)}
                 onFocus={() => setShowVolumeSlider(true)}
                 // Add onMouseLeave/Blur to hide (but might conflict with slider interaction)
                 // onMouseLeave={() => setTimeout(() => { if (!volumeSliderRef.current?.matches(':hover')) setShowVolumeSlider(false) }, 100)}
                 // onBlur={() => setTimeout(() => setShowVolumeSlider(false), 100)} // Delay to allow focus transfer
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>

              {/* Vertical Volume Slider */}
               <div
                className={cn(
                    "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-black/70 rounded-md shadow-lg cursor-pointer",
                    "transition-opacity duration-150",
                     showVolumeSlider ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none" // Control visibility via state
                )}
                ref={volumeSliderRef}
                onMouseDown={handleVolumeMouseDown}
                onTouchStart={handleVolumeTouchStart}
                // Add mouse enter/leave to keep it open while interacting
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
                role="slider"
                aria-label="Volume"
                aria-orientation="vertical"
                aria-valuemin={0}
                aria-valuemax={1}
                aria-valuenow={volume}
              >
                  <div className="relative w-1.5 h-20 sm:h-24 bg-white/30 rounded-full">
                    {/* Volume Fill */}
                    <div
                      className="absolute bottom-0 left-0 w-full bg-white rounded-full"
                      style={{ height: `${volume * 100}%` }}
                    />
                    {/* Volume Handle */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow border border-gray-300"
                      style={{ bottom: `calc(${volume * 100}% - 6px)` }}
                    />
                  </div>
                </div>
            </div>

             {/* Time Display */}
             <div className="text-xs sm:text-sm font-medium tabular-nums ml-1 whitespace-nowrap">
                <span>{formatTime(currentTime)}</span> /{" "}
                <span>{formatTime(duration)}</span>
             </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Settings Button & Menu */}
            <div className="relative group/settings">
              <button
                data-testid="settings-button"
                 onClick={(e) => {
                     e.stopPropagation();
                     setShowSettingsMenu(!showSettingsMenu);
                     resetControlsTimeout();
                  }}
                className={cn("p-2 rounded-full hover:bg-white/20 transition-colors", {
                   'text-gray-400 pointer-events-none opacity-50': isNativeHLS || availableQualities.length === 0 // Simplified condition
                })}
                aria-label="Settings"
                disabled={isNativeHLS || availableQualities.length === 0}
                aria-haspopup="true"
                aria-expanded={showSettingsMenu}
                // Desktop hover/focus for settings menu
                 onMouseEnter={() => setShowSettingsMenu(true)}
                 onFocus={() => setShowSettingsMenu(true)}
                 // onMouseLeave={() => setTimeout(() => { if (!settingsMenuRef.current?.matches(':hover')) setShowSettingsMenu(false)}, 100)}
                 // onBlur={() => setTimeout(() => setShowSettingsMenu(false), 100)}
              >
                <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Settings Menu */}
              <div
                  className={cn(
                      "absolute bottom-full right-0 mb-2 min-w-[120px] bg-black/80 rounded-md shadow-lg py-1 text-xs sm:text-sm",
                      "transition-opacity duration-150",
                      showSettingsMenu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none" // Control via state
                  )}
                  ref={settingsMenuRef}
                  // Keep open on hover
                  onMouseEnter={() => setShowSettingsMenu(true)}
                  onMouseLeave={() => setShowSettingsMenu(false)}
                  role="menu"
               >
                  {/* Content depends on HLS support */}
                  {!isNativeHLS && availableQualities.length > 0 ? (
                      <>
                          <div className="px-3 py-1.5 font-semibold border-b border-white/20">Quality</div>
                          {/* Auto Option */}
                          <button
                            role="menuitemradio"
                            aria-checked={currentQualityIndex === -1}
                            onClick={(e) => { e.stopPropagation(); handleQualityChange(-1); }}
                            className={cn("w-full text-left px-3 py-1.5 hover:bg-white/20 flex items-center justify-between", currentQualityIndex === -1 && "bg-white/10")}
                          >
                            <span>Auto {currentQualityIndex === -1 && activeAutoQualityHeight && `(${activeAutoQualityHeight}p)`}</span>
                            {currentQualityIndex === -1 && <Check className="w-4 h-4 ml-auto" />}
                          </button>
                          {/* Specific Quality Options */}
                          {availableQualities.map((quality) => (
                            <button
                              key={quality.index}
                              role="menuitemradio"
                              aria-checked={currentQualityIndex === quality.index}
                              onClick={(e) => { e.stopPropagation(); handleQualityChange(quality.index); }}
                              className={cn("w-full text-left px-3 py-1.5 hover:bg-white/20 flex items-center justify-between", currentQualityIndex === quality.index && "bg-white/10")}
                            >
                              <span>{quality.height}p</span>
                              {currentQualityIndex === quality.index && <Check className="w-4 h-4 ml-auto" />}
                            </button>
                          ))}
                      </>
                  ) : (
                     <div className="px-3 py-1.5 text-gray-400 italic">Quality unavailable</div>
                  )}
              </div>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Fullscreen"
            >
              <Maximize2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;