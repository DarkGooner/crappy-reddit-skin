"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, Home, Compass, Bookmark, Settings, ArrowLeft, ArrowUp } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import ThemeSelector from "@/components/theme-selector"
import SearchDrawer from "@/components/search/search-drawer"
import AuthButton from "@/components/auth/auth-button"
import { useSession } from "next-auth/react"
import { useNSFW } from "@/components/nsfw-context"
import type { Subreddit } from "@/types/reddit"
import { Skeleton } from "@/components/ui/skeleton"
import NotificationPanel from "@/components/notification/notification-panel"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import UsernameLink from "@/components/username-link"

interface NavbarProps {
  onSubredditChange?: (subreddit: string | null) => void
  subscribedSubreddits?: Subreddit[]
  loadingSubreddits?: boolean
}

export default function Navbar({
  onSubredditChange,
  subscribedSubreddits = [],
  loadingSubreddits = false,
}: NavbarProps) {
  const [currentSubreddit, setCurrentSubreddit] = useState<string | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const { data: session } = useSession()
  const { showNSFW, toggleNSFW } = useNSFW()
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navigateToSubreddit = (subreddit: string) => {
    router.push(`/r/${subreddit}`)
  }

  const navigateToHome = () => {
    router.push("/")
  }

  return (
    <div
      className={cn(
        "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border transition-shadow duration-200",
        isScrolled && "shadow-sm",
      )}
    >
      <div className="flex items-center justify-between p-2 max-w-[1800px] mx-auto">
        <div className="flex items-center gap-1">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0">
              <SheetHeader className="p-3 border-b">
                <SheetTitle>Reddit Mobile</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-4rem)]">
                <div className="py-3">
                  <div className="flex items-center gap-3 mb-4 px-4">
                    {session ? (
                      <>
                        <Avatar>
                          <AvatarImage src={session.user?.image || ""} />
                          <AvatarFallback>{session.user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{session.user?.name}</div>
                          <UsernameLink 
                            username={session.user?.name || ""} 
                            className="text-xs text-muted-foreground"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <Avatar>
                          <AvatarFallback>G</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">Guest</div>
                          <div className="text-sm text-muted-foreground">Not signed in</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="px-2 mb-4 grid grid-cols-2 gap-2">
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full" onClick={navigateToHome}>
                        <Home className="mr-2 h-4 w-4" />
                        Home
                      </Button>
                    </SheetClose>
                    <Button variant="outline" className="w-full">
                      <Compass className="mr-2 h-4 w-4" />
                      Discover
                    </Button>
                  </div>

                  {/* NSFW Toggle */}
                  <div className="px-4 py-2 mb-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="nsfw-toggle" className="text-base">
                          Show NSFW Content
                        </Label>
                        <p className="text-sm text-muted-foreground">Toggle visibility of adult content</p>
                      </div>
                      <Switch id="nsfw-toggle" checked={showNSFW} onCheckedChange={toggleNSFW} />
                    </div>
                  </div>

                  <nav className="space-y-1 px-2">
                    <Button variant="ghost" className="w-full justify-start rounded-lg">
                      <Bookmark className="mr-2 h-5 w-5" />
                      Saved
                    </Button>

                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start rounded-lg"
                        onClick={() => router.push("/upvoted")}
                      >
                        <ArrowUp className="mr-2 h-5 w-5" />
                        Upvoted
                      </Button>
                    </SheetClose>

                    {session && (
                      <>
                        <div className="pt-4 pb-2 px-3">
                          <h3 className="text-sm font-medium text-muted-foreground">Your Communities</h3>
                        </div>

                        {loadingSubreddits ? (
                          <div className="space-y-2 px-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="flex items-center gap-2 p-2">
                                <Skeleton className="h-5 w-5 rounded-full" />
                                <Skeleton className="h-4 w-32" />
                              </div>
                            ))}
                          </div>
                        ) : subscribedSubreddits.length > 0 ? (
                          <div className="space-y-1">
                            {subscribedSubreddits.map((sub) => (
                              <SheetClose key={sub.id} asChild>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start rounded-lg"
                                  onClick={() => navigateToSubreddit(sub.display_name)}
                                >
                                  <Avatar className="h-5 w-5 mr-2">
                                    {sub.icon_img ? <AvatarImage src={sub.icon_img} /> : null}
                                    <AvatarFallback className="text-xs">
                                      {sub.display_name[0].toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  r/{sub.display_name}
                                </Button>
                              </SheetClose>
                            ))}
                          </div>
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No subscribed communities found</div>
                        )}
                      </>
                    )}

                    {!session && (
                      <>
                        <div className="pt-4 pb-2 px-3">
                          <h3 className="text-sm font-medium text-muted-foreground">Popular Communities</h3>
                        </div>

                        {["programming", "AskReddit", "worldnews", "gaming", "movies"].map((sub) => (
                          <SheetClose key={sub} asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-start rounded-lg"
                              onClick={() => navigateToSubreddit(sub)}
                            >
                              <Avatar className="h-5 w-5 mr-2">
                                <AvatarFallback className="text-xs">{sub[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                              r/{sub}
                            </Button>
                          </SheetClose>
                        ))}
                      </>
                    )}

                    <div className="pt-4 pb-2 px-3">
                      <h3 className="text-sm font-medium text-muted-foreground">Settings</h3>
                    </div>

                    <div className="px-1">
                      <ThemeSelector variant="ghost" className="w-full justify-between rounded-lg h-10" />
                    </div>

                    <SheetClose asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start rounded-lg"
                        onClick={() => router.push('/settings')}
                      >
                        <Settings className="mr-2 h-5 w-5" />
                        Settings
                      </Button>
                    </SheetClose>
                  </nav>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {currentSubreddit ? (
            <Button
              variant="ghost"
              className="text-base font-semibold flex items-center gap-1 px-2 max-w-[200px] truncate"
              onClick={navigateToHome}
            >
              <ArrowLeft className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">r/{currentSubreddit}</span>
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="rounded-full" onClick={navigateToHome}>
              <Home className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <SearchDrawer onSubredditSelect={navigateToSubreddit} />
          <NotificationPanel />
          <AuthButton />
        </div>
      </div>
    </div>
  )
}

