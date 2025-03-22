import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

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
    if (!afterValue || loading || loadingRef.current || !enabled) {
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
      
      const result = await fetchItems(afterValue);
      
      // Filter out duplicates
      const existingIds = new Set(items.map(item => item.id));
      const newItems = result.items.filter(item => !existingIds.has(item.id));
      
      if (newItems.length > 0) {
        setItems(prev => [...prev, ...newItems]);
        setAfterValue(result.after);
        // If there's an after value, we should still have more content
        setHasMore(!!result.after);
        retryCountRef.current = 0;
      } else if (result.after && result.after !== afterValue) {
        // No new items but have new after value, try next page
        setAfterValue(result.after);
        
        // We still have an after value, so there might be more content
        setHasMore(true);
        
        // Small delay before trying the next page
        setTimeout(() => {
          loadingRef.current = false;
          setLoading(false);
          loadMore();
        }, 500);
        return;
      } else {
        // No new items and no new after value - we've reached the end
        setHasMore(false);
      }
    } catch (error) {
      // Only show errors for non-aborted requests
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Error loading more items:", error);
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