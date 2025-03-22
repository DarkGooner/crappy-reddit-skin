/**
 * Format a number with abbreviations (k, m, b) for readability
 * 
 * @param num The number to format
 * @param digits Number of decimal places (default: 1)
 * @returns Formatted string like "1.2k" or "3.4m"
 */
export function FormatNumber(num: number, digits = 1): string {
  if (num === undefined || num === null) return '0';
  
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "m" },
    { value: 1e9, symbol: "b" },
    { value: 1e12, symbol: "t" },
  ];
  
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  const item = lookup
    .slice()
    .reverse()
    .find(function(item) {
      return num >= item.value;
    });
    
  return item 
    ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol 
    : "0";
}

/**
 * Format a date relative to now (e.g., "2 hours ago")
 * 
 * @param date Date to format
 * @returns Formatted string like "2h ago" or "3d ago"
 */
export function FormatRelativeTime(date: Date | number | string): string {
  const now = new Date();
  const dateObj = typeof date === 'object' ? date : new Date(date);
  const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  // Handle future dates
  if (seconds < 0) {
    return 'in the future';
  }
  
  // Time intervals in seconds
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  // For very recent posts
  if (seconds < 60) {
    return 'just now';
  }
  
  // Find the appropriate interval
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      // Format with abbreviations
      const unitAbbr = unit === 'year' ? 'y' 
                    : unit === 'month' ? 'mo' 
                    : unit === 'week' ? 'w' 
                    : unit === 'day' ? 'd' 
                    : unit === 'hour' ? 'h' 
                    : 'm';
      
      return `${interval}${unitAbbr} ago`;
    }
  }
  
  return 'just now';
}

/**
 * Format a UTC timestamp string to a human-readable date format
 * 
 * @param timestamp UTC timestamp in seconds
 * @returns Formatted date string
 */
export function FormatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a number as a file size (e.g., "1.2 MB")
 * 
 * @param bytes Number of bytes
 * @param decimals Number of decimal places
 * @returns Formatted string like "1.2 MB" or "820 KB"
 */
export function FormatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
} 