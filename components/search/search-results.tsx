"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import UsernameLink from "@/components/username-link"
import Link from "next/link"
import { User, FileText, Hash } from "lucide-react"
import { CommandItem } from "@/components/ui/command"
import { FormatNumber } from "@/lib/format"

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
  community_icon?: string
  display_name?: string
  display_name_prefixed?: string
  public_description?: string
  active_user_count?: number
  karma?: number
  url?: string
}

interface SearchResultsProps {
  results: SearchResult[]
  isLoading: boolean
  query: string
  onResultClick: (result: SearchResult) => void
}

export default function SearchResults({ results, isLoading, query, onResultClick }: SearchResultsProps) {
  // Group results by type for better organization
  const subreddits = results.filter(result => result.type === "subreddit");
  const users = results.filter(result => result.type === "user");
  const posts = results.filter(result => result.type === "post");
  
  // Function to render the icon image with fallback
  const renderIcon = (result: SearchResult) => {
    const iconUrl = result.icon_img || result.community_icon || "";
    const fallbackLetter = (result.name || result.display_name || "?")[0].toUpperCase();
    
    return (
      <Avatar className="h-5 w-5 mr-2 flex-shrink-0">
        {iconUrl ? <AvatarImage src={iconUrl} alt="" /> : null}
        <AvatarFallback className="text-xs">{fallbackLetter}</AvatarFallback>
      </Avatar>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="flex flex-col items-center justify-center space-y-2 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <div className="text-sm text-muted-foreground">Searching...</div>
        </div>
      </div>
    );
  }
  
  if (results.length === 0 && query.trim().length >= 2) {
    return (
      <div className="p-4 text-center">
        <div className="flex flex-col items-center justify-center py-8">
          <Hash className="h-8 w-8 mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No results found for "{query}"</p>
        </div>
      </div>
    );
  }
  
  if (query.trim().length < 2) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Enter at least 2 characters to search
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      {/* Subreddit results section */}
      {subreddits.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
            Communities
          </div>
          {subreddits.map((result) => (
            <Button
              key={result.id}
              variant="ghost"
              className="w-full justify-start text-sm h-auto py-2"
              onClick={() => onResultClick(result)}
            >
              <div className="flex items-center w-full overflow-hidden">
                {renderIcon(result)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {result.display_name_prefixed || `r/${result.name || result.display_name}`}
                  </div>
                  {(result.subscribers !== undefined || result.public_description) && (
                    <div className="text-xs text-muted-foreground truncate">
                      {result.subscribers !== undefined ? 
                        `${FormatNumber(result.subscribers)} members` : 
                        result.public_description}
                    </div>
                  )}
                </div>
                {result.over_18 && (
                  <Badge variant="destructive" className="ml-2 text-[10px] h-5 px-1.5 flex-shrink-0">
                    NSFW
                  </Badge>
                )}
              </div>
            </Button>
          ))}
        </div>
      )}

      {/* User results section */}
      {users.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
            People
          </div>
          {users.map((result) => (
            <Button
              key={result.id}
              variant="ghost"
              className="w-full justify-start text-sm h-auto py-2"
              onClick={() => onResultClick(result)}
            >
              <div className="flex items-center w-full overflow-hidden">
                <Avatar className="h-5 w-5 mr-2 flex-shrink-0">
                  {result.icon_img ? <AvatarImage src={result.icon_img} alt="" /> : null}
                  <AvatarFallback className="text-xs">
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    u/{result.name}
                  </div>
                  {result.karma !== undefined && (
                    <div className="text-xs text-muted-foreground truncate">
                      {FormatNumber(result.karma)} karma
                    </div>
                  )}
                </div>
              </div>
            </Button>
          ))}
        </div>
      )}

      {/* Post results section */}
      {posts.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
            Posts
          </div>
          {posts.map((result) => (
            <Button
              key={result.id}
              variant="ghost"
              className="w-full justify-start text-sm h-auto py-2"
              onClick={() => onResultClick(result)}
            >
              <div className="flex items-center w-full overflow-hidden">
                <FileText className="h-5 w-5 mr-2 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="font-medium truncate">{result.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    in <Link 
                          href={`/r/${result.subreddit}`} 
                          className="hover:underline" 
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          r/{result.subreddit}
                        </Link> 
                    {result.author && (
                      <>
                        {" • by "}
                        <UsernameLink 
                          username={result.author} 
                          prefixU={false} 
                          onClick={(e: React.MouseEvent) => e.stopPropagation()} 
                        />
                      </>
                    )}
                  </div>
                </div>
                {result.over_18 && (
                  <Badge variant="destructive" className="ml-2 text-[10px] h-5 px-1.5 flex-shrink-0">
                    NSFW
                  </Badge>
                )}
              </div>
            </Button>
          ))}
        </div>
      )}

      {/* View all results link */}
      {results.length > 0 && query.trim().length >= 2 && (
        <Button
          variant="outline"
          className="w-full text-center text-sm mt-2"
          onClick={() => {
            onResultClick({
              id: "view-all",
              type: "post", // Just a placeholder, not used
              over_18: false,
              title: query
            });
          }}
        >
          See all results for "{query}"
        </Button>
      )}
    </div>
  );
}

