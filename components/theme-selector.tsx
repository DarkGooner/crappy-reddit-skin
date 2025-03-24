"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Check, Monitor, Moon, Sun, Eye } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const themes = [
  { id: "dark", name: "Dark", icon: Moon },
  { id: "light", name: "Light", icon: Sun },
  { id: "system", name: "System", icon: Monitor },
  { id: "midnight", name: "Midnight", icon: Moon },
  { id: "sunset", name: "Sunset", icon: Sun },
  { id: "forest", name: "Forest", icon: Moon },
  { id: "ocean", name: "Ocean", icon: Moon },
  { id: "lavender", name: "Lavender", icon: Moon },
  { id: "desert", name: "Desert", icon: Sun },
  { id: "protanopia", name: "Protanopia", icon: Eye },
  { id: "deuteranopia", name: "Deuteranopia", icon: Eye },
  { id: "tritanopia", name: "Tritanopia", icon: Eye },
  { id: "amoled", name: "AMOLED", icon: Moon },
]

interface ThemeSelectorProps {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export default function ThemeSelector({ variant = "ghost", size = "default", className }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  const currentTheme = themes.find((t) => t.id === theme) || themes[0]
  const Icon = currentTheme.icon

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={cn("gap-2", className)}>
          <Icon className="h-[1.2em] w-[1.2em]" />
          <span className="hidden md:inline">{currentTheme.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            {themes.map((t) => {
              const ThemeIcon = t.icon
              return (
                <DropdownMenuRadioItem key={t.id} value={t.id} className="cursor-pointer">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <ThemeIcon className="h-4 w-4" />
                      <span>{t.name}</span>
                    </div>
                    {theme === t.id && <Check className="h-4 w-4" />}
                  </div>
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

