"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, X, Clock, Trash2, ArrowLeft, TriangleAlert } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import SearchResults from "@/components/search/search-results"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SearchResult {
  id: string
  type: "subreddit" | "post" | "user"
  name?: string
  title?: string
  subreddit?: string
  author?: string
  over_18: boolean
  subscribers?: number
  icon_img?: string
  display_name?: string
  display_name_prefixed?: string
}

interface SearchBarProps {
  onClose: () => void
  onSubredditSelect?: (subreddit: string) => void
}

export default function SearchBar({ onClose, onSubredditSelect }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showClearButton, setShowClearButton] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchType, setSearchType] = useState<"all" | "sr" | "user">("all")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Load search history from localStorage
    const history = localStorage.getItem("searchHistory")
    if (history) {
      try {
        setSearchHistory(JSON.parse(history))
      } catch (e) {
        // Reset if corrupt
        localStorage.removeItem("searchHistory")
        setSearchHistory([])
      }
    }

    // Focus the search input
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }

    // Cleanup any pending requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    // Check if there's any search history to show clear button
    setShowClearButton(searchHistory.length > 0)
  }, [searchHistory])

  useEffect(() => {
    const fetchSearchResults = async () => {
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Reset states
      setError(null)
      
      if (!debouncedSearchQuery.trim() || debouncedSearchQuery.length < 2) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      
      // Create a new abort controller
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal
      
      try {
        // Build the query with type filter
        const typeParam = searchType !== "all" ? `&types=${searchType}` : "";
        const includeProfilesParam = searchType === "all" || searchType === "user" ? "&includeUsers=true" : "&includeUsers=false";
        const includeSubsParam = searchType === "all" || searchType === "sr" ? "&includeSubs=true" : "&includeSubs=false";
        
        // Add timestamp to prevent browser caching
        const cacheBreaker = `&_t=${Date.now()}`;
        
        // Fetch with the abort signal
        const response = await fetch(
          `/api/reddit/search/autocomplete?q=${encodeURIComponent(debouncedSearchQuery)}${typeParam}${includeProfilesParam}${includeSubsParam}${cacheBreaker}`, 
          { signal }
        )
        
        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Only update state if this request wasn't aborted
        if (!signal.aborted) {
          setSearchResults(data)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Ignore abort errors
          console.log('Search request was cancelled')
        } else {
          console.error("Search error:", error)
          setError(error instanceof Error ? error.message : "Search failed")
          setSearchResults([])
        }
      } finally {
        if (!signal.aborted) {
          setIsSearching(false)
        }
      }
    }

    fetchSearchResults()
  }, [debouncedSearchQuery, searchType])

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!searchQuery.trim()) return

    // Save to search history
    const newHistory = [searchQuery, ...searchHistory.filter((q) => q !== searchQuery)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem("searchHistory", JSON.stringify(newHistory))

    // Navigate to search results page
    const typeParam = searchType !== "all" ? `&type=${searchType}` : "";
    router.push(`/search?q=${encodeURIComponent(searchQuery)}${typeParam}`)
    onClose()
  }

  const handleResultClick = (result: SearchResult) => {
    // Determine display name for history
    let queryToSave: string;
    
    if (result.type === "subreddit") {
      queryToSave = result.display_name || result.name || "";
    } else if (result.type === "user") {
      queryToSave = result.name || "";
    } else {
      queryToSave = result.title || "";
    }

    // Save to search history if we have a valid query
    if (queryToSave) {
      const newHistory = [queryToSave, ...searchHistory.filter((q) => q !== queryToSave)].slice(0, 10)
      setSearchHistory(newHistory)
      localStorage.setItem("searchHistory", JSON.stringify(newHistory))
    }

    // Navigate based on result type
    if (result.type === "subreddit") {
      const subredditName = result.name || result.display_name || "";
      if (onSubredditSelect && subredditName) {
        onSubredditSelect(subredditName);
      } else {
        router.push(`/r/${subredditName}`);
      }
    } else if (result.type === "user") {
      router.push(`/user/${result.name}`);
    } else {
      // For posts, we need to construct the URL
      router.push(`/r/${result.subreddit}/comments/${result.id}`);
    }

    onClose();
  }

  const handleHistoryItemClick = (query: string) => {
    setSearchQuery(query)
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  const clearSearchHistory = () => {
    setSearchHistory([])
    localStorage.removeItem("searchHistory")
    setShowClearButton(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b">
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <form onSubmit={handleSearch} className="flex-1 flex">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Reddit"
              className="pl-8 pr-8"
              autoComplete="off"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-8 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button type="submit" variant="ghost" size="sm" className="ml-2">
            Search
          </Button>
        </form>
      </div>

      <div className="border-b px-2">
        <Tabs defaultValue="all" value={searchType} onValueChange={(v) => setSearchType(v as "all" | "sr" | "user")}>
          <TabsList className="grid grid-cols-3 h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="sr" className="text-xs">Communities</TabsTrigger>
            <TabsTrigger value="user" className="text-xs">People</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        {!isSearching && searchQuery === "" && searchHistory.length > 0 && (
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Searches</h3>
              {showClearButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearchHistory}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {searchHistory.map((query, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => handleHistoryItemClick(query)}
                >
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  {query}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Show error message if there was an error */}
        {error && !isSearching && searchQuery.trim().length > 0 && (
          <div className="p-4 text-center">
            <div className="flex items-center justify-center text-destructive mb-2">
              <TriangleAlert className="h-5 w-5 mr-2" />
              <span>Error loading results</span>
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => {
                // Force refresh by clearing and then re-setting the query
                const currentQuery = searchQuery;
                setSearchQuery("");
                setTimeout(() => setSearchQuery(currentQuery), 10);
              }}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Search results */}
        <SearchResults
          results={searchResults}
          isLoading={isSearching}
          query={searchQuery}
          onResultClick={handleResultClick}
        />
      </ScrollArea>
    </div>
  )
}

