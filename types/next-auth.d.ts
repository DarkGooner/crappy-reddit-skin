import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken: string
    refreshToken: string
    error?: string
    user: {
      id: string
      name: string
      email: string
      image: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string
    refreshToken: string
    accessTokenExpires: number
    error?: string
    user?: {
      id: string
      name: string
      email: string
      image: string
    }
  }
}

