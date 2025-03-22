import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SessionProvider } from "@/components/session-provider"
import { NSFWProvider } from "@/components/nsfw-context"
import MobileNav from "@/components/mobile-nav"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Reddit Mobile",
  description: "A mobile-optimized Reddit client",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-512x512.png",
  },
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={cn(inter.className, "min-h-screen bg-background antialiased overflow-x-hidden")}>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <NSFWProvider>
              <div className="flex flex-col min-h-screen">
                {/* Main content */}
                <main className="flex-1 pb-16">{children}</main>

                {/* Sticky bottom nav */}
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <MobileNav />
                </div>
              </div>
              <Toaster />
            </NSFWProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}



import './globals.css'