import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redditCache } from "@/lib/reddit-cache";
import { apiConfig } from "@/app/api/reddit/config";

/**
 * Standard error response format for API routes
 */
export interface ApiErrorResponse {
  error: string;
  details?: string | unknown;
  status: number;
}

/**
 * Create a standardized error response for API routes
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: unknown
): NextResponse {
  const errorResponse: ApiErrorResponse = {
    error: message,
    status,
  };
  
  if (details) {
    if (details instanceof Error) {
      errorResponse.details = details.message;
    } else {
      errorResponse.details = details;
    }
  }
  
  console.error(`API Error (${status}):`, message, details || "");
  return NextResponse.json(errorResponse, { status });
}

/**
 * Error responses for common scenarios
 */
export const ApiErrors = {
  unauthorized: (details?: string) => 
    createErrorResponse(details || "You must be logged in to perform this action", 401),
  
  forbidden: (details?: string) => 
    createErrorResponse(details || "You don't have permission to perform this action", 403),
    
  notFound: (details?: string) => 
    createErrorResponse(details || "The requested resource was not found", 404),
    
  badRequest: (details?: string) => 
    createErrorResponse(details || "Invalid request parameters", 400),
    
  internalError: (error?: unknown) => 
    createErrorResponse("An internal server error occurred", 500, error),
    
  serviceUnavailable: (details?: string) => 
    createErrorResponse(details || "Service temporarily unavailable", 503),
};

/**
 * Transform and validate data from Reddit API
 * @param data Any data from Reddit API
 * @param validator Optional validation function
 */
export function transformRedditResponse<T>(
  data: any, 
  validator?: (data: any) => boolean
): T {
  // Basic validation
  if (!data) {
    throw new Error("Empty response from Reddit API");
  }
  
  // Custom validation
  if (validator && !validator(data)) {
    throw new Error("Invalid data format from Reddit API");
  }
  
  return data as T;
}

/**
 * Create safe Reddit API request with proper error handling 
 * and automatic cookie/header management
 */
export async function createRedditApiRequest<T>(
  url: string, 
  options: RequestInit = {},
  skipCache = false
): Promise<T> {
  try {
    // Get user session and access token - this is async and needs proper dynamic config
    const session = await getServerSession(authOptions);
    
    // Set up headers
    const headers = new Headers(options.headers);
    
    // Add default headers
    if (!headers.has("User-Agent")) {
      headers.set("User-Agent", apiConfig.defaultHeaders["User-Agent"]);
    }
    
    // Add authentication if available
    if (session?.accessToken) {
      headers.set("Authorization", `Bearer ${session.accessToken}`);
    }
    
    // Use cache unless skipCache is true
    if (skipCache) {
      // Force cache to be bypassed by adding a timestamp
      const cacheBustUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      return await redditCache.fetchWithCache<T>(cacheBustUrl, { 
        ...options, 
        headers 
      });
    }
    
    // Use the cache
    return await redditCache.fetchWithCache<T>(url, { 
      ...options, 
      headers 
    });
  } catch (error) {
    console.error("API Request Error:", error);
    throw error;
  }
}

/**
 * Safe response handler for API routes
 */
export function handleApiResponse<T>(
  data: T | null,
  error: Error | null = null,
  status = 200
): NextResponse {
  if (error || !data) {
    const errorMessage = error?.message || "Unknown error";
    console.error(`API Error (${status}):`, errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: status || 500 }
    );
  }
  
  return NextResponse.json(data);
}

/**
 * Check if content is NSFW and handle accordingly
 */
export function checkNSFWContent(
  content: any, 
  showNSFW: boolean
): { isBlocked: boolean; response?: NextResponse } {
  // Check if the content is NSFW and should be filtered
  if (content?.over_18 && !showNSFW) {
    return {
      isBlocked: true,
      response: NextResponse.json(
        {
          isNSFW: true,
          message: apiConfig.errors.nsfw.message,
        },
        { status: apiConfig.errors.nsfw.status }
      ),
    };
  }
  
  return { isBlocked: false };
}

/**
 * Extract filter parameters from search params
 */
export function extractFilterParams(searchParams: URLSearchParams) {
  return {
    sort: searchParams.get("sort") || "hot",
    t: searchParams.get("t") || "day",
    after: searchParams.get("after") || "",
    before: searchParams.get("before") || "",
    limit: Number(searchParams.get("limit") || "25"),
    showNSFW: searchParams.get("showNSFW") === "true",
    skipCache: searchParams.get("skipCache") === "true",
  };
} 