import { NextRequest, NextResponse } from 'next/server';

// Store the token with its expiration time
let redgifsToken: {
  token: string;
  expiresAt: number;
  pending: Promise<string> | null;
} = {
  token: '',
  expiresAt: 0,
  pending: null
};

// Function to get a valid token
async function getToken(): Promise<string> {
  const now = Date.now();
  
  // Check if we already have a valid token
  if (redgifsToken.token && redgifsToken.expiresAt > now) {
    return redgifsToken.token;
  }
  
  // If there's a pending request, wait for it
  if (redgifsToken.pending) {
    return redgifsToken.pending;
  }
  
  // Create a new token request
  redgifsToken.pending = (async () => {
    try {
      const response = await fetch('https://api.redgifs.com/v2/auth/temporary', {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get RedGIFs token: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Store the token with expiration (set to expire slightly earlier to be safe)
      // Typically tokens are valid for 24 hours, but we'll set it to 23 hours to be safe
      redgifsToken.token = data.token;
      redgifsToken.expiresAt = now + (23 * 60 * 60 * 1000); // 23 hours in milliseconds
      
      return data.token;
    } catch (error) {
      console.error('Error getting RedGIFs token:', error);
      throw error;
    } finally {
      redgifsToken.pending = null;
    }
  })();
  
  return redgifsToken.pending;
}

// Handler for GET requests to fetch gif info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gifId = searchParams.get('id');
    
    if (!gifId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }
    
    // Get a valid token
    const token = await getToken();
    
    // Fetch the gif info
    const response = await fetch(`https://api.redgifs.com/v2/gifs/${gifId}?views=yes&users=yes`, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch gif info: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in RedGIFs API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 