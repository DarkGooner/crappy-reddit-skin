"use client"

import { cn, decodeHtmlEntities } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import React, { useState, useEffect } from "react"

interface FormattedContentProps {
  /**
   * HTML content to render (preferred if available)
   */
  html?: string
  
  /**
   * Markdown content to render as a fallback
   */
  markdown?: string
  
  /**
   * Additional styling classes to apply
   */
  className?: string
  
  /**
   * Limit the number of lines displayed
   */
  lineClamp?: number
  
  /**
   * If true, will add hover effect for line clamped content
   */
  showHoverEffect?: boolean
}

export default function FormattedContent({
  html,
  markdown,
  className,
  lineClamp,
  showHoverEffect = false,
}: FormattedContentProps) {
  const [decoded, setDecoded] = useState<string>("")
  
  // Handle decoding HTML entities on the client side
  useEffect(() => {
    if (html) {
      setDecoded(decodeHtmlEntities(html))
    }
  }, [html])
  
  const containerClasses = cn(
    "prose dark:prose-invert max-w-none",
    lineClamp && `line-clamp-${lineClamp}`,
    showHoverEffect && lineClamp && "cursor-pointer hover:text-primary",
    className
  )
  
  // If we have HTML content, render it with dangerouslySetInnerHTML
  if (html) {
    return (
      <div 
        className={containerClasses}
        dangerouslySetInnerHTML={{ __html: decoded }}
      />
    )
  }
  
  // If we only have markdown content, render it with ReactMarkdown
  if (markdown) {
    return (
      <div className={containerClasses}>
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    )
  }
  
  // If we have neither, return null
  return null
} 