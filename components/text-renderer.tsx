"use client"

import { useEffect, useState } from "react"
import { decodeHtmlEntities } from "@/lib/utils"

interface TextRendererProps {
  /**
   * The text content to render, which may contain HTML entities
   */
  text: string;
  
  /**
   * Additional class names to apply to the container
   */
  className?: string;
}

/**
 * A simple component that renders text with HTML entities decoded.
 * This is useful for titles and other simple text that might contain
 * entities like &amp;, &quot;, etc.
 */
export default function TextRenderer({ text, className }: TextRendererProps) {
  const [decoded, setDecoded] = useState(text)
  
  // Decode HTML entities on the client side
  useEffect(() => {
    setDecoded(decodeHtmlEntities(text))
  }, [text])
  
  return <span className={className}>{decoded}</span>
} 