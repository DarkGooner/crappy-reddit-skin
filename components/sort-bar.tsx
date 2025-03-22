"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Flame, Clock, TrendingUp, Award, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface SortBarProps {
  sortOption: string
  timeFilter: string
  onSortChange: (sort: string, time?: string) => void
}

export default function SortBar({ sortOption, timeFilter, onSortChange }: SortBarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getSortIcon = () => {
    switch (sortOption) {
      case "hot":
        return <Flame className="h-4 w-4 mr-2" />
      case "new":
        return <Clock className="h-4 w-4 mr-2" />
      case "top":
        return <TrendingUp className="h-4 w-4 mr-2" />
      case "rising":
        return <Sparkles className="h-4 w-4 mr-2" />
      case "best":
        return <Award className="h-4 w-4 mr-2" />
      default:
        return <Flame className="h-4 w-4 mr-2" />
    }
  }

  const getSortLabel = () => {
    let label = sortOption.charAt(0).toUpperCase() + sortOption.slice(1)

    if (sortOption === "top") {
      switch (timeFilter) {
        case "hour":
          label += ": Past Hour"
          break
        case "day":
          label += ": Today"
          break
        case "week":
          label += ": This Week"
          break
        case "month":
          label += ": This Month"
          break
        case "year":
          label += ": This Year"
          break
        case "all":
          label += ": All Time"
          break
      }
    }

    return label
  }

  return (
    <div className="px-4 py-2 flex items-center justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-10 border-t border-b">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            {getSortIcon()}
            {getSortLabel()}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem className={cn(sortOption === "best" && "bg-accent")} onClick={() => onSortChange("best")}>
            <Award className="h-4 w-4 mr-2" />
            Best
          </DropdownMenuItem>
          <DropdownMenuItem className={cn(sortOption === "hot" && "bg-accent")} onClick={() => onSortChange("hot")}>
            <Flame className="h-4 w-4 mr-2" />
            Hot
          </DropdownMenuItem>
          <DropdownMenuItem className={cn(sortOption === "new" && "bg-accent")} onClick={() => onSortChange("new")}>
            <Clock className="h-4 w-4 mr-2" />
            New
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={cn(sortOption === "top" && "bg-accent")}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Top
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={timeFilter}>
                <DropdownMenuRadioItem value="hour" onClick={() => onSortChange("top", "hour")}>
                  Past Hour
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="day" onClick={() => onSortChange("top", "day")}>
                  Today
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="week" onClick={() => onSortChange("top", "week")}>
                  This Week
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="month" onClick={() => onSortChange("top", "month")}>
                  This Month
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="year" onClick={() => onSortChange("top", "year")}>
                  This Year
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="all" onClick={() => onSortChange("top", "all")}>
                  All Time
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            className={cn(sortOption === "rising" && "bg-accent")}
            onClick={() => onSortChange("rising")}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Rising
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

