"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import type { Subreddit } from "@/types/reddit"

export function useSubscribedSubreddits() {
  const { data: session } = useSession()
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSubreddits = async () => {
      if (!session?.accessToken) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch("/api/reddit/subscribed")
        if (!response.ok) {
          throw new Error("Failed to fetch subscribed subreddits")
        }

        const data = await response.json()
        setSubreddits(data)
      } catch (err) {
        console.error("Error fetching subscribed subreddits:", err)
        setError("Failed to load subscribed subreddits")
      } finally {
        setLoading(false)
      }
    }

    fetchSubreddits()
  }, [session?.accessToken])

  return {
    subreddits,
    loading,
    error,
  }
}

