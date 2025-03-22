"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Home, Bookmark, ArrowUp, Settings, Search } from "lucide-react"
import ThemeSelector from "@/components/theme-selector"
import { useSession } from "next-auth/react"
import type { Subreddit } from "@/types/reddit"
import UsernameLink from "@/components/username-link"

interface SidebarProps {
  subscribedSubreddits: Subreddit[]
  loadingSubreddits: boolean
  onClose: () => void
}

export default function Sidebar({ subscribedSubreddits, loadingSubreddits, onClose }: SidebarProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredSubreddits, setFilteredSubreddits] = useState<Subreddit[]>(subscribedSubreddits)

  useEffect(() => {
    if (searchQuery) {
      setFilteredSubreddits(
        subscribedSubreddits.filter((sub) => sub.display_name.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    } else {
      setFilteredSubreddits(subscribedSubreddits)
    }
  }, [searchQuery, subscribedSubreddits])

  const navigateTo = (path: string) => {
    router.push(path)
    onClose()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        {session && (
          <div className="flex items-center gap-3 py-2 px-3 mb-2 border rounded-lg">
            <Avatar>
              <AvatarImage src={session.user?.image || undefined} />
              <AvatarFallback>{session.user?.name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="font-medium truncate">{session.user?.name}</div>
              <UsernameLink 
                username={session.user?.name || ""} 
                className="text-sm text-muted-foreground"
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-2">
        <Button variant="ghost" className="w-full justify-start" onClick={() => navigateTo("/")}>
          <Home className="mr-2 h-5 w-5" />
          Home
        </Button>

        <Button variant="ghost" className="w-full justify-start" onClick={() => navigateTo("/search")}>
          <Search className="mr-2 h-5 w-5" />
          Search
        </Button>

        {session && (
          <>
            <Button variant="ghost" className="w-full justify-start" onClick={() => navigateTo("/saved")}>
              <Bookmark className="mr-2 h-5 w-5" />
              Saved
            </Button>

            <Button variant="ghost" className="w-full justify-start" onClick={() => navigateTo("/upvoted")}>
              <ArrowUp className="mr-2 h-5 w-5" />
              Upvoted
            </Button>
          </>
        )}
      </div>

      {session && (
        <>
          <div className="px-4 py-2 border-t border-b">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Your Communities</h3>

            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Filter communities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 text-sm bg-muted rounded-md"
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  ×
                </button>
              )}
            </div>

            <div className="h-[200px] overflow-hidden border border-border rounded-md bg-card">
              <ScrollArea className="h-full pr-2">
                {loadingSubreddits ? (
                  <div className="space-y-2 animate-pulse p-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-8 bg-muted rounded-md"></div>
                    ))}
                  </div>
                ) : filteredSubreddits.length > 0 ? (
                  <div className="space-y-1 p-2">
                    {filteredSubreddits.map((sub) => (
                      <Button
                        key={sub.id}
                        variant="ghost"
                        className="w-full justify-start text-sm h-8"
                        onClick={() => navigateTo(`/r/${sub.display_name}`)}
                      >
                        <Avatar className="h-5 w-5 mr-2">
                          {sub.icon_img ? <AvatarImage src={sub.icon_img} /> : null}
                          <AvatarFallback className="text-xs">{sub.display_name[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">r/{sub.display_name}</span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    {searchQuery ? "No matching communities" : "No communities found"}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </>
      )}

      <div className="mt-auto p-4 border-t">
        <div className="mb-2">
          <ThemeSelector variant="outline" className="w-full" />
        </div>
        <Button variant="ghost" className="w-full justify-start" onClick={() => navigateTo("/settings")}>
          <Settings className="mr-2 h-5 w-5" />
          Settings
        </Button>
      </div>
    </div>
  )
}

