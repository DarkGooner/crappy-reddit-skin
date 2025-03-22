"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Home, Bookmark, Menu, Search, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useSession } from "next-auth/react"
import Sidebar from "@/components/sidebar"
import { useSubscribedSubreddits } from "@/hooks/use-subscribed-subreddits"

export default function MobileNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session } = useSession()
  const { subreddits, loading } = useSubscribedSubreddits()

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollingDown = currentScrollY > lastScrollY
      const scrollDelta = Math.abs(currentScrollY - lastScrollY)

      // Only hide/show if we've scrolled more than 10px
      if (scrollDelta > 10) {
        setIsVisible(!scrollingDown)
        setLastScrollY(currentScrollY)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const navItems = [
    {
      icon: Home,
      label: "Home",
      href: "/",
    },
    {
      icon: Search,
      label: "Search",
      href: "/search",
    },
    {
      icon: ArrowUp,
      label: "Upvoted",
      href: "/upvoted",
      requiresAuth: true,
    },
    {
      icon: Bookmark,
      label: "Saved",
      href: "/saved",
      requiresAuth: true,
    },
    {
      icon: Menu,
      label: "Menu",
      action: () => setSidebarOpen(true),
    },
  ]

  return (
    <>
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border sm:hidden transition-transform duration-300",
          !isVisible && "translate-y-full",
        )}
      >
        <nav className="flex items-center justify-around p-2">
          {navItems.map((item) => {
            const Icon = item.icon

            // Skip auth-required items if not logged in
            if (item.requiresAuth && !session) {
              return null
            }

            return item.action ? (
              <Button
                key={item.label}
                variant="ghost"
                size="icon"
                className="flex flex-col items-center justify-center gap-1 h-auto py-2"
                onClick={item.action}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Button>
            ) : (
              <Button
                key={item.label}
                variant="ghost"
                size="icon"
                className={cn(
                  "flex flex-col items-center justify-center gap-1 h-auto py-2",
                  pathname === item.href && "text-primary",
                )}
                onClick={() => router.push(item.href)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Button>
            )
          })}
        </nav>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[85%] sm:w-[350px]">
          <Sidebar
            subscribedSubreddits={subreddits}
            loadingSubreddits={loading}
            onClose={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

