import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useBrowsingStore } from '@/store/browsing-store'
import type { Post } from '@/types/reddit'

interface ScrollRestorationOptions {
  enabled?: boolean
  key?: string
  posts?: Post[]
  after?: string | null
  onRestorePosts?: (posts: Post[], after: string | null) => void
}

/**
 * Hook to handle saving and restoring scroll position and viewed posts when navigating
 */
export function useScrollRestoration({
  enabled = true,
  key = '',
  posts = [],
  after = null,
  onRestorePosts,
}: ScrollRestorationOptions = {}) {
  const pathname = usePathname()
  const routeKey = key || pathname || '/'
  const { getRouteState, setRouteState } = useBrowsingStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrollSaveTime = useRef<number>(0)
  const initialRender = useRef(true)
  
  // Save current state on component unmount or route change
  useEffect(() => {
    if (!enabled) return
    
    // Save posts on mount/update
    if (posts.length > 0) {
      setRouteState(routeKey, { posts, after })
    }
    
    return () => {
      // Save scroll position on unmount
      if (containerRef.current) {
        const scrollY = window.scrollY
        setRouteState(routeKey, { scrollPosition: scrollY })
      }
    }
  }, [enabled, routeKey, setRouteState, posts, after])
  
  // Save scroll position periodically during scrolling
  useEffect(() => {
    if (!enabled) return
    
    const handleScroll = () => {
      const now = Date.now()
      // Throttle saves to once per second
      if (now - lastScrollSaveTime.current > 1000) {
        lastScrollSaveTime.current = now
        const scrollY = window.scrollY
        setRouteState(routeKey, { scrollPosition: scrollY })
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [enabled, routeKey, setRouteState])
  
  // Restore scroll and posts on first render
  useEffect(() => {
    if (!enabled || !initialRender.current) return
    
    const savedState = getRouteState(routeKey)
    
    // Restore posts if a callback was provided and we have saved posts
    if (onRestorePosts && savedState.posts.length > 0) {
      onRestorePosts(savedState.posts, savedState.after)
    }
    
    // Restore scroll position with a slight delay to ensure content is rendered
    if (savedState.scrollPosition > 0) {
      const timer = setTimeout(() => {
        window.scrollTo({
          top: savedState.scrollPosition,
          behavior: 'auto'
        })
      }, 100)
      
      return () => clearTimeout(timer)
    }
    
    initialRender.current = false
  }, [enabled, routeKey, getRouteState, onRestorePosts])
  
  return { containerRef }
} 