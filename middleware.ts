import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Protected routes that require authentication
const protectedPaths = [
  '/settings',
  '/upvoted',
  '/saved',
  '/user',
  '/notifications',
  '/inbox',
]

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Check if the path is a protected route
  const isProtectedPath = protectedPaths.some(route => path.startsWith(route))
  
  if (isProtectedPath) {
    try {
      // Get the token from the request
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      })
      
      // If no token, redirect to the unauthenticated page
      if (!token) {
        const url = new URL('/auth/unauthenticated', request.url)
        // Add the original URL as a callback URL
        url.searchParams.set('callbackUrl', request.url)
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('Authentication error in middleware:', error)
      // If there's an error parsing the token, redirect to unauthenticated page
      const url = new URL('/auth/unauthenticated', request.url)
      return NextResponse.redirect(url)
    }
  }
  
  // Continue with the request for non-protected routes or authenticated users
  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
} 