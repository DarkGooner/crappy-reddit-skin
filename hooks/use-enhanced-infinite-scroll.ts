import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseEnhancedInfiniteScrollOptions<T> {
  items: T[];
  fetchItems: (after?: string | null) => Promise<{ items: T[], after: string | null }>;
  afterValue: string | null;
  enabled?: boolean;
  initialLoading?: boolean;
  threshold?: number;  // Threshold for main trigger
  preloadThreshold?: number; // Threshold for preloading (50% by default)
  maxRetries?: number;
  debounceMs?: number;
}

export function useEnhancedInfiniteScroll<T extends { id: string }>({
  items: initialItems,
  fetchItems,
  afterValue: initialAfterValue,
  enabled = true,
  initialLoading = false,
  threshold = 0.1, // Main trigger at 10% of viewport - decreased from 0.9
  preloadThreshold = 0.5, // Preload trigger at 50% of viewport
  maxRetries = 3,
  debounceMs = 300,
}: UseEnhancedInfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [error, setError] = useState<string | null>(null);
  const [afterValue, setAfterValue] = useState<string | null>(initialAfterValue);
  const [hasMore, setHasMore] = useState<boolean>(!!initialAfterValue);
  
  const loadingRef = useRef<boolean>(false);
  const mainTriggerRef = useRef<HTMLDivElement>(null);
  const preloadTriggerRef = useRef<HTMLDivElement>(null);
  const mainObserverRef = useRef<IntersectionObserver | null>(null);
  const preloadObserverRef = useRef<IntersectionObserver | null>(null);
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef<boolean>(true);
  
  const { toast } = useToast();

  // Update items when initialItems changes (e.g., sorting or filtering changes)
  useEffect(() => {
    console.log(`[InfiniteScroll] Initial items changed: ${initialItems.length} items, afterValue: ${initialAfterValue || 'none'}`);
    setItems(initialItems);
    setAfterValue(initialAfterValue);
    setHasMore(!!initialAfterValue);
    retryCountRef.current = 0;
    isInitialMountRef.current = true;
    
    // Clean up any pending operations
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [initialItems, initialAfterValue]);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[InfiniteScroll] Cleaning up on unmount');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (mainObserverRef.current) {
        mainObserverRef.current.disconnect();
      }
      if (preloadObserverRef.current) {
        preloadObserverRef.current.disconnect();
      }
    };
  }, []);

  // Declare setupObservers reference first to avoid circular dependencies
  const setupObserversRef = useRef<() => void>(() => {});

  // Declare loadMore implementation
  const loadMore = useCallback(async (isPreload = false) => {
    if (loading || loadingRef.current || !enabled || !hasMore) {
      console.log(`[InfiniteScroll] Skipping loadMore: loading=${loading}, loadingRef=${loadingRef.current}, enabled=${enabled}, hasMore=${hasMore}`);
      return;
    }

    // Allow loading without afterValue on first fetch, but require it for subsequent fetches
    if (items.length > 0 && !afterValue) {
      console.log("[InfiniteScroll] No after value available for pagination, but already have items");
      setHasMore(false);
      return;
    }

    setLoading(true);
    loadingRef.current = true;
    setError(null);
    
    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      console.log(`[InfiniteScroll] ${isPreload ? 'Preloading' : 'Loading'} items with after value: ${afterValue || 'initial load'}`);
      const result = await fetchItems(afterValue);
      
      // Debug the result
      console.log(`[InfiniteScroll] Received ${result.items.length} items, after: ${result.after || 'none'}`);
      
      // Filter out duplicates
      const existingIds = new Set(items.map(item => item.id));
      const newItems = result.items.filter(item => !existingIds.has(item.id));
      
      console.log(`[InfiniteScroll] After filtering duplicates, ${newItems.length} new items remain`);
      
      if (newItems.length > 0) {
        // Use functional updates for state
        setItems(prev => {
          const updatedItems = [...prev, ...newItems];
          console.log(`[InfiniteScroll] Updated items count: ${updatedItems.length}`);
          console.log(`[InfiniteScroll] First few new post IDs:`, newItems.slice(0, 3).map(item => item.id));
          console.log(`[InfiniteScroll] Total unique items now: ${new Set(updatedItems.map(item => item.id)).size}`);
          return updatedItems;
        });
        
        setAfterValue(result.after);
        setHasMore(!!result.after);
        retryCountRef.current = 0;
        
        // Force recreating observers after content changes
        // Use a longer delay to ensure DOM is fully updated
        setTimeout(() => {
          console.log('[InfiniteScroll] Refreshing observers after new content loaded');
          setupObserversRef.current();
        }, 300);
      } else if (result.after && result.after !== afterValue) {
        // No new items but have a different after value, try the next page
        console.log(`[InfiniteScroll] No new items but different after value, trying next page. Old: ${afterValue}, New: ${result.after}`);
        setAfterValue(result.after);
        setHasMore(true);
        
        // Small delay before trying the next page
        setTimeout(() => {
          loadingRef.current = false;
          setLoading(false);
          loadMore(isPreload);
        }, 500);
        return;
      } else if (result.after) {
        // We have an after value but no new items - still might have more content
        console.log(`[InfiniteScroll] No new items but still have after value: ${result.after}`);
        setAfterValue(result.after);
        setHasMore(true);
      } else {
        // No more content
        console.log('[InfiniteScroll] No more content - end reached');
        setHasMore(false);
      }
    } catch (error) {
      // Only show errors for non-aborted requests
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("[InfiniteScroll] Error loading more items:", error);
        setError("Failed to load more items.");
        
        // Retry with exponential backoff
        if (retryCountRef.current < maxRetries) {
          const retryDelay = Math.min(1000 * (2 ** retryCountRef.current), 10000);
          
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          
          retryTimeoutRef.current = setTimeout(() => {
            retryCountRef.current += 1;
            loadingRef.current = false;
            setLoading(false);
            loadMore(isPreload);
          }, retryDelay);
        } else {
          // After max retries, show error toast
          toast({
            title: "Error",
            description: "Failed to load more items. Try again later.",
            variant: "destructive",
          });
        }
      }
    } finally {
      if (!retryTimeoutRef.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [afterValue, loading, enabled, hasMore, items, fetchItems, toast, maxRetries]);

  // Define debounced fetch function
  const debouncedFetch = useCallback((isPreload = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    console.log(`[InfiniteScroll] Debouncing fetch (isPreload: ${isPreload})`);
    
    debounceTimerRef.current = setTimeout(() => {
      loadMore(isPreload);
    }, debounceMs);
  }, [debounceMs, loadMore]);

  // Helper function to recreate observers when DOM elements change
  const setupObservers = useCallback(() => {
    // Disconnect existing observers
    if (mainObserverRef.current) {
      mainObserverRef.current.disconnect();
      mainObserverRef.current = null;
    }
    
    if (preloadObserverRef.current) {
      preloadObserverRef.current.disconnect();
      preloadObserverRef.current = null;
    }
    
    // Add a small delay to ensure DOM is updated before attaching new observers
    setTimeout(() => {
      // Setup both observers
      if (mainTriggerRef.current) {
        const mainObserverOptions = {
          root: null, // Use viewport
          rootMargin: "400px 0px", // Increased from 200px to 400px for earlier detection
          threshold, // Use provided threshold
        };
        
        console.log(`[InfiniteScroll] Setting up main observer with threshold: ${threshold}, rootMargin: 400px 0px`);
        
        const handleMainObserver = (entries: IntersectionObserverEntry[]) => {
          const [entry] = entries;
          console.log(`[InfiniteScroll] Main trigger intersection: ${entry.isIntersecting}, ratio: ${entry.intersectionRatio.toFixed(2)}`);
          
          if (entry.isIntersecting && hasMore && !loading && !loadingRef.current) {
            console.log("[InfiniteScroll] Main trigger intersecting - loading more content");
            debouncedFetch(false); // Not preload - immediate need
          }
        };
        
        try {
          // Create and observe
          mainObserverRef.current = new IntersectionObserver(handleMainObserver, mainObserverOptions);
          mainObserverRef.current.observe(mainTriggerRef.current);
          console.log("[InfiniteScroll] Successfully set up main observer");
        } catch (error) {
          console.error("[InfiniteScroll] Error setting up main observer:", error);
        }
      } else {
        console.warn("[InfiniteScroll] Main trigger element not available");
      }
      
      // Setup preload observer
      if (preloadTriggerRef.current) {
        const preloadObserverOptions = {
          root: null, 
          rootMargin: "100px 0px", // Added some margin for earlier detection
          threshold: preloadThreshold,
        };
        
        console.log(`[InfiniteScroll] Setting up preload observer with threshold: ${preloadThreshold}, rootMargin: 100px 0px`);
        
        const handlePreloadObserver = (entries: IntersectionObserverEntry[]) => {
          const [entry] = entries;
          console.log(`[InfiniteScroll] Preload trigger intersection: ${entry.isIntersecting}, ratio: ${entry.intersectionRatio.toFixed(2)}`);
          
          if (entry.isIntersecting && hasMore && !loading && !loadingRef.current) {
            console.log("[InfiniteScroll] Preload trigger intersecting - preloading next content");
            debouncedFetch(true);
          }
        };
        
        try {
          // Create and observe
          preloadObserverRef.current = new IntersectionObserver(handlePreloadObserver, preloadObserverOptions);
          preloadObserverRef.current.observe(preloadTriggerRef.current);
          console.log("[InfiniteScroll] Successfully set up preload observer");
        } catch (error) {
          console.error("[InfiniteScroll] Error setting up preload observer:", error);
        }
      } else {
        console.warn("[InfiniteScroll] Preload trigger element not available");
      }
    }, 100);
  }, [hasMore, loading, threshold, preloadThreshold, debouncedFetch]);
  
  // Assign the setupObservers function to our ref to avoid circular dependencies
  setupObserversRef.current = setupObservers;

  // Update observers when refs or conditions change
  useEffect(() => {
    if (!enabled) {
      console.log('[InfiniteScroll] Infinite scroll disabled, not setting up observers');
      return;
    }
    
    // Wait a brief moment after initial render to ensure DOM elements are ready
    const timer = setTimeout(() => {
      console.log('[InfiniteScroll] Setting up observers after timeout');
      setupObservers();
      
      // On initial mount, check if we need to load more content immediately
      if (isInitialMountRef.current && hasMore && items.length < 5) {
        console.log('[InfiniteScroll] Initial mount with few items, triggering load');
        loadMore(false);
        isInitialMountRef.current = false;
      }
    }, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, [enabled, hasMore, items.length, loadMore, setupObservers]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (loading || loadingRef.current) return;
    
    setLoading(true);
    loadingRef.current = true;
    setError(null);
    
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      const result = await fetchItems(null);
      
      setItems(result.items);
      setAfterValue(result.after);
      setHasMore(!!result.after);
      retryCountRef.current = 0;
      
      toast({
        title: "Refreshed",
        description: "Content updated with latest items",
      });
      
      // Force recreating observers after content changes
      setTimeout(() => {
        setupObservers();
      }, 100);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Error refreshing items:", error);
        setError("Failed to refresh. Please try again.");
        
        toast({
          title: "Error",
          description: "Failed to refresh. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [fetchItems, loading, toast, setupObservers]);

  // Forced manual load more - for button click
  const forceLoadMore = useCallback(() => {
    if (!loading && !loadingRef.current && hasMore) {
      console.log("[InfiniteScroll] Manually triggered loadMore");
      loadMore(false);
    }
  }, [loading, hasMore, loadMore]);

  return {
    items,
    loading,
    error,
    hasMore,
    refresh,
    loadMore: forceLoadMore,
    mainTriggerRef,
    preloadTriggerRef
  };
}