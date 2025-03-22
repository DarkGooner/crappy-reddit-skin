"use client"

import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Home } from "lucide-react"

interface ErrorWithNavbarProps {
  title: string
  description: string
  children?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  showHomeButton?: boolean
  showBackButton?: boolean
}

export default function ErrorWithNavbar({
  title,
  description,
  children,
  action,
  showHomeButton = true,
  showBackButton = true,
}: ErrorWithNavbarProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
          </CardHeader>
          
          <CardContent>
            <p className="text-muted-foreground mb-4">{description}</p>
            {children}
          </CardContent>
          
          <CardFooter className="flex gap-2 justify-end">
            {showBackButton && (
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            )}
            
            {showHomeButton && (
              <Button variant="outline" onClick={() => router.push("/")}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            )}
            
            {action && (
              <Button onClick={action.onClick}>
                {action.label}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 