import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Post } from '@/types/reddit'

interface RouteState {
  scrollPosition: number
  posts: Post[]
  lastViewedPostId: string | null
  after: string | null
}

interface BrowsingState {
  routes: Record<string, RouteState>
  setRouteState: (route: string, state: Partial<RouteState>) => void
  getRouteState: (route: string) => RouteState
  clearRouteState: (route: string) => void
  clearAllRoutes: () => void
}

const defaultRouteState: RouteState = {
  scrollPosition: 0,
  posts: [],
  lastViewedPostId: null,
  after: null
}

export const useBrowsingStore = create<BrowsingState>()(
  persist(
    (set, get) => ({
      routes: {},

      setRouteState: (route, state) => {
        set((current) => ({
          routes: {
            ...current.routes,
            [route]: {
              ...defaultRouteState,
              ...current.routes[route],
              ...state,
            },
          },
        }))
      },

      getRouteState: (route) => {
        return get().routes[route] || { ...defaultRouteState }
      },

      clearRouteState: (route) => {
        set((current) => {
          const newRoutes = { ...current.routes }
          delete newRoutes[route]
          return { routes: newRoutes }
        })
      },

      clearAllRoutes: () => {
        set({ routes: {} })
      },
    }),
    {
      name: 'browsing-store',
      // Only persist the routes object, not the methods
      partialize: (state) => ({ routes: state.routes }),
    }
  )
) 