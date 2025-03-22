"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface UsernameLinkProps {
  username: string
  className?: string
  prefixU?: boolean
  isAuthor?: boolean
  onClick?: (e: React.MouseEvent) => void
}

export default function UsernameLink({
  username,
  className,
  prefixU = true,
  isAuthor = false,
  onClick,
}: UsernameLinkProps) {
  if (!username) return null
  
  // Handle [deleted] or special usernames
  if (username === "[deleted]" || username === "AutoModerator") {
    return (
      <span className={cn("font-medium", className)}>
        {prefixU ? "u/" : ""}{username}
      </span>
    )
  }

  return (
    <Link
      href={`/user/${username}`}
      className={cn(
        "font-medium hover:underline", 
        isAuthor && "text-primary",
        className
      )}
      onClick={onClick}
    >
      {prefixU ? "u/" : ""}{username}
    </Link>
  )
} 