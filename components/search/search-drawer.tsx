"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Search } from "lucide-react"
import SearchBar from "@/components/search/search-bar"

interface SearchDrawerProps {
  onSubredditSelect?: (subreddit: string) => void
}

export default function SearchDrawer({ onSubredditSelect }: SearchDrawerProps) {
  const [open, setOpen] = useState(false)

  const handleClose = () => {
    setOpen(false)
  }

  const handleSubredditSelect = (subreddit: string) => {
    if (onSubredditSelect) {
      onSubredditSelect(subreddit)
    }
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Search className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="p-0 h-[90vh]">
        <SearchBar onClose={handleClose} onSubredditSelect={handleSubredditSelect} />
      </SheetContent>
    </Sheet>
  )
}

