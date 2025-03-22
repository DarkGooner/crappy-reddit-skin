"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import PostCard from "@/components/post-card"
import type { Post } from "@/types/reddit"

interface SubredditSearchProps {
  subreddit: string
}

export default function SubredditSearch({ subreddit }: SubredditSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Post[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  const router = useRouter()

  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setSearchResults([])
      setHasSearched(false)
      return
    }

    const fetchSearchResults = async () => {
      setIsSearching(true)
      try {
        const response = await fetch(
          `/api/reddit/search/results?q=${encodeURIComponent(debouncedSearchQuery)}&subreddit=${encodeURIComponent(subreddit)}&include_over_18=true`
        )
        if (!response.ok) throw new Error("Failed to fetch search results")
        const data = await response.json()
        
        if (data && data.posts && Array.isArray(data.posts)) {
          setSearchResults(data.posts)
        } else if (Array.isArray(data)) {
          setSearchResults(data)
        } else {
          console.error("Invalid search results format:", data)
          setSearchResults([])
        }
        
        setHasSearched(true)
      } catch (error) {
        console.error("Error searching subreddit:", error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    fetchSearchResults()
  }, [debouncedSearchQuery, subreddit])

  const handleClearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setHasSearched(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/r/${subreddit}/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search in r/${subreddit}`}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full"
            onClick={handleClearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {isSearching && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {hasSearched && !isSearching && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            {searchResults && searchResults.length > 0
              ? `Search results for "${debouncedSearchQuery}" in r/${subreddit}`
              : `No results found for "${debouncedSearchQuery}" in r/${subreddit}`}
          </h2>

          {Array.isArray(searchResults) && searchResults.length > 0 ? (
            <div className="space-y-3 px-0">
              {searchResults.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  showSubreddit={false} 
                  showFullContent={false} 
                />
              ))}
            </div>
          ) : null}

          {searchResults && searchResults.length > 0 && (
            <div className="text-center py-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/r/${subreddit}/search?q=${encodeURIComponent(searchQuery)}`)}
              >
                See all results
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

