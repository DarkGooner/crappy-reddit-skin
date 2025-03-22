import React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface InfinityScrollTriggerProps {
  loading: boolean
  hasMore: boolean
  loadMore: () => void
  className?: string
  mode?: "auto" | "button" | "hybrid"
  triggerRef?: React.RefObject<HTMLDivElement | null>
  loadingText?: string
  loadMoreText?: string
  noMoreText?: string
}

export default function InfinityScrollTrigger({
  loading,
  hasMore,
  loadMore,
  className,
  mode = "auto",
  triggerRef,
  loadingText = "Loading more content...",
  loadMoreText = "Load More",
  noMoreText = "No more content to show"
}: InfinityScrollTriggerProps) {
  // If we're loading, always show the loading indicator
  if (loading && (mode === "auto" || mode === "hybrid")) {
    return (
      <div
        ref={triggerRef}
        className={cn(
          "h-20 w-full flex items-center justify-center",
          className
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // If we're in auto mode with no more content, just show an end message
  if (mode === "auto" && !hasMore) {
    return (
      <div className={cn("text-center py-4 text-muted-foreground text-sm", className)}>
        {noMoreText}
      </div>
    )
  }

  // If we're in button mode or hybrid mode, show a button
  if (mode === "button" || mode === "hybrid") {
    return (
      <div className={cn("flex justify-center py-4", className)}>
        {hasMore ? (
          <Button 
            variant="outline" 
            onClick={loadMore}
            disabled={loading}
            className="min-w-[150px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {loadingText}
              </>
            ) : (
              loadMoreText
            )}
          </Button>
        ) : (
          <div className="text-center py-2 text-muted-foreground text-sm">
            {noMoreText}
          </div>
        )}
      </div>
    )
  }

  // Auto mode with more content - just show an invisible trigger for intersection observer
  return (
    <div
      ref={triggerRef}
      className={cn(
        "h-20 w-full",
        "invisible", // Always invisible when not loading in auto mode
        className
      )}
    />
  )
} 