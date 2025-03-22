"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Filter, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectionControlsProps {
  options: {
    id: string
    label: string
    icon?: React.ReactNode
    subOptions?: {
      id: string
      label: string
    }[]
  }[]
  value: string
  subValue?: string
  onChange: (value: string, subValue?: string) => void
  label: string
  className?: string
}

export default function SelectionControls({
  options,
  value,
  subValue,
  onChange,
  label,
  className,
}: SelectionControlsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [timeFilterOpen, setTimeFilterOpen] = useState(false)

  const selectedOption = options.find((option) => option.id === value)
  const selectedSubOption = selectedOption?.subOptions?.find((option) => option.id === subValue)

  const getDisplayLabel = () => {
    const displayLabel = selectedOption?.label || options[0].label
    return displayLabel
  }

  // Handle time filter visibility
  const showTimeFilter = value === "top" && selectedOption?.subOptions

  return (
    <div
      className={cn(
        "px-4 py-2 flex items-center justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-10 border-t border-b",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              {selectedOption?.icon}
              <span>{getDisplayLabel()}</span>
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {options.map((option) => {
              if (option.subOptions) {
                return (
                  <DropdownMenuItem
                    key={option.id}
                    className={cn(value === option.id && "bg-accent")}
                    onClick={() => {
                      onChange(option.id, option.subOptions?.[0].id)
                      setIsOpen(false)
                      // If selecting "top", automatically open time filter
                      if (option.id === "top") {
                        setTimeout(() => setTimeFilterOpen(true), 100)
                      }
                    }}
                  >
                    {option.icon}
                    {option.label}
                  </DropdownMenuItem>
                )
              }

              return (
                <DropdownMenuItem
                  key={option.id}
                  className={cn(value === option.id && "bg-accent")}
                  onClick={() => onChange(option.id)}
                >
                  {option.icon}
                  {option.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Adjacent time filter dropdown */}
        {showTimeFilter && (
          <DropdownMenu open={timeFilterOpen} onOpenChange={setTimeFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 ml-2">
                {selectedSubOption?.label || "Time"}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuRadioGroup value={subValue}>
                {selectedOption?.subOptions?.map((subOption) => (
                  <DropdownMenuRadioItem
                    key={subOption.id}
                    value={subOption.id}
                    onClick={() => onChange(value, subOption.id)}
                  >
                    {subOption.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Filter className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

