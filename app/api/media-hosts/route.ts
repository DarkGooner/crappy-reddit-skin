import { NextRequest, NextResponse } from 'next/server';
import { 
  getCustomMediaHosts, 
  addCustomMediaHost, 
  deleteCustomMediaHost,
  CustomMediaHost
} from '@/lib/media-hosts';

// GET handler - Retrieve all custom media hosts
export async function GET() {
  try {
    const hosts = getCustomMediaHosts();
    return NextResponse.json(hosts);
  } catch (error) {
    console.error('Error retrieving media hosts:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve media hosts' },
      { status: 500 }
    );
  }
}

// POST handler - Add a new custom media host
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.urlPattern || !body.embedUrlPattern) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const newHost = addCustomMediaHost({
      name: body.name,
      urlPattern: body.urlPattern,
      embedUrlPattern: body.embedUrlPattern,
      sampleUrl: body.sampleUrl
    });
    
    if (!newHost) {
      return NextResponse.json(
        { error: 'Failed to add media host' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(newHost, { status: 201 });
  } catch (error) {
    console.error('Error adding media host:', error);
    return NextResponse.json(
      { error: 'Failed to add media host' },
      { status: 500 }
    );
  }
}

// DELETE handler - Remove a custom media host
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing host ID' },
        { status: 400 }
      );
    }
    
    const success = deleteCustomMediaHost(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete media host' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting media host:', error);
    return NextResponse.json(
      { error: 'Failed to delete media host' },
      { status: 500 }
    );
  }
} 