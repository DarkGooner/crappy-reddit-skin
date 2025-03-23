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

  /**
   * If true, will add a gradient fade effect at the bottom of truncated content
   */
  showGradient?: boolean
}

export default function FormattedContent({
  html,
  markdown,
  className,
  lineClamp,
  showHoverEffect = false,
  showGradient = false,
}: FormattedContentProps) {
  const [decoded, setDecoded] = useState<string>("")
  
  // Handle decoding HTML entities on the client side
  useEffect(() => {
    if (html) {
      setDecoded(decodeHtmlEntities(html))
    }
  }, [html])
  
  // Calculate gradient height based on line clamp value
  const gradientHeight = lineClamp 
    ? Math.min(lineClamp * 1.5, 8)
    : 8;
  
  const containerClasses = cn(
    "prose dark:prose-invert max-w-none",
    lineClamp && [
      `line-clamp-${lineClamp}`,
      "overflow-hidden text-ellipsis",
    ],
    showHoverEffect && lineClamp && "cursor-pointer hover:text-primary",
    lineClamp && showGradient && 
      "relative after:absolute after:bottom-0 after:left-0 after:h-28 after:w-full after:bg-gradient-to-t after:from-background/90 after:via-background/50 after:to-transparent after:pointer-events-none",
    className
  )

  // Enforce line clamp on all child paragraphs for HTML content  
  const htmlContent = `
    <style>
      .line-clamped p {
        margin: 0.5em 0;
      }
      ${lineClamp ? `.line-clamped {
        display: -webkit-box;
        -webkit-line-clamp: ${lineClamp};
        -webkit-box-orient: vertical;
        overflow: hidden;
      }` : ''}
    </style>
    <div class="${lineClamp ? 'line-clamped' : ''}">${decoded}</div>
  `;
  
  // If we have HTML content, render it with dangerouslySetInnerHTML
  if (html) {
    return (
      <div 
        className={containerClasses}
        dangerouslySetInnerHTML={{ __html: lineClamp ? htmlContent : decoded }}
      />
    )
  }
  
  // If we only have markdown content, render it with ReactMarkdown
  if (markdown) {
    return (
      <div className={containerClasses} style={lineClamp ? {
        display: '-webkit-box',
        WebkitLineClamp: lineClamp,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      } : undefined}>
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    )
  }
  
  // If we have neither, return null
  return null
} 