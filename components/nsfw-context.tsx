"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type NSFWContextType = {
  showNSFW: boolean
  toggleNSFW: () => void
}

const NSFWContext = createContext<NSFWContextType | undefined>(undefined)

export function NSFWProvider({ children }: { children: React.ReactNode }) {
  const [showNSFW, setShowNSFW] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load preference from localStorage on mount
  useEffect(() => {
    const storedPreference = localStorage.getItem("showNSFW")
    if (storedPreference !== null) {
      setShowNSFW(storedPreference === "true")
    }
    setIsLoaded(true)
  }, [])

  // Save preference to localStorage when it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("showNSFW", showNSFW.toString())
    }
  }, [showNSFW, isLoaded])

  const toggleNSFW = () => {
    setShowNSFW((prev) => !prev)
  }

  return <NSFWContext.Provider value={{ showNSFW, toggleNSFW }}>{children}</NSFWContext.Provider>
}

export function useNSFW() {
  const context = useContext(NSFWContext)
  if (context === undefined) {
    throw new Error("useNSFW must be used within a NSFWProvider")
  }
  return context
}

