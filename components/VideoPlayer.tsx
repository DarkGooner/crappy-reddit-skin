"use client";
import React, { useRef, useEffect, useState, useCallback } from 'react';
import Plyr from 'plyr'; // Import Plyr directly for imperative control
import 'plyr-react/plyr.css';
import Hls from 'hls.js';

interface VideoPlayerProps {
  hlsUrl: string;
  posterUrl?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ hlsUrl, posterUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Memoize updateQuality - this function tells HLS.js what to do
  const updateQuality = useCallback((newQuality: number) => {
    const hls = hlsRef.current;
    if (hls) {
      console.log(`Plyr requested quality change to: ${newQuality}p (0 means Auto)`);
      if (newQuality === 0) { // Our representation for 'Auto'
        hls.currentLevel = -1; // Enable AUTO quality switching in HLS.js
        console.log('HLS: Set quality to Auto (level -1)');
      } else {
        // Find the HLS level index corresponding to the selected height
        const levelIndex = hls.levels.findIndex(level => level.height === newQuality);
        if (levelIndex !== -1) {
          hls.currentLevel = levelIndex;
          console.log(`HLS: Set quality to level index ${levelIndex} (${newQuality}p)`);
        } else {
          console.warn(`HLS: Quality level ${newQuality}p not found in available levels.`);
          // Optional: Fallback to Auto if specific quality not found?
          // hls.currentLevel = -1;
        }
      }
    } else {
      console.warn('updateQuality called but HLS instance is not available.');
    }
  }, []); // No dependencies, only uses refs

  // State to hold Plyr options, allowing dynamic updates for quality
  const [plyrOptions, setPlyrOptions] = useState<Plyr.Options>({
    // Initial options BEFORE HLS manifest is parsed
    quality: {
      default: 0, // Default to 'Auto' (value 0)
      options: [0], // Start with only 'Auto' placeholder value
      forced: true, // Show settings menu even with only 'Auto' initially
      onChange: updateQuality, // Use the memoized callback
    },
    captions: { active: false, update: true, language: 'en' }, // Default captions off
    tooltips: { controls: true, seek: true },
    // Add other desired Plyr options
    // controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
    settings: ['captions', 'quality', 'speed', 'loop'],
  });


  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !hlsUrl) return;

    // Cleanup function
    const cleanup = () => {
      console.log(`Cleaning up player for ${hlsUrl}`);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
       if (videoElement) {
         // Stop playback and clear source
         videoElement.pause();
         videoElement.removeAttribute('src');
         videoElement.load(); // Reset the media element
         // Clear existing tracks manually if necessary
         while (videoElement.textTracks.length > 0) {
            videoElement.textTracks[0].mode = 'disabled';
            // videoElement.removeTextTrack(videoElement.textTracks[0]); // might cause issues
         }
       }
       // Reset quality options state for the next load
       setPlyrOptions(prev => ({
           ...prev,
           quality: {
               ...prev.quality!,
               options: [0], // Reset to just 'Auto'
               default: 0,
           }
       }));
    };

    cleanup(); // Clean up any previous instances immediately

    console.log(`Setting up player for HLS URL: ${hlsUrl}`);

    let hls: Hls | null = null;
    let player: Plyr | null = null;

    if (Hls.isSupported()) {
      console.log('HLS.js supported. Initializing...');
      hls = new Hls({
        // Start capped at a reasonable level to avoid initial buffering issues?
        // startLevel: -1 // Or specify an index e.g. 1
        // capLevelToPlayerSize: true, // Useful for performance
      });
      hlsRef.current = hls;

      // --- HLS Event Listeners ---

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        console.log('HLS Manifest Parsed. Levels:', data.levels);
        if (!hlsRef.current) return; // Check if cleanup happened prematurely

        // Extract heights, remove duplicates, sort descending, add 'Auto' (0)
        const availableHeights = [...new Set(hlsRef.current.levels.map(level => level.height))]
                                .sort((a, b) => b - a); // Sort high to low

        const qualityOptions = [0, ...availableHeights]; // 0 represents 'Auto'

        console.log('Derived Plyr Quality Options:', qualityOptions);

        // --- CRITICAL: Update Plyr Options State ---
        // This triggers a state update, preparing the correct options for Plyr initialization
        setPlyrOptions(prevOptions => ({
          ...prevOptions,
          quality: {
            ...prevOptions.quality!,
            options: qualityOptions,
            // Optionally set a different default based on available options
            // default: availableHeights.includes(720) ? 720 : (availableHeights[0] || 0),
          },
        }));

        // --- Initialize Plyr *AFTER* manifest parsed and options state is set ---
        // Use the *latest* options from the state update we just triggered
        setPlyrOptions(currentOpts => {
            if (!playerRef.current && videoRef.current) { // Ensure player not already init'd
                console.log('Initializing Plyr with updated options:', currentOpts.quality);
                try {
                    player = new Plyr(videoRef.current, currentOpts);
                    playerRef.current = player; // Store the instance

                    // Force redraw of settings menu IF needed (sometimes helps)
                    // player.elements?.settings?.menu?.remove();
                    // player.elements?.settings?.button.addEventListener('click', () => player.toggleSettings(player.elements.settings.button));
                } catch(error) {
                    console.error("Error initializing Plyr:", error);
                }
            }
            return currentOpts; // Return unmodified opts for state setter
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        console.log(`HLS Level Switched. Auto: ${hlsRef.current?.autoLevelEnabled}, New Level Index: ${data.level}`);
        if (!hlsRef.current || !playerRef.current) return;

        const currentLevel = hlsRef.current.levels[data.level];
        const player = playerRef.current;

        // Update the 'AUTO (xxxp)' label in the Plyr settings menu
        // Use requestAnimationFrame to ensure DOM update happens after potential Plyr updates
        requestAnimationFrame(() => {
            const autoLabel = player.elements?.settings?.menu?.querySelector<HTMLSpanElement>(
              'button[data-plyr="quality"][value="0"] span.plyr__menu__value' // Selector for the span inside the button
            );

            if (autoLabel) {
              if (hlsRef.current?.autoLevelEnabled && currentLevel) {
                autoLabel.innerHTML = `AUTO (${currentLevel.height}p)`;
              } else {
                autoLabel.innerHTML = 'AUTO';
              }
              // console.log(`Updated AUTO label to: ${autoLabel.innerHTML}`);
            } else {
                 // This might log frequently initially until the menu is rendered
                 // console.warn("Could not find AUTO quality label element in Plyr menu to update.");
            }

            // Maybe force quality button update (less ideal)
            // player.elements.buttons.settings?.quality?.forEach(button => {
            //    if(button.value === '0') { ... }
            // });
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
         console.error('HLS Error:', data);
         if (data.fatal) {
           switch (data.type) {
             case Hls.ErrorTypes.NETWORK_ERROR:
               console.error('Fatal network error encountered, trying to recover');
               hls?.startLoad(); // Try to recover network errors
               break;
             case Hls.ErrorTypes.MEDIA_ERROR:
               console.error('Fatal media error encountered, trying to recover');
               hls?.recoverMediaError(); // Try to recover media errors
               break;
             default:
               console.error('Unrecoverable HLS fatal error, destroying HLS');
               hls?.destroy(); // Destroy on other fatal errors
               hlsRef.current = null;
               break;
           }
         }
      });

      // Attach HLS to video element and load source
      console.log('Attaching HLS and loading source...');
      hls.attachMedia(videoElement);
      hls.loadSource(hlsUrl);


    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, iOS)
      console.log('Native HLS support detected. Setting src directly.');
      videoElement.src = hlsUrl;

      // Initialize Plyr for native HLS - Quality selection NOT available here
      const nativePlyrOptions: Plyr.Options = {
          ...plyrOptions, // Base options
          quality: undefined, // Disable Plyr's quality handling
          settings: plyrOptions.settings?.filter(s => s !== 'quality'), // Remove 'quality' from settings
      };
      console.log('Initializing Plyr for native HLS...');
      try {
        player = new Plyr(videoElement, nativePlyrOptions);
        playerRef.current = player;
      } catch(error) {
        console.error("Error initializing Plyr for native HLS:", error);
      }

    } else {
      console.error('HLS is not supported in this browser.');
      // Display error message to user?
    }

    // Return the cleanup function
    return cleanup;

  // Re-run effect ONLY when hlsUrl changes.
  // updateQuality is memoized. plyrOptions is state managed internally.
  }, [hlsUrl, updateQuality]);


  // Note: We don't need a separate useEffect for plyrOptions updates anymore,
  // because Plyr is initialized *with* the updated options inside the MANIFEST_PARSED event.

  console.log("Rendering VideoPlayer component. Poster:", posterUrl);

  return (
    <div className="w-full aspect-video relative bg-black"> {/* Added bg-black */}
      <video
        ref={videoRef}
        className="plyr-react plyr"
        controls
        crossOrigin="anonymous"
        playsInline
        poster={posterUrl}
        preload="metadata"
        // Key is applied by the parent component using this VideoPlayer
      />
    </div>
  );
};

export default VideoPlayer;