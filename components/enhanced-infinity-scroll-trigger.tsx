import React, { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EnhancedInfinityScrollTriggerProps {
  loading: boolean
  hasMore: boolean
  loadMore: () => void
  mode?: "auto" | "button" | "hybrid"
  mainTriggerRef: React.RefObject<HTMLDivElement>
  preloadTriggerRef: React.RefObject<HTMLDivElement>
  className?: string
  showDebug?: boolean
}

export default function EnhancedInfinityScrollTrigger({
  loading = false,
  hasMore = true,
  loadMore,
  mode = "auto",
  mainTriggerRef,
  preloadTriggerRef,
  className,
  showDebug = true,
}: EnhancedInfinityScrollTriggerProps) {
  // Add debugging to check if observers are created
  useEffect(() => {
    console.log("[EnhancedScrollTrigger] Component mounted, hasMore:", hasMore);
    
    // Force a load when component mounts if hasMore is true
    if (hasMore && mode === "auto") {
      console.log("[EnhancedScrollTrigger] Auto-triggering initial load");
      
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        loadMore();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [hasMore, loadMore, mode]);

  return (
    <div className={cn("w-full relative", className)}>
      {/* Show visibility indicator in development mode */}
      {process.env.NODE_ENV !== "production" && hasMore && (
        <div className="text-xs text-center my-1 text-muted-foreground">
          {loading ? "Loading more posts..." : "Scroll down for more posts"}
        </div>
      )}

      {/* Main trigger element - more visible for debugging */}
      <div
        ref={mainTriggerRef}
        className={cn(
          "w-full h-24 flex items-center justify-center", 
          showDebug ? "bg-purple-500/20 text-xs my-4 border border-dashed border-purple-500" : ""
        )}
        data-testid="main-trigger"
      >
        {showDebug && (
          <span className="text-center p-1 opacity-70">
            Main Trigger
            <br />
            {loading ? "Loading..." : hasMore ? "Has more" : "No more content"}
          </span>
        )}
      </div>
      
      {/* Preload trigger element - positioned above the main trigger */}
      <div
        ref={preloadTriggerRef}
        className={cn(
          "absolute bottom-[200px] left-0 w-full h-8", 
          showDebug ? "bg-blue-500/20 text-xs border border-dashed border-blue-500" : ""
        )}
        data-testid="preload-trigger"
      >
        {showDebug && (
          <span className="text-center w-full inline-block opacity-70">
            Preload Trigger (50% point)
          </span>
        )}
      </div>
      
      {/* Visible content based on mode */}
      {mode === "button" && hasMore && (
        <div className="flex justify-center my-4">
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
      
      {mode === "hybrid" && hasMore && (
        <div className="flex justify-center my-4">
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
      
      {/* Show loading indicator for automatic mode */}
      {mode === "auto" && loading && (
        <div className="flex justify-center items-center mt-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {/* Always show a manual load button if we're not loading and still have more content */}
      {mode === "auto" && !loading && hasMore && (
        <div className="flex justify-center py-2">
          <Button
            onClick={loadMore}
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
          >
            Load more
          </Button>
        </div>
      )}
      
      {/* Show no more content message when hasMore is false */}
      {!hasMore && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No more posts to load
        </div>
      )}
      
      {/* Debug manual load button */}
      {showDebug && hasMore && !loading && loadMore && (
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            size="sm"
            className="border-dashed border-purple-500"
            onClick={() => {
              console.log("[Trigger] Debug load more button clicked");
              loadMore();
            }}
          >
            Debug: Force Load More
          </Button>
        </div>
      )}
    </div>
  )
} 