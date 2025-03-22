import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Decode HTML entities in a string
 * Useful for processing Reddit API responses that contain HTML-escaped content
 */
export function decodeHtmlEntities(html: string): string {
  if (!html) return '';
  
  // Create a textarea element to decode HTML entities
  // This approach works in both browser and server environments
  try {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  } catch (error) {
    // Fallback for server-side rendering
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#x60;/g, '`')
      .replace(/&#x3D;/g, '=');
  }
}

//export function cn(...inputs: (string | undefined | null)[]): string {
//  return inputs.filter(Boolean).join(" ")
//}
//
//export function decodeHtmlEntities(text: string): string {
//  if (typeof window === "undefined") {
//    return text // Skip decoding on server-side
//  }
//  const textarea = document.createElement("textarea")
//  textarea.innerHTML = text
//  return textarea.value
//}
//

