import { formatDistanceToNow } from "date-fns";

/**
 * Format a score number to a more readable format (e.g. 1.2k, 3.4M)
 */
export function formatScore(score: number): string {
  if (score >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`;
  }
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  return score.toString();
}

/**
 * Format a timestamp to a relative time string with consistent formatting
 * @param timestamp Unix timestamp in seconds or milliseconds
 * @param options Formatting options
 */
export function formatRelativeTime(
  timestamp: number | undefined | null,
  options: { addSuffix?: boolean; fallback?: string } = {}
): string {
  if (!timestamp) {
    return options.fallback || "Unknown time";
  }

  // Ensure timestamp is in milliseconds (Reddit API uses seconds)
  const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  
  try {
    const date = new Date(timestampMs);
    if (isNaN(date.getTime())) {
      return options.fallback || "Invalid date";
    }
    return formatDistanceToNow(date, { addSuffix: options.addSuffix });
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return options.fallback || "Invalid date";
  }
} 