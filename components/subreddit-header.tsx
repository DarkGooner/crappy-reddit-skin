"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import SelectionControls from "@/components/selection-controls"
import { Flame, Clock, TrendingUp, Sparkles, Award } from "lucide-react"

interface SubredditHeaderProps {
  subreddit: string
  sortOption: string
  timeFilter: string
  onSortChange: (sort: string, time?: string) => void
}

export default function SubredditHeader({ subreddit, sortOption, timeFilter, onSortChange }: SubredditHeaderProps) {
  const sortOptions = [
    {
      id: "best",
      label: "Best",
      icon: <Award className="h-4 w-4 mr-2" />,
    },
    {
      id: "hot",
      label: "Hot",
      icon: <Flame className="h-4 w-4 mr-2" />,
    },
    {
      id: "new",
      label: "New",
      icon: <Clock className="h-4 w-4 mr-2" />,
    },
    {
      id: "top",
      label: "Top",
      icon: <TrendingUp className="h-4 w-4 mr-2" />,
      subOptions: [
        { id: "hour", label: "Past Hour" },
        { id: "day", label: "Today" },
        { id: "week", label: "This Week" },
        { id: "month", label: "This Month" },
        { id: "year", label: "This Year" },
        { id: "all", label: "All Time" },
      ],
    },
    {
      id: "rising",
      label: "Rising",
      icon: <Sparkles className="h-4 w-4 mr-2" />,
    },
  ]

  return (
    <div className="border-b">
      <div className="relative">
        <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/40"></div>
        <div className="absolute -bottom-6 left-4">
          <Avatar className="h-12 w-12 border-4 border-background">
            <AvatarImage src={`/placeholder.svg?text=${subreddit[0].toUpperCase()}`} />
            <AvatarFallback>{subreddit[0].toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="pt-8 pb-2 px-4">
        <h1 className="text-2xl font-bold">r/{subreddit}</h1>
        <p className="text-sm text-muted-foreground">r/{subreddit}</p>
      </div>

      <div className="px-4 pb-2 flex gap-2">
        <Button variant="outline" size="sm">
          Join
        </Button>
        <Button variant="outline" size="sm">
          About
        </Button>
      </div>

      <SelectionControls
        options={sortOptions}
        value={sortOption}
        subValue={timeFilter}
        onChange={onSortChange}
        label="Sort"
      />
    </div>
  )
}

