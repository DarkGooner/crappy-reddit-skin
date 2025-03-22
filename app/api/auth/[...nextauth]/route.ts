import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Create an async handler function to properly handle params
async function auth(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  const params = await context.params
  // NextAuth will handle the request with properly awaited headers and cookies
  return NextAuth(authOptions)(req, { params })
}

export { auth as GET, auth as POST }

