import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { debounce } from 'lodash';

interface UseInfiniteScrollOptions<T> {
  items: T[];
  fetchItems: (after?: string | null) => Promise<{ items: T[], after: string | null }>;
  afterValue: string | null;
  enabled?: boolean;
  initialLoading?: boolean;
  threshold?: number;
  rootMargin?: string;
  maxRetries?: number;
}

export function useInfiniteScroll<T extends { id: string }>({
  items: initialItems,
  fetchItems,
  afterValue: initialAfterValue,
  enabled = true,
  initialLoading = false,
  threshold = 0.01,
  rootMargin = "800px 0px",
  maxRetries = 3,
}: UseInfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [error, setError] = useState<string | null>(null);
  const [afterValue, setAfterValue] = useState<string | null>(initialAfterValue);
  const [hasMore, setHasMore] = useState<boolean>(!!initialAfterValue);
  
  const loadingRef = useRef<boolean>(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { toast } = useToast();

  // Update items when initialItems changes (e.g., sorting or filtering changes)
  useEffect(() => {
    setItems(initialItems);
    setAfterValue(initialAfterValue);
    setHasMore(!!initialAfterValue);
    retryCountRef.current = 0;
    
    // Clean up any pending operations
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [initialItems, initialAfterValue]);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (!enabled || !triggerRef.current || !hasMore || loading || loadingRef.current) {
      return;
    }

    const observerOptions = {
      root: null, // Use viewport
      rootMargin,
      threshold,
    };

    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      
      if (entry.isIntersecting && hasMore && !loading && !loadingRef.current) {
        loadMore();
      }
    };

    observerRef.current = new IntersectionObserver(handleObserver, observerOptions);
    observerRef.current.observe(triggerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, afterValue, enabled, rootMargin, threshold]);

  // Load more items
  const loadMore = useCallback(async () => {
    if (loading || loadingRef.current || !enabled) {
      console.log("Skipping loadMore: already loading or disabled");
      return;
    }

    // Allow loading without afterValue on first fetch, but require it for subsequent fetches
    if (items.length > 0 && !afterValue) {
      console.log("No after value available for pagination, but already have items");
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
      
      console.log(`[InfiniteScroll] Loading more items with after value: ${afterValue || 'initial load'}`);
      const result = await fetchItems(afterValue);
      
      // Debug the result
      console.log(`[InfiniteScroll] Received ${result.items.length} items, after: ${result.after || 'none'}`);
      
      // Filter out duplicates
      const existingIds = new Set(items.map(item => item.id));
      const newItems = result.items.filter(item => !existingIds.has(item.id));
      
      console.log(`[InfiniteScroll] After filtering duplicates, ${newItems.length} new items remain`);
      
      if (newItems.length > 0) {
        setItems(prev => [...prev, ...newItems]);
        setAfterValue(result.after);
        setHasMore(!!result.after);
        retryCountRef.current = 0;
      } else if (result.after && result.after !== afterValue) {
        // No new items but have a different after value, try the next page
        console.log(`[InfiniteScroll] No new items but different after value, trying next page. Old: ${afterValue}, New: ${result.after}`);
        setAfterValue(result.after);
        setHasMore(true);
        
        // Small delay before trying the next page
        setTimeout(() => {
          loadingRef.current = false;
          setLoading(false);
          loadMore();
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
            loadMore();
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
  }, [afterValue, loading, enabled, items, fetchItems, toast, maxRetries]);

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
  }, [fetchItems, loading, toast]);

  // Forced manual load more - for button click
  const forceLoadMore = useCallback(() => {
    if (!loading && !loadingRef.current && hasMore) {
      loadMore();
    }
  }, [loading, hasMore, loadMore]);

  // Add prefetching for smoother transitions
  useEffect(() => {
    // Prefetch next page when we're close to the bottom
    if (hasMore && !loading && !loadingRef.current && items.length >= 10) {
      const prefetchNextPage = async () => {
        try {
          console.log(`[InfiniteScroll] Prefetching next page with after: ${afterValue}`);
          // Only fetch the data, don't update state
          await fetchItems(afterValue);
        } catch (error) {
          // Silently fail on prefetch errors
          console.error("[InfiniteScroll] Prefetch error:", error);
        }
      };
      
      // Start prefetching after a delay (to avoid throttling)
      const prefetchTimer = setTimeout(prefetchNextPage, 1000);
      return () => clearTimeout(prefetchTimer);
    }
  }, [hasMore, loading, items.length, afterValue, fetchItems]);

  // Create a debounced version of loadMore
  const debouncedLoadMore = useCallback(
    debounce(() => {
      if (!loading && hasMore) {
        loadMore();
      }
    }, 150), // 150ms debounce
    [loading, hasMore, loadMore]
  );

  return {
    items,
    loading,
    error,
    hasMore,
    refresh,
    loadMore: forceLoadMore,
    triggerRef,
  };
} 