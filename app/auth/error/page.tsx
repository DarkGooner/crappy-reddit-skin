"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { signIn } from "next-auth/react"
import ErrorWithNavbar from "@/components/error-with-navbar"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setIsLoading(true)
    await signIn("reddit", { callbackUrl: "/" })
    setIsLoading(false)
  }

  let errorTitle = "Authentication Error"
  let errorDescription = "There was a problem with your authentication."

  // Map error codes to meaningful messages
  switch (error) {
    case "Signin":
      errorDescription = "An error occurred during the sign-in process."
      break
    case "OAuthSignin":
      errorDescription = "An error occurred while redirecting to Reddit for authentication."
      break
    case "OAuthCallback":
      errorDescription = "Reddit returned an error during the authentication process."
      break
    case "OAuthCreateAccount":
      errorDescription = "There was a problem creating your account."
      break
    case "Callback":
      errorDescription = "There was a problem processing the authentication callback."
      break
    case "OAuthAccountNotLinked":
      errorDescription = "Your account is not linked with any Reddit account."
      break
    case "AccessDenied":
      errorTitle = "Access Denied"
      errorDescription = "You denied the application access to your Reddit account."
      break
    case "CredentialsSignin":
      errorDescription = "Your sign-in credentials were incorrect or expired."
      break
    case "SessionRequired":
      errorTitle = "Authentication Required"
      errorDescription = "You need to be signed in to access this content."
      break
    default:
      errorDescription = "An unexpected authentication error occurred."
  }

  return (
    <ErrorWithNavbar
      title={errorTitle}
      description={errorDescription}
      action={{
        label: isLoading ? "Signing in..." : "Sign in with Reddit",
        onClick: handleSignIn
      }}
    >
      <div className="flex flex-col items-center justify-center mt-4">
        <Button 
          onClick={handleSignIn} 
          disabled={isLoading} 
          size="lg"
          className="mb-4 w-full"
        >
          <LogIn className="mr-2 h-5 w-5" />
          {isLoading ? "Signing in..." : "Sign in with Reddit"}
        </Button>
        
        <p className="text-sm text-muted-foreground text-center mt-4">
          By signing in, you'll be able to access all Reddit content and features through our app.
        </p>
      </div>
    </ErrorWithNavbar>
  )
} 