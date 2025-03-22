"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FaReddit } from "react-icons/fa"
import { useRouter, useSearchParams } from "next/navigation"

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const error = searchParams.get("error")

  const handleSignIn = async () => {
    setIsLoading(true)
    await signIn("reddit", { callbackUrl })
    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <FaReddit className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sign in to Reddit Mobile</CardTitle>
          <CardDescription>Connect with your Reddit account to access personalized content</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error === "OAuthSignin" && "An error occurred while signing in with Reddit."}
              {error === "OAuthCallback" && "An error occurred while processing the authentication callback."}
              {error === "OAuthAccountNotLinked" && "Your Reddit account is not linked to an existing account."}
              {error === "Callback" && "An error occurred during the authentication callback."}
              {error === "AccessDenied" && "You denied access to your Reddit account."}
              {!["OAuthSignin", "OAuthCallback", "OAuthAccountNotLinked", "Callback", "AccessDenied"].includes(error) &&
                "An unknown error occurred during authentication."}
            </div>
          )}
          <Button onClick={handleSignIn} className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in with Reddit"}
          </Button>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </CardFooter>
      </Card>
    </div>
  )
}

