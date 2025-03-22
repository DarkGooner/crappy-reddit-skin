"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      themes={[
        "light",
        "dark",
        "system",
        "midnight",
        "sunset",
        "forest",
        "ocean",
        "lavender",
        "desert",
        "protanopia",
        "deuteranopia",
        "tritanopia",
      ]}
      defaultTheme="dark"
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

