import { NextResponse } from 'next/server';
import './cache-init';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '1.0.0',
    caching: 'enabled',
  });
} 